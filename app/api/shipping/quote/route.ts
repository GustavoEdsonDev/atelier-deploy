import { NextResponse } from 'next/server'
import {
  buildOfflineShippingOptions,
  extractApiMessage,
  mapCarrierOptions,
  normalizeProductForCarrier,
  parseServices,
  sanitizePostalCode,
  type CarrierProduct,
} from '@/lib/shipping-server'

type QuoteRequestBody = {
  toPostalCode?: string
  items?: CarrierProduct[]
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as QuoteRequestBody | null
  const toPostalCode = sanitizePostalCode(body?.toPostalCode || '')
  const items = Array.isArray(body?.items) ? body.items : []

  if (!toPostalCode || toPostalCode.length !== 8) {
    return NextResponse.json({ message: 'Informe um CEP de destino valido com 8 digitos.' }, { status: 400 })
  }

  if (!items.length) {
    return NextResponse.json({ message: 'Adicione ao menos um item para calcular o frete.' }, { status: 400 })
  }

  const melhorEnvioToken = process.env.MELHOR_ENVIO_TOKEN || ''
  const fromPostalCode = sanitizePostalCode(process.env.MELHOR_ENVIO_FROM_POSTAL_CODE || '')
  const services = parseServices(process.env.MELHOR_ENVIO_SERVICES || '')
  const useSandbox = process.env.MELHOR_ENVIO_SANDBOX !== 'false'
  const offlineMode = process.env.MVP_OFFLINE === 'true'
  const melhorEnvioBaseUrl = useSandbox ? 'https://sandbox.melhorenvio.com.br' : 'https://www.melhorenvio.com.br'

  if (offlineMode) {
    return NextResponse.json({
      options: buildOfflineShippingOptions(toPostalCode, items),
      offlineMode: true,
    })
  }

  if (!melhorEnvioToken) {
    return NextResponse.json(
      { message: 'Configure MELHOR_ENVIO_TOKEN no backend antes de calcular o frete.' },
      { status: 500 },
    )
  }

  if (!fromPostalCode || fromPostalCode.length !== 8) {
    return NextResponse.json(
      { message: 'Configure MELHOR_ENVIO_FROM_POSTAL_CODE no backend antes de calcular o frete.' },
      { status: 500 },
    )
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
      return NextResponse.json({ message, details: payload }, { status: melhorEnvioResponse.status })
    }

    return NextResponse.json({ options: mapCarrierOptions(payload), raw: payload })
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Nao foi possivel consultar o Melhor Envio agora.',
        details: error instanceof Error ? error.message : 'Erro desconhecido.',
      },
      { status: 502 },
    )
  }
}
