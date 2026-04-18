// app.js — Orchestrador principal do EJH Gestão de Obras v4.2
// ══════════════════════════════════════════════════════════════════════

import { fmt, fmtD, pad, safeInner, safeText, showToast, nav, setBnActive,
         openModal, closeModal, statusBadge, tipoLabel,
         popularSelectsObras, modalidadeIcon, verificarAvisosObra,
         toggleFab, closeFab, openLightbox, closeLightbox, showSaveIndicator, obraName } from './utils.js';
import { saveState, loadState, fbInit, fbLoginGoogle, fbLogout,
         fbSaveData, fbLoadData, saveIaKey, getIaKey, setIaKey, iaCall, gerarOrcamentoIA, gerarEscopoIA, gerarRelatorioIA } from './services.js';
import { addObra, delObra, renderObras, registrarMedicaoRapida } from './modules/obras.js';
import { addOrc, delOrc, renderOrc, abrirOrcamentoObra, voltarOrcLista, renderOrcDetalhe, openEditOrc, gerarOrcamentoComIA } from './modules/orcamento.js';
import { addCron, delCron, saveCronEdit, openCronEdit, setCronView, renderCron, renderGantt } from './modules/cronograma.js';
import { addDiario, delDiario, handleFotos, removePendingFoto, openModalDiario, renderDiario, gerarDiarioComFoto } from './modules/diario.js';
import { addFin, delFin, openModalFin, renderFinanceiro } from './modules/financeiro.js';
import { addMedicao, updateMedVal, loadMedItems, printMedicao, colherAssinatura, renderMedicoes } from './modules/medicoes.js';
import { addEmpreita, delEmpreita, openEmpPag, addEmpPag, renderEmpreita } from './modules/empreita.js';
import { openPropProjeto, openPropObra, calcPropProjeto, calcPropostaObra,
         saveProposta, delProposta, editProposta, printProposta, compartilharWhatsApp,
         colherAssinaturaProposta, saveCliSig, importFromOrcamento, addObraItem,
         addProjServico, addProjExtra, toggleModoGlobal, renderPropostas } from './modules/propostas.js';
import { renderTabelas, filterSinapi, setSinapiCat, setTabelaSrc, importSinapi } from './modules/sinapi.js';
import { renderReport, gerarRelatorioWpp, gerarRelatorioEmail } from './modules/relatorio.js';
import { addChecklist, renderChecklist, renderTemplatesNBR, novoChecklist } from './modules/checklist.js';
import { renderCaptura, capProcessarIA, capConfirmarTodos, capLimpar, capDescartarResultado, capToggleCard, capProcessarArquivo } from './modules/captura.js';

// ── Estado global ────────────────────────────────────────────────────
const DEFAULT_STATE = {
  obras:[], orc:[], cron:[], diario:[], fin:[],
  medicoes:[], empreita:[], propostas:[], checklists:[], capturas:[],
  counters:{ obra:1, orc:1, cron:1, dia:1, fin:1, med:1, emp:1, prop:1, ck:1 },
  engNome:'', engRegistro:'', engCrea:'', engSig:'',
  relatorioRodape:'', logoData:'', sinapiMes:'',
  tabelaSource:'sinapi', sinapiCatFilter:'Todos',
};

export let state = loadState(DEFAULT_STATE);
window._state = state;

function initFields() {
  ['obras','orc','cron','diario','fin','medicoes','empreita','propostas','checklists','capturas']
    .forEach(k => { if (!Array.isArray(state[k])) state[k] = []; });
  if (!state.counters) state.counters = { ...DEFAULT_STATE.counters };
  Object.keys(DEFAULT_STATE.counters).forEach(k => {
    if (!state.counters[k]) state.counters[k] = 1;
  });
}
initFields();

const PAGE_RENDER_MAP = {
  'dashboard':  () => renderDashboard(),
  'obras':      () => renderObras(state),
  'orcamento':  () => renderOrc(state),
  'cronograma': () => renderCron(state),
  'diario':     () => renderDiario(state),
  'financeiro': () => renderFinanceiro(state),
  'tabelas':    () => renderTabelas(state),
  'medicao':    () => renderMedicoes(state),
  'empreita':   () => renderEmpreita(state),
  'propostas':  () => renderPropostas(state),
  'relatorio':  () => renderReport(state),
  'checklist':  () => renderChecklist(state),
  'captura':    () => renderCaptura(state),
  'importar':   () => {},
};

let _fbSaveTimer = null;
let _lastHash = '';
function calcHash(s) {
  const str = JSON.stringify({obras:s.obras,orc:s.orc,cron:s.cron,fin:s.fin,
    medicoes:s.medicoes,empreita:s.empreita,propostas:s.propostas,
    checklists:s.checklists,capturas:s.capturas});
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; }
  return h.toString(36);
}

export function renderAtiva() {
  const ativa = document.querySelector('.page.active');
  const id = ativa?.id?.replace('page-','') || 'dashboard';
  try { renderDashboard(); } catch(e) {}
  try { const fn = PAGE_RENDER_MAP[id]; if (fn) fn(); } catch(e) { console.error('Render error', id, e); }
  popularSelectsObras(state);
  const hash = calcHash(state);
  if (hash !== _lastHash) {
    _lastHash = hash;
    saveState(state);
    showSaveIndicator();
    if (window._fbUser) {
      clearTimeout(_fbSaveTimer);
      _fbSaveTimer = setTimeout(() => fbSaveData(state), 3000);
    }
  }
}

function renderDashboard() {
  const hoje = new Date();
  safeText('dash-date', hoje.toLocaleDateString('pt-BR',{weekday:'long',year:'numeric',month:'long',day:'numeric'}));
  const totOrc  = state.orc.reduce((a,x)=>a+x.qtd*x.vunit, 0);
  const totReal = state.orc.reduce((a,x)=>a+x.real, 0);
  const rec = state.fin.filter(x=>x.tipo==='Receita').reduce((a,x)=>a+x.valor, 0);
  const des = state.fin.filter(x=>x.tipo==='Despesa').reduce((a,x)=>a+x.valor, 0);
  safeText('kpi-total', state.obras.length);
  safeText('kpi-orc',   fmt(totOrc));
  safeText('kpi-real',  fmt(totReal));
  safeText('kpi-real-pct', totOrc > 0 ? Math.round(totReal/totOrc*100)+'% do orçado' : '');
  safeText('kpi-saldo', fmt(rec-des));
  const sEl = document.getElementById('kpi-saldo');
  if (sEl) sEl.style.color = (rec-des) >= 0 ? 'var(--green)' : 'var(--red)';
  // Cards ativos
  const active = state.obras.filter(o => o.status === 'Em andamento');
  safeInner('dash-obras', active.map(o => {
    const etapas = state.cron.filter(c=>c.obraId===o.id);
    const avg = etapas.length ? Math.round(etapas.reduce((a,x)=>a+x.conc,0)/etapas.length) : 0;
    return `<div class="obra-card" onclick="window.nav('obras',null)" style="cursor:pointer">
      <div class="obra-card-title">${o.nome}</div>
      <div class="obra-card-meta"><span>👤 ${o.cliente}</span><span>📐 ${o.area} m²</span></div>
      <div style="margin-top:10px">
        <div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:4px"><span style="color:var(--muted)">Avanço</span><strong>${avg}%</strong></div>
        <div class="prog-obra"><div class="prog-obra-fill" style="width:${avg}%"></div></div>
      </div>
    </div>`;
  }).join('') || '<div style="color:var(--muted);padding:20px;text-align:center">Nenhuma obra em andamento.</div>');
}

function exportJSON() {
  const data = JSON.stringify(state, null, 2);
  const a = document.createElement('a');
  a.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(data);
  a.download = 'ejh_backup_' + new Date().toISOString().split('T')[0] + '.json';
  a.click();
}

function openSettings() {
  document.getElementById('set-eng-nome').value  = state.engNome || '';
  document.getElementById('set-eng-reg').value   = state.engRegistro || '';
  document.getElementById('set-emp-nome').value  = state.empNome || '';
  document.getElementById('set-rel-rodape').value = state.relatorioRodape || '';
  openModal('modal-settings');
}
function saveSettings() {
  state.engNome        = document.getElementById('set-eng-nome')?.value || '';
  state.engRegistro    = document.getElementById('set-eng-reg')?.value  || '';
  state.empNome        = document.getElementById('set-emp-nome')?.value || '';
  state.relatorioRodape = document.getElementById('set-rel-rodape')?.value || '';
  closeModal('modal-settings');
  renderAtiva();
  showToast('✅ Configurações salvas!');
}
function handleLogoUpload(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => { state.logoData = e.target.result; showToast('✅ Logo carregada!'); };
  reader.readAsDataURL(file);
}

function abrirLogin() { openModal('modal-login'); }

let sigPads = {};
function initSigPad(canvasId, wrapId, phId, key) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let drawing = false;
  const getPos = (e, rect) => {
    const t = e.touches?.[0] || e;
    return { x: (t.clientX - rect.left) * (canvas.width/rect.width),
             y: (t.clientY - rect.top)  * (canvas.height/rect.height) };
  };
  canvas.addEventListener('mousedown',  e => { drawing=true; ctx.beginPath(); const p=getPos(e,canvas.getBoundingClientRect()); ctx.moveTo(p.x,p.y); document.getElementById(phId).style.display='none'; });
  canvas.addEventListener('mousemove',  e => { if(!drawing)return; const p=getPos(e,canvas.getBoundingClientRect()); ctx.lineTo(p.x,p.y); ctx.stroke(); });
  canvas.addEventListener('mouseup',    () => drawing=false);
  canvas.addEventListener('touchstart', e => { e.preventDefault(); drawing=true; ctx.beginPath(); const p=getPos(e,canvas.getBoundingClientRect()); ctx.moveTo(p.x,p.y); document.getElementById(phId).style.display='none'; }, {passive:false});
  canvas.addEventListener('touchmove',  e => { e.preventDefault(); if(!drawing)return; const p=getPos(e,canvas.getBoundingClientRect()); ctx.lineTo(p.x,p.y); ctx.stroke(); }, {passive:false});
  canvas.addEventListener('touchend',   () => drawing=false);
  sigPads[key] = canvas;
}
function clearSig(key) {
  const c = sigPads[key]; if (!c) return;
  c.getContext('2d').clearRect(0,0,c.width,c.height);
  if(document.getElementById('sig-'+key+'-ph')) document.getElementById('sig-'+key+'-ph').style.display='flex';
}
function saveSig() {
  const c = sigPads['eng']; if (!c) return;
  state.engSig = c.toDataURL();
  closeModal('modal-assinatura');
  showToast('✅ Assinatura salva!');
}
function openSigModal() {
  openModal('modal-assinatura');
  setTimeout(() => initSigPad('sig-eng-canvas','sig-eng-wrap','sig-eng-ph','eng'), 100);
}

function saveCliSigMedicao(state) {
  const medId = document.getElementById('sig-cli-med-id')?.value;
  const canvas = sigPads['cli'];
  if (!medId || !canvas) return;
  const m = state.medicoes.find(x => x.id === medId);
  if (m) {
    m.assinatura = { dataUrl: canvas.toDataURL(), nome: document.getElementById('sig-cli-nome')?.value || 'Cliente', data: new Date().toLocaleDateString('pt-BR') };
    closeModal('modal-assinatura-cliente');
    renderAtiva();
    showToast('✅ Assinatura colhida!');
  }
}

// ── EXPOSIÇÃO GLOBAL ──────────────────────────────────────────────────
const G = window;
G.obraName = (id) => obraName(state, id);
G.nav = (id,el) => { nav(id,el); renderAtiva(); };
G.openModal = openModal;
G.closeModal = closeModal;
G.renderAtiva = renderAtiva;
G.exportJSON = exportJSON;
G.openSettings = openSettings;
G.saveSettings = saveSettings;
G.handleLogoUpload = handleLogoUpload;
G.toggleFab = toggleFab;
G.closeFab = closeFab;
G.openLightbox = openLightbox;
G.closeLightbox = closeLightbox;
G.setBnActive = setBnActive;
G.abrirLogin = abrirLogin;
G.fbLoginGoogle = fbLoginGoogle;
G.fbLogout = fbLogout;
G.openSigModal = openSigModal;
G.saveSig = saveSig;
G.clearSig = clearSig;
G.saveIaConfig = () => {
  const key = document.getElementById('set-ia-key')?.value;
  if(!key) { showToast('⚠️ Cole sua chave'); return; }
  saveIaKey(key); closeModal('modal-ia-config'); showToast('✅ Chave salva!');
};
G.initSigPad = initSigPad;
G.addObra = () => { if(addObra(state)) renderAtiva(); };
G.delObra = id => { if(delObra(state,id)) renderAtiva(); };
G.registrarMedicaoRapida = id => { if(registrarMedicaoRapida(state,id)) renderAtiva(); };
G.addOrc = () => { if(addOrc(state)) renderAtiva(); };
G.delOrc = id => { if(delOrc(state,id)) renderAtiva(); };
G.openEditOrc = id => openEditOrc(state, id);
G.abrirNovoOrc = () => {
  const el = document.getElementById('f-orc-id');
  if(el) el.value = '';
  // Limpar outros campos se necessário, ou apenas abrir
  openModal('modal-orc');
};
G.abrirOrcamentoObra = id => abrirOrcamentoObra(state,id);
G.voltarOrcLista = () => voltarOrcLista();
G.addCron = () => { if(addCron(state)) renderAtiva(); };
G.delCron = id => { if(delCron(state,id)) renderAtiva(); };
G.saveCronEdit = () => { if(saveCronEdit(state)) renderAtiva(); };
G.openCronEdit = id => openCronEdit(state,id);
G.setCronView = v => setCronView(v);
G.renderGantt = () => renderGantt(state);
G.openModalDiario = () => openModalDiario(state);
G.addDiario = () => { if(addDiario(state)) renderAtiva(); };
G.delDiario = id => { if(delDiario(state,id)) renderAtiva(); };
G.handleFotos = inp => handleFotos(state, inp);
G.removePendingFoto = i => removePendingFoto(state, i);
G.openModalFin = tipo => openModalFin(state, tipo);
G.addFin = () => { if(addFin(state)) renderAtiva(); };
G.delFin = id => { if(delFin(state,id)) renderAtiva(); };
G.addMedicao = () => { if(addMedicao(state)) renderAtiva(); };
G.updateMedVal = (inp, orcId) => updateMedVal(state, inp, orcId);
G.loadMedItems = () => loadMedItems(state);
G.printMedicao = id => printMedicao(state, id);
G.colherAssinatura = id => colherAssinatura(state, id);
G.addEmpreita = () => { if(addEmpreita(state)) renderAtiva(); };
G.delEmpreita = id => { if(delEmpreita(state,id)) renderAtiva(); };
G.openEmpPag = id => openEmpPag(state,id);
G.addEmpPag = () => { if(addEmpPag(state)) renderAtiva(); };
G.openPropProjeto = () => openPropProjeto(state);
G.openPropObra = () => openPropObra(state);
G.calcPropProjeto = () => calcPropProjeto(state);
G.calcPropostaObra = () => calcPropostaObra(state);
G.saveProposta = tipo => { if(saveProposta(state,tipo)) renderAtiva(); };
G.delProposta = id => { if(delProposta(state,id)) renderAtiva(); };
G.printProposta = id => printProposta(state,id);
G.compartilharWhatsApp = id => compartilharWhatsApp(state,id);
G.colherAssinaturaProposta = id => colherAssinaturaProposta(state,id);
G.editProposta = id => editProposta(state, id);
window._origSaveCliSig = () => saveCliSigMedicao(state);
G.saveCliSig = () => saveCliSig(state);
G.importFromOrcamento = () => importFromOrcamento(state);
G.addObraItem = () => addObraItem(state);
G.addProjServico = a => addProjServico(state,a);
G.addProjExtra = () => addProjExtra(state);
G.toggleModoGlobal = () => toggleModoGlobal(state);
G.filterSinapi = q => filterSinapi(state,q);
G.setSinapiCat = c => setSinapiCat(state,c);
G.setTabelaSrc = s => setTabelaSrc(state,s);
G.importSinapi = () => importSinapi(state);
G.renderTabelas = () => renderTabelas(state);
G.gerarRelatorioWpp = () => gerarRelatorioWpp(state);
G.gerarRelatorioEmail = () => gerarRelatorioEmail(state);
G.renderReport = () => renderReport(state);
G.addChecklist = () => { if(addChecklist(state)) renderAtiva(); };
G.renderTemplatesNBR = () => renderTemplatesNBR();
G.novoChecklist = () => novoChecklist(state);
G.capProcessarIA = () => capProcessarIA(state);
G.capConfirmarTodos = () => { capConfirmarTodos(state); renderAtiva(); };
G.capLimpar = () => capLimpar(state);
G.capDescartarResultado = () => capDescartarResultado(state);
G.capToggleCard = (i,ck) => capToggleCard(state,i,ck);
G.capProcessarArquivo = (inp) => capProcessarArquivo(state,inp);
G.gerarOrcamentoComIA = () => gerarOrcamentoComIA(state);
G.gerarDiarioComFoto = () => gerarDiarioComFoto(state);
G.iaTrocarChave = () => {
  const atual = getIaKey();
  const nova = prompt(
    'Chave Anthropic (sk-ant-...). Deixe em branco pra remover.\n' +
    'Pegue em https://console.anthropic.com/ → API Keys.',
    atual ? atual.slice(0, 12) + '…' : ''
  );
  if (nova === null) return;
  if (nova.startsWith('sk-ant-')) { setIaKey(nova); showToast('✅ Chave salva'); }
  else if (nova === '') { setIaKey(''); showToast('🗑 Chave removida'); }
  else showToast('⚠️ Chave inválida (deve começar com sk-ant-)');
};
// Stubs — funções não implementadas ou que faltam
G.showJsonPaste = () => {
  const el = document.getElementById('json-paste-wrap');
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
};
G.parseJsonConfig = () => {
  showToast('⚠️ Função em desenvolvimento');
};
G.salvarConfigurarFb = () => {
  showToast('⚠️ Função em desenvolvimento');
};
G.addImportRow = () => {
  showToast('⚠️ Função em desenvolvimento');
};
G.cancelImport = () => {
  closeModal('modal-import');
  showToast('❌ Importação cancelada');
};
G.confirmImport = () => {
  showToast('⚠️ Função em desenvolvimento');
};
G.importManual = () => {
  showToast('⚠️ Função em desenvolvimento');
};
G.importExcel = (inp) => {
  showToast('⚠️ Import Excel em desenvolvimento');
  inp.value = '';
};
G.importPDF = (inp) => {
  showToast('⚠️ Import PDF em desenvolvimento');
  inp.value = '';
};
G.importCSV = (inp) => {
  showToast('⚠️ Import CSV em desenvolvimento');
  inp.value = '';
};
G.applyMapping = () => {
  showToast('⚠️ Mapping em desenvolvimento');
};

window.addEventListener('load', () => {
  initFields();
  renderAtiva();
  fbInit(user => {
    window._fbUser = user;
    const uBar = document.getElementById('user-bar');
    const lBar = document.getElementById('login-bar');
    if (user) {
      if (uBar) uBar.style.display = 'flex';
      if (lBar) lBar.style.display = 'none';
      const nome = user.displayName || user.email || 'U';
      const ini  = nome.split(' ').filter(Boolean).slice(0,2).map(n=>n[0].toUpperCase()).join('');
      safeText('user-initials', ini);
      safeText('user-name', nome.split(' ')[0]);
      fbLoadData(state).then(merged => {
        Object.assign(state, merged); window._state = state;
        renderAtiva(); showToast('☁️ Sincronizado!', 2000);
      });
    } else {
      if (uBar) uBar.style.display = 'none';
      if (lBar) lBar.style.display = 'flex';
    }
  });
});
