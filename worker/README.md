# EJH Obras — IA Proxy (Cloudflare Worker)

Proxy serverless gratuito entre o site (GitHub Pages) e a API da Anthropic.
Guarda a chave da Anthropic como **secret** no Cloudflare (não vai pro código público).

## Por que precisa disso?

- O browser **não pode** chamar `api.anthropic.com` direto (bloqueio CORS).
- A chave da Anthropic **não pode** ficar no frontend (qualquer um rouba).
- O Worker resolve os dois: roda no servidor da Cloudflare, guarda a chave,
  e libera CORS só pro domínio do GitHub Pages.

## Pré-requisitos

1. **Chave Anthropic** — em https://console.anthropic.com/ → API Keys → "Create Key"
2. **Conta Cloudflare** (grátis) — em https://dash.cloudflare.com/sign-up
3. **Node.js 18+** instalado na sua máquina

## Deploy (opção 1 — via CLI, recomendada)

```bash
# 1. Entre na pasta do worker
cd worker

# 2. Instale o CLI do Cloudflare
npm install -g wrangler

# 3. Faça login na Cloudflare (abre navegador)
wrangler login

# 4. Configure a chave Anthropic como secret (cola a chave quando pedir)
wrangler secret put ANTHROPIC_API_KEY

# 5. Publica o Worker
wrangler deploy
```

No fim do deploy, ele imprime uma URL tipo:

```
https://ejh-obras-ia.SEU-USUARIO.workers.dev
```

**Copie essa URL** — você vai precisar no próximo passo.

## Deploy (opção 2 — via dashboard, sem CLI)

1. Entra em https://dash.cloudflare.com
2. **Workers & Pages** → **Create** → **Create Worker**
3. Nome: `ejh-obras-ia` → **Deploy**
4. No Worker criado → **Edit code** → cola o conteúdo de `worker.js` → **Save and Deploy**
5. **Settings** → **Variables and Secrets** → **Add** →
   - Type: **Secret**
   - Name: `ANTHROPIC_API_KEY`
   - Value: *sua chave da Anthropic*
   - **Save**
6. Copie a URL do Worker (algo como `https://ejh-obras-ia.SEU-USUARIO.workers.dev`)

## Conectar o site ao Worker

Abra `services.js` na raiz do repo e **edite a constante `IA_PROXY_URL`**:

```js
const IA_PROXY_URL = 'https://ejh-obras-ia.SEU-USUARIO.workers.dev';
```

Commit + push. O GitHub Pages atualiza em 1-2 min e a IA volta a funcionar
(com suporte a texto, imagens e PDF).

## Testar

Depois do deploy, você pode testar no terminal:

```bash
curl -X POST https://ejh-obras-ia.SEU-USUARIO.workers.dev \
  -H "Content-Type: application/json" \
  -H "Origin: https://ejhengenhariagxp-hue.github.io" \
  -d '{
    "model": "claude-sonnet-4-20250514",
    "max_tokens": 100,
    "system": "Responda em português.",
    "messages": [{"role": "user", "content": "Diga olá."}]
  }'
```

Deve vir um JSON com `content[0].text` contendo a resposta.

## Custos

- Cloudflare Workers: **grátis** até 100.000 requisições/dia.
- Anthropic: cobrada por token no seu console Anthropic (cada captura IA
  usa ~2000 tokens ≈ USD 0,01 com Sonnet 4).

## Segurança

- A chave `ANTHROPIC_API_KEY` fica só no servidor Cloudflare (secret).
- O Worker só aceita requisições do origin `https://ejhengenhariagxp-hue.github.io`
  (e localhost pra desenvolvimento). Editável em `worker.js:9`.
- Se sua chave vazar um dia, **revogue no console Anthropic** e rode
  `wrangler secret put ANTHROPIC_API_KEY` de novo com a chave nova.
