const {
  buildOfflineShippingOptions,
  extractApiMessage,
  mapCarrierOptions,
  normalizeProductForCarrier,
  parseServices,
  sanitizePostalCode,
} = require('../_lib/shipping')

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return response.status(405).json({ message: 'Metodo nao permitido.' })
  }

  const toPostalCode = sanitizePostalCode(request.body?.toPostalCode || '')
  const items = Array.isArray(request.body?.items) ? request.body.items : []

  if (!toPostalCode || toPostalCode.length !== 8) {
    return response.status(400).json({ message: 'Informe um CEP de destino valido com 8 digitos.' })
  }

  if (!items.length) {
    return response.status(400).json({ message: 'Adicione ao menos um item para calcular o frete.' })
  }

  const melhorEnvioToken = process.env.MELHOR_ENVIO_TOKEN || ''
  const fromPostalCode = sanitizePostalCode(process.env.MELHOR_ENVIO_FROM_POSTAL_CODE || '')
  const services = parseServices(process.env.MELHOR_ENVIO_SERVICES)
  const useSandbox = process.env.MELHOR_ENVIO_SANDBOX !== 'false'
  const offlineMode = process.env.MVP_OFFLINE === 'true'
  const melhorEnvioBaseUrl = useSandbox ? 'https://sandbox.melhorenvio.com.br' : 'https://www.melhorenvio.com.br'

  if (offlineMode) {
    return response.status(200).json({
      options: buildOfflineShippingOptions(toPostalCode, items),
      offlineMode: true,
    })
  }

  if (!melhorEnvioToken) {
    return response.status(500).json({ message: 'Configure MELHOR_ENVIO_TOKEN no backend antes de calcular o frete.' })
  }

  if (!fromPostalCode || fromPostalCode.length !== 8) {
    return response
      .status(500)
      .json({ message: 'Configure MELHOR_ENVIO_FROM_POSTAL_CODE no backend antes de calcular o frete.' })
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

    return response.status(200).json({ options: mapCarrierOptions(payload), raw: payload })
  } catch (error) {
    return response.status(502).json({
      message: 'Nao foi possivel consultar o Melhor Envio agora.',
      details: error instanceof Error ? error.message : 'Erro desconhecido.',
    })
  }
}
