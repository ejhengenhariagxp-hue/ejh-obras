// app.js — Orchestrador principal do EJH Gestão de Obras v4.2
// ══════════════════════════════════════════════════════════════════════

import { fmt, fmtD, pad, safeInner, safeText, showToast, nav, setBnActive,
         openModal, closeModal, statusBadge, tipoLabel,
         popularSelectsObras, modalidadeIcon, verificarAvisosObra,
         toggleFab, closeFab, openLightbox, closeLightbox, showSaveIndicator } from './utils.js?v=20260501g';
import { loadState, fbInit, fbLoginGoogle, fbLogout,
         saveIaKey, getIaKey, setIaKey,
         fbMigrarFotosAntigas, fbSalvarSnapshot } from './services.js?v=20260515b';
import { addObra, delObra, renderObras, registrarMedicaoRapida, openEditObra, salvarObra, resetFormObra, filtrarObras, limparFiltrosObras } from './modules/obras.js?v=20260516e';
import { addOrc, delOrc, renderOrc, abrirOrcamentoObra, voltarOrcLista, renderOrcDetalhe, gerarOrcamentoComIA } from './modules/orcamento.js?v=20260501g';
import { addCron, delCron, saveCronEdit, openCronEdit, setCronView, renderCron, renderGantt, renderCronAtivo } from './modules/cronograma.js?v=20260516m';
import { addDiario, delDiario, handleFotos, removePendingFoto, openModalDiario, openEditDiario, renderDiario, gerarDiarioComFoto, cancelarDiario, abrirDiarioObra, voltarDiarioObras, filtrarDiario } from './modules/diario.js?v=20260516d';
import { addFin, delFin, openEditFin, openModalFin, openModalFinPessoal, isModalFinPessoal, renderFinanceiro, toggleHideRT, marcarFinPago,
         addCustoFixo, delCustoFixo, toggleCustoFixoAtivo, openEditCustoFixo, abrirModalCustoFixo,
         preencherCustoFixoPadrao, gerarLancamentosCustosFixos,
         abrirDespesasPadraoObra, salvarDespesasPadraoObra,
         addConta, delConta, openEditConta, abrirModalConta,
         gerarParcelas, toggleParcFin, aplicarFiltrosFin, limparFiltrosFin, auditarDuplicatasFin,
         atualizarStatusVencimentos,
         importarFaturamentoHistoricoEJH, toggleFinSection, toggleAgendMes, toggleTodosAgend,
         editarFaturamentoMes, salvarFaturamentoMes, resetarFaturamentoMes,
         setResumoMes, rolarPendentesProximoMes, moverParaProximoMes,
         abrirModalTransf, addTransferencia, delTransferencia,
         addMeta, delMeta, openModalMeta, openEditMeta, addProgressoMeta,
         addDivida, delDivida, openModalDivida, openEditDivida, pagarParcelaDivida,
         atualizarTotalPagamentoDivida, confirmarPagamentoDivida,
         importarAbril2026Planilha, importarMesPlanilha,
         renderEjhLife, setEjhLifeFiltro, limparEjhLifeFiltros, aumentarFinLimit } from './modules/financeiro.js?v=20260514c';
import { addMedicao, updateMedVal, loadMedItems, printMedicao, colherAssinatura, renderMedicoes, openModalMedicao, openEditMedicao, delMedicao } from './modules/medicoes.js?v=20260505i';
import { addEmpreita, delEmpreita, openEmpPag, addEmpPag, renderEmpreita, initSignaturePads, limparAssinatura, obterItensSelecionados, resetFormEmpreita } from './modules/empreita.js?v=20260501g';
import { openPropProjeto, openPropObra, calcPropProjeto, calcPropostaObra,
         saveProposta, delProposta, editProposta, printProposta, compartilharWhatsApp,
         colherAssinaturaProposta, importFromOrcamento, addObraItem,
         addProjServico, addProjExtra, toggleModoGlobal, renderPropostas,
         atualizarStatusProposta, gerarObraDeProposta,
         addPropFoto, removePropFoto, renderPropFotos } from './modules/propostas.js?v=20260516a';
import { renderTabelas, filterSinapi, setSinapiCat, setTabelaSrc, importSinapi } from './modules/sinapi.js?v=20260501g';
import { renderReport, gerarRelatorioWpp, gerarRelatorioEmail } from './modules/relatorio.js?v=20260508c';
import { addChecklist, renderChecklist, renderTemplatesNBR, novoChecklist } from './modules/checklist.js?v=20260501g';
import { renderCaptura, capProcessarIA, capConfirmarTodos, capLimpar, capDescartarResultado, capToggleCard, capProcessarArquivo, capLimparWhatsApp, capSetView, renderHistoricoCaptura, renderTimelineCaptura } from './modules/captura.js?v=20260501g';
import { novaComposicao, addInsumoComp, renderInsumosComp, calcTotalComp,
         salvarComposicao, delComposicao, renderComposicoes, filtrarComposicoes,
         popularSelectComposicoes, preencherDadosComposicao, calcTotalComposicaoSel,
         inserirComposicaoNoOrcamento, editarComposicao,
         abrirCopiaSinapi, _setCopiaSrc, _filtrarCopiaSinapi, _copiarDeSinapi,
         setInsumoField, removeInsumoAt } from './modules/composicoes.js?v=20260501g';
import { exportarOrcamentoExcel, exportarOrcamentoExcelObra, exportarMedicoesExcel } from './modules/excel_export.js?v=20260505i';
import { importExcel, importCSV, importPDF, importManual, applyMapping,
         _selectSheet, _updateImportItem, _removeImportItem, addImportRow,
         cancelImport, confirmImport } from './modules/importar.js?v=20260501g';

// ── Estado global ────────────────────────────────────────────────────
const DEFAULT_STATE = {
  obras:[], orc:[], cron:[], diario:[], fin:[],
  medicoes:[], empreita:[], propostas:[], checklists:[], capturas:[], composicoes:[],
  custosFixos:[], contas:[],
  faturamentoMensal:{},
  counters:{ obra:1, orc:1, cron:1, dia:1, fin:1, med:1, emp:1, prop:1, ck:1, comp:1, cf:1, cb:1, met:1, div:1, transf:1 },
  engNome:'', engRegistro:'', engCrea:'', engSig:'',
  relatorioRodape:'', logoData:'', sinapiMes:'',
  tabelaSource:'sinapi', sinapiCatFilter:'Todos',
};

export let state = loadState(DEFAULT_STATE);
window._state = state;

function initFields() {
  // Migração legada: empreitas (plural) → empreita (singular). O módulo
  // antigo escrevia em state.empreitas mas o restante do app sempre leu de
  // state.empreita, deixando contratos invisíveis ao sync. Faz move uma
  // única vez se for o caso.
  if (Array.isArray(state.empreitas) && state.empreitas.length && !state.empreita?.length) {
    state.empreita = state.empreitas;
    delete state.empreitas;
  }
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
  'cronograma': () => renderCronAtivo(state),
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
  'ejhlife':    () => renderEjhLife(state),
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
    relatorioRodape:s.relatorioRodape, logoLen:(s.logoData||'').length,
    faturamentoMensal:s.faturamentoMensal});
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; }
  return h.toString(36);
}

export function renderAtiva() {
  const ativa = document.querySelector('.page.active');
  const id = ativa?.id?.replace('page-','') || 'dashboard';
  try { atualizarStatusVencimentos(state); } catch(e) {}
  // renderDashboard só roda se a página ativa for o dashboard — antes
  // era chamado em qualquer ação (digitando no Financeiro, salvando no
  // Diário, etc.), gastando ~10 filtros/reduces sobre o state pra renderizar
  // HTML que nem está visível.
  try { const fn = PAGE_RENDER_MAP[id]; if (fn) fn(); } catch(e) { console.error('Render error', id, e); }
  popularSelectsObras(state);
  const hash = calcHash(state);
  if (hash !== _lastHash) {
    // Só atualiza _lastHash e mostra "salvo" se o save de fato ocorreu.
    // Antes: _lastHash era setado ANTES do save → falhas silenciosas (quota
    // cheia, JSON inválido) deixavam o sistema "esquecer" que precisa salvar
    // e nunca tentar de novo. Agora retenta no próximo render.
    if (saveStateLocal()) {
      _lastHash = hash;
      showSaveIndicator();
    }
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
  let avg;
  if (etapas.length) {
    avg = Math.round(etapas.reduce((a,x)=>a+(x.conc||0),0)/etapas.length);
  } else {
    const diasComAvanco = (state.diario||[]).filter(d=>d.obraId===o.id && d.avancoPct!=null);
    if (diasComAvanco.length) {
      const ultimo = diasComAvanco.sort((a,b)=>(b.data||'').localeCompare(a.data||''))[0];
      avg = ultimo.avancoPct;
    } else {
      avg = 0;
    }
  }
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
  const saldo = state.fin.filter(f => f.tipo === 'Receita' && !f.transferGroupId && !f.pessoal).reduce((a,x)=>a+(+x.valor||0),0)
              - state.fin.filter(f => f.tipo === 'Despesa' && !f.transferGroupId && !f.pessoal).reduce((a,x)=>a+(+x.valor||0),0);

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

function renderIAsoContextual() {
  const el = document.getElementById('dash-iaso-contextual');
  if (!el) return;

  const hoje = new Date();
  const hojeStr = hoje.toISOString().split('T')[0];
  const alertas = [];

  // Obras sem registro no diário há mais de 3 dias
  const obrasAndamento = state.obras.filter(o => o.status === 'Em andamento');
  obrasAndamento.forEach(o => {
    const registros = (state.diario || []).filter(d => d.obraId === o.id);
    if (!registros.length) {
      alertas.push({ tipo: 'diario', icon: '📋', cor: '#e07b39', msg: `<strong>${o.nome}</strong> não tem nenhum registro no diário ainda.`, onclick: `abrirDiarioObra('${o.id}')` });
      return;
    }
    const ultimo = registros.map(d => d.data).sort().reverse()[0];
    const diasSem = Math.floor((hoje - new Date(ultimo)) / 86400000);
    if (diasSem >= 3) {
      alertas.push({ tipo: 'diario', icon: '📋', cor: diasSem >= 7 ? '#ef4444' : '#e07b39', msg: `<strong>${o.nome}</strong> está há <strong>${diasSem} dias</strong> sem registro no diário.`, onclick: `abrirDiarioObra('${o.id}')` });
    }
  });

  // Propostas em negociação há mais de 7 dias sem atualização
  const props = (state.propostas || []).filter(p => p.status === 'em_negociacao' || p.status === 'em_revisao');
  props.forEach(p => {
    const criado = p.criadoEm ? new Date(p.criadoEm) : null;
    if (criado) {
      const dias = Math.floor((hoje - criado) / 86400000);
      if (dias >= 7) {
        alertas.push({ tipo: 'proposta', icon: '📝', cor: '#2a7a50', msg: `Proposta <strong>${p.empreend || p.cliente || p.id}</strong> em negociação há <strong>${dias} dias</strong>.`, onclick: `nav('propostas',null)` });
      }
    }
  });

  // Lançamentos vencidos (não pagos)
  const vencidos = (state.fin || []).filter(f => f.status && f.status !== 'pago' && f.data && f.data < hojeStr && !f.transferGroupId && !f.pessoal);
  if (vencidos.length) {
    const total = vencidos.reduce((a, f) => a + f.valor, 0);
    const tipoMais = vencidos.filter(f => f.tipo === 'Despesa').length >= vencidos.filter(f => f.tipo === 'Receita').length ? 'pagar' : 'receber';
    alertas.push({ tipo: 'fin', icon: '💰', cor: '#ef4444', msg: `<strong>${vencidos.length} lançamento${vencidos.length > 1 ? 's' : ''} vencido${vencidos.length > 1 ? 's' : ''}</strong> — total de <strong>${fmt(total)}</strong> a ${tipoMais}.`, onclick: `nav('financeiro',null)` });
  }

  // Cronogramas atrasados
  const hoje2 = hojeStr;
  const atrasadas = (state.cron || []).filter(c => c.fim && c.fim < hoje2 && c.conc < 100);
  if (atrasadas.length) {
    alertas.push({ tipo: 'cron', icon: '📅', cor: '#ef4444', msg: `<strong>${atrasadas.length} etapa${atrasadas.length > 1 ? 's' : ''} do cronograma</strong> com prazo vencido e pendente de conclusão.`, onclick: `nav('cronograma',null)` });
  }

  if (!alertas.length) {
    el.innerHTML = '';
    return;
  }

  const visiveis = alertas.slice(0, 3);
  const extras = alertas.slice(3);

  el.innerHTML = `
    <div style="border-radius:var(--radius);overflow:hidden;box-shadow:var(--shadow);border:1px solid var(--border)">
      <div style="background:#1e2e24;padding:12px 18px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <span style="font-size:18px">👷</span>
        <span style="font-family:'Syne',sans-serif;font-weight:700;color:#fff;font-size:14px">IAsô — Alertas do dia</span>
        <span style="font-size:11px;color:rgba(255,255,255,.6);margin-left:auto">${alertas.length} item${alertas.length > 1 ? 's' : ''}</span>
      </div>
      <div style="background:var(--card);padding:12px 16px">
        <div id="iaso-alertas-lista" style="display:flex;flex-direction:column;gap:5px">
          ${visiveis.map(a => `
            <div onclick="${a.onclick}" style="display:flex;align-items:flex-start;gap:10px;background:#fff;border-left:3px solid ${a.cor};border-radius:7px;padding:9px 12px;cursor:pointer;transition:background .15s;box-shadow:0 1px 4px rgba(0,0,0,.05)"
              onmouseover="this.style.background='#f5f9f6'" onmouseout="this.style.background='#fff'">
              <span style="font-size:15px;flex-shrink:0;margin-top:1px">${a.icon}</span>
              <span style="font-size:13.5px;color:var(--text);line-height:1.4">${a.msg}</span>
            </div>`).join('')}
        </div>
        ${extras.length ? `
          <div id="iaso-alertas-extras" style="display:none;flex-direction:column;gap:5px;margin-top:5px">
            ${extras.map(a => `
              <div onclick="${a.onclick}" style="display:flex;align-items:flex-start;gap:10px;background:#fff;border-left:3px solid ${a.cor};border-radius:7px;padding:9px 12px;cursor:pointer;transition:background .15s;box-shadow:0 1px 4px rgba(0,0,0,.05)"
                onmouseover="this.style.background='#f5f9f6'" onmouseout="this.style.background='#fff'">
                <span style="font-size:15px;flex-shrink:0;margin-top:1px">${a.icon}</span>
                <span style="font-size:13.5px;color:var(--text);line-height:1.4">${a.msg}</span>
              </div>`).join('')}
          </div>
          <button onclick="const e=document.getElementById('iaso-alertas-extras');const b=document.getElementById('iaso-ver-mais');if(e.style.display==='none'){e.style.display='flex';b.textContent='Ver menos ▲'}else{e.style.display='none';b.textContent='Ver mais (${extras.length}) ▼'}"
            id="iaso-ver-mais"
            style="margin-top:10px;background:none;border:1px solid var(--border);color:var(--muted);border-radius:7px;padding:5px 12px;font-size:12px;cursor:pointer;width:100%">
            Ver mais (${extras.length}) ▼
          </button>` : ''}
      </div>
    </div>
  `;
}

window._abrirGerenciarRotinas = function() {
  let rotinas = [];
  try { rotinas = JSON.parse(localStorage.getItem('ejh_rotinas') || '[]'); } catch(e) {}
  const dias = ['Segunda','Terça','Quarta','Quinta','Sexta'];
  const lista = rotinas.map(r => {
    const freq = r.freq === 'diaria' ? 'Diária' : r.freq === 'semanal' ? `Semanal (${dias[r.diaSemana]||'?'})` : r.freq === 'quinzenal' ? `Quinzenal (${dias[r.diaSemana]||'?'})` : `Mensal (dia ${r.diaMes})`;
    return `<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:#f8f6f2;border-radius:7px;margin-bottom:6px">
      <span style="flex:1;font-size:13px">📌 <strong>${r.texto}</strong> — ${freq}</span>
      <button onclick="_delRotina(${r.id})" style="background:#fee2e2;border:none;color:#dc2626;border-radius:5px;padding:3px 8px;font-size:11px;cursor:pointer">Remover</button>
    </div>`;
  }).join('') || '<div style="color:var(--muted);font-size:13px;padding:8px 0">Nenhuma rotina cadastrada ainda.</div>';

  const modal = document.createElement('div');
  modal.id = 'modal-rotinas-bg';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:300;display:flex;align-items:center;justify-content:center;padding:20px';
  modal.innerHTML = `
    <div style="background:var(--card);border-radius:16px;padding:28px;width:100%;max-width:500px;max-height:85vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.25)">
      <div style="font-family:'Syne',sans-serif;font-size:17px;font-weight:800;color:var(--navy);margin-bottom:16px">⚙ Gerenciar Rotinas Recorrentes</div>
      <div id="rotinas-lista" style="margin-bottom:18px">${lista}</div>
      <div style="border-top:1px solid var(--border);padding-top:16px">
        <div style="font-size:12px;font-weight:600;color:var(--muted);margin-bottom:10px">ADICIONAR NOVA ROTINA</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <input id="rot-texto" placeholder="Ex: Reunião com equipe, Visita à prefeitura, Enviar relatório…" style="padding:8px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px">
          <div style="display:flex;gap:8px">
            <select id="rot-freq" onchange="_rotFreqChange()" style="flex:1;padding:8px;border:1px solid var(--border);border-radius:8px;font-size:13px">
              <option value="diaria">Diária</option>
              <option value="semanal" selected>Semanal</option>
              <option value="quinzenal">Quinzenal</option>
              <option value="mensal">Mensal</option>
            </select>
            <select id="rot-dia-semana" style="flex:1;padding:8px;border:1px solid var(--border);border-radius:8px;font-size:13px">
              <option value="0">Segunda</option><option value="1">Terça</option><option value="2">Quarta</option><option value="3">Quinta</option><option value="4">Sexta</option>
            </select>
            <input id="rot-dia-mes" type="number" min="1" max="31" placeholder="Dia (1-31)" style="flex:1;padding:8px;border:1px solid var(--border);border-radius:8px;font-size:13px;display:none">
          </div>
          <button onclick="_addRotina()" style="background:var(--blue);color:#fff;border:none;border-radius:8px;padding:9px;font-size:13px;font-weight:600;cursor:pointer">＋ Adicionar Rotina</button>
        </div>
      </div>
      <div style="margin-top:14px;text-align:right">
        <button onclick="document.getElementById('modal-rotinas-bg').remove()" style="background:none;border:1px solid var(--border);border-radius:8px;padding:7px 16px;font-size:13px;cursor:pointer;color:var(--muted)">Fechar</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
};

window._rotFreqChange = function() {
  const freq = document.getElementById('rot-freq')?.value;
  const ds = document.getElementById('rot-dia-semana');
  const dm = document.getElementById('rot-dia-mes');
  if (!ds || !dm) return;
  ds.style.display = (freq === 'semanal' || freq === 'quinzenal') ? '' : 'none';
  dm.style.display = freq === 'mensal' ? '' : 'none';
};

window._addRotina = function() {
  const texto = document.getElementById('rot-texto')?.value.trim();
  if (!texto) { alert('Digite o nome da rotina'); return; }
  const freq = document.getElementById('rot-freq')?.value;
  let rotinas = [];
  try { rotinas = JSON.parse(localStorage.getItem('ejh_rotinas') || '[]'); } catch(e) {}
  const nova = { id: Date.now(), texto, freq };
  if (freq === 'semanal' || freq === 'quinzenal') nova.diaSemana = +document.getElementById('rot-dia-semana')?.value;
  if (freq === 'mensal') nova.diaMes = +document.getElementById('rot-dia-mes')?.value || 1;
  rotinas.push(nova);
  try { localStorage.setItem('ejh_rotinas', JSON.stringify(rotinas)); } catch(e) {}
  document.getElementById('modal-rotinas-bg')?.remove();
  if (window._renderAgendaSemanal) window._renderAgendaSemanal();
};

window._delRotina = function(id) {
  let rotinas = [];
  try { rotinas = JSON.parse(localStorage.getItem('ejh_rotinas') || '[]'); } catch(e) {}
  rotinas = rotinas.filter(r => r.id !== id);
  try { localStorage.setItem('ejh_rotinas', JSON.stringify(rotinas)); } catch(e) {}
  document.getElementById('modal-rotinas-bg')?.remove();
  if (window._renderAgendaSemanal) window._renderAgendaSemanal();
};

window._agendaAddItem = function(slotStr) {
  const texto = prompt('Adicionar à agenda (' + new Date(slotStr + 'T12:00:00').toLocaleDateString('pt-BR', {weekday:'long', day:'2-digit', month:'short'}) + '):');
  if (!texto || !texto.trim()) return;
  let itens = {};
  try { itens = JSON.parse(localStorage.getItem('ejh_agenda_manual') || '{}'); } catch(e) {}
  if (!itens[slotStr]) itens[slotStr] = [];
  itens[slotStr].push({ id: Date.now(), texto: texto.trim() });
  try { localStorage.setItem('ejh_agenda_manual', JSON.stringify(itens)); } catch(e) {}
  if (window._renderAgendaSemanal) window._renderAgendaSemanal();
};

window._agendaDelItem = function(slotStr, id) {
  let itens = {};
  try { itens = JSON.parse(localStorage.getItem('ejh_agenda_manual') || '{}'); } catch(e) {}
  if (itens[slotStr]) itens[slotStr] = itens[slotStr].filter(x => x.id !== id);
  try { localStorage.setItem('ejh_agenda_manual', JSON.stringify(itens)); } catch(e) {}
  if (window._renderAgendaSemanal) window._renderAgendaSemanal();
};

function renderAgendaSemanal() {
  window._renderAgendaSemanal = renderAgendaSemanal;
  const el = document.getElementById('dash-agenda-semanal');
  if (!el) return;

  // Carrega itens manuais e rotinas recorrentes do localStorage
  let itensManual = {};
  try { itensManual = JSON.parse(localStorage.getItem('ejh_agenda_manual') || '{}'); } catch(e) {}
  let rotinas = [];
  try { rotinas = JSON.parse(localStorage.getItem('ejh_rotinas') || '[]'); } catch(e) {}

  const hoje = new Date();
  const hojeStr = hoje.toISOString().split('T')[0];

  // Sábado (6) ou domingo (0) → mostra próxima semana
  const diaSemanaJS = hoje.getDay();
  const diaSemana = diaSemanaJS === 0 ? 6 : diaSemanaJS - 1;
  const segunda = new Date(hoje);
  const offsetParaSegunda = diaSemanaJS === 0 ? -6 : -(diaSemanaJS - 1);
  segunda.setDate(hoje.getDate() + offsetParaSegunda);
  if (diaSemanaJS === 6 || diaSemanaJS === 0) segunda.setDate(segunda.getDate() + 7);

  const diasSemana = ['Segunda','Terça','Quarta','Quinta','Sexta'];
  const slots = [0,1,2,3,4].map(i => {
    const d = new Date(segunda);
    d.setDate(segunda.getDate() + i);
    return { nome: diasSemana[i], data: d, str: d.toISOString().split('T')[0], tarefas: [] };
  });

  // Coleta tarefas priorizadas
  const tarefas = [];

  // Obras sem diário (visitas de campo — seg/qua/sex)
  state.obras.filter(o => o.status === 'Em andamento').forEach(o => {
    const registros = (state.diario || []).filter(d => d.obraId === o.id);
    const ultimo = registros.length ? registros.map(d => d.data).sort().reverse()[0] : null;
    const dias = ultimo ? Math.floor((hoje - new Date(ultimo)) / 86400000) : 999;
    if (dias >= 3) {
      tarefas.push({ prioridade: dias >= 7 ? 0 : 1, tipo: 'visita', icon: '🏗', cor: dias >= 7 ? '#ef4444' : '#e07b39',
        texto: `Visitar <strong>${o.nome}</strong>${dias < 999 ? ` (${dias}d sem registro)` : ' (sem registros)'}`,
        onclick: `abrirDiarioObra('${o.id}')`, prefSlot: [0,2,4] });
    }
  });

  // Propostas para retornar (contato — ter/qui)
  (state.propostas || []).filter(p => p.status === 'em_negociacao' || p.status === 'em_revisao').forEach(p => {
    const dias = p.criadoEm ? Math.floor((hoje - new Date(p.criadoEm)) / 86400000) : 0;
    if (dias >= 5) {
      tarefas.push({ prioridade: dias >= 14 ? 0 : 2, tipo: 'contato', icon: '📞', cor: '#2a7a50',
        texto: `Retornar proposta <strong>${p.empreend || p.cliente || p.id}</strong> (${dias}d em negociação)`,
        onclick: `nav('propostas',null)`, prefSlot: [1,3] });
    }
  });

  // Lançamentos vencendo esta semana
  const fimSemana = slots[4].str;
  (state.fin || []).filter(f => f.status && f.status !== 'pago' && f.data && f.data >= hojeStr && f.data <= fimSemana && !f.transferGroupId && !f.pessoal).forEach(f => {
    const slotIdx = slots.findIndex(s => s.str === f.data);
    tarefas.push({ prioridade: 1, tipo: 'fin', icon: f.tipo === 'Receita' ? '💵' : '💸', cor: f.tipo === 'Receita' ? '#2a7a50' : '#ef4444',
      texto: `${f.tipo === 'Receita' ? 'Receber' : 'Pagar'}: <strong>${f.desc}</strong> — ${fmt(f.valor)}`,
      onclick: `nav('financeiro',null)`, prefSlot: slotIdx >= 0 ? [slotIdx] : [1,3] });
  });

  // Lançamentos já vencidos (atrasar resolução)
  const vencidos = (state.fin || []).filter(f => f.status && f.status !== 'pago' && f.data && f.data < hojeStr && !f.transferGroupId && !f.pessoal);
  if (vencidos.length) {
    const tot = vencidos.reduce((a,f) => a+f.valor, 0);
    tarefas.push({ prioridade: 0, tipo: 'fin', icon: '⚠️', cor: '#ef4444',
      texto: `Resolver <strong>${vencidos.length} lançamento${vencidos.length>1?'s':''} vencido${vencidos.length>1?'s':''}</strong> — ${fmt(tot)}`,
      onclick: `nav('financeiro',null)`, prefSlot: [0] });
  }

  // Etapas do cronograma com prazo esta semana
  (state.cron || []).filter(c => c.fim && c.fim >= hojeStr && c.fim <= fimSemana && c.conc < 100).forEach(c => {
    const slotIdx = slots.findIndex(s => s.str === c.fim);
    const obra = state.obras.find(o => o.id === c.obraId);
    tarefas.push({ prioridade: 1, tipo: 'cron', icon: '📅', cor: '#7c3aed',
      texto: `Prazo: <strong>${c.nome||'Etapa'}</strong>${obra ? ` — ${obra.nome}` : ''} (${c.conc||0}% concluído)`,
      onclick: `nav('cronograma',null)`, prefSlot: slotIdx >= 0 ? [slotIdx] : [2] });
  });

  // Obras com frequência de visita definida
  const semanaNum = Math.floor((new Date(slots[0].str) - new Date('2024-01-01')) / (7 * 86400000));
  state.obras.filter(o => o.status === 'Em andamento' && o.freqVisita).forEach(o => {
    const freq = o.freqVisita;
    if (freq === 'diaria') {
      // Uma entrada por dia útil (slots 0-4)
      slots.forEach((s, i) => {
        tarefas.push({ prioridade: 0, tipo: 'rotina', icon: '🔁', cor: '#2a7a50',
          texto: `<strong>${o.nome}</strong> — visita diária`,
          onclick: `abrirDiarioObra('${o.id}')`, prefSlot: [i], fixedSlot: i });
      });
    } else if (freq === 'semanal') {
      tarefas.push({ prioridade: 0, tipo: 'rotina', icon: '🔁', cor: '#2a7a50',
        texto: `<strong>${o.nome}</strong> — visita semanal`,
        onclick: `abrirDiarioObra('${o.id}')`, prefSlot: [0,2,4] });
    } else if (freq === 'quinzenal') {
      if (semanaNum % 2 === 0) {
        tarefas.push({ prioridade: 0, tipo: 'rotina', icon: '🔁', cor: '#2a7a50',
          texto: `<strong>${o.nome}</strong> — visita quinzenal`,
          onclick: `abrirDiarioObra('${o.id}')`, prefSlot: [0,2,4] });
      }
    } else if (freq === 'mensal') {
      // Mostra só na semana que contém o dia de início (ou dia 1 se não houver)
      const diaRef = o.inicio ? new Date(o.inicio).getDate() : 1;
      const temNaSemana = slots.some(s => new Date(s.str).getDate() === diaRef);
      if (temNaSemana) {
        const slotIdx = slots.findIndex(s => new Date(s.str).getDate() === diaRef);
        tarefas.push({ prioridade: 0, tipo: 'rotina', icon: '🔁', cor: '#2a7a50',
          texto: `<strong>${o.nome}</strong> — visita mensal`,
          onclick: `abrirDiarioObra('${o.id}')`, prefSlot: slotIdx >= 0 ? [slotIdx] : [0] });
      }
    }
  });

  // Rotinas recorrentes livres (não vinculadas a obras)
  rotinas.forEach(r => {
    if (r.freq === 'diaria') {
      slots.forEach((s, i) => {
        tarefas.push({ prioridade: 1, tipo: 'rotina-livre', icon: '📌', cor: '#7c3aed',
          texto: r.texto, onclick: '', prefSlot: [i], fixedSlot: i });
      });
    } else if (r.freq === 'semanal' && r.diaSemana !== undefined) {
      tarefas.push({ prioridade: 1, tipo: 'rotina-livre', icon: '📌', cor: '#7c3aed',
        texto: r.texto, onclick: '', prefSlot: [r.diaSemana] });
    } else if (r.freq === 'quinzenal' && r.diaSemana !== undefined) {
      if (semanaNum % 2 === 0) {
        tarefas.push({ prioridade: 1, tipo: 'rotina-livre', icon: '📌', cor: '#7c3aed',
          texto: r.texto, onclick: '', prefSlot: [r.diaSemana] });
      }
    } else if (r.freq === 'mensal' && r.diaMes !== undefined) {
      const temNaSemana = slots.some(s => new Date(s.str).getDate() === r.diaMes);
      if (temNaSemana) {
        const slotIdx = slots.findIndex(s => new Date(s.str).getDate() === r.diaMes);
        tarefas.push({ prioridade: 1, tipo: 'rotina-livre', icon: '📌', cor: '#7c3aed',
          texto: r.texto, onclick: '', prefSlot: slotIdx >= 0 ? [slotIdx] : [0] });
      }
    }
  });

  if (!tarefas.length && !rotinas.length && !Object.values(itensManual).flat().length) { el.innerHTML = ''; return; }

  // Distribui tarefas nos slots da semana (máx 3 por dia; diárias fixas já têm slot)
  tarefas.sort((a,b) => a.prioridade - b.prioridade);
  tarefas.forEach(t => {
    if (t.fixedSlot !== undefined && slots[t.fixedSlot]) {
      slots[t.fixedSlot].tarefas.push(t);
    } else {
      const ordem = [...(t.prefSlot || [0,1,2,3,4]), 0,1,2,3,4];
      for (const s of ordem) {
        if (slots[s] && slots[s].tarefas.length < 3) { slots[s].tarefas.push(t); break; }
      }
    }
  });

  const semanaLabel = `${slots[0].data.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})} – ${slots[4].data.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})}`;

  const diasHtml = slots.map((s, i) => {
    const isHoje = i === diaSemana && (diaSemanaJS !== 6 && diaSemanaJS !== 0);
    const passou = s.str < hojeStr;
    const opacity = passou ? '.55' : '1';
    const manuais = itensManual[s.str] || [];
    return `<div style="flex:1;min-width:130px;opacity:${opacity}">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:7px 10px;background:${isHoje ? '#1e2e24' : '#2a3a2e'};border-radius:7px 7px 0 0;margin-bottom:0">
        <span style="font-size:11px;font-weight:700;color:${isHoje ? '#6ee7b7' : 'rgba(255,255,255,.85)'};text-transform:uppercase;letter-spacing:.4px">
          ${s.nome}${isHoje ? ' · Hoje' : ''}
        </span>
        ${!passou ? `<button onclick="_agendaAddItem('${s.str}')" title="Adicionar item"
          style="background:rgba(110,231,183,.15);border:none;color:#6ee7b7;border-radius:4px;width:18px;height:18px;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1">＋</button>` : ''}
      </div>
      <div style="background:var(--card);border-radius:0 0 7px 7px;padding:6px 6px 6px;min-height:40px;display:flex;flex-direction:column;gap:4px">
        ${s.tarefas.map(t => `
          <div onclick="${t.onclick}" style="background:#fff;border-left:3px solid ${t.cor};border-radius:5px;padding:6px 8px;cursor:pointer;font-size:11.5px;color:var(--text);line-height:1.3;transition:background .15s;box-shadow:0 1px 3px rgba(0,0,0,.06)"
            onmouseover="this.style.background='#f0f7f3'" onmouseout="this.style.background='#fff'">
            <span style="margin-right:3px">${t.icon}</span>${t.texto}
          </div>`).join('')}
        ${manuais.map(m => `
          <div style="background:#fff;border-left:3px solid #2a7a50;border-radius:5px;padding:6px 8px;font-size:11.5px;color:var(--text);line-height:1.3;display:flex;align-items:flex-start;gap:5px;box-shadow:0 1px 3px rgba(0,0,0,.06)">
            <span style="flex:1">📌 ${m.texto.replace(/</g,'&lt;')}</span>
            <button onclick="_agendaDelItem('${s.str}',${m.id})" style="background:#fee2e2;border:none;color:#dc2626;border-radius:3px;width:15px;height:15px;font-size:9px;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center" title="Remover">✕</button>
          </div>`).join('')}
        ${s.tarefas.length === 0 && manuais.length === 0 ? `<div style="font-size:11px;color:var(--muted);padding:4px 2px">Livre</div>` : ''}
      </div>
    </div>`;
  }).join('');

  el.innerHTML = `
    <div style="border-radius:var(--radius);overflow:hidden;box-shadow:var(--shadow);border:1px solid var(--border)">
      <div style="background:#1e2e24;padding:12px 18px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <span style="font-size:18px">🗓</span>
        <span style="font-family:'Syne',sans-serif;font-weight:700;color:#fff;font-size:14px">Agenda da Semana — IAsô</span>
        <button onclick="_abrirGerenciarRotinas()" style="margin-left:auto;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:rgba(255,255,255,.8);border-radius:7px;padding:4px 10px;font-size:11px;cursor:pointer">⚙ Rotinas</button>
        <span style="font-size:11px;color:rgba(255,255,255,.5)">${semanaLabel}</span>
      </div>
      <div style="background:#2a3a2e;padding:12px 14px;display:flex;gap:8px;flex-wrap:wrap">${diasHtml}</div>
    </div>
  `;
}

function renderDashboard() {
  const hoje = new Date();
  safeText('dash-date', hoje.toLocaleDateString('pt-BR',{weekday:'long',year:'numeric',month:'long',day:'numeric'}));

  renderAlertaUrgente();
  renderIAsoContextual();
  renderAgendaSemanal();

  // KPIs
  const rec = state.fin.filter(x=>x.tipo==='Receita' && !x.transferGroupId && !x.pessoal).reduce((a,x)=>a+x.valor, 0);
  const des = state.fin.filter(x=>x.tipo==='Despesa' && !x.transferGroupId && !x.pessoal).reduce((a,x)=>a+x.valor, 0);
  const andamento = state.obras.filter(o=>o.status==='Em andamento').length;
  safeText('kpi-total', andamento);
  const kpiTotalSub = document.getElementById('kpi-total-sub');
  if (kpiTotalSub) kpiTotalSub.textContent = `de ${state.obras.length} cadastrada${state.obras.length!==1?'s':''}`;
  safeText('kpi-saldo', fmt(rec-des));
  const sEl = document.getElementById('kpi-saldo');
  if (sEl) sEl.style.color = (rec-des) >= 0 ? 'var(--green)' : 'var(--red)';

  // Alertas financeiros
  const todayStr = hoje.toISOString().split('T')[0];
  const pendentes = state.fin.filter(f => f.status && f.status !== 'pago' && !f.transferGroupId && !f.pessoal);
  const aReceber = pendentes.filter(f => f.tipo === 'Receita').sort((a,b)=>(a.data||'').localeCompare(b.data||'')).slice(0,6);
  const aPagar   = pendentes.filter(f => f.tipo === 'Despesa').sort((a,b)=>(a.data||'').localeCompare(b.data||'')).slice(0,6);
  const totalReceber = pendentes.filter(f=>f.tipo==='Receita').reduce((a,f)=>a+f.valor,0);
  const totalPagar   = pendentes.filter(f=>f.tipo==='Despesa').reduce((a,f)=>a+f.valor,0);

  safeText('kpi-a-receber', fmt(totalReceber));
  safeText('kpi-a-pagar',   fmt(totalPagar));

  const finItemHtml = (f, tipo) => {
    const obra = state.obras.find(o=>o.id===f.obraId);
    const vencido = f.data && f.data < todayStr;
    const cor = tipo === 'Receita' ? 'var(--green)' : (vencido ? 'var(--red)' : 'var(--amber)');
    const statusTag = vencido
      ? `<span style="font-size:10px;background:#fee2e2;color:#991b1b;border-radius:4px;padding:1px 5px;font-weight:700">VENCIDO</span>`
      : `<span style="font-size:10px;background:#fef3c7;color:#92400e;border-radius:4px;padding:1px 5px">${fmtD(f.data)}</span>`;
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 12px;border-bottom:1px solid var(--border);font-size:12.5px;gap:8px">
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;color:var(--navy);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${f.desc || '—'}</div>
        <div style="font-size:11px;color:var(--muted);display:flex;gap:6px;align-items:center;margin-top:2px">
          ${obra ? `<span>🏗 ${obra.nome}</span>` : ''}
          ${statusTag}
        </div>
      </div>
      <div style="font-weight:700;color:${cor};white-space:nowrap">${fmt(f.valor)}</div>
    </div>`;
  };

  const emptyFin = (msg) => `<div style="color:var(--muted);padding:14px;text-align:center;font-size:13px">${msg}</div>`;

  safeInner('dash-receber', aReceber.length ? aReceber.map(f=>finItemHtml(f,'Receita')).join('') : emptyFin('✅ Nenhum valor pendente'));
  safeInner('dash-pagar',   aPagar.length   ? aPagar.map(f=>finItemHtml(f,'Despesa')).join('')   : emptyFin('✅ Nenhuma despesa pendente'));
  safeText('dash-receber-total', totalReceber > 0 ? fmt(totalReceber) : '');
  safeText('dash-pagar-total',   totalPagar   > 0 ? fmt(totalPagar)   : '');
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
  const pendentes = (state.diario || []).reduce((a, d) =>
    a + (d.fotos || []).filter(f => !f.url && f.dataUrl).length, 0);
  const sec = document.getElementById('set-migrar-section');
  const div = document.getElementById('set-migrar-divider');
  const cnt = document.getElementById('set-migrar-count');
  if (sec) sec.style.display = pendentes > 0 ? '' : 'none';
  if (div) div.style.display = pendentes > 0 ? '' : 'none';
  if (cnt) cnt.textContent = pendentes;
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
  const receitasTotal = state.fin.filter(f => f.tipo === 'Receita' && !f.transferGroupId && !f.pessoal).reduce((a,x) => a + (+x.val || 0), 0);
  const despesasTotal = state.fin.filter(f => f.tipo === 'Despesa' && !f.transferGroupId && !f.pessoal).reduce((a,x) => a + (+x.val || 0), 0);
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
// Categorias pessoais (quando modal-fin é aberto em modo "pessoal")
const CAT_RECEITA_PESSOAL = [
  '💼 Pró-labore',
  '🎁 Presente / Doação Recebida',
  '💰 Rendimento / Investimento',
  '↩ Reembolso',
  '📦 Outros',
];
const CAT_DESPESA_PESSOAL = [
  '🏠 Casa / Moradia',
  '🛒 Mercado / Alimentação',
  '🚗 Transporte / Combustível',
  '💊 Saúde / Farmácia',
  '👕 Vestuário',
  '🎉 Lazer / Viagem',
  '📚 Educação',
  '💳 Dívida (parcela)',
  '💸 Imposto / Taxa',
  '📱 Assinaturas / Internet',
  '👨‍👩‍👧 Família / Filhos',
  '📦 Outros',
];
function atualizarCategoriasFin() {
  const tipo = document.getElementById('f-fin-tipo')?.value || 'Receita';
  const sel = document.getElementById('f-fin-cat');
  if (!sel) return;
  const ehPessoal = typeof isModalFinPessoal === 'function' && isModalFinPessoal();
  let lista;
  if (ehPessoal) {
    lista = tipo === 'Receita' ? CAT_RECEITA_PESSOAL : CAT_DESPESA_PESSOAL;
  } else {
    lista = tipo === 'Receita' ? CAT_RECEITA : CAT_DESPESA;
  }
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
G.filtrarObras = filtrarObras;
G.limparFiltrosObras = limparFiltrosObras;
G.filtrarDiario = filtrarDiario;
G.migrarFotosStorage = async () => {
  if (!window._fbUser) { showToast('⚠️ Faça login no Google primeiro (sync ativa)'); return; }
  const totalDataUrl = (state.diario || []).reduce((a, d) =>
    a + (d.fotos || []).filter(f => !f.url && f.dataUrl).length, 0);
  if (!totalDataUrl) { showToast('✅ Não há fotos antigas para migrar'); return; }
  if (!confirm(`Migrar ${totalDataUrl} foto(s) do diário para o Firebase Storage?\n\nIsso reduz drasticamente o tamanho do seu state e libera espaço no navegador. As fotos continuam acessíveis (passam a ser URLs).\n\nA operação pode demorar alguns minutos dependendo da quantidade.`)) return;
  showToast('🔄 Migrando fotos… aguarde', 60000);
  try {
    const r = await fbMigrarFotosAntigas(state, p => {
      console.log(`[Migração] ${p.migradas}/${p.total} — ${p.cur}`);
    });
    try { localStorage.removeItem('ejh_obras_v4'); } catch (_) {}
    _lastHash = '';
    saveStateLocal();
    if (window._fbUser) { clearTimeout(_fbSaveTimer); saveToCloud(); }
    renderAtiva();
    showToast(`✅ ${r.migradas} foto(s) migradas, ${r.falhas} falha(s), ${r.jaTinha} já estavam`, 8000);
    console.log('[Migração] Resultado:', r);
  } catch (e) {
    showToast('❌ Erro: ' + (e?.message || 'desconhecido'), 8000);
  }
};
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
G.setCronView = v => { setCronView(v); if(v==='gantt') renderGantt(state); else renderCron(state); };
G.renderGantt = () => renderGantt(state);
G.renderCron = () => renderCron(state);
G.renderCronAtivo = () => renderCronAtivo(state);
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

window._aplicarTemplateCaixa = function() {
  const obraId = document.getElementById('cron-obra-sel')?.value;
  if (!obraId) { showToast('⚠️ Selecione uma obra antes de aplicar o template.'); return; }
  const obra = state.obras.find(o => o.id === obraId);
  if (!confirm(`Adicionar etapas padrão CEF/Caixa à obra "${obra?.nome || obraId}"?\n\nEtapas já existentes serão mantidas.`)) return;
  const etapasCEF = [
    { etapa:'Barração+Lig. Provisórias (Água/Luz)+Projetos/Aprovs.', incidencia:2.19 },
    { etapa:'Infraestrutura (Estacas, Brocas, Baldrames, Sapatas)',   incidencia:6.94 },
    { etapa:'Supraestrutura (Vigas, Pilares, Cintas, Escadas)',        incidencia:14.93 },
    { etapa:'Paredes e Painéis',                                       incidencia:9.03 },
    { etapa:'Esquadrias',                                              incidencia:7.81 },
    { etapa:'Vidros e Plásticos',                                      incidencia:1.56 },
    { etapa:'Coberturas (Estrutura e Telhas)',                         incidencia:7.92 },
    { etapa:'Impermeabilizações',                                      incidencia:1.56 },
    { etapa:'Revestimentos Internos',                                  incidencia:8.91 },
    { etapa:'Forros',                                                  incidencia:0.94 },
    { etapa:'Revestimentos Externos',                                  incidencia:5.16 },
    { etapa:'Pinturas',                                                incidencia:4.91 },
    { etapa:'Pisos',                                                   incidencia:9.06 },
    { etapa:'Acabamentos (Soleiras, Rodapés, Peitoril etc.)',          incidencia:1.13 },
    { etapa:'Instalações Elétricas e Telefônicas',                     incidencia:4.66 },
    { etapa:'Instalações Hidráulicas',                                 incidencia:3.79 },
    { etapa:'Instalações: Esgoto e Águas Pluviais',                   incidencia:3.66 },
    { etapa:'Louças e Metais',                                         incidencia:4.29 },
    { etapa:'Complementos (Limpeza Final e Calafete)',                 incidencia:1.56 },
    { etapa:'Outros / Serviços Adicionais',                            incidencia:0 },
  ];
  const existentes = state.cron.filter(c=>c.obraId===obraId);
  const mapaExist = new Map(existentes.map(c=>[c.etapa, c]));
  let adicionadas = 0, atualizadas = 0;
  etapasCEF.forEach(({etapa:nome, incidencia}) => {
    const exist = mapaExist.get(nome);
    if (exist) {
      if ((exist.incidencia||0) !== incidencia) { exist.incidencia = incidencia; atualizadas++; }
      return;
    }
    state.cron.push({ id:'CRN-'+pad(state.counters.cron), obraId, etapa:nome, inicio:'', fim:'', prev:100, conc:0, incidencia });
    state.counters.cron++;
    adicionadas++;
  });
  saveStateLocal();
  if (window._fbUser) { clearTimeout(_fbSaveTimer); _fbSaveTimer = setTimeout(()=>saveToCloud(),400); }
  renderAtiva();
  const msgs = [];
  if (adicionadas) msgs.push(`${adicionadas} adicionada(s)`);
  if (atualizadas) msgs.push(`${atualizadas} incidência(s) atualizada(s)`);
  showToast(`✅ ${msgs.join(', ') || 'Nenhuma alteração'}.`);
};
G.openModalFin = tipo => openModalFin(state, tipo);
G.openModalFinPessoal = tipo => openModalFinPessoal(state, tipo);
// Metas Pessoais
G.openModalMeta = () => openModalMeta();
G.openEditMeta = id => openEditMeta(state, id);
G.addMeta = () => {
  if (addMeta(state)) {
    saveStateLocal();
    if (window._fbUser) clearTimeout(_fbSaveTimer), (_fbSaveTimer = setTimeout(saveToCloud, 400));
    renderAtiva();
  }
};
G.delMeta = id => {
  if (delMeta(state, id)) {
    saveStateLocal();
    if (window._fbUser) clearTimeout(_fbSaveTimer), (_fbSaveTimer = setTimeout(saveToCloud, 400));
    renderAtiva();
  }
};
G.addProgressoMeta = id => {
  if (addProgressoMeta(state, id)) {
    saveStateLocal();
    if (window._fbUser) clearTimeout(_fbSaveTimer), (_fbSaveTimer = setTimeout(saveToCloud, 400));
    renderAtiva();
  }
};
// Dívidas Pessoais
G.openModalDivida = () => openModalDivida();
G.setEjhLifeFiltro = (campo, valor) => { setEjhLifeFiltro(campo, valor); renderEjhLife(state); };
G.limparEjhLifeFiltros = () => { limparEjhLifeFiltros(); renderEjhLife(state); };
G.openEditDivida = id => openEditDivida(state, id);
G.addDivida = () => {
  if (addDivida(state)) {
    saveStateLocal();
    if (window._fbUser) clearTimeout(_fbSaveTimer), (_fbSaveTimer = setTimeout(saveToCloud, 400));
    renderAtiva();
  }
};
G.delDivida = id => {
  if (delDivida(state, id)) {
    saveStateLocal();
    if (window._fbUser) clearTimeout(_fbSaveTimer), (_fbSaveTimer = setTimeout(saveToCloud, 400));
    renderAtiva();
  }
};
G.pagarParcelaDivida = id => pagarParcelaDivida(state, id);
G.atualizarTotalPagamentoDivida = () => atualizarTotalPagamentoDivida(state);
G.confirmarPagamentoDivida = () => {
  if (confirmarPagamentoDivida(state)) {
    saveStateLocal();
    if (window._fbUser) clearTimeout(_fbSaveTimer), (_fbSaveTimer = setTimeout(saveToCloud, 400));
    renderAtiva();
  }
};
G.aumentarFinLimit = aumentarFinLimit;
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
G.auditarDuplicatasFin = () => { if (auditarDuplicatasFin(state)) renderAtiva(); };
G.toggleHideRT = cb => { toggleHideRT(state, cb); renderAtiva(); };
G.importarFaturamentoHistoricoEJH = () => { if(importarFaturamentoHistoricoEJH(state)) renderAtiva(); };
G.toggleFinSection = id => toggleFinSection(id);
G.toggleAgendMes = mesKey => toggleAgendMes(mesKey);
G.toggleTodosAgend = () => toggleTodosAgend();
G.editarFaturamentoMes = (year, month) => editarFaturamentoMes(state, year, month);
G.salvarFaturamentoMes = () => {
  if(salvarFaturamentoMes(state)) {
    saveStateLocal();
    if (window._fbUser) clearTimeout(_fbSaveTimer), (_fbSaveTimer = setTimeout(saveToCloud, 400));
    renderAtiva();
  }
};
G.resetarFaturamentoMes = () => {
  if(resetarFaturamentoMes(state)) {
    saveStateLocal();
    if (window._fbUser) clearTimeout(_fbSaveTimer), (_fbSaveTimer = setTimeout(saveToCloud, 400));
    renderAtiva();
  }
};
G.setResumoMes = val => { setResumoMes(val); renderAtiva(); };
G.rolarPendentesProximoMes = () => {
  if (rolarPendentesProximoMes(state)) {
    saveStateLocal();
    if (window._fbUser) clearTimeout(_fbSaveTimer), (_fbSaveTimer = setTimeout(saveToCloud, 400));
    renderAtiva();
  }
};
G.moverParaProximoMes = (finId) => {
  if (moverParaProximoMes(state, finId)) {
    saveStateLocal();
    if (window._fbUser) clearTimeout(_fbSaveTimer), (_fbSaveTimer = setTimeout(saveToCloud, 400));
    renderAtiva();
  }
};
G.abrirModalTransf = () => abrirModalTransf(state);
G.addTransferencia = () => {
  if (addTransferencia(state)) {
    saveStateLocal();
    if (window._fbUser) clearTimeout(_fbSaveTimer), (_fbSaveTimer = setTimeout(saveToCloud, 400));
    renderAtiva();
  }
};
G.delTransferencia = grpId => {
  if (delTransferencia(state, grpId)) {
    saveStateLocal();
    if (window._fbUser) clearTimeout(_fbSaveTimer), (_fbSaveTimer = setTimeout(saveToCloud, 400));
    renderAtiva();
  }
};
G.importarAbril2026Planilha = () => {
  if (importarAbril2026Planilha(state)) {
    saveStateLocal();
    if (window._fbUser) clearTimeout(_fbSaveTimer), (_fbSaveTimer = setTimeout(saveToCloud, 400));
    renderAtiva();
  }
};
G.importarMesPlanilha = mesKey => {
  if (importarMesPlanilha(state, mesKey)) {
    saveStateLocal();
    if (window._fbUser) clearTimeout(_fbSaveTimer), (_fbSaveTimer = setTimeout(saveToCloud, 400));
    renderAtiva();
  }
};
G.toggleSidebar = () => {
  const collapsed = document.body.classList.toggle('sidebar-collapsed');
  try { localStorage.setItem('ejh_sidebar_collapsed', collapsed ? '1' : '0'); } catch(e) {}
};
// Restaura estado da sidebar ao carregar
try { if (localStorage.getItem('ejh_sidebar_collapsed') === '1') document.body.classList.add('sidebar-collapsed'); } catch(e) {}

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
G.addPropFoto = input => { addPropFoto(input); };
G.removePropFoto = idx => { removePropFoto(idx); renderPropFotos(); };
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
    const after = calcHash(state);
    // Persiste o estado mesclado (incluindo fotos vindas do celular) no
    // localStorage ANTES de atualizar _lastHash — garante que o próximo
    // saveToCloud use a versão correta e não sobreescreva o Firestore com
    // dados antigos (sem fotos) na próxima ação do usuário.
    if (after !== before) saveStateLocal();
    _lastHash = after;
    renderAtiva();
    if (window._fbUser) { clearTimeout(_fbSaveTimer); saveToCloud(); }
    setSyncStatus('☁✓', 'Sincronizado ' + new Date().toLocaleTimeString('pt-BR'));
    if (!silent && after !== before) showToast('☁️ Atualizado!', 2000);
  }).catch(e => {
    console.error('syncFromCloud falhou:', e);
    setSyncStatus('❌', 'Erro no sync: ' + (e.message || ''));
  });
}

// Save local PRESERVANDO fotos do diário (saveState do services.js zera fotos)
// Compacta o state antes de gravar no localStorage: para fotos que já foram
// migradas pro Firebase Storage (têm url + storagePath), descarta o dataUrl
// — economiza até 95% de espaço sem perder dado nenhum.
function compactStateParaLocal(s) {
  const diario = (s.diario || []).map(d => {
    const fotos = (d.fotos || []).map(f => {
      if (f && f.url && f.storagePath && f.dataUrl) {
        const { dataUrl, ...resto } = f;
        return resto;
      }
      return f;
    });
    return { ...d, fotos };
  });
  return { ...s, diario };
}

// Retorna true se o save local foi bem-sucedido; false se houve falha
// (quota cheia, JSON inválido, etc.). Em caso de falha, exibe banner
// PERSISTENTE no topo da página (não toast efêmero) que só some quando
// o próximo save funcionar.
function saveStateLocal() {
  const compact = compactStateParaLocal(state);
  const json = JSON.stringify(compact);
  const tryWrite = () => {
    localStorage.setItem('ejh_obras_v4', json);
    if (Array.isArray(state.propostas)) {
      localStorage.setItem('ejh_propostas_bak', JSON.stringify(state.propostas));
    }
  };
  try {
    tryWrite();
    hideSaveErrorBanner();
    return true;
  } catch (e) {
    const isQuota = e?.name === 'QuotaExceededError' || /quota/i.test(e?.message || '');
    if (isQuota) {
      try {
        localStorage.removeItem('ejh_obras_v4');
        tryWrite();
        hideSaveErrorBanner();
        return true;
      } catch (_) {}
    }
    console.warn('saveStateLocal:', e?.message || e);
    if (isQuota) {
      showQuotaBanner();
    } else {
      showSaveErrorBanner('⚠️ Falha ao salvar localmente: ' + (e?.message || 'erro desconhecido') + '. Suas alterações estão apenas em memória.');
    }
    return false;
  }
}

function showQuotaBanner() {
  let el = document.getElementById('save-error-banner');
  if (!el) {
    el = document.createElement('div');
    el.id = 'save-error-banner';
    el.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#ef4444;color:#fff;padding:10px 16px;text-align:center;font-weight:600;font-size:13px;z-index:99999;box-shadow:0 2px 8px rgba(0,0,0,.3)';
    document.body.appendChild(el);
  }
  const logado = !!window._fbUser;
  el.innerHTML = logado
    ? '⚠️ Armazenamento cheio — <button onclick="migrarFotosStorage()" style="background:#fff;color:#ef4444;border:none;border-radius:6px;padding:3px 10px;font-weight:700;cursor:pointer;margin:0 6px">☁️ Migrar fotos agora</button> para liberar espaço'
    : '⚠️ Armazenamento cheio — <button onclick="fbLoginGoogle()" style="background:#fff;color:#ef4444;border:none;border-radius:6px;padding:3px 10px;font-weight:700;cursor:pointer;margin:0 6px">Entrar com Google</button> para sincronizar e liberar espaço';
  el.style.display = 'block';
}
function showSaveErrorBanner(msg) {
  let el = document.getElementById('save-error-banner');
  if (!el) {
    el = document.createElement('div');
    el.id = 'save-error-banner';
    el.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#ef4444;color:#fff;padding:10px 16px;text-align:center;font-weight:600;font-size:13px;z-index:99999;box-shadow:0 2px 8px rgba(0,0,0,.3)';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.display = 'block';
}
function hideSaveErrorBanner() {
  const el = document.getElementById('save-error-banner');
  if (el) el.style.display = 'none';
}

// Snapshot diário no Storage para recovery facilitado em incidentes
// (ver causa do incidente desta sessão). Roda no máximo 1 vez por dia
// — usa flag em localStorage 'ejh_ultimo_snapshot' com YYYY-MM-DD.
async function tentarSnapshotDiario() {
  if (!window._fbUser) return;
  try {
    const hoje = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem('ejh_ultimo_snapshot') === hoje) return;
    const r = await fbSalvarSnapshot(state);
    localStorage.setItem('ejh_ultimo_snapshot', hoje);
    console.log('[snapshot diário]', r);
  } catch (e) {
    console.warn('snapshot diário falhou:', e?.message);
  }
}
window.fazerSnapshotAgora = tentarSnapshotDiario; // permite chamar manualmente

// Estima o uso atual de localStorage como porcentagem da quota disponível
// (típica 5MB no navegador). Útil antes de operações pesadas (importar,
// migrar fotos, gerar lote) para avisar o usuário antes de estourar.
// Retorna { bytes, pctEstimado, severidade: 'ok'|'alerta'|'critico' }.
function avaliarQuotaLocalStorage() {
  try {
    const raw = localStorage.getItem('ejh_obras_v4') || '';
    const bytes = new Blob([raw]).size;
    const quotaAprox = 5 * 1024 * 1024; // 5MB conservador
    const pct = Math.round((bytes / quotaAprox) * 100);
    let sev = 'ok';
    if (pct > 80) sev = 'critico';
    else if (pct > 60) sev = 'alerta';
    return { bytes, pctEstimado: pct, severidade: sev };
  } catch (e) {
    return { bytes: 0, pctEstimado: 0, severidade: 'ok' };
  }
}

// Wrapper para operações pesadas: alerta + exige confirmação se quota
// estiver alta. Retorna boolean indicando se pode prosseguir.
function confirmarSeQuotaAlta(operacao) {
  const q = avaliarQuotaLocalStorage();
  if (q.severidade === 'critico') {
    return confirm(`⚠️ Atenção: o armazenamento local está em ${q.pctEstimado}% (${Math.round(q.bytes/1024)} KB).\n\nAo executar "${operacao}", há risco de estourar a quota e a operação falhar parcialmente, deixando dados inconsistentes.\n\nRecomendado: migrar fotos para o Firebase Storage (Configurações → ☁️ Migrar fotos) antes.\n\nContinuar mesmo assim?`);
  }
  if (q.severidade === 'alerta') {
    showToast(`⚠️ Armazenamento em ${q.pctEstimado}%. Considere migrar fotos para Storage em breve.`, 5000);
  }
  return true;
}
window.confirmarSeQuotaAlta = confirmarSeQuotaAlta; // disponível para módulos

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

    // 2) Diários: cada um vira sub-doc.
    // Antes de gravar, lê o Firestore para não sobrescrever fotos adicionadas
    // em outro dispositivo (ex: celular) com uma versão local sem fotos.
    const oversized = [];
    const writes = (state.diario || []).map(async d => {
      const ref = db.doc(`usuarios/${uid}/diario/${d.id}`);
      const nLocal = (d.fotos || []).filter(f => f.url || f.dataUrl).length;
      // Se local não tem fotos, verifica se o cloud tem antes de sobrescrever
      let dParaSalvar = d;
      if (nLocal === 0) {
        try {
          const snap = await ref.get();
          if (snap.exists) {
            const cloudFotos = (snap.data().fotos || []).filter(f => f.url || f.dataUrl);
            if (cloudFotos.length > 0) {
              dParaSalvar = { ...d, fotos: cloudFotos };
            }
          }
        } catch (_) {}
      }
      const docKB = Math.round(JSON.stringify(dParaSalvar).length / 1024);
      if (docKB > 950) {
        oversized.push(`${d.id}(${docKB}KB)`);
        await ref.set({ ...dParaSalvar, fotos: [] });
      } else {
        await ref.set(dParaSalvar);
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

  // Merge LOCAL-FIRST para arrays genéricos (obras, fin, etc.).
  // Para o diário usa mergeDiario (abaixo) que compara fotos.
  const mergeArr = (local, cloud) => {
    if (!Array.isArray(cloud) || !cloud.length) return local || [];
    if (!Array.isArray(local) || !local.length) return cloud;
    const localIds = new Set(local.map(x => x.id).filter(Boolean));
    return [...local, ...cloud.filter(x => x.id && !localIds.has(x.id))];
  };

  // Merge do diário: em conflito de ID, prefere a versão com MAIS fotos.
  // Se a contagem for igual, prefere local (preserva edições locais de texto).
  // Isso garante que fotos adicionadas no celular apareçam no notebook.
  const mergeDiario = (local, cloud) => {
    if (!Array.isArray(cloud) || !cloud.length) return local || [];
    if (!Array.isArray(local) || !local.length) return cloud;
    const cloudMap = new Map(cloud.filter(x => x.id).map(x => [x.id, x]));
    const merged = local.map(l => {
      const c = cloudMap.get(l.id);
      if (!c) return l;
      cloudMap.delete(l.id);
      const nLocal = (l.fotos || []).length;
      const nCloud = (c.fotos || []).filter(f => f.url || f.dataUrl).length;
      // Usa cloud se tiver mais fotos; caso igual prefere local (mais recente)
      return nCloud > nLocal ? { ...l, fotos: c.fotos } : l;
    });
    // Entradas que existem só no cloud (novo dispositivo)
    cloudMap.forEach(c => merged.push(c));
    return merged;
  };

  // Para faturamentoMensal (objeto, não array) faz merge por chave,
  // preferindo local em colisão.
  const mergeObj = (local, cloud) => {
    if (!cloud || typeof cloud !== 'object') return local || {};
    if (!local || typeof local !== 'object') return cloud;
    return { ...cloud, ...local };
  };

  // Para escalares (logoData, engNome, etc.): só usa cloud se local for vazio.
  // Evita que um cloud antigo apague configuração local nova.
  const preferLocal = (l, c) => (l !== undefined && l !== null && l !== '') ? l : c;

  const m = { ...state, ...main };
  // Estendido para incluir custosFixos, contas, metas, dividas (antes ficavam
  // fora do merge → cloud-replace puro, perdendo edições locais).
  ['obras','orc','cron','fin','medicoes','empreita','propostas','checklists','capturas','composicoes','custosFixos','contas','metas','dividas']
    .forEach(k => { m[k] = mergeArr(state[k], main[k]); });
  // Sub-coleção é fonte da verdade do diário; mas se ainda estiver vazia,
  // cai pro main.diario (legado caminho A) pra dispositivo fresh recuperar
  // os registros antigos sem fotos.
  const cloudDiarios = remoteDiarios.length ? remoteDiarios : (main.diario || []);
  m.diario = mergeDiario(state.diario, cloudDiarios);

  // Faturamento mensal (objeto)
  m.faturamentoMensal = mergeObj(state.faturamentoMensal, main.faturamentoMensal);

  // Escalares: preserva local se houver
  ['engNome','engRegistro','engSig','empNome','relatorioRodape','logoData']
    .forEach(k => { m[k] = preferLocal(state[k], main[k]); });

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
        const beforeLogin = _lastHash;
        Object.assign(state, merged); window._state = state;
        const afterLogin = calcHash(state);
        if (afterLogin !== beforeLogin) saveStateLocal();
        _lastHash = afterLogin;
        renderAtiva();
        if (window._fbUser) saveToCloud();
        showToast('☁️ Sincronizado!', 2000);
        // Snapshot diário automático no Firebase Storage. Idempotente:
        // se já houver snapshot do dia, sobrescreve. Não bloqueia UX.
        tentarSnapshotDiario();
        // Migração automática: se há fotos em base64 no dispositivo e o
        // usuário acabou de logar, sobe silenciosamente para o Storage.
        const fotosPendentes = (state.diario || []).reduce((a, d) =>
          a + (d.fotos || []).filter(f => !f.url && f.dataUrl).length, 0);
        if (fotosPendentes > 0) {
          showToast(`☁️ Enviando ${fotosPendentes} foto(s) para a nuvem…`, 8000);
          fbMigrarFotosAntigas(state, () => {}).then(r => {
            if (r.migradas > 0) {
              try { localStorage.removeItem('ejh_obras_v4'); } catch (_) {}
              _lastHash = '';
              saveStateLocal();
              saveToCloud();
              showToast(`✅ ${r.migradas} foto(s) enviada(s) para a nuvem`, 4000);
            }
          }).catch(() => {});
        }
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
