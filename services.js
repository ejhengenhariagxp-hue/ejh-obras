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

export let fbUser = null;
export let fbConfigured = false;
let fbAuth = null, fbDb = null;

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
export async function iaCall(system, user, maxTokens=1500) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: IA_MODEL, max_tokens: maxTokens,
      system, messages: [{ role:'user', content: user }]
    })
  });
  if (!r.ok) { const e=await r.json().catch(()=>({})); throw new Error(e.error?.message||'IA error '+r.status); }
  const d = await r.json();
  return d.content?.map(c=>c.text||'').join('') || '';
}

export async function gerarOrcamentoIA(descricao) {
  const raw = await iaCall(
    'Orçamentista de obras experiente no Brasil (Minas Gerais). Retorne APENAS JSON: {"itens":[{"item":"","sinapi":"","un":"","qtd":0,"vunit":0,"etapa":""}],"totalEstimado":0,"observacoes":""}',
    'Gerar orçamento: ' + descricao, 2000);
  return JSON.parse(raw.replace(/```json|```/g,'').trim());
}

export async function gerarEscopoIA(dados) {
  return await iaCall(
    'Engenheiro civil sênior redator de contratos. Gere texto de escopo técnico. Máx 200 palavras. Texto corrido.',
    `Obra: ${dados.empreend||''} | Cliente: ${dados.cliente||''} | Área: ${dados.area||''}m² | Itens: ${dados.itens||''}`,
    500);
}

export async function gerarRelatorioIA(dadosObras, contexto='') {
  return await iaCall(
    'Engenheiro civil consultor sênior. Relatório gerencial executivo: resumo executivo, situação das obras, análise financeira, recomendações. Máx 400 palavras. Sem markdown.',
    `Contexto: ${contexto}\n\n${dadosObras}\n\nData: ${new Date().toLocaleDateString('pt-BR')}`,
    1000);
}
