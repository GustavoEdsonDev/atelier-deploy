function sanitizePostalCode(value) {
  return String(value || '').replace(/\D/g, '')
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

function roundCurrency(value) {
  return Math.round(value * 100) / 100
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

function parseServices(rawValue) {
  return String(rawValue || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .join(',')
}

function mapCarrierOptions(payload) {
  if (!Array.isArray(payload)) return []

  return payload
    .filter((service) => !service.error && Number(service.price || service.custom_price || 0) > 0)
    .map((service) => ({
      id: String(service.id || service.name || service.company?.name || Math.random()),
      name: service.name || 'Servico',
      company: service.company?.name || 'Transportadora',
      price: Number(service.price || service.custom_price || 0),
      deliveryDays:
        Number(service.delivery_range?.max || service.delivery_time || service.delivery_range?.min || 0) || null,
      currency: 'BRL',
    }))
    .sort((left, right) => left.price - right.price)
}

module.exports = {
  buildOfflineShippingOptions,
  extractApiMessage,
  mapCarrierOptions,
  normalizeProductForCarrier,
  parseServices,
  sanitizePostalCode,
}
