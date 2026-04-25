// ══════════════════════════════════════════════════════════════════════
// modules/obras.js — CRUD de obras, validação e renderização
// ══════════════════════════════════════════════════════════════════════

import { fmt, fmtD, pad, safeInner, showToast, statusBadge, tipoLabel, openModal, closeModal, modalidadeIcon, verificarAvisosObra, escapeHtml, markDeleted } from '../utils.js?v=20260425g';

const val = id => document.getElementById(id)?.value?.trim() || '';
const num = id => +document.getElementById(id)?.value || 0;

function lerFormObra() {
  return {
    nome:          val('f-obra-nome'),
    tipo:          val('f-obra-tipo') || 'obra',
    cliente:       val('f-obra-cliente'),
    cliTel:        val('f-obra-cli-tel'),
    cliEmail:      val('f-obra-cli-email'),
    cliDoc:        val('f-obra-cli-doc'),
    area:          num('f-obra-area'),
    endereco:      val('f-obra-end'),
    rt:            val('f-obra-rt'),
    crea:          val('f-obra-crea'),
    inicio:        val('f-obra-inicio'),
    fim:           val('f-obra-fim'),
    status:        val('f-obra-status') || 'Em andamento',
    contrato:      num('f-obra-contrato'),
    modalidade:    val('f-obra-modalidade') || 'privada',
    numcontrato:   val('f-obra-numcontrato'),
    periodicidade: val('f-obra-periodicidade'),
    diamed:        num('f-obra-diamed'),
    obscontrato:   val('f-obra-obscontrato'),
  };
}

// Salvar obra nova
export function addObra(state) {
  const dados = lerFormObra();
  if (!dados.nome) { showToast('⚠️ Informe o nome da obra'); document.getElementById('f-obra-nome')?.focus(); return false; }
  if (!dados.cliente) { showToast('⚠️ Informe o nome do cliente'); document.getElementById('f-obra-cliente')?.focus(); return false; }

  const id = 'OBR-'+pad(state.counters.obra);
  state.obras.push({ id, ...dados, ultimaMedicao:'', proximaMedicao:'' });
  state.counters.obra++;
  closeModal('modal-obra');
  showToast('✅ Obra cadastrada!');
  return true;
}

// Abrir formulário para editar obra existente
export function openEditObra(state, id) {
  const o = state.obras.find(x => x.id === id);
  if (!o) { showToast('⚠️ Obra não encontrada'); return; }
  const set = (k, v) => { const el = document.getElementById(k); if (el) el.value = v ?? ''; };
  set('f-obra-id', o.id);
  set('f-obra-tipo', o.tipo);
  set('f-obra-modalidade', o.modalidade || 'privada');
  set('f-obra-nome', o.nome);
  set('f-obra-cliente', o.cliente);
  set('f-obra-cli-tel', o.cliTel);
  set('f-obra-cli-email', o.cliEmail);
  set('f-obra-cli-doc', o.cliDoc);
  set('f-obra-area', o.area);
  set('f-obra-end', o.endereco);
  set('f-obra-rt', o.rt);
  set('f-obra-crea', o.crea);
  set('f-obra-inicio', o.inicio);
  set('f-obra-fim', o.fim);
  set('f-obra-status', o.status);
  set('f-obra-contrato', o.contrato);
  set('f-obra-numcontrato', o.numcontrato);
  set('f-obra-periodicidade', o.periodicidade);
  set('f-obra-diamed', o.diamed);
  set('f-obra-obscontrato', o.obscontrato);
  const t = document.getElementById('modal-obra-title');
  if (t) t.textContent = '✏️ Editar ' + o.id;
  openModal('modal-obra');
}

// Cria OU atualiza obra, dependendo do campo oculto f-obra-id
export function salvarObra(state) {
  const id = document.getElementById('f-obra-id')?.value;
  if (!id) return addObra(state);
  const i = state.obras.findIndex(o => o.id === id);
  if (i < 0) { showToast('⚠️ Obra não encontrada'); return false; }
  const dados = lerFormObra();
  if (!dados.nome) { showToast('⚠️ Informe o nome da obra'); return false; }
  if (!dados.cliente) { showToast('⚠️ Informe o nome do cliente'); return false; }
  state.obras[i] = { ...state.obras[i], ...dados };
  closeModal('modal-obra');
  showToast('✅ Obra atualizada!');
  return true;
}

// Reset do form para novo cadastro (limpa id oculto e título)
export function resetFormObra() {
  const ids = ['f-obra-id','f-obra-nome','f-obra-cliente','f-obra-cli-tel','f-obra-cli-email',
    'f-obra-cli-doc','f-obra-area','f-obra-end','f-obra-rt','f-obra-crea','f-obra-inicio',
    'f-obra-fim','f-obra-contrato','f-obra-numcontrato','f-obra-diamed','f-obra-obscontrato'];
  ids.forEach(k => { const el = document.getElementById(k); if (el) el.value = ''; });
  const t = document.getElementById('modal-obra-title');
  if (t) t.textContent = '🏗 Nova Atividade';
}

// Excluir obra
export function delObra(state, id) {
  if (!confirm('Excluir esta obra e todos os dados associados?')) return false;
  // Captura ids relacionados ANTES de filtrar, para gerar tombstones
  const orcIds  = state.orc.filter(x=>x.obraId===id).map(x=>x.id);
  const cronIds = state.cron.filter(x=>x.obraId===id).map(x=>x.id);
  const diaIds  = state.diario.filter(x=>x.obraId===id).map(x=>x.id);
  const finIds  = state.fin.filter(x=>x.obraId===id).map(x=>x.id);
  const medIds  = state.medicoes.filter(x=>x.obraId===id).map(x=>x.id);
  state.obras    = state.obras.filter(x=>x.id!==id);
  state.orc      = state.orc.filter(x=>x.obraId!==id);
  state.cron     = state.cron.filter(x=>x.obraId!==id);
  state.diario   = state.diario.filter(x=>x.obraId!==id);
  state.fin      = state.fin.filter(x=>x.obraId!==id);
  state.medicoes = state.medicoes.filter(x=>x.obraId!==id);
  markDeleted(state, 'obras', id);
  orcIds.forEach(i => markDeleted(state, 'orc', i));
  cronIds.forEach(i => markDeleted(state, 'cron', i));
  diaIds.forEach(i => markDeleted(state, 'diario', i));
  finIds.forEach(i => markDeleted(state, 'fin', i));
  medIds.forEach(i => markDeleted(state, 'medicoes', i));
  return true;
}

// Registrar medição rápida
export function registrarMedicaoRapida(state, obraId) {
  const obra = state.obras.find(o=>o.id===obraId);
  if (!obra) return false;
  const hoje = new Date().toISOString().split('T')[0];
  if (!confirm(`Registrar medição realizada hoje (${fmtD(hoje)}) para "${obra.nome}"?`)) return false;
  const idx = state.obras.findIndex(o=>o.id===obraId);
  if (idx >= 0) {
    state.obras[idx].ultimaMedicao = hoje;
    const ciclo = { mensal:30, quinzenal:15, semanal:7, por_pl:30 }[obra.periodicidade] || 30;
    const prox = new Date(new Date(hoje).getTime() + ciclo*86400000);
    state.obras[idx].proximaMedicao = prox.toISOString().split('T')[0];
  }
  showToast('✅ Medição registrada! Próxima: '+fmtD(state.obras[idx]?.proximaMedicao||''));
  return true;
}

// Renderizar tabela de obras
export function renderObras(state) {
  safeInner('tbody-obras', state.obras.map(o => {
    const aviso = verificarAvisosObra(o);
    const avisoHtml = aviso
      ? `<span style="margin-left:6px;font-size:10px;padding:2px 6px;border-radius:8px;font-weight:700;background:${aviso.tipo==='vencida'?'#fee2e2':'#fef3c7'};color:${aviso.tipo==='vencida'?'#991b1b':'#92400e'}">
          ${aviso.tipo==='vencida'?'⚠️ Med. '+aviso.dias+'d atraso':'🔔 Med. em '+aviso.dias+'d'}
        </span>` : '';
    const tipoBadgeClass = o.tipo==='acompanhamento' ? 'badge-teal'
                         : (o.tipo==='projeto' || o.tipo==='R1' ? 'badge-purple' : 'badge-blue');
    const tipoBadgeIcon  = o.tipo==='acompanhamento' ? '🔍 ' : '';
    return `<tr>
      <td><span class="badge ${tipoBadgeClass}">${tipoBadgeIcon}${tipoLabel(o.tipo)}</span></td>
      <td class="td-id">${o.id}</td>
      <td style="font-weight:600">${escapeHtml(o.nome)}${avisoHtml}</td>
      <td>${escapeHtml(o.cliente||'—')}</td>
      <td>${(o.area||0).toLocaleString('pt-BR')} m²</td>
      <td>${modalidadeIcon(o.modalidade||'privada')}</td>
      <td>${fmtD(o.inicio)}</td><td>${fmtD(o.fim)}</td>
      <td>${statusBadge(o.status)}</td>
      <td style="white-space:nowrap">
        <button onclick="registrarMedicaoRapida('${o.id}')" class="btn btn-outline btn-xs" style="color:var(--blue);border-color:var(--blue);margin-right:3px" title="Registrar medição">📏</button>
        <button onclick="openEditObra('${o.id}')" class="btn btn-outline btn-xs" style="color:var(--amber);border-color:var(--amber);margin-right:3px" title="Editar obra">✏️</button>
        <button onclick="delObra('${o.id}')" class="btn btn-outline btn-xs" style="color:var(--red);border-color:var(--red)">✕</button>
      </td>
    </tr>`;
  }).join(''));
}



