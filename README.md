# Atelier Raízes MVP

MVP de e-commerce para apresentação da loja com checkout, painel administrativo e cotação de frete via Melhor Envio.

## Stack

- **Next.js 15** (App Router) com React 19 e Tailwind CSS
- API routes em `app/api/` para CEP, frete e health check

## Fluxos

- Home com carrossel e descrição curta da marca
- Produtos com cartões e ação de compra
- Carrinho com ajuste de quantidade e resumo
- Dados pessoais, endereço, frete e pagamento em telas separadas
- Área administrativa com vendas, usuários, estoque e gráfico mensal

## Configuração

1. Copie o arquivo de exemplo:

```bash
cp .env.example .env.local
```

2. Preencha as variáveis em `.env.local`:

- `MELHOR_ENVIO_TOKEN`: token da sua aplicação no Melhor Envio
- `MELHOR_ENVIO_FROM_POSTAL_CODE`: CEP de origem da loja
- `MELHOR_ENVIO_SERVICES`: IDs dos serviços que deseja cotar, separados por vírgula
- `MELHOR_ENVIO_SANDBOX`: `true` para sandbox, `false` para produção
- `MVP_OFFLINE`: `true` para responder com frete simulado e evitar dependência de internet durante a demo
- `NEXT_PUBLIC_WHATSAPP_NUMBER`: número do WhatsApp do gestor, em formato internacional
- `NEXT_PUBLIC_API_BASE_URL`: opcional; deixe vazio para usar o mesmo domínio dos endpoints `/api`

Sem as variáveis do Melhor Envio, a API sobe normalmente, mas a cotação retornará mensagem de configuração pendente.
Com `MVP_OFFLINE=true`, o backend ignora a chamada externa e devolve opções de frete simuladas.

## Como rodar

Instale as dependências:

```bash
npm install
```

Suba o servidor de desenvolvimento:

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
npm run start
```

## API

- `GET /api/health` — status das configurações
- `GET /api/cep/:cep` — consulta de CEP via ViaCEP
- `POST /api/shipping/quote` — cotação de frete via Melhor Envio

Exemplo de body para teste de frete:

```json
{
  "toPostalCode": "30140071",
  "items": [
    {
      "id": 1,
      "name": "Caneca",
      "price": 89.9,
      "quantity": 1,
      "package": {
        "width": 12,
        "height": 10,
        "length": 12,
        "weight": 0.6
      }
    }
  ]
}
```

## Deploy na Vercel

1. Importe o repositório na Vercel (framework detectado automaticamente como Next.js)
2. Configure as variáveis de ambiente do `.env.example`
3. Faça o deploy

Validação rápida após deploy:

- `GET https://SEU-DOMINIO/api/health` deve retornar `ok: true`
- `POST https://SEU-DOMINIO/api/shipping/quote` deve responder com `options`

## Demo offline

Para uma apresentação sem depender de internet:

1. Ative `MVP_OFFLINE=true` em `.env.local`
2. Gere o build e suba o servidor:

```bash
npm run build
npm run start
```

3. Abra [http://localhost:3000](http://localhost:3000)

## Windows

Há um script `start-demo.bat` na raiz do projeto. Com o Node.js instalado e as dependências baixadas:

```bat
start-demo.bat
```
# atelier-deploy
