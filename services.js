// services.js — Firebase, Anthropic IA, persistência
// ══════════════════════════════════════════════════════════════════════

const FB_CONFIG = {
  apiKey:            "AIzaSyBoqbCF5-EklcUh_Jtnn_8imE0Vc2Bup3A",
  authDomain:        "ejh-obras.firebaseapp.com",
  projectId:         "ejh-obras",
  storageBucket:     "ejh-obras.firebasestorage.app",
  messagingSenderId: "872702640",
  appId:             "1:872702640:web:5ff8bf38377b06c9ba9175"
};
const STORAGE_KEY = 'ejh_obras_v4';
const PROPS_BAK   = 'ejh_propostas_bak';
const IA_MODEL    = 'claude-sonnet-4-20250514';
const IA_KEY_STORAGE = 'anthropic_api_key';

export let fbUser = null;
export let fbConfigured = false;
let fbAuth = null, fbDb = null, fbStorage = null;

// ── Local persistence ────────────────────────────────────────────────
export function saveState(state) {
  try {
    const s = { ...state, diario: state.diario.map(d=>({...d,fotos:[]})) };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    if (Array.isArray(state.propostas)) {
      localStorage.setItem(PROPS_BAK, JSON.stringify(state.propostas));
    }
  } catch(e) { console.warn('saveState:', e.message); }
}

export function loadState(defaults) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
             || localStorage.getItem('ejh_obras_v3')
             || localStorage.getItem('ejh_obras_v2');
    const saved = raw ? JSON.parse(raw) : null;
    const merged = saved ? { ...defaults, ...saved } : defaults;
    const bak = localStorage.getItem(PROPS_BAK);
    if (bak) {
      const p = JSON.parse(bak);
      if (Array.isArray(p) && p.length && (!Array.isArray(merged.propostas) || !merged.propostas.length))
        merged.propostas = p;
    }
    return merged;
  } catch(e) { return defaults; }
}

// ── Firebase ─────────────────────────────────────────────────────────
export function fbInit(onUserChange) {
  try {
    let app;
    try { app = firebase.initializeApp(FB_CONFIG); }
    catch(e) { if (e.code === 'app/duplicate-app') app = firebase.app(); else throw e; }
    fbAuth = firebase.auth();
    fbDb   = firebase.firestore();
    try { fbStorage = firebase.storage(); } catch(e) { console.warn('storage init:', e.message); }
    fbConfigured = true;
    fbAuth.onAuthStateChanged(user => {
      fbUser = user;
      window._fbUser = user;
      onUserChange?.(user);
    });
  } catch(e) { console.warn('fbInit:', e.message); }
}

export function fbLoginGoogle() {
  if (!fbConfigured) return;
  const p = new firebase.auth.GoogleAuthProvider();
  fbAuth.signInWithPopup(p).catch(e => {
    if (e.code === 'auth/popup-blocked') fbAuth.signInWithRedirect(p);
  });
}
export function fbLogout() { fbAuth?.signOut(); }

// ── Firebase Storage (fotos do diário) ───────────────────────────────
// Sobe um Blob ou File pro Storage no path usuarios/{uid}/fotos_diario/.
// Retorna { url, storagePath } pronto para gravar no state.fotos.
export async function fbUploadFoto(blob, filename) {
  if (!fbUser || !fbStorage) throw new Error('Não logado / Storage indisponível');
  const safe = (filename || 'foto.jpg').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  const ts = Date.now();
  const rand = Math.floor(Math.random() * 1e6).toString(36);
  const path = `usuarios/${fbUser.uid}/fotos_diario/${ts}_${rand}_${safe}`;
  const ref = fbStorage.ref().child(path);
  const snap = await ref.put(blob, { contentType: blob.type || 'image/jpeg' });
  const url = await snap.ref.getDownloadURL();
  return { url, storagePath: path };
}

// Apaga uma foto do Storage pelo path absoluto (usuarios/.../fotos_diario/...).
// Silencioso em caso de erro — pode ser por já estar apagada ou regra de segurança.
export async function fbDeleteFoto(storagePath) {
  if (!fbStorage || !storagePath) return;
  try {
    await fbStorage.ref().child(storagePath).delete();
  } catch (e) {
    console.warn('fbDeleteFoto:', storagePath, e?.message);
  }
}

// Migra fotos antigas (com dataUrl em base64) para o Storage.
// Itera por todos os diários, faz upload da dataUrl como blob, atualiza
// o registro in-place com { url, storagePath }. Retorna estatísticas.
export async function fbMigrarFotosAntigas(state, onProgress) {
  if (!fbUser || !fbStorage) throw new Error('Faça login no Google primeiro');
  let total = 0, migradas = 0, falhas = 0, jaTinha = 0;
  for (const d of (state.diario || [])) {
    for (const f of (d.fotos || [])) {
      total++;
      if (f.url || f.storagePath) { jaTinha++; continue; }
      const du = f.dataUrl;
      if (!du || !du.startsWith('data:')) { falhas++; continue; }
      try {
        const resp = await fetch(du);
        const blob = await resp.blob();
        const { url, storagePath } = await fbUploadFoto(blob, f.name);
        f.url = url;
        f.storagePath = storagePath;
        f.dataUrl = ''; // libera memória/localStorage
        migradas++;
        if (onProgress) onProgress({ total, migradas, falhas, jaTinha, cur: f.name });
      } catch (e) {
        console.warn('migrar foto falhou:', f.name, e?.message);
        falhas++;
      }
    }
  }
  return { total, migradas, falhas, jaTinha };
}

export async function fbSaveData(state) {
  if (!fbUser || !fbDb) return;
  try {
    const s = { ...state, diario: state.diario.map(d=>({...d,fotos:[]})),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
    await fbDb.collection('usuarios').doc(fbUser.uid).set(s);
  } catch(e) { console.warn('fbSave:', e.message); }
}

export async function fbLoadData(cur) {
  if (!fbUser || !fbDb) return cur;
  try {
    const doc = await fbDb.collection('usuarios').doc(fbUser.uid).get();
    if (!doc.exists) { await fbSaveData(cur); return cur; }
    const rem = doc.data(); delete rem.updatedAt;
    const merge = (a,b) => {
      if (!Array.isArray(b)||!b.length) return a||[];
      if (!Array.isArray(a)||!a.length) return b;
      const ids = new Set(b.map(x=>x.id).filter(Boolean));
      return [...b, ...a.filter(x=>x.id&&!ids.has(x.id))];
    };
    const m = { ...cur, ...rem };
    ['obras','orc','cron','diario','fin','medicoes','empreita','propostas','checklists','capturas']
      .forEach(k => { m[k] = merge(cur[k], rem[k]); });
    if (rem.counters && cur.counters) {
      m.counters = {};
      Object.keys({...cur.counters,...rem.counters}).forEach(k =>
        m.counters[k] = Math.max(cur.counters[k]||1, rem.counters[k]||1));
    }
    return m;
  } catch(e) { console.warn('fbLoad:', e.message); return cur; }
}

// ── Anthropic IA ─────────────────────────────────────────────────────
// Sanitiza chave: remove qualquer caractere fora do ASCII imprimível
// (corrige problema "non ISO-8859-1 code point" causado por copy/paste
// que traz espaços Unicode, zero-width chars, etc).
function sanitizeKey(k) {
  return (k || '').replace(/[^\x20-\x7E]/g, '').trim();
}

export function saveIaKey(key) {
  if (!key) return;
  const clean = sanitizeKey(key);
  if (!clean) return;
  localStorage.setItem('anthropic_api_key', clean);
}

export async function iaCall(system, userContent, maxTokens=1500) {
  let key = localStorage.getItem('anthropic_api_key');
  if (!key) throw new Error('Chave da Anthropic não configurada. Vá em IA Inteligente (BETA) na barra lateral.');
  // Re-sanitiza ao ler — chaves antigas podem ter sido salvas antes do fix
  const clean = sanitizeKey(key);
  if (clean !== key) {
    localStorage.setItem('anthropic_api_key', clean);
    key = clean;
  }
  if (!key.startsWith('sk-ant-')) throw new Error('Chave inválida no localStorage. Reconfigure em IA Inteligente.');

  const messages = [{
    role: 'user',
    content: typeof userContent === 'string' ? [{ type: 'text', text: userContent }] : userContent
  }];

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: IA_MODEL,
      max_tokens: maxTokens,
      system,
      messages
    })
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    const msg = e.error?.message || 'Erro na IA (' + r.status + ')';
    if (r.status === 401) throw new Error('Chave da Anthropic inválida ou expirada.');
    throw new Error(msg);
  }
  const d = await r.json();
  return d.content?.map(c => c.text || '').join('') || '';
}

export async function gerarOrcamentoIA(descricao) {
  const raw = await iaCall(
    'Orçamentista de obras experiente no Brasil (Minas Gerais). Retorne APENAS JSON: {"itens":[{"item":"","sinapi":"","un":"","qtd":0,"vunit":0,"etapa":""}],"totalEstimado":0,"observacoes":""}',
    'Gerar orçamento para: ' + descricao, 2000);
  return JSON.parse(raw.replace(/```json|```/g, '').trim());
}

export async function gerarEscopoIA(dados) {
  return await iaCall(
    'Engenheiro civil sênior redator de contratos. Gere texto de escopo técnico. Máx 200 palavras. Texto corrido.',
    `Obra: ${dados.empreend || ''} | Cliente: ${dados.cliente || ''} | Área: ${dados.area || ''}m² | Itens: ${dados.itens || ''}`,
    500);
}

export async function gerarRelatorioIA(dadosObras, contexto = '') {
  return await iaCall(
    'Engenheiro civil consultor sênior. Relatório gerencial executivo: resumo executivo, situação das obras, análise financeira, recomendações. Máx 400 palavras. Sem markdown.',
    `Contexto: ${contexto}\n\n${dadosObras}\n\nData: ${new Date().toLocaleDateString('pt-BR')}`,
    1000);
}

export function getIaKey() {
  return localStorage.getItem(IA_KEY_STORAGE) || '';
}
export function setIaKey(k) {
  if (k) localStorage.setItem(IA_KEY_STORAGE, sanitizeKey(k));
  else   localStorage.removeItem(IA_KEY_STORAGE);
}
export function hasIaKey() { return !!getIaKey(); }

