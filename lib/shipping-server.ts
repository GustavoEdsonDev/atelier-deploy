export type CarrierProduct = {
  id?: string | number
  price?: number
  quantity?: number
  package?: {
    width?: number
    height?: number
    length?: number
    weight?: number
  }
}

export type ShippingOption = {
  id: string
  name: string
  company: string
  price: number
  deliveryDays: number | null
  currency: string
}

export function sanitizePostalCode(value: string) {
  return String(value || '').replace(/\D/g, '')
}

export function normalizeProductForCarrier(item: CarrierProduct) {
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

export function extractApiMessage(payload: unknown) {
  if (!payload) return ''
  if (typeof payload === 'string') return payload
  if (Array.isArray(payload) && payload[0]?.error) return String(payload[0].error)
  if (typeof payload === 'object' && payload !== null && 'message' in payload && typeof payload.message === 'string') {
    return payload.message
  }
  if (typeof payload === 'object' && payload !== null && 'error' in payload && typeof payload.error === 'string') {
    return payload.error
  }
  return ''
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100
}

export function buildOfflineShippingOptions(toPostalCode: string, items: CarrierProduct[]): ShippingOption[] {
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

export function parseServices(rawValue: string) {
  return String(rawValue || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .join(',')
}

type CarrierService = {
  error?: unknown
  price?: number
  custom_price?: number
  id?: string | number
  name?: string
  company?: { name?: string }
  delivery_range?: { max?: number; min?: number }
  delivery_time?: number
}

export function mapCarrierOptions(payload: unknown): ShippingOption[] {
  if (!Array.isArray(payload)) return []

  return (payload as CarrierService[])
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
