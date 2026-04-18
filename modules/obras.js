// ══════════════════════════════════════════════════════════════════════
// modules/obras.js — CRUD de obras, validação e renderização
// ══════════════════════════════════════════════════════════════════════

import { fmt, fmtD, pad, safeInner, showToast, statusBadge, tipoLabel, openModal, closeModal, modalidadeIcon, verificarAvisosObra } from '../utils.js';

// Salvar obra nova
export function addObra(state) {
  const nome = document.getElementById('f-obra-nome')?.value.trim();
  const cli  = document.getElementById('f-obra-cliente')?.value.trim();
  if (!nome) { showToast('⚠️ Informe o nome da obra'); if(document.getElementById('f-obra-nome')) document.getElementById('f-obra-nome').focus(); return false; }
  if (!cli)  { showToast('⚠️ Informe o nome do cliente'); if(document.getElementById('f-obra-cliente')) document.getElementById('f-obra-cliente').focus(); return false; }

  const id = 'OBR-'+pad(state.counters.obra);
  state.obras.push({
    id, nome,
    tipo:         document.getElementById('f-obra-tipo')?.value || 'obra',
    cliente:      cli,
    area:        +document.getElementById('f-obra-area')?.value || 0,
    endereco:     document.getElementById('f-obra-end')?.value || '',
    inicio:       document.getElementById('f-obra-inicio')?.value || '',
    fim:          document.getElementById('f-obra-fim')?.value || '',
    status:       document.getElementById('f-obra-status')?.value || 'Em andamento',
    contrato:    +document.getElementById('f-obra-contrato')?.value || 0,
    modalidade:   document.getElementById('f-obra-modalidade')?.value || 'privada',
    numcontrato:  document.getElementById('f-obra-numcontrato')?.value || '',
    periodicidade:document.getElementById('f-obra-periodicidade')?.value || '',
    diamed:      +document.getElementById('f-obra-diamed')?.value || 0,
    obscontrato:  document.getElementById('f-obra-obscontrato')?.value || '',
    ultimaMedicao:'', proximaMedicao:''
  });
  state.counters.obra++;
  closeModal('modal-obra');
  showToast('✅ Obra cadastrada!');
  return true;
}

// Excluir obra
export function delObra(state, id) {
  if (!confirm('Excluir esta obra e todos os dados associados?')) return false;
  state.obras    = state.obras.filter(x=>x.id!==id);
  state.orc      = state.orc.filter(x=>x.obraId!==id);
  state.cron     = state.cron.filter(x=>x.obraId!==id);
  state.diario   = state.diario.filter(x=>x.obraId!==id);
  state.fin      = state.fin.filter(x=>x.obraId!==id);
  state.medicoes = state.medicoes.filter(x=>x.obraId!==id);
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
    return `<tr>
      <td><span class="badge ${o.tipo==='projeto' || o.tipo==='R1'?'badge-purple':'badge-blue'}">${tipoLabel(o.tipo)}</span></td>
      <td class="td-id">${o.id}</td>
      <td style="font-weight:600">${o.nome}${avisoHtml}</td>
      <td>${o.cliente||'—'}</td>
      <td>${(o.area||0).toLocaleString('pt-BR')} m²</td>
      <td>${modalidadeIcon(o.modalidade||'privada')}</td>
      <td>${fmtD(o.inicio)}</td><td>${fmtD(o.fim)}</td>
      <td>${statusBadge(o.status)}</td>
      <td style="white-space:nowrap">
        <button onclick="registrarMedicaoRapida('${o.id}')" class="btn btn-outline btn-xs" style="color:var(--blue);border-color:var(--blue);margin-right:3px" title="Registrar medição">📏</button>
        <button onclick="delObra('${o.id}')" class="btn btn-outline btn-xs" style="color:var(--red);border-color:var(--red)">✕</button>
      </td>
    </tr>`;
  }).join(''));
}



