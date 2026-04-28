// modules/financeiro.js
import { fmt, fmtD, pad, safeInner, safeText, showToast, openModal, closeModal, statusBadge, popularSelectsObras, obraName, markDeleted } from '../utils.js?v=20260425q';

let _finLimit = 20;
let _hideRT = false;

export function toggleHideRT(state, cb) {
  _hideRT = !!(cb && cb.checked);
  return true;
}

export function addFin(state){
  const desc=document.getElementById('f-fin-desc').value.trim();
  const valor=+document.getElementById('f-fin-valor').value||0;
  if(!desc){
    document.getElementById('f-fin-desc').style.border='1.5px solid var(--red)';
    showToast('⚠️ Informe a descrição do lançamento.');
    return;
  }
  if(valor<=0){
    document.getElementById('f-fin-valor').style.border='1.5px solid var(--red)';
    showToast('⚠️ O valor deve ser maior que zero.');
    return;
  }
  document.getElementById('f-fin-desc').style.border='';
  document.getElementById('f-fin-valor').style.border='';

  // Lê categoria — se for "Personalizada" pega do campo custom
  const catSel = document.getElementById('f-fin-cat').value;
  const catCustom = document.getElementById('f-fin-cat-custom')?.value?.trim();
  let cat = catSel;
  if (catSel === '__custom__') {
    if (!catCustom) { showToast('⚠️ Digite a categoria personalizada'); return; }
    cat = catCustom;
  }

  const editId = document.getElementById('f-fin-id')?.value;
  const dados = {
    tipo:   document.getElementById('f-fin-tipo').value,
    obraId: document.getElementById('f-fin-obra').value,
    data:   document.getElementById('f-fin-data').value,
    desc:   desc,
    cat:    cat,
    status: document.getElementById('f-fin-status').value,
    valor:  valor,
    obs:    document.getElementById('f-fin-obs').value,
  };

  if (editId) {
    const idx = state.fin.findIndex(x => x.id === editId);
    if (idx < 0) { showToast('⚠️ Lançamento não encontrado'); return false; }
    state.fin[idx] = { ...state.fin[idx], ...dados };
    showToast('✅ Lançamento atualizado!');
  } else {
    state.fin.push({ id: 'FIN-'+pad(state.counters.fin), ...dados });
    state.counters.fin++;
    showToast('✅ Lançamento registrado!');
  }
  closeModal('modal-fin');
  return true;
}

export function openEditFin(state, id) {
  const f = state.fin.find(x => x.id === id);
  if (!f) { showToast('⚠️ Lançamento não encontrado'); return; }
  popularSelectsObras(state);
  const set = (k, v) => { const el = document.getElementById(k); if (el) el.value = v ?? ''; };
  set('f-fin-id', f.id);
  set('f-fin-tipo', f.tipo);
  // Atualiza categorias do tipo escolhido antes de setar
  if (typeof window.atualizarCategoriasFin === 'function') window.atualizarCategoriasFin();
  set('f-fin-obra', f.obraId);
  set('f-fin-data', f.data);
  set('f-fin-desc', f.desc);
  set('f-fin-status', f.status || 'pago');
  set('f-fin-valor', f.valor);
  set('f-fin-obs', f.obs);
  // Categoria: se existe na lista padrão usa, senão é personalizada
  const sel = document.getElementById('f-fin-cat');
  const opcoes = Array.from(sel?.options || []).map(o => o.value);
  if (opcoes.includes(f.cat)) {
    sel.value = f.cat;
  } else {
    sel.value = '__custom__';
    const inp = document.getElementById('f-fin-cat-custom');
    if (inp) inp.value = f.cat;
  }
  if (typeof window.toggleCatPersonalizada === 'function') window.toggleCatPersonalizada();
  if(document.getElementById('fin-modal-title')) document.getElementById('fin-modal-title').textContent = '✏️ Editar Lançamento';
  openModal('modal-fin');
}

export function delFin(state, id){
  if(confirm('Excluir este lançamento?')){
    state.fin=state.fin.filter(x=>x.id!==id);
    markDeleted(state, 'fin', id);
    _finLimit=20;
    return true;
  }
  return false;
}

export function openModalFin(state, tipo){
  popularSelectsObras(state);
  // Limpa modo edição
  ['f-fin-id','f-fin-desc','f-fin-valor','f-fin-obs','f-fin-cat-custom'].forEach(k => {
    const el = document.getElementById(k); if (el) el.value = '';
  });
  if(document.getElementById('f-fin-tipo')) document.getElementById('f-fin-tipo').value=tipo;
  // Popula categorias filtradas pelo tipo
  if (typeof window.atualizarCategoriasFin === 'function') window.atualizarCategoriasFin();
  if(document.getElementById('f-fin-status')) document.getElementById('f-fin-status').value='pago';
  if(document.getElementById('fin-modal-title')) document.getElementById('fin-modal-title').textContent=(tipo==='Receita'?'💚 Nova Receita':'🔴 Nova Despesa');
  if(document.getElementById('f-fin-data')) document.getElementById('f-fin-data').value = new Date().toISOString().split('T')[0];
  openModal('modal-fin');
}

// ── CUSTOS FIXOS DA EMPRESA ─────────────────────────────────────────
// Estrutura: { id, desc, valor, diaVencimento, ativo, icon }
// São despesas mensais recorrentes (aluguel, internet, combustível, etc.)
// que se transformam em lançamentos via "Gerar lançamentos do mês".

const CUSTOS_FIXOS_PADRAO = [
  { desc: 'Aluguel do escritório', icon: '🏢' },
  { desc: 'Internet', icon: '🌐' },
  { desc: 'Energia (escritório)', icon: '⚡' },
  { desc: 'Água (escritório)', icon: '💧' },
  { desc: 'Telefone', icon: '📞' },
  { desc: 'Combustível', icon: '⛽' },
  { desc: 'Material de escritório (papel, tinta, etc)', icon: '📑' },
  { desc: 'Contador', icon: '💼' },
  { desc: 'Seguro', icon: '🛡' },
];

export function addCustoFixo(state) {
  const desc = document.getElementById('f-cf-desc')?.value?.trim();
  const valor = +document.getElementById('f-cf-valor')?.value || 0;
  const dia = +document.getElementById('f-cf-dia')?.value || 1;
  const icon = document.getElementById('f-cf-icon')?.value || '💼';
  if (!desc) { showToast('⚠️ Informe a descrição'); return false; }
  if (valor <= 0) { showToast('⚠️ Valor deve ser maior que zero'); return false; }
  if (dia < 1 || dia > 28) { showToast('⚠️ Dia entre 1 e 28'); return false; }

  if (!Array.isArray(state.custosFixos)) state.custosFixos = [];
  if (!state.counters.cf) state.counters.cf = 1;

  const editId = document.getElementById('f-cf-id')?.value;
  const dados = { desc, valor, diaVencimento: dia, icon, ativo: true };

  if (editId) {
    const idx = state.custosFixos.findIndex(c => c.id === editId);
    if (idx < 0) { showToast('⚠️ Não encontrado'); return false; }
    state.custosFixos[idx] = { ...state.custosFixos[idx], ...dados };
    showToast('✅ Custo fixo atualizado!');
  } else {
    state.custosFixos.push({ id: 'CF-' + pad(state.counters.cf), ...dados });
    state.counters.cf++;
    showToast('✅ Custo fixo cadastrado!');
  }
  closeModal('modal-custo-fixo');
  return true;
}

export function delCustoFixo(state, id) {
  if (!confirm('Excluir este custo fixo? (Lançamentos já gerados continuam)')) return false;
  state.custosFixos = (state.custosFixos || []).filter(c => c.id !== id);
  markDeleted(state, 'custosFixos', id);
  return true;
}

export function toggleCustoFixoAtivo(state, id) {
  const c = (state.custosFixos || []).find(x => x.id === id);
  if (!c) return false;
  c.ativo = !c.ativo;
  return true;
}

export function openEditCustoFixo(state, id) {
  const c = (state.custosFixos || []).find(x => x.id === id);
  if (!c) return;
  const set = (k, v) => { const el = document.getElementById(k); if (el) el.value = v ?? ''; };
  set('f-cf-id', c.id);
  set('f-cf-desc', c.desc);
  set('f-cf-valor', c.valor);
  set('f-cf-dia', c.diaVencimento);
  set('f-cf-icon', c.icon || '💼');
  const t = document.querySelector('#modal-custo-fixo .modal-title');
  if (t) t.textContent = '✏️ Editar Custo Fixo — ' + c.id;
  openModal('modal-custo-fixo');
}

export function abrirModalCustoFixo() {
  ['f-cf-id','f-cf-desc','f-cf-valor'].forEach(k => {
    const el = document.getElementById(k); if (el) el.value = '';
  });
  if (document.getElementById('f-cf-dia')) document.getElementById('f-cf-dia').value = '5';
  if (document.getElementById('f-cf-icon')) document.getElementById('f-cf-icon').value = '💼';
  const t = document.querySelector('#modal-custo-fixo .modal-title');
  if (t) t.textContent = '＋ Novo Custo Fixo';
  // Renderiza atalhos de custos padrão
  const wrap = document.getElementById('cf-padrao-wrap');
  if (wrap) {
    wrap.innerHTML = CUSTOS_FIXOS_PADRAO.map(p => `
      <button type="button" class="btn btn-outline btn-xs" onclick="preencherCustoFixoPadrao('${p.desc.replace(/'/g,"\\'")}','${p.icon}')" style="font-size:11.5px">
        ${p.icon} ${p.desc}
      </button>
    `).join('');
  }
  openModal('modal-custo-fixo');
}

export function preencherCustoFixoPadrao(desc, icon) {
  const dEl = document.getElementById('f-cf-desc');
  const iEl = document.getElementById('f-cf-icon');
  if (dEl) dEl.value = desc;
  if (iEl) iEl.value = icon;
  document.getElementById('f-cf-valor')?.focus();
}

// Gera lançamentos de despesa para todos os custos fixos ATIVOS no mês selecionado
export function gerarLancamentosCustosFixos(state) {
  const sel = document.getElementById('cf-mes-gerar');
  const mes = sel?.value; // formato 'YYYY-MM'
  if (!mes) { showToast('⚠️ Selecione o mês'); return false; }
  const ativos = (state.custosFixos || []).filter(c => c.ativo);
  if (!ativos.length) { showToast('⚠️ Nenhum custo fixo ativo'); return false; }

  // Verifica duplicatas: se já existe lançamento desse custoFixoId nesse mês, pula
  const [ano, mm] = mes.split('-');
  const jaExistentes = (state.fin || []).filter(f =>
    f.custoFixoId && f.data?.startsWith(mes)
  ).map(f => f.custoFixoId);

  const novosIds = ativos.filter(c => !jaExistentes.includes(c.id));
  if (!novosIds.length) {
    showToast('ℹ️ Todos os custos fixos do mês já foram gerados.');
    return false;
  }

  if (!confirm(`Gerar ${novosIds.length} lançamento${novosIds.length>1?'s':''} de despesa para ${mes}?`)) return false;

  if (!state.counters.fin) state.counters.fin = 1;
  novosIds.forEach(c => {
    const dia = String(c.diaVencimento).padStart(2,'0');
    const data = `${ano}-${mm}-${dia}`;
    const hojeStr = new Date().toISOString().split('T')[0];
    const status = data > hojeStr ? 'agendado' : (data === hojeStr ? 'pendente' : 'agendado');
    state.fin.push({
      id: 'FIN-' + pad(state.counters.fin),
      tipo: 'Despesa',
      obraId: '__empresa__', // identificador especial
      data,
      desc: `${c.icon || '💼'} ${c.desc} — ${mes}`,
      cat: '🏢 Custo Fixo (Empresa)',
      status,
      valor: c.valor,
      obs: 'Gerado automaticamente do custo fixo ' + c.id,
      custoFixoId: c.id,
    });
    state.counters.fin++;
  });
  showToast(`✅ ${novosIds.length} lançamento${novosIds.length>1?'s':''} criado${novosIds.length>1?'s':''}!`);
  return true;
}

// Renderiza a seção "Custos Fixos da Empresa" na tela financeiro
export function renderCustosFixos(state) {
  const el = document.getElementById('fin-custos-fixos');
  if (!el) return;

  const lista = state.custosFixos || [];
  const totalMensal = lista.filter(c => c.ativo).reduce((a,x) => a + (x.valor||0), 0);

  // Sugere mês atual no select
  const hoje = new Date();
  const mesAtual = hoje.getFullYear() + '-' + String(hoje.getMonth()+1).padStart(2,'0');
  const mesProx = new Date(hoje.getFullYear(), hoje.getMonth()+1, 1);
  const mesProxStr = mesProx.getFullYear() + '-' + String(mesProx.getMonth()+1).padStart(2,'0');

  el.innerHTML = `
    <div class="section" style="border-left:4px solid #7c3aed">
      <div class="section-hdr" style="flex-wrap:wrap;gap:10px">
        <div class="section-title">💼 Custos Fixos da Empresa</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <span style="padding:4px 10px;background:#ede9fe;color:#5b21b6;border-radius:8px;font-size:12px;font-weight:700">Total mensal: ${fmt(totalMensal)}</span>
          <button class="btn btn-outline btn-sm" onclick="abrirModalCustoFixo()" style="color:#7c3aed;border-color:#7c3aed">＋ Novo Custo Fixo</button>
        </div>
      </div>
      ${lista.length ? `
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px">
          ${lista.map(c => `
            <div class="cf-card ${c.ativo ? '' : 'cf-inativo'}">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
                <div style="flex:1;min-width:0">
                  <div style="font-size:18px;line-height:1">${c.icon||'💼'}</div>
                  <div class="cf-desc">${c.desc}</div>
                  <div class="cf-meta">Vence dia ${c.diaVencimento} • <strong>${fmt(c.valor)}</strong>/mês</div>
                </div>
                <div style="display:flex;flex-direction:column;gap:3px;align-items:flex-end">
                  <label style="display:inline-flex;align-items:center;gap:4px;font-size:10.5px;cursor:pointer;color:var(--muted)">
                    <input type="checkbox" ${c.ativo?'checked':''} onchange="toggleCustoFixoAtivo('${c.id}')" style="cursor:pointer;accent-color:#7c3aed">
                    ${c.ativo?'Ativo':'Inativo'}
                  </label>
                  <div style="display:flex;gap:3px">
                    <button class="btn btn-outline btn-xs" onclick="openEditCustoFixo('${c.id}')" style="color:var(--amber);border-color:var(--amber);font-size:10px;padding:2px 6px">✏️</button>
                    <button class="btn btn-outline btn-xs" onclick="delCustoFixo('${c.id}')" style="color:var(--red);border-color:var(--red);font-size:10px;padding:2px 6px">✕</button>
                  </div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:12px;background:#f8faff;border-radius:9px">
          <label style="font-size:12.5px;font-weight:600;color:var(--navy)">📅 Gerar lançamentos do mês:</label>
          <select id="cf-mes-gerar" style="padding:7px 11px;border:1px solid var(--border);border-radius:7px;font-size:13px">
            <option value="${mesAtual}">${mesAtual} (atual)</option>
            <option value="${mesProxStr}" selected>${mesProxStr} (próximo)</option>
          </select>
          <button class="btn btn-primary btn-sm" onclick="gerarLancamentosCustosFixos()" style="background:#7c3aed">⚡ Gerar Lançamentos</button>
          <span style="font-size:11.5px;color:var(--muted)">Cria as despesas como "Agendado" — você marca como "Pago" depois</span>
        </div>
      ` : `
        <div style="background:#fafbff;padding:24px;border-radius:10px;text-align:center;color:var(--muted);font-size:13px">
          Nenhum custo fixo cadastrado. Cadastre os recorrentes (aluguel, internet, combustível...) e gere os lançamentos do mês com 1 clique.
        </div>
      `}
    </div>
  `;
}

// ── DESPESAS PADRÃO POR OBRA ─────────────────────────────────────────
const DESPESAS_PADRAO_OBRA = [
  { desc: 'ART (Anotação de Resp. Técnica)', icon: '📜', cat: '📜 RT / ART / RRT' },
  { desc: 'Placa de Obra', icon: '🪧', cat: '🧾 Outros (Despesa)' },
  { desc: 'CRI (Registro de Imóveis)', icon: '📋', cat: '🏛 Taxas / Impostos' },
  { desc: 'Plotagens / Cópias', icon: '🖨', cat: '🖨 Plotagens / Cópias' },
  { desc: 'Alvará de Construção', icon: '📑', cat: '🏛 Taxas / Impostos' },
  { desc: 'Habite-se / Vistoria', icon: '✅', cat: '🏛 Taxas / Impostos' },
  { desc: 'Ligação de Água', icon: '💧', cat: '🧾 Outros (Despesa)' },
  { desc: 'Ligação de Energia', icon: '⚡', cat: '🧾 Outros (Despesa)' },
  { desc: 'Caçamba / Entulho', icon: '🚛', cat: '🧾 Outros (Despesa)' },
  { desc: 'Sondagem do solo', icon: '⛏', cat: '🔧 Serviço Terceirizado' },
  { desc: 'Topografia', icon: '📐', cat: '🔧 Serviço Terceirizado' },
  { desc: 'EPI / Segurança', icon: '🦺', cat: '🧱 Material' },
];

export function abrirDespesasPadraoObra(state, obraId) {
  const obra = state.obras.find(o => o.id === obraId);
  if (!obra) return;
  window._dpObraId = obraId;
  // Título
  const t = document.querySelector('#modal-despesas-padrao .modal-title');
  if (t) t.textContent = '📋 Despesas Padrão — ' + obra.nome;
  // Renderiza checkboxes
  const grid = document.getElementById('dp-grid');
  if (grid) {
    grid.innerHTML = DESPESAS_PADRAO_OBRA.map((d, i) => `
      <div class="dp-row">
        <label style="display:flex;align-items:center;gap:10px;flex:1;cursor:pointer;font-size:13px">
          <input type="checkbox" id="dp-chk-${i}" data-idx="${i}" style="width:16px;height:16px;accent-color:#7c3aed;cursor:pointer">
          <span style="font-size:18px">${d.icon}</span>
          <span style="font-weight:600;color:var(--navy)">${d.desc}</span>
        </label>
        <input type="number" id="dp-val-${i}" min="0" step="0.01" placeholder="R$ 0,00" style="width:120px;padding:6px 10px;border:1px solid var(--border);border-radius:7px;font-size:13px;text-align:right">
      </div>
    `).join('');
  }
  // Reseta data
  const d = document.getElementById('dp-data');
  if (d) d.value = new Date().toISOString().split('T')[0];
  const s = document.getElementById('dp-status');
  if (s) s.value = 'pago';
  openModal('modal-despesas-padrao');
}

export function salvarDespesasPadraoObra(state) {
  const obraId = window._dpObraId;
  if (!obraId) { showToast('⚠️ Obra não identificada'); return false; }
  const data = document.getElementById('dp-data')?.value;
  const status = document.getElementById('dp-status')?.value || 'pago';
  if (!data) { showToast('⚠️ Selecione a data'); return false; }

  const items = [];
  DESPESAS_PADRAO_OBRA.forEach((d, i) => {
    const chk = document.getElementById('dp-chk-' + i);
    const val = +document.getElementById('dp-val-' + i)?.value || 0;
    if (chk?.checked && val > 0) items.push({ ...d, valor: val });
  });
  if (!items.length) { showToast('⚠️ Marque ao menos um item com valor'); return false; }

  if (!state.counters.fin) state.counters.fin = 1;
  items.forEach(it => {
    state.fin.push({
      id: 'FIN-' + pad(state.counters.fin),
      tipo: 'Despesa',
      obraId,
      data,
      desc: `${it.icon} ${it.desc}`,
      cat: it.cat,
      status,
      valor: it.valor,
      obs: 'Despesa padrão de obra',
    });
    state.counters.fin++;
  });
  closeModal('modal-despesas-padrao');
  showToast(`✅ ${items.length} despesa${items.length>1?'s':''} cadastrada${items.length>1?'s':''}!`);
  return true;
}

// Renderiza card de lançamentos agendados/pendentes (3 meses à frente)
export function renderAgendamentos(state) {
  const el = document.getElementById('fin-agendamentos');
  if (!el) return;

  const hoje = new Date();
  const hojeStr = hoje.toISOString().split('T')[0];
  const limite = new Date(hoje.getTime() + 90*86400000); // próximos 90 dias
  const limiteStr = limite.toISOString().split('T')[0];

  const futuros = state.fin
    .filter(f => (f.status === 'agendado' || f.status === 'pendente') && f.data >= hojeStr && f.data <= limiteStr)
    .sort((a,b) => a.data.localeCompare(b.data));

  if (!futuros.length) {
    el.innerHTML = '';
    return;
  }

  // Agrupar por mês
  const meses = {};
  futuros.forEach(f => {
    const mesKey = f.data.substring(0,7); // YYYY-MM
    (meses[mesKey] = meses[mesKey] || []).push(f);
  });

  const totalReceita = futuros.filter(f => f.tipo === 'Receita').reduce((a,x) => a + x.valor, 0);
  const totalDespesa = futuros.filter(f => f.tipo === 'Despesa').reduce((a,x) => a + x.valor, 0);
  const saldoPrevisto = totalReceita - totalDespesa;

  const mesNome = m => {
    const [y, mo] = m.split('-');
    return new Date(+y, +mo-1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  el.innerHTML = `
    <div class="section" style="border-left:4px solid #2563eb">
      <div class="section-hdr">
        <div class="section-title">📅 Lançamentos Agendados — Próximos 90 dias</div>
        <div style="display:flex;gap:8px;font-size:12px;flex-wrap:wrap">
          <span style="padding:4px 10px;background:#f0fdf4;color:var(--green);border-radius:8px;font-weight:600">↗ ${fmt(totalReceita)} a receber</span>
          <span style="padding:4px 10px;background:#fef2f2;color:var(--red);border-radius:8px;font-weight:600">↘ ${fmt(totalDespesa)} a pagar</span>
          <span style="padding:4px 10px;background:${saldoPrevisto>=0?'#eff6ff':'#fee2e2'};color:${saldoPrevisto>=0?'var(--blue)':'var(--red)'};border-radius:8px;font-weight:700">Saldo previsto: ${fmt(saldoPrevisto)}</span>
        </div>
      </div>
      ${Object.keys(meses).sort().map(mesKey => {
        const lista = meses[mesKey];
        const subRec = lista.filter(f => f.tipo === 'Receita').reduce((a,x) => a + x.valor, 0);
        const subDes = lista.filter(f => f.tipo === 'Despesa').reduce((a,x) => a + x.valor, 0);
        return `
          <div style="margin-bottom:14px">
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:#f8faff;border-radius:8px;margin-bottom:8px">
              <div style="font-family:'Syne',sans-serif;font-weight:700;color:var(--navy);font-size:13.5px;text-transform:capitalize">📆 ${mesNome(mesKey)}</div>
              <div style="font-size:12px;color:var(--muted)">
                ${subRec>0?`<span style="color:var(--green);font-weight:600">+${fmt(subRec)}</span>`:''}
                ${subRec>0&&subDes>0?' · ':''}
                ${subDes>0?`<span style="color:var(--red);font-weight:600">-${fmt(subDes)}</span>`:''}
              </div>
            </div>
            ${lista.map(f => {
              const obra = obraName(state, f.obraId);
              const cor = f.tipo === 'Receita' ? 'var(--green)' : 'var(--red)';
              const sIcon = f.status === 'agendado' ? '📅' : '⏳';
              const diasFalta = Math.ceil((new Date(f.data) - hoje) / 86400000);
              const urgencia = diasFalta <= 3 ? '#fee2e2' : diasFalta <= 7 ? '#fef3c7' : '#fff';
              return `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border-bottom:1px solid var(--border);font-size:13px;background:${urgencia};border-radius:6px;margin-bottom:3px">
                  <div style="flex:1;min-width:0">
                    <div style="font-weight:600;color:var(--navy)">${sIcon} ${f.desc}</div>
                    <div style="font-size:11px;color:var(--muted);margin-top:2px">${fmtD(f.data)} ${diasFalta>=0?`(em ${diasFalta} dia${diasFalta!==1?'s':''})`:''} · ${obra} · ${f.cat}</div>
                  </div>
                  <div style="text-align:right;margin-left:10px">
                    <div style="font-weight:700;color:${cor};font-size:13.5px;white-space:nowrap">${f.tipo==='Receita'?'+':'-'}${fmt(f.valor)}</div>
                    <div style="display:flex;gap:4px;margin-top:4px;justify-content:flex-end">
                      <button class="btn btn-outline btn-xs" onclick="marcarFinPago('${f.id}')" style="color:var(--green);border-color:var(--green);font-size:10px;padding:2px 7px" title="Marcar como pago">✓ Pagar</button>
                      <button class="btn btn-outline btn-xs" onclick="openEditFin('${f.id}')" style="color:var(--amber);border-color:var(--amber);font-size:10px;padding:2px 7px" title="Editar">✏️</button>
                    </div>
                  </div>
                </div>`;
            }).join('')}
          </div>`;
      }).join('')}
    </div>
  `;
}

// Marca um lançamento como pago/recebido (botão rápido nos agendamentos)
export function marcarFinPago(state, id) {
  const f = state.fin.find(x => x.id === id);
  if (!f) return false;
  if (!confirm(`Marcar "${f.desc}" (${f.tipo}: ${fmt(f.valor)}) como ${f.tipo === 'Receita' ? 'recebido' : 'pago'}?`)) return false;
  f.status = 'pago';
  showToast('✅ Marcado como pago!');
  return true;
}

export function renderFinanceiro(state){
  const rec=state.fin.filter(x=>x.tipo==='Receita').reduce((a,x)=>a+x.valor,0);
  const des=state.fin.filter(x=>x.tipo==='Despesa').reduce((a,x)=>a+x.valor,0);
  const sal=rec-des;
  safeText('fin-kpi-rec', fmt(rec));
  safeText('fin-kpi-des', fmt(des));
  const salEl=document.getElementById('fin-kpi-sal');
  if(salEl){
    salEl.textContent=fmt(sal);
    salEl.className='kpi-value '+(sal>=0?'saldo-positivo':'saldo-negativo');
  }

  // Novo Dashboard Avançado
  renderDashFinAvancado(state);

  // Custos Fixos da Empresa (recorrentes)
  renderCustosFixos(state);

  // Card de Lançamentos Agendados (próximos 90 dias)
  renderAgendamentos(state);

  const renderObraRow = o => {
    const r=state.fin.filter(x=>x.obraId===o.id&&x.tipo==='Receita').reduce((a,x)=>a+x.valor,0);
    const d=state.fin.filter(x=>x.obraId===o.id&&x.tipo==='Despesa').reduce((a,x)=>a+x.valor,0);
    const s=r-d;
    return `<tr>
      <td style="font-weight:600">${o.nome}</td>
      <td style="color:var(--green);font-weight:600">${fmt(r)}</td>
      <td style="color:var(--red);font-weight:600">${fmt(d)}</td>
      <td style="font-weight:800;color:${s>=0?'var(--green)':'var(--red)'}">${fmt(s)}</td>
      <td>${statusBadge(o.status)}</td>
      <td><button class="btn btn-outline btn-xs" onclick="abrirDespesasPadraoObra('${o.id}')" style="color:#7c3aed;border-color:#7c3aed;font-size:10.5px;padding:3px 8px" title="Adicionar despesas padrão (ART, placa, CRI...)">📋 Despesas padrão</button></td>
    </tr>`;
  };

  // Por categoria R1 (Projetos)
  const tbR1 = document.getElementById('tbody-fin-r1');
  if(tbR1) {
    const obrasR1 = state.obras.filter(o => o.tipo === 'R1' || o.tipo === 'projeto');
    tbR1.innerHTML = obrasR1.map(renderObraRow).join('') || '<tr><td colspan="6" style="color:var(--muted);padding:10px">Nenhum R1 (Projeto) encontrado.</td></tr>';
  }

  // Por categoria R2 (Obras)
  const tbR2 = document.getElementById('tbody-fin-r2');
  if(tbR2) {
    const obrasR2 = state.obras.filter(o => o.tipo === 'R2' || o.tipo === 'obra' || !o.tipo);
    tbR2.innerHTML = obrasR2.map(renderObraRow).join('') || '<tr><td colspan="6" style="color:var(--muted);padding:10px">Nenhum R2 (Obra) encontrado.</td></tr>';
  }

  // Lançamentos — com paginação
  if(!state.fin.length){
    safeInner('tbody-fin', `<tr><td colspan="8" style="padding:36px;text-align:center;color:var(--muted)">
      <div style="font-size:32px;margin-bottom:8px">💰</div>
      <div style="font-weight:600;color:var(--navy);font-size:14px;margin-bottom:4px">Nenhum lançamento financeiro</div>
      <div style="font-size:12.5px;margin-bottom:14px">Registre receitas e despesas para acompanhar o saldo das suas obras</div>
      <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
        <button class="btn btn-primary btn-sm" onclick="openModalFin('Receita')" style="background:var(--green)">＋ Receita</button>
        <button class="btn btn-primary btn-sm" onclick="openModalFin('Despesa')" style="background:var(--red)">＋ Despesa</button>
      </div>
    </td></tr>`);
    const verMaisWrap = document.getElementById('fin-ver-mais-wrap');
    if(verMaisWrap) verMaisWrap.innerHTML = '';
    return;
  }
  const rtIds = new Set(state.obras.filter(o => o.tipo === 'acompanhamento').map(o => o.id));
  const baseFin = _hideRT ? state.fin.filter(f => !rtIds.has(f.obraId)) : state.fin;
  const sortedFin = [...baseFin].sort((a,b)=>b.data.localeCompare(a.data));
  const totalFin = sortedFin.length;
  const visiveisFin = sortedFin.slice(0, _finLimit);
  const htmlFin = visiveisFin.map(f=>{
    const s = f.status || 'pago';
    const sBadge = `<span class="badge" style="background:${s==='pago'?'#f0fdf4':s==='pendente'?'#fef2f2':'#eff6ff'};color:${s==='pago'?'var(--green)':s==='pendente'?'var(--red)':'var(--blue)'}">${s==='pago'?'✅ Pago':s==='pendente'?'⏳ Pendente':'📅 Agendado'}</span>`;
    
    return `<tr>
      <td>${fmtD(f.data)}</td>
      <td><span class="badge ${f.tipo==='Receita'?'badge-green':'badge-red'}">${f.tipo}</span></td>
      <td style="font-size:12px">${obraName(state, f.obraId)}</td>
      <td style="font-weight:500">${f.desc}</td>
      <td><span class="badge badge-blue" style="font-size:10px">${f.cat}</span></td>
      <td>${sBadge}</td>
      <td style="font-weight:700;color:${f.tipo==='Receita'?'var(--green)':'var(--red)'}">${f.tipo==='Receita'?'+':'-'}${fmt(f.valor)}</td>
      <td style="white-space:nowrap">
        <button class="btn btn-outline btn-xs" onclick="openEditFin('${f.id}')" style="color:var(--amber);border-color:var(--amber);margin-right:3px" title="Editar">✏️</button>
        <button class="btn btn-outline btn-xs" onclick="delFin('${f.id}')" style="color:var(--red);border-color:var(--red)" title="Excluir">✕</button>
      </td>
    </tr>`}).join('');
  
  safeInner('tbody-fin', htmlFin);
  
  const verMaisWrap = document.getElementById('fin-ver-mais-wrap');
  if(totalFin > _finLimit && verMaisWrap){
    verMaisWrap.innerHTML = `<button class="btn btn-outline btn-sm" onclick="window._state.finLimit+=20; renderAtiva()">Ver mais (${totalFin-_finLimit} restantes)</button>`;
  } else if (verMaisWrap) {
    verMaisWrap.innerHTML = '';
  }
}

export function renderDashFinAvancado(state) {
  const container = document.getElementById('dash-fin-avancado');
  if(!container) return;

  const now = new Date();
  const yearNow = now.getFullYear();
  const yearLast = yearNow - 1;
  const monthNow = now.getMonth() + 1;

  const finR1 = state.fin.filter(f => {
    const o = state.obras.find(x => x.id === f.obraId);
    return o && (o.tipo === 'R1' || o.tipo === 'projeto');
  });
  const finR2 = state.fin.filter(f => {
    const o = state.obras.find(x => x.id === f.obraId);
    return o && (o.tipo === 'R2' || o.tipo === 'obra' || !o.tipo);
  });

  const sum = (arr, year, tipo) => arr.filter(f => f.data.startsWith(year) && (!tipo || f.tipo === tipo)).reduce((a,x) => a + x.valor, 0);

  const r1Rec = sum(finR1, String(yearNow), 'Receita');
  const r2Rec = sum(finR2, String(yearNow), 'Receita');
  
  const totalRecYTD = state.fin.filter(f => f.data.startsWith(String(yearNow)) && f.tipo === 'Receita').reduce((a,x) => a+x.valor, 0);
  const avgMensal = totalRecYTD / monthNow;

  const lastYearSamePeriod = state.fin.filter(f => {
    const y = parseInt(f.data.substring(0,4));
    const m = parseInt(f.data.substring(5,7));
    return y === yearLast && m <= monthNow && f.tipo === 'Receita';
  }).reduce((a,x) => a+x.valor, 0);

  const diffPct = lastYearSamePeriod > 0 ? ((totalRecYTD / lastYearSamePeriod) - 1) * 100 : 0;
  const diffColor = diffPct >= 0 ? 'var(--green)' : 'var(--red)';
  const diffIcon = diffPct >= 0 ? '↗' : '↘';

  container.innerHTML = `
    <div class="kpi-grid" style="margin-top:20px; margin-bottom: 30px;">
      <div class="kpi purple">
        <div class="kpi-label">Faturamento R1 (Projeto)</div>
        <div class="kpi-value">${fmt(r1Rec)}</div>
        <div class="kpi-sub">Total no ano ${yearNow}</div>
      </div>
      <div class="kpi blue">
        <div class="kpi-label">Faturamento R2 (Obra)</div>
        <div class="kpi-value">${fmt(r2Rec)}</div>
        <div class="kpi-sub">Total no ano ${yearNow}</div>
      </div>
      <div class="kpi teal">
        <div class="kpi-label">Média Mensal (${yearNow})</div>
        <div class="kpi-value">${fmt(avgMensal)}</div>
        <div class="kpi-sub">Baseado em ${monthNow} mês(es)</div>
      </div>
      <div class="kpi ${diffPct >= 0 ? 'green' : 'red'}">
        <div class="kpi-label">Performance YoY (%)</div>
        <div class="kpi-value" style="color:${diffColor}">${diffIcon} ${diffPct.toFixed(1)}%</div>
        <div class="kpi-sub">vs mesmo período de ${yearLast}</div>
      </div>
    </div>
  `;
}
