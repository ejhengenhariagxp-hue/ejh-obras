// ══════════════════════════════════════════════════════════════════════
// modules/orcamento.js — Orçamento por obra
// ══════════════════════════════════════════════════════════════════════

import { fmt, fmtD, pad, safeInner, showToast, openModal, closeModal } from '../utils.js';

export function addOrc(state) {
  const obraId = document.getElementById('f-orc-obra')?.value;
  const item   = document.getElementById('f-orc-item')?.value.trim();
  if (!obraId) { showToast('⚠️ Selecione uma obra'); return false; }
  if (!item)   { showToast('⚠️ Informe o item/serviço'); document.getElementById('f-orc-item').focus(); return false; }

  state.orc.push({
    id:     'ORC-'+pad(state.counters.orc),
    obraId, item,
    sinapi: document.getElementById('f-orc-sinapi')?.value || '',
    un:     document.getElementById('f-orc-un')?.value || 'vb',
    qtd:   +document.getElementById('f-orc-qtd')?.value || 0,
    vunit: +document.getElementById('f-orc-vunit')?.value || 0,
    real:  +document.getElementById('f-orc-real')?.value || 0,
  });
  state.counters.orc++;
  closeModal('modal-orc');
  showToast('✅ Item adicionado!');
  return true;
}

export function delOrc(state, id) {
  if (!confirm('Excluir este item do orçamento?')) return false;
  state.orc = state.orc.filter(x => x.id !== id);
  return true;
}

export function renderOrcObra(state, obraId) {
  const itens = state.orc.filter(x => x.obraId === obraId);
  const totOrc  = itens.reduce((a,x)=>a+x.qtd*x.vunit, 0);
  const totReal = itens.reduce((a,x)=>a+x.real, 0);
  const desvio  = totOrc > 0 ? ((totReal/totOrc)-1)*100 : 0;

  return `
  <div style="background:var(--card);border-radius:var(--radius);box-shadow:var(--shadow);overflow:hidden;margin-bottom:12px">
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>ID</th><th>Item/Serviço</th><th>SINAPI</th>
          <th>Un.</th><th>Qtd</th><th>V.Unit</th>
          <th>Total Orçado</th><th>Realizado</th><th>Desvio</th><th></th>
        </tr></thead>
        <tbody>${itens.map(x => {
          const tot = x.qtd*x.vunit;
          const dev = tot>0 ? ((x.real/tot)-1)*100 : 0;
          return `<tr>
            <td class="td-id">${x.id}</td>
            <td style="font-weight:500">${x.item}</td>
            <td style="font-size:11px;color:var(--muted)">${x.sinapi||'—'}</td>
            <td>${x.un}</td><td>${x.qtd.toLocaleString('pt-BR')}</td>
            <td>${fmt(x.vunit)}</td>
            <td style="font-weight:600">${fmt(tot)}</td>
            <td>${fmt(x.real)}</td>
            <td style="color:${dev>10?'var(--red)':dev<-10?'var(--green)':'var(--muted)'}">
              ${dev>0?'+':''}${dev.toFixed(1)}%
            </td>
            <td><button onclick="delOrc('${x.id}')" class="btn btn-outline btn-xs" style="color:var(--red);border-color:var(--red)">✕</button></td>
          </tr>`;
        }).join('')}</tbody>
        <tfoot><tr>
          <td colspan="6" style="text-align:right;font-weight:700">TOTAIS</td>
          <td style="font-weight:700">${fmt(totOrc)}</td>
          <td style="font-weight:700">${fmt(totReal)}</td>
          <td style="color:${desvio>10?'var(--red)':desvio<-10?'var(--green)':'var(--muted)'}">
            ${desvio>0?'+':''}${desvio.toFixed(1)}%
          </td>
          <td></td>
        </tr></tfoot>
      </table>
    </div>
  </div>`;
}

export function renderOrc(state) {
  const obras = state.obras;
  if (!obras.length) {
    safeInner('orcamento-lista-obras', '<div style="color:var(--muted);padding:40px;text-align:center">Nenhuma obra cadastrada.</div>');
    return;
  }
  safeInner('orcamento-lista-obras', obras.map(o => {
    const itens = state.orc.filter(x=>x.obraId===o.id);
    const tot = itens.reduce((a,x)=>a+x.qtd*x.vunit,0);
    const real= itens.reduce((a,x)=>a+x.real,0);
    const pct = tot>0 ? Math.round(real/tot*100) : 0;
    return `<div class="obra-card" style="cursor:pointer" onclick="abrirOrcamentoObra('${o.id}')">
      <div class="obra-card-title">${o.nome}</div>
      <div class="obra-card-meta">
        <span>👤 ${o.cliente}</span>
        <span>${itens.length} itens</span>
        <span>💰 ${fmt(tot)}</span>
      </div>
      <div style="margin-top:8px">
        <div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:4px">
          <span style="color:var(--muted)">Realizado</span>
          <span style="font-weight:700;color:${pct>=100?'var(--red)':pct>=80?'var(--amber)':'var(--blue)'}">${pct}%</span>
        </div>
        <div style="height:5px;background:#e2e8f0;border-radius:3px">
          <div style="height:100%;width:${Math.min(pct,100)}%;background:${pct>=100?'var(--red)':pct>=80?'var(--amber)':'var(--blue)'};border-radius:3px"></div>
        </div>
      </div>
    </div>`;
  }).join(''));
}


export function abrirOrcamentoObra(state, obraId) {
  const obra = state.obras.find(o=>o.id===obraId);
  if (!obra) return;
  const lista   = document.getElementById('orcamento-lista-obras');
  const detalhe = document.getElementById('orcamento-detalhe');
  if (lista)   lista.style.display   = 'none';
  if (detalhe) detalhe.style.display = 'block';
  const title = document.getElementById('orc-detalhe-nome');
  if (title) title.textContent = obra.nome + ' — Orçamento detalhado';
  renderOrcDetalhe(state, obraId);
  window._currentOrcObraId = obraId;
}

export function voltarOrcLista() {
  const lista   = document.getElementById('orcamento-lista-obras');
  const detalhe = document.getElementById('orcamento-detalhe');
  if (lista)   lista.style.display   = '';
  if (detalhe) detalhe.style.display = 'none';
  window._currentOrcObraId = null;
}

export function renderOrcDetalhe(state, obraId) {
  const id = obraId || window._currentOrcObraId;
  if (!id) return;
  const itens  = state.orc.filter(x=>x.obraId===id);
  const totOrc  = itens.reduce((a,x)=>a+x.qtd*x.vunit,0);
  const totReal = itens.reduce((a,x)=>a+x.real,0);
  const desvio  = totOrc>0?((totReal/totOrc)-1)*100:0;
  const tbody = document.getElementById('tbody-orc-detalhe');
  if (!tbody) return;
  tbody.innerHTML = itens.map(x=>{
    const tot=x.qtd*x.vunit;
    const dev=tot>0?((x.real/tot)-1)*100:0;
    return `<tr>
      <td style="font-weight:500">${x.item}</td>
      <td>${x.un}</td>
      <td>${x.qtd.toLocaleString('pt-BR')}</td>
      <td>${(+(x.vunit)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td>
      <td style="font-weight:600">${(tot).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td>
      <td>${(+(x.real)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td>
      <td style="color:${dev>10?'var(--red)':dev<-10?'var(--green)':'var(--muted)'}">
        ${dev>0?'+':''}${dev.toFixed(1)}%
      </td>
      <td><button onclick="window.delOrc('${x.id}')" class="btn btn-outline btn-xs" style="color:var(--red);border-color:var(--red)">✕</button></td>
    </tr>`;
  }).join('');
  // Totals footer
  const tOrc  = document.getElementById('tfoot-orc-tot');
  const tReal = document.getElementById('tfoot-orc-real');
  const tDev  = document.getElementById('tfoot-orc-dev');
  const f = v=>(+v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  if (tOrc)  tOrc.textContent  = f(totOrc);
  if (tReal) tReal.textContent = f(totReal);
  if (tDev)  tDev.textContent  = (desvio>0?'+':'')+desvio.toFixed(1)+'%';
  if (tDev)  tDev.style.color  = desvio>10?'var(--red)':desvio<-10?'var(--green)':'var(--muted)';
}
