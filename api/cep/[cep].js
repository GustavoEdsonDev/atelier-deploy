module.exports = async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return response.status(405).json({ message: 'Metodo nao permitido.' })
  }

  const cep = String(request.query?.cep || '').replace(/\D/g, '')

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

    return response.status(200).json({
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
}
