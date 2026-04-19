// modules/orcamento.js — Orçamento por obra
import { fmt, fmtD, pad, safeInner, showToast, openModal, closeModal } from '../utils.js';
import { iaCall } from '../services.js';

export function addOrc(state) {
  const obraId = document.getElementById('f-orc-obra')?.value;
  const item   = document.getElementById('f-orc-item')?.value.trim();
  if (!obraId) { showToast('⚠️ Selecione uma obra'); return false; }
  if (!item)   { showToast('⚠️ Informe o item/serviço'); if(document.getElementById('f-orc-item')) document.getElementById('f-orc-item').focus(); return false; }

  const editId = document.getElementById('f-orc-id')?.value;
  
  const data = {
    obraId, item,
    sinapi: document.getElementById('f-orc-sinapi')?.value || '',
    un:     document.getElementById('f-orc-un')?.value || 'vb',
    qtd:   +document.getElementById('f-orc-qtd')?.value || 0,
    vunit: +document.getElementById('f-orc-vunit')?.value || 0,
    real:  +document.getElementById('f-orc-real')?.value || 0,
  };

  if (editId) {
    const idx = state.orc.findIndex(x => x.id === editId);
    if (idx !== -1) {
      state.orc[idx] = { ...state.orc[idx], ...data };
      showToast('✅ Item atualizado!');
    }
  } else {
    state.orc.push({
      id: 'ORC-'+pad(state.counters.orc),
      ...data
    });
    state.counters.orc++;
    showToast('✅ Item adicionado!');
  }
  return true;
}

export function delOrc(state, id) {
  if (!confirm('Excluir este item do orçamento?')) return false;
  return true;
}

export function openEditOrc(state, id) {
  const x = state.orc.find(i => i.id === id);
  if (!x) return;
  const elId = document.getElementById('f-orc-id');
  if(elId) elId.value = x.id;
  if(document.getElementById('f-orc-obra')) document.getElementById('f-orc-obra').value = x.obraId;
  if(document.getElementById('f-orc-item')) document.getElementById('f-orc-item').value = x.item;
  if(document.getElementById('f-orc-sinapi')) document.getElementById('f-orc-sinapi').value = x.sinapi || '';
  if(document.getElementById('f-orc-un')) document.getElementById('f-orc-un').value = x.un || 'vb';
  if(document.getElementById('f-orc-qtd')) document.getElementById('f-orc-qtd').value = x.qtd;
  if(document.getElementById('f-orc-vunit')) document.getElementById('f-orc-vunit').value = x.vunit;
  if(document.getElementById('f-orc-real')) document.getElementById('f-orc-real').value = x.real || 0;
  openModal('modal-orc');
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
  const obra = state.obras.find(o=>o.id===id);
  // Nota: o parâmetro obraId é passado. Mas aqui vou usar state.obras.find(o=>o.id===obraId)
  const o = state.obras.find(x=>x.id===obraId);
  if (!o) return;
  const lista   = document.getElementById('orcamento-lista-obras');
  const detalhe = document.getElementById('orcamento-detalhe');
  if (lista)   lista.style.display   = 'none';
  if (detalhe) detalhe.style.display = 'block';
  const title = document.getElementById('orc-detalhe-nome');
  if (title) title.textContent = o.nome + ' — Orçamento detalhado';
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
      <td>${fmt(x.vunit)}</td>
      <td style="font-weight:600">${fmt(tot)}</td>
      <td>${fmt(x.real)}</td>
      <td style="color:${dev>10?'var(--red)':dev<-10?'var(--green)':'var(--muted)'}">
        ${dev>0?'+':''}${dev.toFixed(1)}%
      </td>
      <td>
        <div style="display:flex;gap:4px">
          <button onclick="openEditOrc('${x.id}')" class="btn btn-outline btn-xs" style="color:var(--blue);border-color:var(--blue)">✏️</button>
          <button onclick="delOrc('${x.id}')" class="btn btn-outline btn-xs" style="color:var(--red);border-color:var(--red)">✕</button>
        </div>
      </td>
    </tr>`;
  }).join('');
  
  const tOrc  = document.getElementById('tfoot-orc-tot');
  const tReal = document.getElementById('tfoot-orc-real');
  const tDev  = document.getElementById('tfoot-orc-dev');
  if (tOrc)  tOrc.textContent  = fmt(totOrc);
  if (tReal) tReal.textContent = fmt(totReal);
  if (tDev)  {
    tDev.textContent  = (desvio>0?'+':'')+desvio.toFixed(1)+'%';
    tDev.style.color  = desvio>10?'var(--red)':desvio<-10?'var(--green)':'var(--muted)';
  }
}

export async function gerarOrcamentoComIA(state) {
  const item = document.getElementById('f-orc-item')?.value?.trim();
  if (!item) { showToast('⚠️ Descreva o item/serviço'); return; }
  const btn = document.getElementById('orc-ia-btn');
  const loading = document.getElementById('orc-ia-loading');
  if (btn) btn.disabled = true;
  if (loading) loading.style.display = 'block';
  try {
    const system = 'Você é orçamentista experiente no Brasil (MG). Analise a descrição do item e preencha:\n' +
      '- SINAPI: código SINAPI-MG mais relevante (se aplicável)\n' +
      '- un: unidade (m³, m², kg, vb, h, un…)\n' +
      '- qtd: quantidade estimada (baseado na obra)\n' +
      '- vunit: valor unitário em R$ (tabela SINAPI MG atual)\n' +
      'RESPONDA APENAS JSON: {"sinapi":"","un":"","qtd":0,"vunit":0}';
    const obra = state?.obras?.find(o => o.id === document.getElementById('f-orc-obra')?.value);
    const ctx = obra ? `Obra: ${obra.nome} | Área: ${obra.area}m² | Tipo: ${obra.modalidade}` : '';
    const resp = await iaCall(system, `${ctx}\n\nItem: ${item}`, 500);
    const data = JSON.parse(resp.replace(/```json|```/g, '').trim());
    if (data.sinapi) document.getElementById('f-orc-sinapi').value = data.sinapi;
    if (data.un) document.getElementById('f-orc-un').value = data.un;
    if (data.qtd) document.getElementById('f-orc-qtd').value = data.qtd;
    if (data.vunit) document.getElementById('f-orc-vunit').value = data.vunit;
    showToast('✅ Preenchido pela IA!');
  } catch (e) {
    showToast('❌ Erro: ' + e.message);
  } finally {
    if (btn) btn.disabled = false;
    if (loading) loading.style.display = 'none';
  }
}
