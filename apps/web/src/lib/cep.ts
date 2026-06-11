export type CepAddress = {
  street: string
  neighborhood: string
  city: string
}

const CEP_DIGITS = 8

export const digitsOnly = (value: string) => value.replace(/\D/g, '')

export const formatCep = (value: string) => {
  const digits = digitsOnly(value).slice(0, CEP_DIGITS)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

export const isValidCep = (value: string) => {
  const digits = digitsOnly(value)
  if (digits.length !== CEP_DIGITS) return false
  if (/^(\d)\1{7}$/.test(digits)) return false
  return true
}

export async function lookupCepAddress(cep: string, signal?: AbortSignal): Promise<CepAddress> {
  const digits = digitsOnly(cep)

  if (!isValidCep(digits)) {
    throw new Error('CEP inválido. Informe 8 dígitos válidos.')
  }

  const response = await fetch(`${resolveApiBaseUrl()}/api/cep/${digits}`, { signal })
  const payload = (await response.json().catch(() => null)) as
    | CepAddress
    | { message?: string }
    | null

  if (!response.ok || !payload) {
    const message = payload && 'message' in payload && payload.message ? payload.message : 'Não foi possível consultar o CEP agora.'
    throw new Error(message)
  }

  if (!isCepAddress(payload)) {
    throw new Error('Não foi possível consultar o CEP agora.')
  }

  return {
    street: payload.street?.trim() ?? '',
    neighborhood: payload.neighborhood?.trim() ?? '',
    city: payload.city?.trim() ?? '',
  }
}

function resolveApiBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()
  return configuredBaseUrl ? configuredBaseUrl.replace(/\/$/, '') : ''
}

function isCepAddress(payload: CepAddress | { message?: string } | null): payload is CepAddress {
  return Boolean(payload && 'street' in payload && 'neighborhood' in payload && 'city' in payload)
}
