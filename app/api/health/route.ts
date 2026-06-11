import { NextResponse } from 'next/server'
import { sanitizePostalCode } from '@/lib/shipping-server'

export async function GET() {
  const fromPostalCode = sanitizePostalCode(process.env.MELHOR_ENVIO_FROM_POSTAL_CODE || '')

  return NextResponse.json({
    ok: true,
    offlineMode: process.env.MVP_OFFLINE === 'true',
    sandbox: process.env.MELHOR_ENVIO_SANDBOX !== 'false',
    fromPostalCodeConfigured: Boolean(fromPostalCode),
    tokenConfigured: Boolean(process.env.MELHOR_ENVIO_TOKEN),
  })
}
