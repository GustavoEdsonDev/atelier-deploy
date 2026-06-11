import { NextResponse } from 'next/server'
import { sanitizePostalCode } from '@/lib/shipping-server'

type RouteContext = {
  params: Promise<{ cep: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  const { cep: rawCep } = await context.params
  const cep = sanitizePostalCode(rawCep || '')

  if (!cep || cep.length !== 8) {
    return NextResponse.json({ message: 'CEP invalido. Informe 8 digitos.' }, { status: 400 })
  }

  try {
    const viaCepResponse = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
    const payload = await viaCepResponse.json().catch(() => null)

    if (!viaCepResponse.ok || !payload) {
      return NextResponse.json({ message: 'Nao foi possivel consultar o CEP agora.' }, { status: 502 })
    }

    if (payload.erro) {
      return NextResponse.json({ message: 'CEP nao encontrado.' }, { status: 404 })
    }

    return NextResponse.json({
      cep: payload.cep || cep,
      street: payload.logradouro?.trim() || '',
      neighborhood: payload.bairro?.trim() || '',
      city: payload.localidade?.trim() || '',
      state: payload.uf?.trim() || '',
    })
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Falha ao consultar CEP.',
        details: error instanceof Error ? error.message : 'Erro desconhecido.',
      },
      { status: 502 },
    )
  }
}
