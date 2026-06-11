const { sanitizePostalCode } = require('./_lib/shipping')

module.exports = function handler(_request, response) {
  const fromPostalCode = sanitizePostalCode(process.env.MELHOR_ENVIO_FROM_POSTAL_CODE || '')

  return response.status(200).json({
    ok: true,
    offlineMode: process.env.MVP_OFFLINE === 'true',
    sandbox: process.env.MELHOR_ENVIO_SANDBOX !== 'false',
    fromPostalCodeConfigured: Boolean(fromPostalCode),
    tokenConfigured: Boolean(process.env.MELHOR_ENVIO_TOKEN),
  })
}
