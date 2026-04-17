// app.js — Orchestrador principal do EJH Gestão de Obras v4.2
// ══════════════════════════════════════════════════════════════════════

import { fmt, fmtD, pad, safeInner, safeText, showToast, nav, setBnActive,
         openModal, closeModal, statusBadge, tipoLabel,
         popularSelectsObras, modalidadeIcon, verificarAvisosObra,
         toggleFab, closeFab, openLightbox, closeLightbox, showSaveIndicator } from './utils.js';
import { saveState, loadState, fbInit, fbLoginGoogle, fbLogout,
         fbSaveData, fbLoadData, saveIaKey, iaCall, gerarOrcamentoIA, gerarEscopoIA, gerarRelatorioIA } from './services.js';
import { addObra, delObra, renderObras, registrarMedicaoRapida } from './modules/obras.js';
import { addOrc, delOrc, renderOrc, abrirOrcamentoObra, voltarOrcLista, renderOrcDetalhe } from './modules/orcamento.js';
import { addCron, delCron, saveCronEdit, openCronEdit, setCronView, renderCron, renderGantt } from './modules/cronograma.js';
import { addDiario, delDiario, handleFotos, removePendingFoto, openModalDiario, renderDiario } from './modules/diario.js';
import { addFin, delFin, openModalFin, renderFinanceiro, renderDashFinAvancado } from './modules/financeiro.js';
import { addMedicao, updateMedVal, loadMedItems, printMedicao, colherAssinatura, renderMedicoes } from './modules/medicoes.js';
import { addEmpreita, delEmpreita, openEmpPag, addEmpPag, renderEmpreita } from './modules/empreita.js';
import { openPropProjeto, openPropObra, calcPropProjeto, calcPropostaObra,
         saveProposta, delProposta, printProposta, compartilharWhatsApp,
         colherAssinaturaProposta, importFromOrcamento, saveCliSig, addObraItem,
         addProjServico, addProjExtra, toggleModoGlobal, renderPropostas } from './modules/propostas.js';
import { renderTabelas, filterSinapi, setSinapiCat, setTabelaSrc, importSinapi } from './modules/sinapi.js';
import { renderReport, gerarRelatorioWpp, gerarRelatorioEmail } from './modules/relatorio.js';
import { addChecklist, renderChecklist, renderTemplatesNBR, novoChecklist } from './modules/checklist.js';
import { renderCaptura, capProcessarIA, capConfirmarTodos, capLimpar, capDescartarResultado } from './modules/captura.js';

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

// Garante arrays e contadores
function initFields() {
  ['obras','orc','cron','diario','fin','medicoes','empreita','propostas','checklists','capturas']
    .forEach(k => { if (!Array.isArray(state[k])) state[k] = []; });
  if (!state.counters) state.counters = { ...DEFAULT_STATE.counters };
  Object.keys(DEFAULT_STATE.counters).forEach(k => {
    if (!state.counters[k]) state.counters[k] = 1;
  });
}
initFields();

// ── PAGE_RENDER_MAP ───────────────────────────────────────────────────
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
  // Persist
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

// ── DASHBOARD ─────────────────────────────────────────────────────────
let pendingFotos = [];

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

  // Alerts
  const venc = state.obras.filter(o=>o.status==='Em andamento'&&verificarAvisosObra(o)?.tipo==='vencida');
  const prox = state.obras.filter(o=>o.status==='Em andamento'&&verificarAvisosObra(o)?.tipo==='proxima');
  const aEl = document.getElementById('dash-alerts');
  if (aEl) {
    let h = '';
    if (venc.length) h += `<div style="background:#fee2e2;border-radius:10px;padding:11px 15px;margin-bottom:8px;border-left:4px solid #dc2626;display:flex;align-items:center;gap:10px"><span>⚠️</span><div><div style="font-weight:700;color:#991b1b;font-size:12.5px">Medição em atraso</div><div style="font-size:11.5px;color:#7f1d1d">${venc.map(o=>o.nome+' — '+verificarAvisosObra(o).dias+'d').join(' | ')}</div></div></div>`;
    if (prox.length) h += `<div style="background:#fef3c7;border-radius:10px;padding:11px 15px;margin-bottom:8px;border-left:4px solid #d97706;display:flex;align-items:center;gap:10px"><span>🔔</span><div><div style="font-weight:700;color:#92400e;font-size:12.5px">Medição próxima</div><div style="font-size:11.5px;color:#78350f">${prox.map(o=>o.nome+' — em '+verificarAvisosObra(o).dias+'d').join(' | ')}</div></div></div>`;
    aEl.innerHTML = h;
    aEl.style.display = h ? 'block' : 'none';
  }

  // Cards ativos
  const active = state.obras.filter(o => o.status === 'Em andamento');
  safeInner('dash-obras', active.map(o => {
    const etapas = state.cron.filter(c=>c.obraId===o.id);
    const avg = etapas.length ? Math.round(etapas.reduce((a,x)=>a+x.conc,0)/etapas.length) : 0;
    const fim  = o.fim ? new Date(o.fim) : null;
    const dias = fim ? Math.ceil((fim - hoje)/86400000) : null;
    const sem  = avg>=80?'verde':(dias!==null&&dias<0)?'vermelho':(dias!==null&&dias<30&&avg<60)?'vermelho':'amarelo';
    const col  = avg>=75?'var(--green)':avg>=40?'var(--amber)':'var(--blue)';
    const av   = verificarAvisosObra(o);
    return `<div class="obra-card slide-in" onclick="window.nav('obras',null)" style="cursor:pointer">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div class="obra-card-title">${o.nome}</div>
        <span class="semaforo ${sem}"></span>
      </div>
      <div class="obra-card-meta">
        <span>👤 ${o.cliente}</span>
        <span>📐 ${o.area} m²</span>
        ${modalidadeIcon(o.modalidade||'privada')}
        ${dias!==null?`<span style="color:${dias<0?'var(--red)':dias<30?'var(--amber)':'var(--muted)'}">${dias>0?'⏱ '+dias+'d':'⚠️ '+Math.abs(dias)+'d atraso'}</span>`:''}
        ${av?`<span style="background:${av.tipo==='vencida'?'#fee2e2':'#fef3c7'};color:${av.tipo==='vencida'?'#991b1b':'#92400e'};padding:2px 7px;border-radius:10px;font-size:10px;font-weight:700">${av.tipo==='vencida'?'⚠️ Med '+av.dias+'d':'🔔 Med em '+av.dias+'d'}</span>`:''}
      </div>
      <div style="margin-top:10px">
        <div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:4px">
          <span style="color:var(--muted)">Avanço físico</span>
          <span style="font-weight:700;color:${col}">${avg}%</span>
        </div>
        <div class="prog-obra"><div class="prog-obra-fill" style="width:${avg}%;background:${col}"></div></div>
      </div>
    </div>`;
  }).join('') || `<div class="quick-card" onclick="openModal('modal-obra')">
    <span class="quick-card-icon">🏗</span>
    <div><div class="quick-card-title">Cadastrar primeira obra</div>
    <div class="quick-card-sub">Toque para começar</div></div>
  </div>`);

  // Últimas movimentações
  const ultFin = [...state.fin].sort((a,b)=>(b.data||'').localeCompare(a.data||'')).slice(0,5);
  safeInner('dash-fin', ultFin.length ? `
    <div class="table-wrap"><table>
      <thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Valor</th></tr></thead>
      <tbody>${ultFin.map(x => {
        const obra = state.obras.find(o=>o.id===x.obraId);
        return `<tr>
          <td>${fmtD(x.data)}</td>
          <td><span style="background:${x.tipo==='Receita'?'#f0fdf4':'#fef2f2'};color:${x.tipo==='Receita'?'var(--green)':'var(--red)'};padding:2px 8px;border-radius:8px;font-size:11px;font-weight:700">${x.tipo}</span></td>
          <td>${x.desc||'—'} ${obra?'<span style="font-size:11px;color:var(--muted)">— '+obra.nome+'</span>':''}</td>
          <td style="font-weight:700;color:${x.tipo==='Receita'?'var(--green)':'var(--red)'}">${fmt(x.valor)}</td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>` : '<div style="color:var(--muted);padding:16px;font-size:13px">Nenhum lançamento ainda.</div>');
}

// ── exportJSON ───────────────────────────────────────────────────────
function exportJSON() {
  const data = JSON.stringify(state, null, 2);
  const a = document.createElement('a');
  a.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(data);
  a.download = 'ejh_backup_' + new Date().toISOString().split('T')[0] + '.json';
  a.click();
}

// ── saveSettings / openSettings ───────────────────────────────────────
function openSettings() {
  document.getElementById('set-eng-nome').value  = state.engNome || '';
  document.getElementById('set-eng-reg').value   = state.engRegistro || '';
  document.getElementById('set-emp-nome').value  = state.empNome || '';
  document.getElementById('set-rel-rodape').value = state.relatorioRodape || '';
  const preview = document.getElementById('set-logo-preview');
  if (preview && state.logoData)
    preview.innerHTML = `<img src="${state.logoData}" style="max-height:60px;border-radius:6px">`;
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
  reader.onload = e => {
    state.logoData = e.target.result;
    const p = document.getElementById('set-logo-preview');
    if (p) p.innerHTML = `<img src="${e.target.result}" style="max-height:60px;border-radius:6px">`;
  };
  reader.readAsDataURL(file);
}

// ── abrirLogin ────────────────────────────────────────────────────────
function abrirLogin() { openModal('modal-login'); }

// ── initSigPad / saveSig / clearSig ──────────────────────────────────
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
  canvas.addEventListener('mousedown',  e => { drawing=true; ctx.beginPath(); const r=canvas.getBoundingClientRect(); const p=getPos(e,r); ctx.moveTo(p.x,p.y); document.getElementById(phId).style.display='none'; });
  canvas.addEventListener('mousemove',  e => { if(!drawing)return; const r=canvas.getBoundingClientRect(); const p=getPos(e,r); ctx.lineWidth=2.5; ctx.strokeStyle='#0f2744'; ctx.lineCap='round'; ctx.lineTo(p.x,p.y); ctx.stroke(); });
  canvas.addEventListener('mouseup',    () => drawing=false);
  canvas.addEventListener('mouseleave', () => drawing=false);
  canvas.addEventListener('touchstart', e => { e.preventDefault(); drawing=true; ctx.beginPath(); const r=canvas.getBoundingClientRect(); const p=getPos(e,r); ctx.moveTo(p.x,p.y); document.getElementById(phId).style.display='none'; }, {passive:false});
  canvas.addEventListener('touchmove',  e => { e.preventDefault(); if(!drawing)return; const r=canvas.getBoundingClientRect(); const p=getPos(e,r); ctx.lineWidth=2.5; ctx.strokeStyle='#0f2744'; ctx.lineCap='round'; ctx.lineTo(p.x,p.y); ctx.stroke(); }, {passive:false});
  canvas.addEventListener('touchend',   () => drawing=false);
  sigPads[key] = canvas;
}
function clearSig(key) {
  const c = sigPads[key];
  if (!c) return;
  c.getContext('2d').clearRect(0,0,c.width,c.height);
  const ph = document.getElementById('sig-'+key+'-ph');
  if (ph) ph.style.display='flex';
}
function saveSig() {
  const c = sigPads['eng'];
  if (!c) return;
  const data = c.getContext('2d').getImageData(0,0,c.width,c.height).data;
  if (!data.some(v=>v!==0)) { showToast('⚠️ Assine antes de confirmar.'); return; }
  state.engSig  = c.toDataURL();
  state.engNome = document.getElementById('sig-eng-nome')?.value || state.engNome;
  closeModal('modal-assinatura');
  renderAtiva();
  showToast('✅ Assinatura salva!');
}
function openSigModal() {
  openModal('modal-assinatura');
  setTimeout(() => initSigPad('sig-eng-canvas','sig-eng-wrap','sig-eng-ph','eng'), 100);
}

// ── DOMContentLoaded ─────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  initFields();
  renderAtiva();

  // Expor tudo ao HTML (onclick inline)
  const G = window;
  G.nav = (id,el) => { nav(id,el); renderAtiva(); };
  G.setBnActive = setBnActive;
  G.openModal = openModal;
  G.closeModal = closeModal;
  G.toggleFab = toggleFab;
  G.closeFab = closeFab;
  G.openLightbox = openLightbox;
  G.closeLightbox = closeLightbox;
  G.renderAtiva = renderAtiva;
  G.exportJSON = exportJSON;
  G.openSettings = openSettings;
  G.saveSettings = saveSettings;
  G.handleLogoUpload = handleLogoUpload;
  G.abrirLogin = abrirLogin;
  G.fbLoginGoogle = fbLoginGoogle;
  G.fbLogout = fbLogout;
  G.openSigModal = openSigModal;
  G.saveSig = saveSig;
  G.clearSig = clearSig;
  G.saveIaConfig = () => {
    const key = document.getElementById('set-ia-key')?.value;
    if(!key) { showToast('⚠️ Cole sua chave primeiro'); return; }
    saveIaKey(key);
    closeModal('modal-ia-config');
    showToast('✅ Chave IA salva com sucesso!');
  };

  // Obras
  G.addObra  = () => { if(addObra(state)) renderAtiva(); };
  G.delObra  = id => { if(delObra(state,id)) renderAtiva(); };
  G.registrarMedicaoRapida = id => { if(registrarMedicaoRapida(state,id)) renderAtiva(); };
  // Orçamento
  G.addOrc  = () => { if(addOrc(state)) renderAtiva(); };
  G.delOrc  = id => { if(delOrc(state,id)) renderAtiva(); };
  G.abrirOrcamentoObra = id => abrirOrcamentoObra(state,id);
  G.voltarOrcLista = () => voltarOrcLista();
  // Cronograma
  G.addCron  = () => { if(addCron(state)) renderAtiva(); };
  G.delCron  = id => { if(delCron(state,id)) renderAtiva(); };
  G.saveCronEdit = () => { if(saveCronEdit(state)) renderAtiva(); };
  G.openCronEdit = (id) => openCronEdit(state,id);
  G.setCronView  = v => setCronView(v);
  G.renderGantt  = () => renderGantt(state);
  // Diário
  G.openModalDiario = () => openModalDiario(state);
  G.addDiario  = () => { if(addDiario(state)) renderAtiva(); };
  G.delDiario  = id => { if(delDiario(state,id)) renderAtiva(); };
  G.handleFotos = inp => handleFotos(inp);
  G.removePendingFoto = i => removePendingFoto(i);
  // Financeiro
  G.openModalFin = tipo => openModalFin(tipo);
  G.addFin = () => { if(addFin(state)) renderAtiva(); };
  G.delFin = id => { if(delFin(state,id)) renderAtiva(); };
  // Medições
  G.addMedicao = () => { if(addMedicao(state)) renderAtiva(); };
  G.updateMedVal = (a,b,c) => updateMedVal(state,a,b,c);
  G.loadMedItems = () => loadMedItems(state);
  G.printMedicao = id => printMedicao(state,id);
  G.colherAssinatura = id => colherAssinatura(id);
  // Empreita
  G.addEmpreita = () => { if(addEmpreita(state)) renderAtiva(); };
  G.delEmpreita = id => { if(delEmpreita(state,id)) renderAtiva(); };
  G.openEmpPag = id => openEmpPag(state,id);
  G.addEmpPag  = () => { if(addEmpPag(state)) renderAtiva(); };
  // Propostas
  G.openPropProjeto = () => openPropProjeto(state);
  G.openPropObra    = () => openPropObra(state);
  G.calcPropProjeto = () => calcPropProjeto(state);
  G.calcPropostaObra = () => calcPropostaObra(state);
  G.saveProposta = tipo => { if(saveProposta(state,tipo)) renderAtiva(); };
  G.delProposta  = id  => { if(delProposta(state,id)) renderAtiva(); };
  G.printProposta = id => printProposta(state,id);
  G.compartilharWhatsApp = id => compartilharWhatsApp(state,id);
  G.colherAssinaturaProposta = id => colherAssinaturaProposta(state,id);
  G.saveCliSig = () => saveCliSig(state);
  G.importFromOrcamento = () => importFromOrcamento(state);
  G.addObraItem  = () => addObraItem(state);
  G.addProjServico = a => addProjServico(state,a);
  G.addProjExtra = () => addProjExtra(state);
  G.toggleModoGlobal = () => toggleModoGlobal(state);
  // SINAPI
  G.filterSinapi = q => filterSinapi(state,q);
  G.setSinapiCat = c => setSinapiCat(state,c);
  G.setTabelaSrc = s => setTabelaSrc(state,s);
  G.importSinapi = () => importSinapi(state);
  G.renderTabelas = () => renderTabelas(state);
  // Relatório
  G.gerarRelatorioWpp   = () => gerarRelatorioWpp(state);
  G.gerarRelatorioEmail = () => gerarRelatorioEmail(state);
  G.renderReport = () => renderReport(state);
  // Checklist
  G.addChecklist = () => { if(addChecklist(state)) renderAtiva(); };
  G.renderTemplatesNBR = () => renderTemplatesNBR();
  G.novoChecklist = () => novoChecklist(state);
  // Captura
  G.capProcessarIA = () => capProcessarIA(state);
  G.capConfirmarTodos = () => { capConfirmarTodos(state); renderAtiva(); };
  G.capLimpar = () => capLimpar();
  G.capDescartarResultado = () => capDescartarResultado();

  // Firebase
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
        Object.assign(state, merged);
        window._state = state;
        renderAtiva();
        showToast('☁️ Dados sincronizados!', 3000);
      });
    } else {
      if (uBar) uBar.style.display = 'none';
      if (lBar) lBar.style.display = 'flex';
    }
  });
});
