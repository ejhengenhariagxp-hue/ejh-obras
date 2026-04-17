// Cloudflare Worker — EJH Obras IA Proxy
// ══════════════════════════════════════════════════════════════════════
// Proxy seguro entre o frontend (GitHub Pages) e a API da Anthropic.
// Guarda a chave ANTHROPIC_API_KEY como secret (nunca vai pro browser).
// Suporta texto, imagens (base64) e PDF (base64).
//
// Deploy: ver ../worker/README.md
// ══════════════════════════════════════════════════════════════════════

const ALLOWED_ORIGINS = [
  'https://ejhengenhariagxp-hue.github.io',
  'http://localhost:8000',
  'http://127.0.0.1:8000'
];

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, origin);
    }
    if (!env.ANTHROPIC_API_KEY) {
      return json({ error: 'Server not configured (missing ANTHROPIC_API_KEY)' }, 500, origin);
    }

    let payload;
    try { payload = await request.json(); }
    catch { return json({ error: 'Invalid JSON' }, 400, origin); }

    const { model, max_tokens, system, messages } = payload || {};
    if (!model || !messages || !Array.isArray(messages)) {
      return json({ error: 'Missing model or messages[]' }, 400, origin);
    }

    try {
      const upstream = await fetch(ANTHROPIC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': ANTHROPIC_VERSION
        },
        body: JSON.stringify({
          model,
          max_tokens: max_tokens || 1500,
          system: system || '',
          messages
        })
      });
      const text = await upstream.text();
      return new Response(text, {
        status: upstream.status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
      });
    } catch (e) {
      return json({ error: 'Upstream error: ' + e.message }, 502, origin);
    }
  }
};
