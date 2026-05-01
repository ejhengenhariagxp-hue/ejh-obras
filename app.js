// app.js — Orchestrador principal do EJH Gestão de Obras v4.2
// ══════════════════════════════════════════════════════════════════════

import { fmt, fmtD, pad, safeInner, safeText, showToast, nav, setBnActive,
         openModal, closeModal, statusBadge, tipoLabel,
         popularSelectsObras, modalidadeIcon, verificarAvisosObra,
         toggleFab, closeFab, openLightbox, closeLightbox, showSaveIndicator } from './utils.js?v=20260501d';
import { saveState, loadState, fbInit, fbLoginGoogle, fbLogout,
         fbSaveData, fbLoadData, saveIaKey, iaCall, gerarOrcamentoIA, gerarEscopoIA, gerarRelatorioIA,
         getIaKey, setIaKey, hasIaKey } from './services.js?v=20260501d';
import { addObra, delObra, renderObras, registrarMedicaoRapida, openEditObra, salvarObra, resetFormObra } from './modules/obras.js?v=20260501d';
import { addOrc, delOrc, renderOrc, abrirOrcamentoObra, voltarOrcLista, renderOrcDetalhe, gerarOrcamentoComIA } from './modules/orcamento.js?v=20260501d';
import { addCron, delCron, saveCronEdit, openCronEdit, setCronView, renderCron, renderGantt } from './modules/cronograma.js?v=20260501d';
import { addDiario, delDiario, handleFotos, removePendingFoto, openModalDiario, openEditDiario, renderDiario, gerarDiarioComFoto, cancelarDiario, abrirDiarioObra, voltarDiarioObras } from './modules/diario.js?v=20260501d';
import { addFin, delFin, openEditFin, openModalFin, renderFinanceiro, toggleHideRT, marcarFinPago,
         addCustoFixo, delCustoFixo, toggleCustoFixoAtivo, openEditCustoFixo, abrirModalCustoFixo,
         preencherCustoFixoPadrao, gerarLancamentosCustosFixos,
         abrirDespesasPadraoObra, salvarDespesasPadraoObra,
         addConta, delConta, openEditConta, abrirModalConta,
         gerarParcelas, toggleParcFin, aplicarFiltrosFin, limparFiltrosFin,
         atualizarStatusVencimentos,
         importarFaturamentoHistoricoEJH, toggleFinSection } from './modules/financeiro.js?v=20260501d';
import { addMedicao, updateMedVal, loadMedItems, printMedicao, colherAssinatura, renderMedicoes, openModalMedicao, openEditMedicao, delMedicao } from './modules/medicoes.js?v=20260501d';
import { addEmpreita, delEmpreita, openEmpPag, addEmpPag, renderEmpreita, initSignaturePads, limparAssinatura, obterItensSelecionados, resetFormEmpreita } from './modules/empreita.js?v=20260501d';
import { openPropProjeto, openPropObra, calcPropProjeto, calcPropostaObra,
         saveProposta, delProposta, editProposta, printProposta, compartilharWhatsApp,
         colherAssinaturaProposta, importFromOrcamento, addObraItem,
         addProjServico, addProjExtra, toggleModoGlobal, renderPropostas,
         atualizarStatusProposta, gerarObraDeProposta } from './modules/propostas.js?v=20260501d';
import { renderTabelas, filterSinapi, setSinapiCat, setTabelaSrc, importSinapi } from './modules/sinapi.js?v=20260501d';
import { renderReport, gerarRelatorioWpp, gerarRelatorioEmail } from './modules/relatorio.js?v=20260501d';
import { addChecklist, renderChecklist, renderTemplatesNBR, novoChecklist } from './modules/checklist.js?v=20260501d';
import { renderCaptura, capProcessarIA, capConfirmarTodos, capLimpar, capDescartarResultado, capToggleCard, capProcessarArquivo, capLimparWhatsApp, capSetView, renderHistoricoCaptura, renderTimelineCaptura } from './modules/captura.js?v=20260501d';
import { novaComposicao, addInsumoComp, renderInsumosComp, calcTotalComp,
         salvarComposicao, delComposicao, renderComposicoes, filtrarComposicoes,
         popularSelectComposicoes, preencherDadosComposicao, calcTotalComposicaoSel,
         inserirComposicaoNoOrcamento, editarComposicao,
         abrirCopiaSinapi, _setCopiaSrc, _filtrarCopiaSinapi, _copiarDeSinapi,
         setInsumoField, removeInsumoAt } from './modules/composicoes.js?v=20260501d';
import { exportarOrcamentoExcel, exportarOrcamentoExcelObra, exportarMedicoesExcel } from './modules/excel_export.js?v=20260501d';
import { importExcel, importCSV, importPDF, importManual, applyMapping,
         _selectSheet, _updateImportItem, _removeImportItem, addImportRow,
         cancelImport, confirmImport } from './modules/importar.js?v=20260501d';

// ── Estado global ────────────────────────────────────────────────────
const DEFAULT_STATE = {
  obras:[], orc:[], cron:[], diario:[], fin:[],
  medicoes:[], empreita:[], propostas:[], checklists:[], capturas:[], composicoes:[],
  custosFixos:[], contas:[],
  counters:{ obra:1, orc:1, cron:1, dia:1, fin:1, med:1, emp:1, prop:1, ck:1, comp:1, cf:1, cb:1 },
  engNome:'', engRegistro:'', engCrea:'', engSig:'',
  relatorioRodape:'', logoData:'', sinapiMes:'',
  tabelaSource:'sinapi', sinapiCatFilter:'Todos',
};

export let state = loadState(DEFAULT_STATE);
window._state = state;

function initFields() {
  ['obras','orc','cron','diario','fin','medicoes','empreita','propostas','checklists','capturas','composicoes','custosFixos','contas']
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
  // diario inclui hash leve (id, data, desc, ocorr, qtd de fotos) — sem dataUrl
  // pra não pesar megabytes na string. Mas DEVE estar no hash, senão alterações
  // no diário não disparam save.
  const diaLite = (s.diario || []).map(d => ({
    id: d.id, obraId: d.obraId, data: d.data,
    desc: d.desc, equipe: d.equipe, clima: d.clima, ocorr: d.ocorr,
    nFotos: (d.fotos || []).length,
    fotosHash: (d.fotos || []).map(f => (f.name || '') + '|' + ((f.dataUrl || f.url || '').length)).join(',')
  }));
  const str = JSON.stringify({obras:s.obras,orc:s.orc,cron:s.cron,fin:s.fin,
    diario: diaLite,
    medicoes:s.medicoes,empreita:s.empreita,propostas:s.propostas,
    checklists:s.checklists,capturas:s.capturas,composicoes:s.composicoes,custosFixos:s.custosFixos,contas:s.contas,
    engNome:s.engNome, engRegistro:s.engRegistro, empNome:s.empNome,
    relatorioRodape:s.relatorioRodape, logoLen:(s.logoData||'').length});
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; }
  return h.toString(36);
}

export function renderAtiva() {
  const ativa = document.querySelector('.page.active');
  const id = ativa?.id?.replace('page-','') || 'dashboard';
  try { atualizarStatusVencimentos(state); } catch(e) {}
  try { renderDashboard(); } catch(e) {}
  try { const fn = PAGE_RENDER_MAP[id]; if (fn) fn(); } catch(e) { console.error('Render error', id, e); }
  popularSelectsObras(state);
  const hash = calcHash(state);
  if (hash !== _lastHash) {
    _lastHash = hash;
    saveStateLocal();
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

function renderAlertaUrgente() {
  const el = document.getElementById('dash-alertas-urgentes');
  if (!el) return;
  const hojeStr = new Date().toISOString().split('T')[0];
  const seteDiasAtras = new Date(Date.now() - 7*86400000).toISOString().split('T')[0];

  // Conta problemas
  const etapasAtrasadas = state.cron.filter(c => c.fim && c.fim < hojeStr && (c.conc || 0) < 100).length;
  const ativas = state.obras.filter(o => o.status === 'Em andamento');
  const obrasSemDiario = ativas.filter(o => {
    const ult = state.diario.filter(d => d.obraId === o.id).sort((a,b)=>b.data.localeCompare(a.data))[0];
    return !ult || ult.data < seteDiasAtras;
  }).length;
  const saldo = state.fin.filter(f => f.tipo === 'Receita').reduce((a,x)=>a+(+x.valor||0),0)
              - state.fin.filter(f => f.tipo === 'Despesa').reduce((a,x)=>a+(+x.valor||0),0);

  let alerta = null;

  if (etapasAtrasadas > 0) {
    alerta = {
      cor: 'red', icon: '⏰',
      title: `${etapasAtrasadas} etapa${etapasAtrasadas>1?'s':''} atrasada${etapasAtrasadas>1?'s':''}`,
      sub: `Verifique o cronograma e atualize o avanço físico.`,
      onclick: `nav('cronograma',null)`
    };
  } else if (saldo < 0) {
    alerta = {
      cor: 'red', icon: '💸',
      title: `Saldo negativo: ${fmt(saldo)}`,
      sub: `Despesas superando receitas. Revise o financeiro.`,
      onclick: `nav('financeiro',null)`
    };
  } else if (obrasSemDiario > 0 && ativas.length > 0) {
    alerta = {
      cor: 'yellow', icon: '📋',
      title: `${obrasSemDiario} obra${obrasSemDiario>1?'s':''} sem diário há 7+ dias`,
      sub: `Chama a 👷 IAsô para registrar rapidamente por foto ou WhatsApp.`,
      onclick: `nav('captura',null)`
    };
  }

  if (!alerta) { el.innerHTML = ''; return; }
  el.innerHTML = `<div class="alert-urgente alert-${alerta.cor}" onclick="${alerta.onclick}">
    <div class="alert-urgente-icon">${alerta.icon}</div>
    <div class="alert-urgente-body">
      <div class="alert-urgente-title">${alerta.title}</div>
      <div class="alert-urgente-sub">${alerta.sub}</div>
    </div>
    <div class="alert-urgente-arrow">→</div>
  </div>`;
}

function renderDashboard() {
  const hoje = new Date();
  safeText('dash-date', hoje.toLocaleDateString('pt-BR',{weekday:'long',year:'numeric',month:'long',day:'numeric'}));

  // Card de alertas urgentes — só aparece se houver problema crítico
  renderAlertaUrgente();

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
  atualizarPreviewLogo();
  openModal('modal-settings');
}
function saveSettings() {
  state.engNome        = document.getElementById('set-eng-nome')?.value || '';
  state.engRegistro    = document.getElementById('set-eng-reg')?.value  || '';
  state.empNome        = document.getElementById('set-emp-nome')?.value || '';
  state.relatorioRodape = document.getElementById('set-rel-rodape')?.value || '';
  closeModal('modal-settings');
  saveStateLocal();
  if (window._fbUser) { clearTimeout(_fbSaveTimer); _fbSaveTimer = setTimeout(()=>saveToCloud(),400); }
  renderAtiva();
  showToast('✅ Configurações salvas!');
}
function handleLogoUpload(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    // Comprime para max 200px de altura, qualidade 0.85 (~30-50KB)
    // Logo grande estoura limite do Firestore e fica lenta ao gerar PDF
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxH = 200;
      let w = img.width, h = img.height;
      if (h > maxH) { w = (w * maxH) / h; h = maxH; }
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      // PNG preserva transparência da logo
      state.logoData = canvas.toDataURL('image/png');
      atualizarPreviewLogo();
      saveStateLocal();
      if (window._fbUser) { clearTimeout(_fbSaveTimer); _fbSaveTimer = setTimeout(()=>saveToCloud(),400); }
      showToast('✅ Logo carregada e salva!');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}
function atualizarPreviewLogo() {
  const el = document.getElementById('set-logo-preview');
  if (!el) return;
  if (state.logoData) {
    el.innerHTML = `<img src="${state.logoData}" style="max-height:60px;max-width:160px;object-fit:contain" alt="Logo">`;
  } else {
    el.innerHTML = '<span style="font-size:12px;color:var(--muted)">Clique para subir sua logomarca</span>';
  }
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

// ── ASSINATURA DO DIÁRIO ────────────────────────────────────────────
let _diaSigPending = null; // dataUrl temporário enquanto modal está aberto
function abrirAssinaturaDiario() {
  // Se já tem uma assinatura existente (edição), pré-carrega no canvas
  openModal('modal-assinatura-diario');
  setTimeout(() => {
    initSigPad('sig-dia-canvas','sig-dia-wrap','sig-dia-ph','dia');
    if (_diaSigPending) {
      const c = document.getElementById('sig-dia-canvas');
      const ctx = c?.getContext('2d');
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, c.width, c.height);
        const ph = document.getElementById('sig-dia-ph');
        if (ph) ph.style.display = 'none';
      };
      img.src = _diaSigPending;
    }
  }, 100);
}
function salvarAssinaturaDiario() {
  const canvas = sigPads['dia'];
  if (!canvas) return;
  _diaSigPending = canvas.toDataURL('image/png');
  atualizarPreviewAssinaturaDiario();
  closeModal('modal-assinatura-diario');
  showToast('✅ Assinatura coletada — salve o registro');
}
function atualizarPreviewAssinaturaDiario() {
  const el = document.getElementById('dia-sig-preview');
  if (!el) return;
  if (_diaSigPending) {
    el.innerHTML = `<img src="${_diaSigPending}" style="max-height:60px;max-width:100%" alt="Assinatura">`;
    el.style.background = '#f0fdf4';
    el.style.borderColor = '#86efac';
    el.style.color = 'var(--green)';
  } else {
    el.innerHTML = 'Sem assinatura coletada';
    el.style.background = '#fafbff';
    el.style.borderColor = 'var(--border)';
    el.style.color = 'var(--muted)';
  }
}
// Expostas para módulo diario.js usar (set/get)
window._diarioGetSig = () => _diaSigPending;
window._diarioSetSig = (sig) => { _diaSigPending = sig || null; atualizarPreviewAssinaturaDiario(); };

// ── EQUIPE DO DIÁRIO ────────────────────────────────────────────────
const PROFISSOES_PADRAO = [
  { cargo: 'Pedreiro',         icon: '🧱' },
  { cargo: 'Carpinteiro',      icon: '🪚' },
  { cargo: 'Pintor',           icon: '🎨' },
  { cargo: 'Soldador',         icon: '🔥' },
  { cargo: 'Eletricista',      icon: '⚡' },
  { cargo: 'Encanador',        icon: '🚿' },
  { cargo: 'Ajudante',         icon: '🛠️' },
  { cargo: 'Montador',         icon: '🔧' },
  { cargo: 'Operador máquina', icon: '🚜' },
];
let _equipeAtual = []; // [{cargo, qtd, custom?:true}]

function renderEquipeGrid() {
  const grid = document.getElementById('f-dia-equipe-grid');
  if (!grid) return;
  // Mescla padrão + customs já adicionados
  const customs = _equipeAtual.filter(e => e.custom);
  const itens = [...PROFISSOES_PADRAO.map(p => {
    const ja = _equipeAtual.find(e => e.cargo === p.cargo && !e.custom);
    return { ...p, qtd: ja?.qtd || 0, checked: !!ja };
  }), ...customs.map(c => ({ cargo: c.cargo, icon: '⭐', qtd: c.qtd, checked: true, custom: true }))];

  grid.innerHTML = itens.map((p, i) => `
    <label class="equipe-item ${p.checked ? 'checked' : ''} ${p.custom ? 'equipe-custom' : ''}">
      <input type="checkbox" ${p.checked ? 'checked' : ''} onchange="toggleEquipeItem('${escapeJs(p.cargo)}', this.checked, ${p.custom || false})">
      <span class="equipe-icon">${p.icon}</span>
      <span class="equipe-label">${p.cargo}</span>
      <input type="number" min="0" max="999" value="${p.qtd}" ${!p.checked?'disabled':''}
        onchange="updateEquipeQtd('${escapeJs(p.cargo)}', +this.value, ${p.custom || false})"
        onclick="event.stopPropagation()">
      ${p.custom ? `<button type="button" class="equipe-rm" onclick="event.preventDefault();removeEquipeCustom('${escapeJs(p.cargo)}')" title="Remover">✕</button>` : ''}
    </label>
  `).join('');
  atualizarCampoEquipe();
}

function escapeJs(s) { return String(s).replace(/'/g, "\\'"); }

function toggleEquipeItem(cargo, checked, isCustom) {
  if (checked) {
    if (!_equipeAtual.find(e => e.cargo === cargo)) {
      _equipeAtual.push({ cargo, qtd: 1, custom: isCustom });
    }
  } else {
    _equipeAtual = _equipeAtual.filter(e => e.cargo !== cargo);
  }
  renderEquipeGrid();
}
function updateEquipeQtd(cargo, qtd, isCustom) {
  const item = _equipeAtual.find(e => e.cargo === cargo);
  if (item) item.qtd = qtd;
  atualizarCampoEquipe();
}
function adicionarEquipeOutro() {
  const desc = document.getElementById('f-dia-equipe-outro')?.value?.trim();
  const qtd = +document.getElementById('f-dia-equipe-outro-qtd')?.value || 1;
  if (!desc) { showToast('⚠️ Descreva o profissional/máquina'); return; }
  if (_equipeAtual.find(e => e.cargo === desc)) { showToast('⚠️ Já adicionado'); return; }
  _equipeAtual.push({ cargo: desc, qtd, custom: true });
  document.getElementById('f-dia-equipe-outro').value = '';
  document.getElementById('f-dia-equipe-outro-qtd').value = '';
  renderEquipeGrid();
}
function removeEquipeCustom(cargo) {
  _equipeAtual = _equipeAtual.filter(e => e.cargo !== cargo);
  renderEquipeGrid();
}
function atualizarCampoEquipe() {
  // Gera string legível para retrocompat: "3 Pedreiros, 2 Ajudantes, 1 Eletricista"
  const txt = _equipeAtual
    .filter(e => e.qtd > 0)
    .map(e => `${e.qtd} ${e.cargo}${e.qtd > 1 && !e.custom ? 's' : ''}`)
    .join(', ');
  const el = document.getElementById('f-dia-equipe');
  if (el) el.value = txt;
}

// Expor para módulo diario.js
window._diarioGetEquipe = () => [..._equipeAtual];
window._diarioSetEquipe = (list) => {
  _equipeAtual = Array.isArray(list) ? list.map(e => ({...e})) : [];
  // Renderiza após próximo tick (modal pode não estar montado)
  setTimeout(renderEquipeGrid, 50);
};

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

// ── ONBOARDING ────────────────────────────────────────────────────────
const ONB_KEY = 'ejh_onboarding_done';

function deveExibirOnboarding() {
  if (localStorage.getItem(ONB_KEY) === 'true') return false;
  // Só mostra se for usuário realmente novo (sem nada cadastrado)
  return !state.engNome && !state.empNome
    && (!state.obras || state.obras.length === 0)
    && (!state.diario || state.diario.length === 0);
}

function atualizarStatusOnboarding() {
  const s1 = document.getElementById('onb-step-1');
  const s2 = document.getElementById('onb-step-2');
  const s3 = document.getElementById('onb-step-3');
  const s4 = document.getElementById('onb-step-4');
  if (s1) s1.classList.toggle('onb-done', !!(state.engNome || state.empNome));
  if (s2) s2.classList.toggle('onb-done', state.obras.length > 0);
  if (s3) s3.classList.toggle('onb-done', !!window._fbUser);
  if (s4) s4.classList.toggle('onb-done', !!localStorage.getItem('anthropic_api_key'));
}

function abrirOnboarding() {
  atualizarStatusOnboarding();
  openModal('modal-onboarding');
}

function onbAcao(passo) {
  closeModal('modal-onboarding');
  setTimeout(() => {
    if (passo === 1) openSettings();
    else if (passo === 2) { resetFormObra(); openModal('modal-obra'); }
    else if (passo === 3) abrirLogin();
    else if (passo === 4) window.openIaConfig?.();
  }, 250);
}

function onbFechar(marcarConcluido) {
  const noShow = document.getElementById('onb-no-show')?.checked;
  if (marcarConcluido || noShow) localStorage.setItem(ONB_KEY, 'true');
  closeModal('modal-onboarding');
}

// ── EXPOSIÇÃO GLOBAL ──────────────────────────────────────────────────
const G = window;
G.nav = (id,el) => { nav(id,el); renderAtiva(); };
G.abrirOnboarding = abrirOnboarding;
G.onbAcao = onbAcao;
G.onbFechar = onbFechar;
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
G.abrirInfoRapida = () => {
  const ativas = state.obras.filter(o => o.status === 'Em andamento').length;
  const atrasadas = state.cron.filter(c => c.fim && c.fim < new Date().toISOString().split('T')[0] && (c.conc || 0) < 100).length;
  const receitasTotal = state.fin.filter(f => f.tipo === 'Receita').reduce((a,x) => a + (+x.val || 0), 0);
  const despesasTotal = state.fin.filter(f => f.tipo === 'Despesa').reduce((a,x) => a + (+x.val || 0), 0);
  const saldo = receitasTotal - despesasTotal;

  document.getElementById('info-obras-ativas').textContent = ativas;
  document.getElementById('info-etapas-atrasadas').textContent = atrasadas ? '⚠️ ' + atrasadas : '✓ 0';
  document.getElementById('info-saldo').textContent = fmt(saldo);

  let det = '';
  if (state.diario.length) {
    const ultimoDia = [...state.diario].sort((a,b)=>b.data.localeCompare(a.data))[0];
    det += `📋 Último registro: ${fmtD(ultimoDia.data)}\n`;
  }
  if (state.medicoes.length) det += `📏 Medições registradas: ${state.medicoes.length}\n`;
  if (state.orc.length) det += `💰 Itens no orçamento: ${state.orc.length}\n`;
  document.getElementById('info-detalhes').textContent = det || 'Nenhum registro ainda.';
  openModal('modal-info-rapida');
};
G.abrirLogin = abrirLogin;
G.fbLoginGoogle = fbLoginGoogle;
G.fbLogout = fbLogout;
G.openSigModal = openSigModal;
G.saveSig = saveSig;
G.clearSig = clearSig;
G.abrirAssinaturaDiario = abrirAssinaturaDiario;
G.salvarAssinaturaDiario = salvarAssinaturaDiario;
G.toggleEquipeItem = toggleEquipeItem;
G.updateEquipeQtd = updateEquipeQtd;
G.adicionarEquipeOutro = adicionarEquipeOutro;
G.removeEquipeCustom = removeEquipeCustom;

// ── CATEGORIAS FINANCEIRAS ──────────────────────────────────────────
// Tipos de serviço reais do escritório
const CAT_RECEITA = [
  '📐 Projetos (sem acompanhamento)',
  '📐👷 Projetos c/ Acompanhamento da Execução',
  '📐🏗 Projetos e Gestão da Obra',
  '🏗 Gestão de Obra',
];
const CAT_DESPESA = [
  '📐 Projetos (sem acompanhamento)',
  '📐👷 Projetos c/ Acompanhamento da Execução',
  '📐🏗 Projetos e Gestão da Obra',
  '🏗 Gestão de Obra',
];
function atualizarCategoriasFin() {
  const tipo = document.getElementById('f-fin-tipo')?.value || 'Receita';
  const sel = document.getElementById('f-fin-cat');
  if (!sel) return;
  const lista = tipo === 'Receita' ? CAT_RECEITA : CAT_DESPESA;
  const valorAtual = sel.value;
  sel.innerHTML = lista.map(c => `<option>${c}</option>`).join('')
    + '<option value="__custom__">📝 Personalizada...</option>';
  // Mantém a categoria atual se ainda existir na lista nova
  if (lista.includes(valorAtual)) sel.value = valorAtual;
  toggleCatPersonalizada();
}
function toggleCatPersonalizada() {
  const sel = document.getElementById('f-fin-cat');
  const wrap = document.getElementById('f-fin-cat-custom-wrap');
  const inp = document.getElementById('f-fin-cat-custom');
  if (!sel || !wrap) return;
  if (sel.value === '__custom__') {
    wrap.style.display = '';
    setTimeout(() => inp?.focus(), 50);
  } else {
    wrap.style.display = 'none';
    if (inp) inp.value = '';
  }
}
G.atualizarCategoriasFin = atualizarCategoriasFin;
G.toggleCatPersonalizada = toggleCatPersonalizada;
G.toggleObraTipoCustom = function () {
  const sel = document.getElementById('f-obra-tipo');
  const wrap = document.getElementById('f-obra-tipo-custom-wrap');
  const inp = document.getElementById('f-obra-tipo-custom');
  if (!sel || !wrap) return;
  if (sel.value === '__custom__') {
    wrap.style.display = '';
    setTimeout(() => inp?.focus(), 50);
  } else {
    wrap.style.display = 'none';
    if (inp) inp.value = '';
  }
};
G.saveIaConfig = () => {
  const key = document.getElementById('set-ia-key')?.value?.trim();
  const savedKey = getIaKey();

  if (!key && !savedKey) { showToast('⚠️ Cole sua chave da Anthropic'); return; }

  if (key && !key.startsWith('sk-ant-')) { showToast('⚠️ Chave inválida (deve começar com sk-ant-)'); return; }

  if (key) saveIaKey(key); // Nova chave
  // Se deixou vazio e já tinha uma, mantém a anterior

  document.getElementById('set-ia-key').value = '';
  closeModal('modal-ia-config');
  showToast('✅ IAsô tá pronta! Pode chamar.');
};
G.openIaConfig = () => {
  const savedKey = getIaKey();
  const inp = document.getElementById('set-ia-key');
  const status = document.getElementById('ia-status');
  const preview = document.getElementById('ia-key-preview');

  if (inp) inp.value = '';
  if (status && preview) {
    if (savedKey) {
      status.style.display = 'block';
      preview.textContent = 'sk-ant-' + savedKey.slice(7, 17) + '...' + savedKey.slice(-4);
      if (inp) inp.placeholder = 'Cole nova chave para alterar (ou deixe vazio)';
    } else {
      status.style.display = 'none';
      if (inp) inp.placeholder = 'sk-ant-api03-...';
    }
  }
  openModal('modal-ia-config');
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
G.openEditDiario = id => openEditDiario(state, id);
G.handleFotos = inp => handleFotos(state, inp);
G.removePendingFoto = i => removePendingFoto(state, i);
G.gerarDiarioComFoto = () => gerarDiarioComFoto(state);
G.abrirDiarioObra = id => { abrirDiarioObra(id); renderAtiva(); };
G.voltarDiarioObras = () => { voltarDiarioObras(); renderAtiva(); };
G.openModalFin = tipo => openModalFin(state, tipo);
G.addFin = () => { if(addFin(state)) renderAtiva(); };
G.delFin = id => { if(delFin(state,id)) renderAtiva(); };
G.openEditFin = id => openEditFin(state, id);
G.marcarFinPago = id => { if(marcarFinPago(state, id)) renderAtiva(); };
G.abrirModalCustoFixo = abrirModalCustoFixo;
G.addCustoFixo = () => { if(addCustoFixo(state)) renderAtiva(); };
G.delCustoFixo = id => { if(delCustoFixo(state, id)) renderAtiva(); };
G.toggleCustoFixoAtivo = id => { if(toggleCustoFixoAtivo(state, id)) renderAtiva(); };
G.openEditCustoFixo = id => openEditCustoFixo(state, id);
G.preencherCustoFixoPadrao = (desc, icon) => preencherCustoFixoPadrao(desc, icon);
G.gerarLancamentosCustosFixos = () => { if(gerarLancamentosCustosFixos(state)) renderAtiva(); };
G.abrirDespesasPadraoObra = obraId => abrirDespesasPadraoObra(state, obraId);
G.salvarDespesasPadraoObra = () => { if(salvarDespesasPadraoObra(state)) renderAtiva(); };
G.addConta = () => { if(addConta(state)) renderAtiva(); };
G.delConta = id => { if(delConta(state, id)) renderAtiva(); };
G.openEditConta = id => openEditConta(state, id);
G.abrirModalConta = abrirModalConta;
G.gerarParcelas = () => { if(gerarParcelas(state)) renderAtiva(); };
G.toggleParcFin = toggleParcFin;
G.aplicarFiltrosFin = () => { aplicarFiltrosFin(); renderAtiva(); };
G.limparFiltrosFin = () => { limparFiltrosFin(); renderAtiva(); };
G.toggleHideRT = cb => { toggleHideRT(state, cb); renderAtiva(); };
G.importarFaturamentoHistoricoEJH = () => { if(importarFaturamentoHistoricoEJH(state)) renderAtiva(); };
G.toggleFinSection = id => toggleFinSection(id);
G.togglePrivacyMode = () => {
  const on = !document.body.classList.contains('privacy-mode');
  document.body.classList.toggle('privacy-mode', on);
  try { localStorage.setItem('ejh_privacy', on ? '1' : '0'); } catch(e) {}
  const btn = document.getElementById('btn-privacy-mode');
  if (btn) {
    btn.textContent = on ? '🙈 Mostrar valores' : '👁 Ocultar valores';
    btn.style.background = on ? '#ede9fe' : '';
  }
};
G.openModalMedicao = () => openModalMedicao(state);
G.openEditMedicao = id => openEditMedicao(state, id);
G.delMedicao = id => { if(delMedicao(state,id)) renderAtiva(); };
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
G.atualizarStatusProposta = (id, novoStatus) => { if(atualizarStatusProposta(state, id, novoStatus)) renderAtiva(); };
G.gerarObraDeProposta = id => { if(gerarObraDeProposta(state, id)) renderAtiva(); };
G.filterSinapi = q => filterSinapi(state,q);
G.setSinapiCat = c => setSinapiCat(state,c);
G.setTabelaSrc = s => setTabelaSrc(state,s);
G.importSinapi = () => importSinapi(state);
G.renderTabelas = () => renderTabelas(state);
G.gerarRelatorioWpp = () => gerarRelatorioWpp(state);
G.gerarRelatorioEmail = () => gerarRelatorioEmail(state);
G.renderReport = () => renderReport(state);

// PDF do Diário: abre janela nova só com os registros do diário da obra selecionada
// (sem barra lateral/menu); imprime direto. "Todas as obras" inclui todas.
G.gerarDiarioPDF = () => {
  const obraId = document.getElementById('dia-pdf-obra')?.value || '';
  const obras = obraId ? state.obras.filter(o => o.id === obraId) : state.obras;
  if (!obras.length) { showToast('⚠️ Nenhuma obra selecionada'); return; }
  const hoje = new Date().toLocaleDateString('pt-BR');
  const w = window.open('', '_blank');
  if (!w) { showToast('⚠️ Permita pop-ups para gerar o PDF'); return; }
  const corpo = obras.map(o => {
    const ents = state.diario.filter(d => d.obraId === o.id).sort((a,b) => b.data.localeCompare(a.data));
    return `
      <h2>${o.nome}</h2>
      <div class="meta">👤 ${o.cliente || '—'}${o.area ? ' • 📐 '+o.area+' m²' : ''}</div>
      ${ents.length ? ents.map(e => {
        const ativs = (e.desc || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
        const ativsHtml = ativs.length
          ? `<ul class="ativs">${ativs.map(a => `<li>${a.replace(/</g,'&lt;')}</li>`).join('')}</ul>`
          : '<div class="muted" style="font-style:italic">Sem descrição</div>';
        const eqList = Array.isArray(e.equipeList) ? e.equipeList : [];
        const equipeHtml = eqList.length
          ? `<div class="equipe-pdf">${eqList.map(eq => `<span class="eq-chip">👷 ${eq.qtd} ${(eq.cargo||'').replace(/</g,'&lt;')}</span>`).join('')}</div>`
          : (e.equipe ? `<div class="muted" style="margin-top:4px">👷 ${(e.equipe||'').replace(/</g,'&lt;')}</div>` : '');
        return `
        <div class="entry">
          <div class="entry-h"><strong>${fmtD(e.data)}</strong> <span class="muted">${e.clima || ''}</span></div>
          <div class="entry-section">📋 Atividades realizadas</div>
          ${ativsHtml}
          ${equipeHtml ? `<div class="entry-section">👷 Equipe</div>${equipeHtml}` : ''}
          ${e.ocorr && e.ocorr !== 'Sem ocorrências' && e.ocorr !== 'Nenhuma'
            ? `<div class="ocorr">⚠️ ${(e.ocorr || '').replace(/</g,'&lt;')}</div>` : ''}
          ${e.fotos && e.fotos.length ? `
            <div class="fotos">
              ${e.fotos.map(f => `<img src="${f.url || f.dataUrl || ''}">`).join('')}
            </div>` : ''}
          ${e.assinatura?.dataUrl ? `
            <div class="sig-block">
              <img src="${e.assinatura.dataUrl}" class="sig-img" alt="Assinatura">
              <div class="sig-line"></div>
              <div class="sig-name">${state.engNome || 'Responsável Técnico'}</div>
              <div class="sig-meta">${state.engRegistro || ''} ${e.assinatura.data ? '• Assinado em '+e.assinatura.data : ''}</div>
            </div>` : ''}
        </div>`;
      }).join('') : '<div class="vazio">Sem registros de diário.</div>'}
    `;
  }).join('');
  w.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
    <title>Diário de Obra — ${obraId ? obras[0].nome : 'Todas'} — ${hoje}</title>
    <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
      *{box-sizing:border-box}
      body{font-family:'DM Sans',sans-serif;padding:32px;max-width:820px;margin:0 auto;color:#1e293b;line-height:1.5}
      .hdr{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #0f2744;padding-bottom:14px;margin-bottom:22px}
      .logo{font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#0f2744}
      .sub{font-size:12px;color:#64748b}
      .titulo{font-size:14px;font-weight:600;color:#2563eb;margin-top:4px}
      .meta-doc{text-align:right;font-size:12px;color:#64748b}
      h2{font-family:'Syne',sans-serif;font-size:18px;color:#0f2744;border-bottom:2px solid #e2e8f0;padding-bottom:8px;margin:24px 0 12px}
      .meta{font-size:12px;color:#64748b;margin-bottom:12px}
      .entry{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:14px;margin-bottom:10px;page-break-inside:avoid}
      .entry-h{display:flex;justify-content:space-between;border-bottom:1px solid #f1f5f9;padding-bottom:6px;margin-bottom:8px;font-size:13px}
      .entry-b{font-size:13px;white-space:pre-wrap}
      .entry-section{font-size:10.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.6px;margin-top:8px;margin-bottom:5px}
      .ativs{margin:2px 0 6px;padding-left:0;list-style:none}
      .ativs li{position:relative;padding:5px 8px 5px 22px;font-size:12.5px;color:#1e293b;background:#f0f7ff;border-radius:6px;margin-bottom:3px;line-height:1.35;border-left:3px solid #2563eb}
      .ativs li::before{content:'✓';position:absolute;left:6px;top:5px;color:#2563eb;font-weight:800;font-size:11.5px}
      .equipe-pdf{display:flex;flex-wrap:wrap;gap:5px;margin-top:3px;margin-bottom:6px}
      .eq-chip{display:inline-block;padding:3px 10px;background:#dbeafe;color:#1e40af;border-radius:12px;font-size:11px;font-weight:600;border:1px solid #93c5fd}
      .muted{font-size:11.5px;color:#64748b}
      .ocorr{margin-top:8px;font-size:12px;color:#b91c1c;background:#fef2f2;padding:8px;border-radius:6px}
      .fotos{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px}
      .fotos img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:6px;border:1px solid #e2e8f0}
      .vazio{color:#64748b;font-size:13px;padding:20px;text-align:center;border:1px dashed #e2e8f0;border-radius:8px}
      .footer{margin-top:24px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;display:flex;justify-content:space-between}
      .sig-block{margin-top:12px;padding-top:10px;border-top:1px dashed #cbd5e1;text-align:center;page-break-inside:avoid}
      .sig-img{height:50px;max-width:200px;object-fit:contain}
      .sig-line{border-top:1px solid #94a3b8;margin:4px auto 4px;width:220px}
      .sig-name{font-weight:700;font-size:11.5px;color:#0f2744}
      .sig-meta{font-size:10.5px;color:#64748b}
      @media print{body{padding:18px}}
    </style></head><body>
    <div class="hdr">
      <div>
        ${state.logoData ? `<img src="${state.logoData}" style="height:42px;max-width:160px;object-fit:contain;margin-bottom:6px">` : ''}
        <div class="logo">${state.empNome || state.empresaNome || 'EJH ENGENHARIA'}</div>
        <div class="sub">Engenharia Civil • Projetos • Obras</div>
        <div class="titulo">Relatório do Diário de Obra</div>
      </div>
      <div class="meta-doc">
        <div><strong>Emissão:</strong> ${hoje}</div>
        <div><strong>Escopo:</strong> ${obraId ? obras[0].nome : 'Todas as obras'}</div>
      </div>
    </div>
    ${corpo}
    <div class="footer">
      <span>${state.relatorioRodape || 'EJH Engenharia — Sistema de Gestão de Obras'}</span>
      <span>Emitido em ${hoje}</span>
    </div>
    <script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script>
  </body></html>`);
  w.document.close();
};

// WhatsApp do Diário: monta texto + anexa fotos via Web Share (mobile);
// fallback wa.me em desktop.
G.gerarDiarioWpp = async () => {
  const obraId = document.getElementById('dia-pdf-obra')?.value || '';
  const obras = obraId ? state.obras.filter(o => o.id === obraId) : state.obras;
  if (!obras.length) { showToast('⚠️ Nenhuma obra selecionada'); return; }
  const hoje = new Date().toLocaleDateString('pt-BR');
  const empresa = state.empNome || state.empresaNome || 'EJH Engenharia';

  let msg = `*${empresa}*\n📋 *Diário de Obra* — ${hoje}\n\n`;
  for (const o of obras) {
    const ents = state.diario.filter(d => d.obraId === o.id).sort((a,b)=>b.data.localeCompare(a.data)).slice(0,5);
    msg += `*🏗 ${o.nome}*\n`;
    if (o.cliente) msg += `Cliente: ${o.cliente}\n`;
    if (!ents.length) { msg += `_Sem registros._\n\n`; continue; }
    for (const e of ents) {
      msg += `\n📅 *${fmtD(e.data)}*`;
      if (e.clima) msg += ` • ${e.clima}`;
      if (e.equipe) msg += ` • 👷 ${e.equipe}`;
      msg += `\n${e.desc || ''}`;
      if (e.ocorr && e.ocorr !== 'Sem ocorrências' && e.ocorr !== 'Nenhuma') msg += `\n⚠️ ${e.ocorr}`;
      if (e.fotos?.length) msg += `\n📷 ${e.fotos.length} foto(s)`;
      msg += `\n`;
    }
    msg += `\n`;
  }
  if (state.engNome) msg += `_${state.engNome}${state.engRegistro?` — ${state.engRegistro}`:''}_\n`;
  if (state.relatorioRodape) msg += `\n${state.relatorioRodape}`;

  // Coleta fotos (até 10) das obras selecionadas
  const files = [];
  if (navigator.canShare && navigator.share) {
    let count = 0;
    outer: for (const o of obras) {
      const ents = state.diario.filter(d => d.obraId === o.id).sort((a,b)=>b.data.localeCompare(a.data));
      for (const e of ents) {
        for (const f of (e.fotos || [])) {
          if (count >= 10) break outer;
          try {
            const src = f.dataUrl || f.url;
            if (!src) continue;
            const r = await fetch(src);
            const blob = await r.blob();
            const safe = (f.name || `diario_${e.data}_${count+1}.jpg`).replace(/[^a-zA-Z0-9._-]/g,'_');
            files.push(new File([blob], safe, { type: blob.type || 'image/jpeg' }));
            count++;
          } catch (err) { console.warn('foto skip:', err?.message); }
        }
      }
    }
    try {
      const payload = { title: 'Diário de Obra', text: msg };
      if (files.length && navigator.canShare({ files })) payload.files = files;
      await navigator.share(payload);
      return;
    } catch (e) {
      if (e?.name === 'AbortError') return;
      console.warn('share falhou:', e?.message);
    }
  }
  window.open('https://api.whatsapp.com/send?text=' + encodeURIComponent(msg), '_blank');
};

// PDF da Medição: abre janela nova só com as medições da obra selecionada
G.gerarMedicaoPDF = () => {
  const obraId = document.getElementById('med-pdf-obra')?.value || '';
  const obras = obraId ? state.obras.filter(o => o.id === obraId) : state.obras;
  if (!obras.length) { showToast('⚠️ Nenhuma obra selecionada'); return; }
  const hoje = new Date().toLocaleDateString('pt-BR');
  const w = window.open('', '_blank');
  if (!w) { showToast('⚠️ Permita pop-ups para gerar o PDF'); return; }
  const corpo = obras.map(o => {
    const meds = state.medicoes.filter(m => m.obraId === o.id).sort((a,b) => (a.num||0)-(b.num||0));
    if (!meds.length) return `<h2>${o.nome}</h2><div class="vazio">Sem medições registradas.</div>`;
    return `<h2>${o.nome}</h2>
      <div class="meta">👤 ${o.cliente || '—'}${o.area ? ' • 📐 '+o.area+' m²' : ''}</div>
      ${meds.map(m => {
        const total = (m.itens||[]).reduce((a,x)=>a+(x.valorMed||0),0);
        return `
          <div class="entry">
            <div class="entry-h">
              <strong>Medição nº ${m.num}</strong>
              <span class="muted">Período: ${m.periodo || '—'} • Emissão: ${fmtD(m.data)}</span>
            </div>
            <table>
              <thead><tr><th>Item</th><th>Un.</th><th>Qtd</th><th>V.Unit</th><th>Qtd Med.</th><th>Valor</th></tr></thead>
              <tbody>${(m.itens||[]).map(it => `<tr>
                <td>${it.item || ''}</td>
                <td class="c">${it.un || ''}</td>
                <td class="c">${it.qtd || 0}</td>
                <td class="r">${fmt(it.vunit || 0)}</td>
                <td class="c"><strong>${it.qtdMed || 0}</strong></td>
                <td class="r"><strong>${fmt(it.valorMed || 0)}</strong></td>
              </tr>`).join('')}</tbody>
              <tfoot><tr><td colspan="5" class="r"><strong>TOTAL</strong></td><td class="r"><strong>${fmt(total)}</strong></td></tr></tfoot>
            </table>
            <div class="muted" style="margin-top:6px">Responsável Técnico: <strong>${m.resp || '—'}</strong> • ID: ${m.id}</div>
          </div>`;
      }).join('')}`;
  }).join('');
  w.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
    <title>Medições — ${obraId ? obras[0].nome : 'Todas'} — ${hoje}</title>
    <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
      *{box-sizing:border-box}
      body{font-family:'DM Sans',sans-serif;padding:32px;max-width:820px;margin:0 auto;color:#1e293b;line-height:1.5}
      .hdr{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #0f2744;padding-bottom:14px;margin-bottom:22px}
      .logo{font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#0f2744}
      .sub{font-size:12px;color:#64748b}
      .titulo{font-size:14px;font-weight:600;color:#2563eb;margin-top:4px}
      .meta-doc{text-align:right;font-size:12px;color:#64748b}
      h2{font-family:'Syne',sans-serif;font-size:18px;color:#0f2744;border-bottom:2px solid #e2e8f0;padding-bottom:8px;margin:24px 0 12px}
      .meta{font-size:12px;color:#64748b;margin-bottom:12px}
      .entry{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:14px;margin-bottom:14px;page-break-inside:avoid}
      .entry-h{display:flex;justify-content:space-between;border-bottom:1px solid #f1f5f9;padding-bottom:6px;margin-bottom:8px}
      .muted{font-size:11.5px;color:#64748b}
      table{width:100%;border-collapse:collapse;font-size:12px;margin-top:6px}
      th{background:#0f2744;color:#fff;padding:6px 8px;text-align:left;font-size:10.5px;text-transform:uppercase}
      td{padding:6px 8px;border-bottom:1px solid #e2e8f0}
      tr:nth-child(even) td{background:#f8faff}
      .c{text-align:center}.r{text-align:right}
      tfoot td{font-weight:700;background:#f0f4fa;border-top:2px solid #0f2744}
      .vazio{color:#64748b;font-size:13px;padding:20px;text-align:center;border:1px dashed #e2e8f0;border-radius:8px}
      .footer{margin-top:24px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;display:flex;justify-content:space-between}
      @media print{body{padding:18px}}
    </style></head><body>
    <div class="hdr">
      <div>
        ${state.logoData ? `<img src="${state.logoData}" style="height:42px;max-width:160px;object-fit:contain;margin-bottom:6px">` : ''}
        <div class="logo">${state.empNome || state.empresaNome || 'EJH ENGENHARIA'}</div>
        <div class="sub">Engenharia Civil • Projetos • Obras</div>
        <div class="titulo">Relatório de Medições</div>
      </div>
      <div class="meta-doc">
        <div><strong>Emissão:</strong> ${hoje}</div>
        <div><strong>Escopo:</strong> ${obraId ? obras[0].nome : 'Todas as obras'}</div>
      </div>
    </div>
    ${corpo}
    <div class="footer">
      <span>${state.relatorioRodape || 'EJH Engenharia — Sistema de Gestão de Obras'}</span>
      <span>Emitido em ${hoje}</span>
    </div>
    <script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script>
  </body></html>`);
  w.document.close();
};
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

// Snapshot das fotos locais por id de diário — usado para restaurar após sync
// (saveToCloud descarta dataUrl para não estourar 1MB do Firestore;
//  ao recarregar do cloud, fotos locais sem URL voltariam vazias sem isso)
function snapshotLocalFotos() {
  const m = {};
  (state.diario || []).forEach(d => {
    if (Array.isArray(d.fotos) && d.fotos.length) m[d.id] = d.fotos;
  });
  return m;
}

function restoreLocalFotos(merged, snap) {
  if (!merged || !Array.isArray(merged.diario)) return;
  merged.diario.forEach(d => {
    const local = snap[d.id];
    if (!local || !local.length) return;
    const cloudFotos = Array.isArray(d.fotos) ? d.fotos : [];
    // Caminho B: cloud (sub-coleção) é a fonte da verdade quando tem fotos.
    // Só restauramos do snapshot local quando o cloud trouxe MENOS fotos —
    // típico durante migração caminho A→B (cloud zerado, local cheio) ou
    // quando o save ainda não rodou.
    if (local.length > cloudFotos.length) {
      d.fotos = local;
    }
  });
}

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
  const fotosSnap = snapshotLocalFotos();
  return loadFromCloudV2().then(merged => {
    applyTombstones(merged, localTombs);
    restoreLocalFotos(merged, fotosSnap);
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

// Save local PRESERVANDO fotos do diário (saveState do services.js zera fotos)
function saveStateLocal() {
  try {
    localStorage.setItem('ejh_obras_v4', JSON.stringify(state));
    if (Array.isArray(state.propostas)) {
      localStorage.setItem('ejh_propostas_bak', JSON.stringify(state.propostas));
    }
  } catch (e) {
    console.warn('saveStateLocal:', e?.message || e);
    if (e?.name === 'QuotaExceededError' || /quota/i.test(e?.message || '')) {
      showToast('⚠️ Armazenamento do navegador cheio. Apague registros antigos com fotos.', 8000);
    }
  }
}

// Remove dataUrls grandes de qualquer item (recursivo, raso) para caber no
// limite de 1MB do Firestore. Mantém URLs externas/Storage, metadados e
// chaves WHITELIST (logo, assinaturas — usuário precisa que persistam).
const KEEP_DATAURL_KEYS = new Set(['logoData', 'engSig', 'dataUrl']);
function stripDataUrls(obj, parentKey) {
  if (Array.isArray(obj)) return obj.map(x => stripDataUrls(x));
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (typeof v === 'string' && v.startsWith('data:') && v.length > 8000) {
        if (KEEP_DATAURL_KEYS.has(k)) {
          out[k] = v; // preserva logo, assinatura
        }
        // senão: dataUrl pesado descartado (fotos do diário, etc)
        continue;
      }
      out[k] = stripDataUrls(v, k);
    }
    return out;
  }
  return obj;
}

// Save ao cloud — Caminho B: cada diário vai em sub-coleção
// usuarios/{uid}             ← state principal (diario:[])
// usuarios/{uid}/diario/{id} ← cada registro com suas fotos (dataUrl)
// Cabe ~6 fotos por diário (1MB/doc). Sem custo adicional, plano Spark.
async function saveToCloud() {
  if (!window._fbUser) return;
  if (!navigator.onLine) { setSyncStatus('⚠️', 'Offline — save adiado'); return; }
  setSyncStatus('🔄', 'Salvando…');
  try {
    if (typeof firebase === 'undefined') throw new Error('Firebase não carregado');
    const db = firebase.firestore();
    const uid = window._fbUser.uid;

    // 1) Doc principal: tudo menos o array diario (que vai em sub-coleção)
    const mainState = stripDataUrls({ ...state, diario: [] });
    const main = { ...mainState, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
    const mainKB = Math.round(JSON.stringify(main).length / 1024);
    if (mainKB > 950) {
      throw new Error(`Doc principal ${mainKB}KB > 1MB. Reduza propostas/capturas/logo.`);
    }
    await db.collection('usuarios').doc(uid).set(main);

    // 2) Diários: cada um vira sub-doc; fotos como dataUrl
    const oversized = [];
    const writes = (state.diario || []).map(async d => {
      const docKB = Math.round(JSON.stringify(d).length / 1024);
      const ref = db.doc(`usuarios/${uid}/diario/${d.id}`);
      if (docKB > 950) {
        oversized.push(`${d.id}(${docKB}KB)`);
        // Salva sem fotos pra preservar texto/data; fotos ficam só no aparelho
        await ref.set({ ...d, fotos: [] });
      } else {
        await ref.set(d);
      }
    });

    // 3) Tombstones: deleta sub-docs apagados em outros dispositivos
    const dels = (state.deletedIds && state.deletedIds.diario) || [];
    const deletes = dels.map(id =>
      db.doc(`usuarios/${uid}/diario/${id}`).delete().catch(() => {})
    );

    await Promise.all([...writes, ...deletes]);

    if (oversized.length) {
      showToast(`⚠️ ${oversized.length} diário(s) com fotos demais: ${oversized.join(', ')}. Reduza fotos.`, 12000);
    }
    setSyncStatus('☁✓', `Salvo ${new Date().toLocaleTimeString('pt-BR')} (${state.diario?.length || 0}d, ${mainKB}KB)`);
  } catch (e) {
    console.error('saveToCloud falhou:', e);
    const code = e?.code ? ` [${e.code}]` : '';
    const msg = (e?.message || 'erro desconhecido') + code;
    setSyncStatus('❌', 'Erro: ' + msg);
    showToast('❌ Salvar falhou: ' + msg, 10000);
  }
}

// Load do cloud — Caminho B: lê doc principal + sub-coleção de diários
async function loadFromCloudV2() {
  if (!window._fbUser || typeof firebase === 'undefined') return state;
  const db = firebase.firestore();
  const uid = window._fbUser.uid;
  const [mainSnap, diaSnap] = await Promise.all([
    db.collection('usuarios').doc(uid).get(),
    db.collection(`usuarios/${uid}/diario`).get()
  ]);
  if (!mainSnap.exists && diaSnap.empty) {
    // Primeira vez: salva o estado local
    await saveToCloud();
    return state;
  }
  const main = mainSnap.exists ? mainSnap.data() : {};
  delete main.updatedAt;
  const remoteDiarios = diaSnap.docs.map(d => d.data());

  const mergeArr = (a, b) => {
    if (!Array.isArray(b) || !b.length) return a || [];
    if (!Array.isArray(a) || !a.length) return b;
    const ids = new Set(b.map(x => x.id).filter(Boolean));
    return [...b, ...a.filter(x => x.id && !ids.has(x.id))];
  };

  const m = { ...state, ...main };
  ['obras','orc','cron','fin','medicoes','empreita','propostas','checklists','capturas','composicoes']
    .forEach(k => { m[k] = mergeArr(state[k], main[k]); });
  // Sub-coleção é fonte da verdade do diário; mas se ainda estiver vazia,
  // cai pro main.diario (legado caminho A) pra dispositivo fresh recuperar
  // os registros antigos sem fotos.
  const cloudDiarios = remoteDiarios.length ? remoteDiarios : (main.diario || []);
  m.diario = mergeArr(state.diario, cloudDiarios);

  if (main.counters && state.counters) {
    m.counters = {};
    Object.keys({ ...state.counters, ...main.counters }).forEach(k =>
      m.counters[k] = Math.max(state.counters[k] || 1, main.counters[k] || 1)
    );
  }
  return m;
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
  // Privacidade: oculto por padrão — só mostra se o usuário explicitamente escolheu '0'
  try {
    const priv = localStorage.getItem('ejh_privacy');
    if (priv !== '0') {
      document.body.classList.add('privacy-mode');
      const btn = document.getElementById('btn-privacy-mode');
      if (btn) btn.textContent = '🙈 Mostrar valores';
    }
  } catch(e) {}
  initFields();
  renderAtiva();
  // Lucide icons: substitui <i data-lucide="..."> por SVG inline
  if (window.lucide?.createIcons) {
    try { window.lucide.createIcons(); } catch(e) { console.warn('lucide:', e?.message); }
  }
  // Onboarding no primeiro acesso (após pequeno delay para UI montar)
  setTimeout(() => { if (deveExibirOnboarding()) abrirOnboarding(); }, 600);
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
      const fotosSnap = snapshotLocalFotos();
      loadFromCloudV2().then(merged => {
        applyTombstones(merged, localTombs);
        restoreLocalFotos(merged, fotosSnap);
        Object.assign(state, merged); window._state = state;
        _lastHash = calcHash(state);
        renderAtiva();
        if (window._fbUser) saveToCloud();
        showToast('☁️ Sincronizado!', 2000);
      }).catch(e => {
        console.error('Login load:', e);
        setSyncStatus('❌', 'Erro ao carregar: ' + (e.message || ''));
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
