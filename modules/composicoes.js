// modules/composicoes.js — Composições próprias de serviço
// ══════════════════════════════════════════════════════════════════════
import { fmt, fmtD, pad, safeInner, safeText, showToast, openModal, closeModal } from '../utils.js';
import { SINAPI, SICOR } from './sinapi.js';

// ── INSUMOS temporários durante edição ────────────────────────────────
let _insumosAtual = [];
let _compSinapiOrigem = null;

export function novaComposicao() {
  _insumosAtual = [];
  _compSinapiOrigem = null;
  const org = document.getElementById('comp-sinapi-origem');
  if (org) { org.style.display = 'none'; org.innerHTML = ''; }
  renderInsumosComp();
  openModal('modal-composicao');
}

export function abrirCopiaSinapi() {
  const modal = document.getElementById('modal-copiar-sinapi');
  if (!modal) {
    const html = `
      <div class="modal-bg open" id="modal-copiar-sinapi" style="display:flex">
        <div class="modal modal-wide">
          <div class="modal-title">📋 Copiar item de tabela de referência</div>
          <div style="display:flex;gap:8px;margin-bottom:10px">
            <button type="button" class="btn btn-outline btn-sm" id="tab-copia-sinapi" onclick="_setCopiaSrc('sinapi')">SINAPI</button>
            <button type="button" class="btn btn-outline btn-sm" id="tab-copia-sicor" onclick="_setCopiaSrc('sicor')">SICOR-MG</button>
            <input id="copia-sinapi-busca" placeholder="Buscar por código ou descrição..." oninput="_filtrarCopiaSinapi(this.value)" style="flex:1;padding:8px;border:1px solid var(--border);border-radius:7px">
          </div>
          <div id="copia-sinapi-lista" style="max-height:420px;overflow:auto;border:1px solid var(--border);border-radius:8px"></div>
          <div class="modal-actions">
            <button class="btn btn-outline" onclick="closeModal('modal-copiar-sinapi')">Cancelar</button>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
  }
  window._copiaSinapiSrc = 'sinapi';
  _renderCopiaSinapiLista();
  openModal('modal-copiar-sinapi');
}

export function _setCopiaSrc(src) {
  window._copiaSinapiSrc = src;
  const sin = document.getElementById('tab-copia-sinapi');
  const sic = document.getElementById('tab-copia-sicor');
  if (sin) sin.classList.toggle('btn-primary', src === 'sinapi');
  if (sic) sic.classList.toggle('btn-primary', src === 'sicor');
  _renderCopiaSinapiLista();
}

export function _filtrarCopiaSinapi(q) {
  _renderCopiaSinapiLista(q);
}

function _renderCopiaSinapiLista(q) {
  const src = window._copiaSinapiSrc || 'sinapi';
  const data = src === 'sinapi' ? SINAPI : SICOR;
  const ql = (q || '').toLowerCase().trim();
  const items = ql
    ? data.filter(x => (x.cod + ' ' + x.desc + ' ' + x.cat).toLowerCase().includes(ql))
    : data;
  const el = document.getElementById('copia-sinapi-lista');
  if (!el) return;
  if (!items.length) {
    el.innerHTML = '<div style="padding:20px;color:var(--muted);text-align:center">Nenhum item encontrado.</div>';
    return;
  }
  el.innerHTML = items.map(s => `
    <div style="display:grid;grid-template-columns:80px 1fr 50px 100px 80px;gap:8px;padding:8px 12px;border-bottom:1px solid var(--border);align-items:center;font-size:12.5px">
      <span style="font-family:monospace;background:#f1f5f9;padding:2px 6px;border-radius:6px;font-size:11px">${s.cod}</span>
      <span>${s.desc}<br><span style="font-size:11px;color:var(--muted)">${s.cat}</span></span>
      <span style="text-align:center">${s.un}</span>
      <span style="text-align:right;font-weight:700">${fmt(s.preco)}</span>
      <button type="button" class="btn btn-primary btn-xs" onclick="_copiarDeSinapi('${s.cod}','${src}')">Copiar</button>
    </div>`).join('');
}

export function _copiarDeSinapi(cod, src) {
  const data = src === 'sinapi' ? SINAPI : SICOR;
  const s = data.find(x => x.cod === cod);
  if (!s) return;
  _compSinapiOrigem = { ...s, src };
  const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
  setVal('f-comp-nome', s.desc);
  setVal('f-comp-cat', _mapCatToComp(s.cat));
  setVal('f-comp-un', s.un);
  setVal('f-comp-cod', (src === 'sinapi' ? 'SINAPI-' : 'SICOR-') + s.cod);
  setVal('f-comp-desc', `Baseado em ${src.toUpperCase()} ${s.cod}. Ajuste os preços conforme a região.`);
  _insumosAtual = [{
    desc: s.desc + ' (base ' + src.toUpperCase() + ' ' + s.cod + ')',
    un: s.un,
    coef: 1,
    preco: s.preco,
  }];
  renderInsumosComp();
  const org = document.getElementById('comp-sinapi-origem');
  if (org) {
    org.style.display = 'block';
    org.innerHTML = `<b>Origem:</b> ${src.toUpperCase()} ${s.cod} — ${fmt(s.preco)}/${s.un}<br>
      <span style="font-size:11px;color:var(--muted)">Ajuste o coeficiente e o preço do insumo abaixo para adaptar à sua região.</span>`;
  }
  closeModal('modal-copiar-sinapi');
  showToast(`✅ Item ${src.toUpperCase()} ${s.cod} copiado como base`);
}

function _mapCatToComp(cat) {
  const map = {
    'Fundações':'Fundações','Estrutura':'Estrutura','Estrutura Metálica':'Estrutura',
    'Alvenaria':'Alvenaria','Cobertura':'Cobertura','Revestimentos':'Revestimento',
    'Instalações':'Hidráulico','Acabamentos':'Pintura','Demolição':'Serviços',
    'Serviços Preliminares':'Serviços',
  };
  return map[cat] || 'Outros';
}

export function addInsumoComp() {
  _insumosAtual.push({ desc: '', un: 'un', coef: 1, preco: 0 });
  renderInsumosComp();
}

export function renderInsumosComp() {
  const el = document.getElementById('comp-insumos-lista');
  if (!el) return;

  if (!_insumosAtual.length) {
    el.innerHTML = `<div style="color:var(--muted);font-size:12.5px;padding:10px;text-align:center">
      Nenhum insumo ainda. Clique em "＋ Adicionar insumo".
    </div>`;
    calcTotalComp(); return;
  }

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:2fr 60px 80px 100px 36px;gap:6px;margin-bottom:6px;font-size:11px;font-weight:700;color:var(--muted);padding:0 4px">
      <span>Descrição do insumo</span><span>Un.</span><span>Coef.</span><span>Preço unit.</span><span></span>
    </div>
    ${_insumosAtual.map((ins, i) => `
    <div style="display:grid;grid-template-columns:2fr 60px 80px 100px 36px;gap:6px;margin-bottom:6px;align-items:center">
      <input value="${ins.desc}" placeholder="Ex: Concreto usinado fck25 MPa"
        oninput="_insumosAtual[${i}].desc=this.value"
        style="padding:6px 9px;border:1px solid var(--border);border-radius:7px;font-size:12.5px;font-family:'DM Sans',sans-serif;background:var(--card);color:var(--text)">
      <input value="${ins.un}" placeholder="m³"
        oninput="_insumosAtual[${i}].un=this.value"
        style="padding:6px 7px;border:1px solid var(--border);border-radius:7px;font-size:12.5px;text-align:center;font-family:'DM Sans',sans-serif;background:var(--card);color:var(--text)">
      <input type="number" value="${ins.coef}" step="0.001" min="0"
        oninput="_insumosAtual[${i}].coef=+this.value;calcTotalComp()"
        style="padding:6px 7px;border:1px solid var(--border);border-radius:7px;font-size:12.5px;text-align:right;font-family:'DM Sans',sans-serif;background:var(--card);color:var(--text)">
      <input type="number" value="${ins.preco}" step="0.01" min="0"
        oninput="_insumosAtual[${i}].preco=+this.value;calcTotalComp()"
        style="padding:6px 7px;border:1px solid var(--border);border-radius:7px;font-size:12.5px;text-align:right;font-family:'DM Sans',sans-serif;background:var(--card);color:var(--text)">
      <button onclick="_insumosAtual.splice(${i},1);renderInsumosComp()"
        style="padding:6px;background:transparent;border:1px solid var(--red);border-radius:7px;color:var(--red);cursor:pointer;font-size:14px;line-height:1">×</button>
    </div>`).join('')}
  `;
  calcTotalComp();
}

export function calcTotalComp() {
  const total = _insumosAtual.reduce((a, x) => a + (x.coef || 0) * (x.preco || 0), 0);
  const el = document.getElementById('comp-total-label');
  if (el) el.textContent = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  return total;
}

export function salvarComposicao(state) {
  const nome = document.getElementById('f-comp-nome')?.value?.trim();
  if (!nome) { showToast('⚠️ Informe o nome da composição'); return false; }
  if (!_insumosAtual.length) { showToast('⚠️ Adicione pelo menos um insumo'); return false; }

  if (!Array.isArray(state.composicoes)) state.composicoes = [];
  if (!state.counters.comp) state.counters.comp = 1;

  const vunit = calcTotalComp();
  const comp = {
    id: 'COMP-' + pad(state.counters.comp),
    nome,
    cat:   document.getElementById('f-comp-cat')?.value  || 'Outros',
    un:    document.getElementById('f-comp-un')?.value   || 'vb',
    cod:   document.getElementById('f-comp-cod')?.value  || '',
    desc:  document.getElementById('f-comp-desc')?.value || '',
    insumos: _insumosAtual.map(x => ({ ...x })),
    vunit,
    criadoEm: new Date().toISOString(),
  };
  state.composicoes.push(comp);
  state.counters.comp++;
  _insumosAtual = [];
  closeModal('modal-composicao');
  showToast('✅ Composição salva: ' + comp.id);
  return true;
}

export function delComposicao(state, id) {
  if (!confirm('Excluir esta composição?')) return false;
  state.composicoes = state.composicoes.filter(c => c.id !== id);
  return true;
}

export function renderComposicoes(state) {
  if (!Array.isArray(state.composicoes)) state.composicoes = [];

  const total   = state.composicoes.length;
  const insumos = state.composicoes.reduce((a, c) => a + c.insumos.length, 0);
  const uso     = state.composicoes.filter(c =>
    state.orc.some(o => o.compId === c.id)
  ).length;

  safeText('comp-kpi-total',   total);
  safeText('comp-kpi-insumos', insumos);
  safeText('comp-kpi-uso',     uso);

  const el = document.getElementById('list-composicoes');
  if (!el) return;

  if (!state.composicoes.length) {
    el.innerHTML = `<div style="background:var(--card);border-radius:var(--radius);padding:40px;text-align:center;box-shadow:var(--shadow)">
      <div style="font-size:40px">🧱</div>
      <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:700;color:var(--navy);margin-top:12px">Nenhuma composição ainda</div>
      <div style="font-size:13px;color:var(--muted);margin-top:6px;margin-bottom:16px">Crie composições com seus próprios insumos, coeficientes e preços</div>
      <button class="btn btn-primary" onclick="openModal('modal-composicao')">＋ Criar primeira composição</button>
    </div>`; return;
  }

  const catColors = {
    'Fundações':'#2563eb','Estrutura':'#7c3aed','Alvenaria':'#0891b2',
    'Cobertura':'#d97706','Hidráulico':'#0ea5e9','Elétrico':'#f59e0b',
    'Revestimento':'#10b981','Pintura':'#ec4899','Serviços':'#64748b','Outros':'#94a3b8'
  };

  el.innerHTML = state.composicoes.map(c => {
    const cor = catColors[c.cat] || '#64748b';
    return `<div style="background:var(--card);border-radius:var(--radius);box-shadow:var(--shadow);margin-bottom:12px;border-left:4px solid ${cor}">
      <div style="padding:14px 18px;border-bottom:1px solid var(--border)">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:4px">
              <span style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:var(--navy)">${c.nome}</span>
              <span style="background:${cor}18;color:${cor};padding:2px 8px;border-radius:8px;font-size:11px;font-weight:700">${c.cat}</span>
              ${c.cod?`<span style="background:#f1f5f9;color:var(--muted);padding:2px 8px;border-radius:8px;font-size:11px">${c.cod}</span>`:''}
            </div>
            ${c.desc?`<div style="font-size:12px;color:var(--muted)">${c.desc}</div>`:''}
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800;color:var(--navy)">${c.vunit.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</div>
            <div style="font-size:11px;color:var(--muted)">por ${c.un} • ${c.insumos.length} insumo(s)</div>
          </div>
        </div>
      </div>
      <!-- Insumos expandidos -->
      <div style="padding:10px 18px;background:#fafbff;font-size:12px;color:var(--muted)">
        ${c.insumos.slice(0,4).map(ins =>
          `<span style="display:inline-block;margin-right:12px;margin-bottom:4px">• ${ins.desc} (${ins.coef}${ins.un} × ${ins.preco.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})})</span>`
        ).join('')}
        ${c.insumos.length>4?`<span style="color:var(--blue)">+${c.insumos.length-4} mais</span>`:''}
      </div>
      <div style="padding:8px 18px;display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-primary btn-sm" onclick="window.abrirInserirComposicao('${c.id}')">↓ Inserir no Orçamento</button>
        <button class="btn btn-outline btn-sm" onclick="window.editarComposicao('${c.id}')">✏️ Editar</button>
        <button class="btn btn-outline btn-sm" style="color:var(--red);border-color:var(--red);margin-left:auto" onclick="window.delComposicao('${c.id}')">🗑</button>
      </div>
    </div>`;
  }).join('');
}

export function filtrarComposicoes(state, q) {
  if (!Array.isArray(state.composicoes)) return;
  const el = document.getElementById('list-composicoes');
  if (!el) return;
  if (!q) { renderComposicoes(state); return; }
  const ql = q.toLowerCase();
  const filtradas = { ...state, composicoes: state.composicoes.filter(c =>
    c.nome.toLowerCase().includes(ql) || c.cat.toLowerCase().includes(ql) || (c.cod||'').toLowerCase().includes(ql)
  )};
  renderComposicoes(filtradas);
}

// Popular select no modal de inserção
export function popularSelectComposicoes(state) {
  const sel = document.getElementById('f-csel-comp');
  if (!sel || !Array.isArray(state.composicoes)) return;
  sel.innerHTML = '<option value="">Selecione a composição...</option>';
  state.composicoes.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.id} — ${c.nome} (${c.vunit.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}/${c.un})`;
    sel.appendChild(opt);
  });
}

export function preencherDadosComposicao(state) {
  const id  = document.getElementById('f-csel-comp')?.value;
  const comp = state.composicoes?.find(c => c.id === id);
  const prev = document.getElementById('f-csel-preview');
  if (!comp) { if (prev) prev.style.display = 'none'; return; }

  const vunitEl = document.getElementById('f-csel-vunit');
  const totEl   = document.getElementById('f-csel-total');
  const qtdEl   = document.getElementById('f-csel-qtd');
  if (vunitEl) vunitEl.value = comp.vunit.toFixed(2);
  if (prev) {
    prev.style.display = 'block';
    prev.innerHTML = `<b>${comp.nome}</b> (${comp.cat} • ${comp.un})<br>
      <span style="font-size:11px;color:var(--muted)">${comp.insumos.map(i=>i.desc).join(' • ')}</span>`;
  }
  calcTotalComposicaoSel();
}

export function calcTotalComposicaoSel() {
  const qtd   = +document.getElementById('f-csel-qtd')?.value  || 0;
  const vunit = +document.getElementById('f-csel-vunit')?.value || 0;
  const totEl = document.getElementById('f-csel-total');
  if (totEl) totEl.value = (qtd * vunit).toFixed(2);
}

export function inserirComposicaoNoOrcamento(state, obraId) {
  const id    = document.getElementById('f-csel-comp')?.value;
  const qtd   = +document.getElementById('f-csel-qtd')?.value  || 1;
  const vunit = +document.getElementById('f-csel-vunit')?.value || 0;
  const comp  = state.composicoes?.find(c => c.id === id);
  if (!comp) { showToast('⚠️ Selecione uma composição'); return false; }

  const oId = obraId || window._currentOrcObraId;
  if (!oId) { showToast('⚠️ Abra o orçamento de uma obra primeiro'); return false; }

  if (!state.counters.orc) state.counters.orc = 1;
  state.orc.push({
    id:     'ORC-' + pad(state.counters.orc),
    obraId: oId,
    compId: comp.id,
    item:   comp.nome,
    sinapi: comp.cod || '',
    un:     comp.un,
    qtd, vunit, real: 0,
  });
  state.counters.orc++;
  closeModal('modal-comp-selecionar');
  showToast(`✅ Composição "${comp.nome}" inserida no orçamento!`);
  return true;
}

export function editarComposicao(state, id) {
  const comp = state.composicoes?.find(c => c.id === id);
  if (!comp) return;
  document.getElementById('f-comp-nome').value = comp.nome;
  document.getElementById('f-comp-cat').value  = comp.cat;
  document.getElementById('f-comp-un').value   = comp.un;
  document.getElementById('f-comp-cod').value  = comp.cod || '';
  document.getElementById('f-comp-desc').value = comp.desc || '';
  _insumosAtual = comp.insumos.map(x => ({ ...x }));
  renderInsumosComp();
  // Override save to update instead of create
  window._editandoCompId = id;
  openModal('modal-composicao');
}
