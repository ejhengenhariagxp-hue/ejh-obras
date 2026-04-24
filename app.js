// app.js — Orchestrador principal do EJH Gestão de Obras v4.2
// ══════════════════════════════════════════════════════════════════════

import { fmt, fmtD, pad, safeInner, safeText, showToast, nav, setBnActive,
         openModal, closeModal, statusBadge, tipoLabel,
         popularSelectsObras, modalidadeIcon, verificarAvisosObra,
         toggleFab, closeFab, openLightbox, closeLightbox, showSaveIndicator } from './utils.js';
import { saveState, loadState, fbInit, fbLoginGoogle, fbLogout,
         fbSaveData, fbLoadData, saveIaKey, iaCall, gerarOrcamentoIA, gerarEscopoIA, gerarRelatorioIA,
         getIaKey, setIaKey, hasIaKey } from './services.js';
import { addObra, delObra, renderObras, registrarMedicaoRapida, openEditObra, salvarObra, resetFormObra } from './modules/obras.js';
import { addOrc, delOrc, renderOrc, abrirOrcamentoObra, voltarOrcLista, renderOrcDetalhe, gerarOrcamentoComIA } from './modules/orcamento.js';
import { addCron, delCron, saveCronEdit, openCronEdit, setCronView, renderCron, renderGantt } from './modules/cronograma.js';
import { addDiario, delDiario, handleFotos, removePendingFoto, openModalDiario, renderDiario, gerarDiarioComFoto, cancelarDiario } from './modules/diario.js';
import { addFin, delFin, openModalFin, renderFinanceiro, toggleHideRT } from './modules/financeiro.js';
import { addMedicao, updateMedVal, loadMedItems, printMedicao, colherAssinatura, renderMedicoes } from './modules/medicoes.js';
import { addEmpreita, delEmpreita, openEmpPag, addEmpPag, renderEmpreita, initSignaturePads, limparAssinatura, obterItensSelecionados, resetFormEmpreita } from './modules/empreita.js';
import { openPropProjeto, openPropObra, calcPropProjeto, calcPropostaObra,
         saveProposta, delProposta, editProposta, printProposta, compartilharWhatsApp,
         colherAssinaturaProposta, importFromOrcamento, addObraItem,
         addProjServico, addProjExtra, toggleModoGlobal, renderPropostas } from './modules/propostas.js';
import { renderTabelas, filterSinapi, setSinapiCat, setTabelaSrc, importSinapi } from './modules/sinapi.js';
import { renderReport, gerarRelatorioWpp, gerarRelatorioEmail } from './modules/relatorio.js';
import { addChecklist, renderChecklist, renderTemplatesNBR, novoChecklist } from './modules/checklist.js';
import { renderCaptura, capProcessarIA, capConfirmarTodos, capLimpar, capDescartarResultado, capToggleCard, capProcessarArquivo, capLimparWhatsApp, capSetView, renderHistoricoCaptura, renderTimelineCaptura } from './modules/captura.js';
import { novaComposicao, addInsumoComp, renderInsumosComp, calcTotalComp,
         salvarComposicao, delComposicao, renderComposicoes, filtrarComposicoes,
         popularSelectComposicoes, preencherDadosComposicao, calcTotalComposicaoSel,
         inserirComposicaoNoOrcamento, editarComposicao,
         abrirCopiaSinapi, _setCopiaSrc, _filtrarCopiaSinapi, _copiarDeSinapi,
         setInsumoField, removeInsumoAt } from './modules/composicoes.js';
import { exportarOrcamentoExcel, exportarOrcamentoExcelObra, exportarMedicoesExcel } from './modules/excel_export.js';
import { importExcel, importCSV, importPDF, importManual, applyMapping,
         _selectSheet, _updateImportItem, _removeImportItem, addImportRow,
         cancelImport, confirmImport } from './modules/importar.js';

// ── Estado global ────────────────────────────────────────────────────
const DEFAULT_STATE = {
  obras:[], orc:[], cron:[], diario:[], fin:[],
  medicoes:[], empreita:[], propostas:[], checklists:[], capturas:[], composicoes:[],
  counters:{ obra:1, orc:1, cron:1, dia:1, fin:1, med:1, emp:1, prop:1, ck:1, comp:1 },
  engNome:'', engRegistro:'', engCrea:'', engSig:'',
  relatorioRodape:'', logoData:'', sinapiMes:'',
  tabelaSource:'sinapi', sinapiCatFilter:'Todos',
};

export let state = loadState(DEFAULT_STATE);
window._state = state;

function initFields() {
  ['obras','orc','cron','diario','fin','medicoes','empreita','propostas','checklists','capturas','composicoes']
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
  'composicoes':() => renderComposicoes(state),
  'importar':   () => {},
};

let _fbSaveTimer = null;
let _lastHash = '';
function calcHash(s) {
  const str = JSON.stringify({obras:s.obras,orc:s.orc,cron:s.cron,fin:s.fin,
    medicoes:s.medicoes,empreita:s.empreita,propostas:s.propostas,
    checklists:s.checklists,capturas:s.capturas,composicoes:s.composicoes});
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
      _fbSaveTimer = setTimeout(() => saveToCloud(), 800);
    }
  }
}

function calcAcoes() {
  const acoes = [];
  const hoje = new Date();
  const hojeStr = hoje.toISOString().split('T')[0];
  const semanaAtras = new Date(hoje.getTime() - 7*86400000).toISOString().split('T')[0];
  const ativas = state.obras.filter(o => o.status === 'Em andamento');

  // 1. Etapas atrasadas (fim < hoje e conc < 100)
  state.cron.forEach(c => {
    if (c.fim && c.fim < hojeStr && (c.conc || 0) < 100) {
      const obra = state.obras.find(o => o.id === c.obraId);
      acoes.push({
        cor: 'red', icon: '⏰',
        title: `Etapa atrasada: ${c.etapa}`,
        sub: `${obra ? obra.nome : c.obraId} • ${c.conc || 0}% concluído • venceu ${fmtD(c.fim)}`,
        onclick: `nav('cronograma',null)`
      });
    }
  });

  // 2. Diário sem registro hoje (por obra ativa)
  ativas.forEach(o => {
    const tem = state.diario.some(d => d.obraId === o.id && d.data === hojeStr);
    if (!tem) {
      acoes.push({
        cor: 'yellow', icon: '📋',
        title: `Atualizar diário de hoje`,
        sub: `${o.nome}`,
        onclick: `openModalDiario()`
      });
    }
  });

  // 3. Despesas pendentes (status === 'Pendente')
  const pendentes = state.fin.filter(f => f.status === 'Pendente');
  if (pendentes.length) {
    const tot = pendentes.reduce((a,x) => a + (x.valor || 0), 0);
    acoes.push({
      cor: 'red', icon: '💰',
      title: `${pendentes.length} lançamento(s) pendente(s)`,
      sub: `Total ${fmt(tot)} aguardando pagamento`,
      onclick: `nav('financeiro',null)`
    });
  }

  // 4. Sem lançamento financeiro na última semana (por obra ativa)
  ativas.forEach(o => {
    const recente = state.fin.some(f => f.obraId === o.id && f.data >= semanaAtras);
    if (!recente) {
      acoes.push({
        cor: 'blue', icon: '💸',
        title: `Sem lançamentos esta semana`,
        sub: `${o.nome} — registre despesas/receitas`,
        onclick: `openModalFin('Despesa')`
      });
    }
  });

  return acoes.slice(0, 6);
}

function statusPortfolio() {
  const ativas = state.obras.filter(o => o.status === 'Em andamento');
  if (!ativas.length) {
    return { cor:'gray', icon:'⚪', titulo:'Nenhuma obra ativa', sub:'Marque uma obra como "Em andamento" para acompanhar a saúde do portfolio' };
  }
  let verdes=0, amarelas=0, vermelhas=0;
  ativas.forEach(o => {
    const etapas = state.cron.filter(c => c.obraId === o.id);
    const st = statusObra(o, etapas);
    if (st.cor === 'red') vermelhas++;
    else if (st.cor === 'yellow') amarelas++;
    else verdes++;
  });
  if (vermelhas > 0) {
    return { cor:'red', icon:'🔴', titulo:`${vermelhas} obra${vermelhas>1?'s':''} crítica${vermelhas>1?'s':''}`, sub:`${verdes} em dia · ${amarelas} em atenção · ${vermelhas} atrasada${vermelhas>1?'s':''}` };
  }
  if (amarelas > 0) {
    return { cor:'yellow', icon:'🟡', titulo:`${amarelas} obra${amarelas>1?'s':''} em atenção`, sub:`${verdes} em dia · ${amarelas} em atenção` };
  }
  return { cor:'green', icon:'🟢', titulo:'Portfolio em dia', sub:`Todas as ${verdes} obra${verdes>1?'s':''} ativa${verdes>1?'s':''} dentro do prazo` };
}

function statusObra(o, etapas) {
  const avg = etapas.length ? Math.round(etapas.reduce((a,x)=>a+x.conc,0)/etapas.length) : 0;
  if (!o.inicio || !o.fim) return { avg, cor:'green', icon:'🟢', label:'Em dia' };
  const ini = new Date(o.inicio).getTime();
  const fim = new Date(o.fim).getTime();
  const hoje = Date.now();
  if (hoje < ini || fim <= ini) return { avg, cor:'green', icon:'🟢', label:'Em dia' };
  const prazoPct = Math.min(100, Math.round((hoje - ini) / (fim - ini) * 100));
  const delta = avg - prazoPct;
  if (hoje > fim && avg < 100) return { avg, cor:'red', icon:'🔴', label:'Atrasada' };
  if (delta < -15) return { avg, cor:'red', icon:'🔴', label:'Atrasada' };
  if (delta < 0)   return { avg, cor:'yellow', icon:'🟡', label:'Atenção' };
  return { avg, cor:'green', icon:'🟢', label:'Em dia' };
}

function renderDashboard() {
  const hoje = new Date();
  safeText('dash-date', hoje.toLocaleDateString('pt-BR',{weekday:'long',year:'numeric',month:'long',day:'numeric'}));
  // Status geral do portfolio
  const sp = statusPortfolio();
  safeInner('dash-portfolio', `<div class="portfolio-banner portfolio-${sp.cor}">
    <div class="portfolio-icon">${sp.icon}</div>
    <div class="portfolio-body">
      <div class="portfolio-titulo">${sp.titulo}</div>
      <div class="portfolio-sub">${sp.sub}</div>
    </div>
  </div>`);
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

  // Empty state: zero obras cadastradas
  if (state.obras.length === 0) {
    safeInner('dash-obras', `
      <div class="empty-hero">
        <div class="empty-hero-icon">🚧</div>
        <div class="empty-hero-title">Nenhuma obra cadastrada</div>
        <div class="empty-hero-sub">Crie sua primeira obra e comece a controlar custos, prazo e execução.</div>
        <button class="btn btn-primary" onclick="resetFormObra();openModal('modal-obra')">＋ Criar Primeira Obra</button>
      </div>`);
    safeInner('dash-fin', '<div style="color:var(--muted);padding:14px;text-align:center;font-size:13px">Sem movimentações ainda.</div>');
    safeInner('dash-acoes', '<div style="color:var(--muted);padding:14px;text-align:center;font-size:13px">Cadastre uma obra para ver suas pendências aqui.</div>');
    safeInner('dash-coms', '<div style="color:var(--muted);padding:14px;text-align:center;font-size:13px">Sem comunicações ainda.</div>');
    return;
  }

  // Próximas Ações
  const acoes = calcAcoes();
  safeInner('dash-acoes', acoes.length ? acoes.map(a => `
    <div class="acao-item acao-${a.cor}" onclick="${a.onclick}">
      <span class="acao-icon">${a.icon}</span>
      <div class="acao-body">
        <div class="acao-title">${a.title}</div>
        <div class="acao-sub">${a.sub}</div>
      </div>
    </div>`).join('') : '<div style="color:var(--green);padding:14px;text-align:center;font-size:13px">✅ Tudo em dia! Sem pendências.</div>');

  // Últimas Comunicações (de capturas)
  const coms = [...(state.capturas || [])].sort((a,b) => b.ts - a.ts).slice(0, 4);
  safeInner('dash-coms', coms.length ? coms.map(c => {
    const obra = state.obras.find(o => o.id === c.obraId);
    const dt = new Date(c.ts).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
    const hora = new Date(c.ts).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
    return `<div class="com-item" onclick="nav('captura',null)">
      <div class="com-title">${(c.resumo || 'Comunicação').substring(0,80)}</div>
      <div class="com-meta">
        <span>🏗 ${obra ? obra.nome : c.obraId || '—'}</span>
        <span>📅 ${dt} ${hora}</span>
        <span style="color:var(--green)">✅ ${c.salvos || 0} registro(s)</span>
      </div>
    </div>`;
  }).join('') : '<div style="color:var(--muted);padding:14px;text-align:center;font-size:13px">Sem comunicações registradas. <br><a href="#" onclick="event.preventDefault();nav(\'captura\',null)" style="color:var(--blue);font-weight:600">Registrar a primeira →</a></div>');

  // Cards ativos com semáforo de status
  const active = state.obras.filter(o => o.status === 'Em andamento');
  safeInner('dash-obras', active.map(o => {
    const etapas = state.cron.filter(c=>c.obraId===o.id);
    const st = statusObra(o, etapas);
    const rtBadge = o.tipo === 'acompanhamento'
      ? '<span class="badge badge-teal" style="margin-right:6px;font-size:10px">🔍 RT</span>'
      : '';
    return `<div class="obra-card status-${st.cor}" onclick="window.nav('obras',null)" style="cursor:pointer">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
        <div class="obra-card-title">${rtBadge}${o.nome}</div>
        <span class="status-pill status-pill-${st.cor}" title="${st.label}">${st.icon} ${st.label}</span>
      </div>
      <div class="obra-card-meta"><span>👤 ${o.cliente}</span><span>📐 ${o.area} m²</span></div>
      <div style="margin-top:10px">
        <div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:4px"><span style="color:var(--muted)">Avanço</span><strong>${st.avg}%</strong></div>
        <div class="prog-obra"><div class="prog-obra-fill" style="width:${st.avg}%"></div></div>
      </div>
    </div>`;
  }).join('') || '<div style="color:var(--muted);padding:20px;text-align:center">Nenhuma obra em andamento.</div>');

  // Últimas 5 movimentações financeiras
  const ultFin = [...state.fin].sort((a,b)=>(b.data||'').localeCompare(a.data||'')).slice(0,5);
  safeInner('dash-fin', ultFin.length ? ultFin.map(f => {
    const obra = state.obras.find(o=>o.id===f.obraId);
    const cor = f.tipo === 'Receita' ? 'var(--green)' : 'var(--red)';
    const sinal = f.tipo === 'Receita' ? '+' : '−';
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-bottom:1px solid var(--border);font-size:13px">
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;color:var(--navy);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${f.desc || '—'}</div>
        <div style="font-size:11.5px;color:var(--muted)">${fmtD(f.data)} • ${obra ? obra.nome : '—'} • ${f.cat || ''}</div>
      </div>
      <div style="font-weight:700;color:${cor};margin-left:12px;white-space:nowrap">${sinal} ${fmt(f.valor)}</div>
    </div>`;
  }).join('') : '<div style="color:var(--muted);padding:14px;text-align:center;font-size:13px">Sem movimentações ainda.</div>');
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

function saveCliSig(state) {
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
G.initSigPad = initSigPad;
G.addObra = () => { if(addObra(state)) renderAtiva(); };
G.delObra = id => { if(delObra(state,id)) renderAtiva(); };
G.openEditObra = id => openEditObra(state, id);
G.salvarObra = () => { if(salvarObra(state)) renderAtiva(); };
G.resetFormObra = () => resetFormObra();
G.registrarMedicaoRapida = id => { if(registrarMedicaoRapida(state,id)) renderAtiva(); };
G.addOrc = () => { if(addOrc(state)) renderAtiva(); };
G.delOrc = id => { if(delOrc(state,id)) renderAtiva(); };
G.gerarOrcamentoComIA = () => gerarOrcamentoComIA(state);
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
G.cancelarDiario = () => cancelarDiario();
G.addDiario = () => { if(addDiario(state)) renderAtiva(); };
G.delDiario = id => { if(delDiario(state,id)) renderAtiva(); };
G.handleFotos = inp => handleFotos(state, inp);
G.removePendingFoto = i => removePendingFoto(state, i);
G.gerarDiarioComFoto = () => gerarDiarioComFoto(state);
G.openModalFin = tipo => openModalFin(state, tipo);
G.addFin = () => { if(addFin(state)) renderAtiva(); };
G.delFin = id => { if(delFin(state,id)) renderAtiva(); };
G.toggleHideRT = cb => { toggleHideRT(state, cb); renderAtiva(); };
G.addMedicao = () => { if(addMedicao(state)) renderAtiva(); };
G.updateMedVal = (inp, orcId) => updateMedVal(state, inp, orcId);
G.loadMedItems = () => loadMedItems(state);
G.printMedicao = id => printMedicao(state, id);
G.colherAssinatura = id => colherAssinatura(state, id);
G.addEmpreita = () => { if(addEmpreita(state)) renderAtiva(); };
G.delEmpreita = id => { if(delEmpreita(state,id)) renderAtiva(); };
G.abrirModalEmpreita = () => { resetFormEmpreita(); openModal('modal-empreita'); setTimeout(initSignaturePads, 100); };
G.openEmpPag = id => openEmpPag(state,id);
G.addEmpPag = () => { if(addEmpPag(state)) renderAtiva(); };
G.limparAssinatura = id => limparAssinatura(id);
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
G.capLimpar = () => capLimpar();
G.capDescartarResultado = () => capDescartarResultado();
G.capToggleCard = (i,ck) => capToggleCard(state,i,ck);
G.capProcessarArquivo = (inp) => capProcessarArquivo(state,inp);
G.capLimparWhatsApp = () => capLimparWhatsApp();
G.capSetView = v => capSetView(v);
G.renderHistoricoCaptura = () => renderHistoricoCaptura(state);
G.renderTimelineCaptura = () => renderTimelineCaptura(state);
// Composições próprias
G.novaComposicao = () => novaComposicao();
G.addInsumoComp = () => addInsumoComp();
G.renderInsumosComp = () => renderInsumosComp();
G.calcTotalComp = () => calcTotalComp();
G.setInsumoField = (i, f, v) => setInsumoField(i, f, v);
G.removeInsumoAt = i => removeInsumoAt(i);
G.salvarComposicao = () => { if(salvarComposicao(state)) renderAtiva(); };
G.delComposicao = id => { if(delComposicao(state,id)) renderAtiva(); };
G.editarComposicao = id => editarComposicao(state, id);
G.filtrarComposicoes = q => filtrarComposicoes(state, q);
G.preencherDadosComposicao = () => preencherDadosComposicao(state);
G.calcTotalComposicaoSel = () => calcTotalComposicaoSel();
G.inserirComposicaoNoOrcamento = () => { if(inserirComposicaoNoOrcamento(state)) renderAtiva(); };
G.abrirInserirComposicao = id => {
  const sel = document.getElementById('f-csel-comp');
  popularSelectComposicoes(state);
  if (sel && id) sel.value = id;
  preencherDadosComposicao(state);
  openModal('modal-comp-selecionar');
};
G.abrirInserirComposicaoObra = () => {
  if (!window._currentOrcObraId) { showToast('⚠️ Abra o orçamento de uma obra primeiro'); return; }
  popularSelectComposicoes(state);
  openModal('modal-comp-selecionar');
};
// Exportar Excel
G.exportarOrcamentoExcel = () => exportarOrcamentoExcel(state);
G.exportarOrcamentoExcelObra = () => exportarOrcamentoExcelObra(state);
G.exportarMedicoesExcel = () => exportarMedicoesExcel(state);
// Copiar SINAPI -> Composição
G.abrirCopiaSinapi = () => abrirCopiaSinapi();
G._setCopiaSrc = src => _setCopiaSrc(src);
G._filtrarCopiaSinapi = q => _filtrarCopiaSinapi(q);
G._copiarDeSinapi = (cod, src) => _copiarDeSinapi(cod, src);
// Importar Orçamento
G.importExcel = inp => importExcel(inp);
G.importCSV = inp => importCSV(inp);
G.importPDF = inp => importPDF(inp);
G.importManual = () => importManual();
G.applyMapping = () => applyMapping();
G._selectSheet = name => _selectSheet(name);
G._updateImportItem = (i, f, v) => _updateImportItem(i, f, v);
G._removeImportItem = i => _removeImportItem(i);
G.addImportRow = () => addImportRow();
G.cancelImport = () => cancelImport();
G.confirmImport = () => { if (confirmImport(state)) renderAtiva(); };

let _lastVisSync = 0;

// Aplica tombstones (itens apagados em qualquer dispositivo) no objeto merged
function applyTombstones(merged, localTombs) {
  const remoteTombs = merged.deletedIds || {};
  const tombs = {};
  new Set([...Object.keys(localTombs), ...Object.keys(remoteTombs)]).forEach(k => {
    tombs[k] = [...new Set([...(localTombs[k]||[]), ...(remoteTombs[k]||[])])];
  });
  merged.deletedIds = tombs;
  const arrayMap = {
    obras:'obras', orc:'orc', cron:'cron', diario:'diario', fin:'fin',
    medicoes:'medicoes', empreita:'empreitas', propostas:'propostas',
    checklists:'checklists', capturas:'capturas', composicoes:'composicoes'
  };
  Object.entries(arrayMap).forEach(([tombKey, stateKey]) => {
    const dels = new Set(tombs[tombKey] || []);
    if (dels.size && Array.isArray(merged[stateKey])) {
      merged[stateKey] = merged[stateKey].filter(x => !dels.has(x.id));
    }
  });
  return merged;
}

function setSyncStatus(emoji, title) {
  const el = document.getElementById('sync-status');
  if (el) { el.textContent = emoji; el.title = title || ''; }
}

function syncFromCloud(silent) {
  if (!window._fbUser) return Promise.resolve();
  if (!navigator.onLine) { setSyncStatus('⚠️', 'Offline — clique quando voltar à internet'); return Promise.resolve(); }
  setSyncStatus('🔄', 'Sincronizando…');
  const localTombs = JSON.parse(JSON.stringify(state.deletedIds || {}));
  return fbLoadData(state).then(merged => {
    applyTombstones(merged, localTombs);
    const before = _lastHash;
    Object.assign(state, merged); window._state = state;
    _lastHash = calcHash(state);
    renderAtiva();
    if (window._fbUser) { clearTimeout(_fbSaveTimer); saveToCloud(); }
    setSyncStatus('☁✓', 'Sincronizado ' + new Date().toLocaleTimeString('pt-BR'));
    if (!silent && _lastHash !== before) showToast('☁️ Atualizado!', 2000);
  }).catch(e => {
    console.error('syncFromCloud falhou:', e);
    setSyncStatus('❌', 'Erro no sync: ' + (e.message || ''));
  });
}

// Save ao cloud com captura explícita de erro — fbSaveData do services.js engole exceções
async function saveToCloud() {
  if (!window._fbUser) return;
  if (!navigator.onLine) { setSyncStatus('⚠️', 'Offline — save adiado'); return; }
  setSyncStatus('🔄', 'Salvando…');
  try {
    if (typeof firebase === 'undefined') throw new Error('Firebase não carregado');
    const db = firebase.firestore();
    const s = { ...state, diario: (state.diario||[]).map(d=>({...d, fotos:[]})),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
    await db.collection('usuarios').doc(window._fbUser.uid).set(s);
    setSyncStatus('☁✓', 'Salvo ' + new Date().toLocaleTimeString('pt-BR'));
  } catch (e) {
    console.error('saveToCloud falhou:', e);
    const msg = e?.message || e?.code || 'erro desconhecido';
    setSyncStatus('❌', 'Erro ao salvar: ' + msg);
    showToast('❌ Salvar na nuvem falhou: ' + msg, 8000);
  }
}

// Flush imediato do save pendente (chamado ao sair/minimizar)
function flushSave() {
  if (!window._fbUser) return;
  if (_fbSaveTimer) {
    clearTimeout(_fbSaveTimer);
    _fbSaveTimer = null;
    saveToCloud();
  }
}

// Sync manual ao clicar no ícone do header
window.syncNow = () => {
  if (!window._fbUser) { showToast('⚠️ Faça login primeiro', 3000); return; }
  showToast('🔄 Sincronizando…', 1500);
  syncFromCloud(false);
};

// Monitorar conexão
window.addEventListener('online',  () => { setSyncStatus('☁✓', 'Voltou online'); syncFromCloud(true); });
window.addEventListener('offline', () => setSyncStatus('⚠️', 'Offline — sem internet'));

// Captura erros globais — fundamental para diagnosticar falhas silenciosas no celular
window.addEventListener('error', (ev) => {
  const msg = (ev.error?.message || ev.message || 'Erro desconhecido').substring(0, 160);
  try { showToast('❌ ' + msg, 8000); } catch {}
  console.error('GLOBAL error:', ev.error || ev);
});
window.addEventListener('unhandledrejection', (ev) => {
  const msg = (ev.reason?.message || String(ev.reason) || 'Promise rejeitada').substring(0, 160);
  try { showToast('❌ ' + msg, 8000); } catch {}
  console.error('Unhandled rejection:', ev.reason);
});

// Polling leve a cada 60s quando a aba está visível (redundância caso visibilitychange não dispare)
setInterval(() => {
  if (document.visibilityState === 'visible' && window._fbUser && navigator.onLine) {
    syncFromCloud(true);
  }
}, 60000);

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
      const localTombs = JSON.parse(JSON.stringify(state.deletedIds || {}));
      fbLoadData(state).then(merged => {
        applyTombstones(merged, localTombs);
        Object.assign(state, merged); window._state = state;
        _lastHash = calcHash(state);
        renderAtiva();
        if (window._fbUser) saveToCloud();
        showToast('☁️ Sincronizado!', 2000);
      });
    } else {
      if (uBar) uBar.style.display = 'none';
      if (lBar) lBar.style.display = 'flex';
    }
  });
});

// Sync ao voltar o foco; flush ao sair (celular ↔ PC ↔ tablet)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { flushSave(); return; }
  const now = Date.now();
  if (now - _lastVisSync < 5000) return; // debounce 5s
  _lastVisSync = now;
  syncFromCloud(false);
});
window.addEventListener('pagehide', flushSave);
window.addEventListener('beforeunload', flushSave);
