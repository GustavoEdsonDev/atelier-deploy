export type ShippingPackage = {
  width: number
  height: number
  length: number
  weight: number
}

export type ShippingCartItem = {
  id: number
  name: string
  price: number
  quantity: number
  package: ShippingPackage
}

export type ShippingOption = {
  id: string
  name: string
  company: string
  price: number
  deliveryDays: number | null
  currency: string
}

type QuoteResponse = {
  options: ShippingOption[]
}

export async function quoteShipping(toPostalCode: string, items: ShippingCartItem[]): Promise<ShippingOption[]> {
  const response = await fetch(`${resolveApiBaseUrl()}/api/shipping/quote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      toPostalCode,
      items,
    }),
  })

  const payload = (await response.json().catch(() => null)) as QuoteResponse | { message?: string } | null

  if (!response.ok) {
    const message = payload && 'message' in payload && payload.message ? payload.message : 'Falha ao calcular frete.'
    throw new Error(message)
  }

  return isQuoteResponse(payload) ? payload.options : []
}

function resolveApiBaseUrl() {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim()
  return configuredBaseUrl ? configuredBaseUrl.replace(/\/$/, '') : ''
}

function isQuoteResponse(payload: QuoteResponse | { message?: string } | null): payload is QuoteResponse {
  return Boolean(payload && 'options' in payload && Array.isArray(payload.options))
}
