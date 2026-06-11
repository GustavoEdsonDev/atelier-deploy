import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'

dotenv.config()

const app = express()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const port = Number(process.env.PORT || 3333)
const webOrigin = process.env.WEB_ORIGIN || 'http://localhost:5173'
const melhorEnvioToken = process.env.MELHOR_ENVIO_TOKEN || ''
const fromPostalCode = sanitizePostalCode(process.env.MELHOR_ENVIO_FROM_POSTAL_CODE || '')
const services = (process.env.MELHOR_ENVIO_SERVICES || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)
  .join(',')
const useSandbox = process.env.MELHOR_ENVIO_SANDBOX !== 'false'
const offlineMode = process.env.MVP_OFFLINE === 'true'
const melhorEnvioBaseUrl = useSandbox ? 'https://sandbox.melhorenvio.com.br' : 'https://www.melhorenvio.com.br'
const webDistDir = path.resolve(__dirname, '../web/dist')
const hasBuiltWeb = existsSync(path.join(webDistDir, 'index.html'))

app.use(cors({ origin: webOrigin }))
app.use(express.json())

app.get(['/health', '/api/health'], (_request, response) => {
  response.json({
    ok: true,
    offlineMode,
    sandbox: useSandbox,
    hasBuiltWeb,
    fromPostalCodeConfigured: Boolean(fromPostalCode),
    tokenConfigured: Boolean(melhorEnvioToken),
  })
})

app.get(['/cep/:cep', '/api/cep/:cep'], async (request, response) => {
  const cep = sanitizePostalCode(request.params?.cep || '')

  if (!cep || cep.length !== 8) {
    return response.status(400).json({ message: 'CEP invalido. Informe 8 digitos.' })
  }

  try {
    const viaCepResponse = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
    const payload = await viaCepResponse.json().catch(() => null)

    if (!viaCepResponse.ok || !payload) {
      return response.status(502).json({ message: 'Nao foi possivel consultar o CEP agora.' })
    }

    if (payload.erro) {
      return response.status(404).json({ message: 'CEP nao encontrado.' })
    }

    return response.json({
      cep: payload.cep || cep,
      street: payload.logradouro?.trim() || '',
      neighborhood: payload.bairro?.trim() || '',
      city: payload.localidade?.trim() || '',
      state: payload.uf?.trim() || '',
    })
  } catch (error) {
    return response.status(502).json({
      message: 'Falha ao consultar CEP.',
      details: error instanceof Error ? error.message : 'Erro desconhecido.',
    })
  }
})

app.post(['/shipping/quote', '/api/shipping/quote'], async (request, response) => {
  const toPostalCode = sanitizePostalCode(request.body?.toPostalCode || '')
  const items = Array.isArray(request.body?.items) ? request.body.items : []

  if (!toPostalCode || toPostalCode.length !== 8) {
    return response.status(400).json({ message: 'Informe um CEP de destino valido com 8 digitos.' })
  }

  if (!items.length) {
    return response.status(400).json({ message: 'Adicione ao menos um item para calcular o frete.' })
  }

  if (offlineMode) {
    return response.json({
      options: buildOfflineShippingOptions(toPostalCode, items),
      offlineMode: true,
    })
  }

  if (!melhorEnvioToken) {
    return response.status(500).json({ message: 'Configure MELHOR_ENVIO_TOKEN no backend antes de calcular o frete.' })
  }

  if (!fromPostalCode || fromPostalCode.length !== 8) {
    return response.status(500).json({ message: 'Configure MELHOR_ENVIO_FROM_POSTAL_CODE no backend antes de calcular o frete.' })
  }

  try {
    const melhorEnvioResponse = await fetch(`${melhorEnvioBaseUrl}/api/v2/me/shipment/calculate`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${melhorEnvioToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Atelier Raizes MVP <contato@atelier-raizes.demo>',
      },
      body: JSON.stringify({
        from: { postal_code: fromPostalCode },
        to: { postal_code: toPostalCode },
        products: items.map(normalizeProductForCarrier),
        options: {
          receipt: false,
          own_hand: false,
        },
        ...(services ? { services } : {}),
      }),
    })

    const payload = await melhorEnvioResponse.json().catch(() => null)

    if (!melhorEnvioResponse.ok) {
      const message = extractApiMessage(payload) || 'Falha ao consultar o Melhor Envio.'
      return response.status(melhorEnvioResponse.status).json({ message, details: payload })
    }

    const options = Array.isArray(payload)
      ? payload
          .filter((service) => !service.error && Number(service.price || service.custom_price || 0) > 0)
          .map((service) => ({
            id: String(service.id || service.name || service.company?.name || Math.random()),
            name: service.name || 'Servico',
            company: service.company?.name || 'Transportadora',
            price: Number(service.price || service.custom_price || 0),
            deliveryDays: Number(
              service.delivery_range?.max ||
                service.delivery_time ||
                service.delivery_range?.min ||
                0,
            ) || null,
            currency: 'BRL',
          }))
          .sort((left, right) => left.price - right.price)
      : []

    return response.json({ options, raw: payload })
  } catch (error) {
    return response.status(502).json({
      message: 'Nao foi possivel consultar o Melhor Envio agora.',
      details: error instanceof Error ? error.message : 'Erro desconhecido.',
    })
  }
})

if (hasBuiltWeb) {
  app.use(express.static(webDistDir))

  app.get(/^(?!\/api(?:\/|$)).*/, (_request, response) => {
    response.sendFile(path.join(webDistDir, 'index.html'))
  })
}

app.listen(port, () => {
  console.log(`API de frete rodando em http://localhost:${port}`)
  if (offlineMode) {
    console.log('Modo offline ativo: frete simulado para demonstracao.')
  }
  if (hasBuiltWeb) {
    console.log(`Demo web disponivel em http://localhost:${port}`)
  }
})

function sanitizePostalCode(value) {
  return String(value).replace(/\D/g, '')
}

function normalizeProductForCarrier(item) {
  const dimensions = item?.package ?? {}

  return {
    id: String(item?.id ?? 'item'),
    width: Number(dimensions.width || 0),
    height: Number(dimensions.height || 0),
    length: Number(dimensions.length || 0),
    weight: Number(dimensions.weight || 0),
    insurance_value: Number(item?.price || 0),
    quantity: Number(item?.quantity || 1),
  }
}

function extractApiMessage(payload) {
  if (!payload) return ''
  if (typeof payload === 'string') return payload
  if (Array.isArray(payload) && payload[0]?.error) return String(payload[0].error)
  if (typeof payload?.message === 'string') return payload.message
  if (typeof payload?.error === 'string') return payload.error
  return ''
}

function buildOfflineShippingOptions(toPostalCode, items) {
  const cepDigits = sanitizePostalCode(toPostalCode)
  const totalWeight = items.reduce(
    (sum, item) => sum + Number(item?.package?.weight || 0) * Math.max(1, Number(item?.quantity || 1)),
    0,
  )
  const totalItems = items.reduce((sum, item) => sum + Math.max(1, Number(item?.quantity || 1)), 0)
  const regionOffset = Number(cepDigits.slice(0, 1) || 0)
  const standardPrice = roundCurrency(15 + totalWeight * 9 + totalItems * 1.5 + regionOffset)
  const expressPrice = roundCurrency(standardPrice + 11.5)

  return [
    {
      id: 'offline-standard',
      name: 'Entrega demo',
      company: 'Atelier Raizes',
      price: standardPrice,
      deliveryDays: 4 + (regionOffset % 3),
      currency: 'BRL',
    },
    {
      id: 'offline-express',
      name: 'Entrega expressa demo',
      company: 'Atelier Raizes',
      price: expressPrice,
      deliveryDays: 2 + (regionOffset % 2),
      currency: 'BRL',
    },
  ]
}

function roundCurrency(value) {
  return Math.round(value * 100) / 100
}
