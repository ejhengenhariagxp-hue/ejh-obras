// modules/financeiro.js
import { fmt, fmtD, pad, safeInner, safeText, showToast, openModal, closeModal, statusBadge, popularSelectsObras, obraName, markDeleted } from '../utils.js?v=20260501g';

let _finLimit = 20;
// Filtra transferências internas: elas movem dinheiro entre contas, mas
// não devem contar como faturamento, despesa real ou saldo líquido.
// (Continuam contando no saldo de cada conta bancária — o dinheiro
// realmente entrou/saiu fisicamente da conta.)
const _semTransf = f => !f.transferGroupId;

let _hideRT = false;
let _resumoMesSel = ''; // '' = mês corrente

export function toggleHideRT(state, cb) {
  _hideRT = !!(cb && cb.checked);
  return true;
}

// Atualiza status dos lançamentos não pagos conforme a data:
// - data >= hoje  → 'a_vencer'
// - data <  hoje  → 'pendente' (vencido)
// Compatibiliza status legado 'agendado' migrando para 'a_vencer'.
export function atualizarStatusVencimentos(state) {
  if (!state || !Array.isArray(state.fin)) return false;
  const hojeStr = new Date().toISOString().split('T')[0];
  let mudou = false;
  state.fin.forEach(f => {
    if (f.status === 'agendado') { f.status = 'a_vencer'; mudou = true; }
    if (f.status === 'pago') return;
    const novo = (f.data && f.data >= hojeStr) ? 'a_vencer' : 'pendente';
    if (f.status !== novo) { f.status = novo; mudou = true; }
  });
  return mudou;
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
    tipo:    document.getElementById('f-fin-tipo').value,
    obraId:  document.getElementById('f-fin-obra').value,
    data:    document.getElementById('f-fin-data').value,
    desc:    desc,
    cat:     cat,
    status:  document.getElementById('f-fin-status').value,
    valor:   valor,
    obs:     document.getElementById('f-fin-obs').value,
    contaId: document.getElementById('f-fin-conta')?.value || '',
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
  popularContasSelect(state, 'f-fin-conta');
  set('f-fin-conta', f.contaId || '');
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

  // Desabilita parcelamento ao editar (não faz sentido parcelar lançamento existente)
  const cbParc = document.getElementById('f-fin-parc-on');
  const wrapParc = document.getElementById('f-fin-parc-wrap');
  const btnSalvar = document.getElementById('f-fin-btn-salvar');
  const btnGerar  = document.getElementById('f-fin-btn-gerar');
  if (cbParc) { cbParc.checked = false; cbParc.disabled = true; }
  if (wrapParc) wrapParc.style.display = 'none';
  if (btnSalvar) btnSalvar.style.display = '';
  if (btnGerar) btnGerar.style.display = 'none';

  openModal('modal-fin');
}

export function delFin(state, id){
  const f = (state.fin || []).find(x => x.id === id);
  // Se é uma transferência, remove as duas pontas vinculadas
  if (f?.transferGroupId) {
    const linked = (state.fin || []).filter(x => x.transferGroupId === f.transferGroupId);
    if (!confirm(`Este lançamento faz parte de uma transferência (${linked.length} lançamentos vinculados). Excluir todos?`)) return false;
    linked.forEach(x => markDeleted(state, 'fin', x.id));
    state.fin = state.fin.filter(x => x.transferGroupId !== f.transferGroupId);
    _finLimit = 20;
    return true;
  }
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
  popularContasSelect(state, 'f-fin-conta');
  // Limpa modo edição
  ['f-fin-id','f-fin-desc','f-fin-valor','f-fin-obs','f-fin-cat-custom','f-fin-parc-num','f-fin-parc-entrada'].forEach(k => {
    const el = document.getElementById(k); if (el) el.value = '';
  });
  // Reset do bloco de parcelamento (e reabilita ao criar novo lançamento)
  const cbParc = document.getElementById('f-fin-parc-on');
  if (cbParc) { cbParc.checked = false; cbParc.disabled = false; }
  const wrapParc = document.getElementById('f-fin-parc-wrap');
  if (wrapParc) wrapParc.style.display = 'none';
  if (document.getElementById('f-fin-parc-dias')) document.getElementById('f-fin-parc-dias').value = '30';
  // Garante que botão Salvar está visível e Gerar Parcelas escondido
  const btnSalvarNF = document.getElementById('f-fin-btn-salvar');
  const btnGerarNF  = document.getElementById('f-fin-btn-gerar');
  if (btnSalvarNF) btnSalvarNF.style.display = '';
  if (btnGerarNF) btnGerarNF.style.display = 'none';

  if(document.getElementById('f-fin-tipo')) document.getElementById('f-fin-tipo').value=tipo;
  // Popula categorias filtradas pelo tipo
  if (typeof window.atualizarCategoriasFin === 'function') window.atualizarCategoriasFin();
  if(document.getElementById('f-fin-status')) document.getElementById('f-fin-status').value='pago';
  if(document.getElementById('fin-modal-title')) document.getElementById('fin-modal-title').textContent=(tipo==='Receita'?'💚 Nova Receita':'🔴 Nova Despesa');
  if(document.getElementById('f-fin-data')) document.getElementById('f-fin-data').value = new Date().toISOString().split('T')[0];
  openModal('modal-fin');
}

// Toggle do bloco de parcelamento
export function toggleParcFin() {
  const cb = document.getElementById('f-fin-parc-on');
  const wrap = document.getElementById('f-fin-parc-wrap');
  const btnSalvar = document.getElementById('f-fin-btn-salvar');
  const btnGerar = document.getElementById('f-fin-btn-gerar');
  if (!cb || !wrap) return;
  if (cb.checked) {
    wrap.style.display = '';
    if (btnSalvar) btnSalvar.style.display = 'none';
    if (btnGerar) btnGerar.style.display = '';
  } else {
    wrap.style.display = 'none';
    if (btnSalvar) btnSalvar.style.display = '';
    if (btnGerar) btnGerar.style.display = 'none';
  }
}

// ── CONTAS BANCÁRIAS ────────────────────────────────────────────────
// Estrutura: { id, nome, banco, agencia, conta, tipo, saldoInicial, ativo, cor }
const BANCOS_PADRAO = [
  { nome: 'Banco do Brasil', cor: '#fef08a' },
  { nome: 'Caixa', cor: '#bfdbfe' },
  { nome: 'Bradesco', cor: '#fecaca' },
  { nome: 'Itaú', cor: '#fed7aa' },
  { nome: 'Santander', cor: '#fecaca' },
  { nome: 'Nubank', cor: '#e9d5ff' },
  { nome: 'Inter', cor: '#fed7aa' },
  { nome: 'Sicoob', cor: '#bbf7d0' },
  { nome: 'Sicredi', cor: '#bbf7d0' },
  { nome: 'PicPay', cor: '#bbf7d0' },
  { nome: 'Mercado Pago', cor: '#bfdbfe' },
  { nome: 'Dinheiro / Caixinha', cor: '#fef9c3' },
  { nome: 'Outro', cor: '#e2e8f0' },
];

export function addConta(state) {
  const nome = document.getElementById('f-cb-nome')?.value?.trim();
  const banco = document.getElementById('f-cb-banco')?.value || '';
  const agencia = document.getElementById('f-cb-agencia')?.value?.trim() || '';
  const conta = document.getElementById('f-cb-conta')?.value?.trim() || '';
  const tipo = document.getElementById('f-cb-tipo')?.value || 'Corrente';
  const saldoInicial = +document.getElementById('f-cb-saldo')?.value || 0;
  if (!nome) { showToast('⚠️ Informe o apelido da conta'); return false; }

  if (!Array.isArray(state.contas)) state.contas = [];
  if (!state.counters.cb) state.counters.cb = 1;
  const cor = (BANCOS_PADRAO.find(b => b.nome === banco) || {}).cor || '#e2e8f0';

  const editId = document.getElementById('f-cb-id')?.value;
  const dados = { nome, banco, agencia, conta, tipo, saldoInicial, ativo: true, cor };
  if (editId) {
    const idx = state.contas.findIndex(c => c.id === editId);
    if (idx < 0) return false;
    state.contas[idx] = { ...state.contas[idx], ...dados };
    showToast('✅ Conta atualizada!');
  } else {
    state.contas.push({ id: 'CB-' + pad(state.counters.cb), ...dados });
    state.counters.cb++;
    showToast('✅ Conta cadastrada!');
  }
  closeModal('modal-conta-bancaria');
  return true;
}

export function delConta(state, id) {
  if (!confirm('Excluir esta conta? (Lançamentos vinculados continuam, mas sem conta)')) return false;
  state.contas = (state.contas || []).filter(c => c.id !== id);
  markDeleted(state, 'contas', id);
  return true;
}

export function openEditConta(state, id) {
  const c = (state.contas || []).find(x => x.id === id);
  if (!c) return;
  const set = (k, v) => { const el = document.getElementById(k); if (el) el.value = v ?? ''; };
  set('f-cb-id', c.id);
  set('f-cb-nome', c.nome);
  set('f-cb-banco', c.banco || '');
  set('f-cb-agencia', c.agencia);
  set('f-cb-conta', c.conta);
  set('f-cb-tipo', c.tipo || 'Corrente');
  set('f-cb-saldo', c.saldoInicial);
  const t = document.querySelector('#modal-conta-bancaria .modal-title');
  if (t) t.textContent = '✏️ Editar Conta — ' + c.id;
  popularOpcoesBanco();
  openModal('modal-conta-bancaria');
}

export function abrirModalConta() {
  ['f-cb-id','f-cb-nome','f-cb-agencia','f-cb-conta','f-cb-saldo'].forEach(k => {
    const el = document.getElementById(k); if (el) el.value = '';
  });
  if (document.getElementById('f-cb-tipo')) document.getElementById('f-cb-tipo').value = 'Corrente';
  if (document.getElementById('f-cb-saldo')) document.getElementById('f-cb-saldo').value = '0';
  popularOpcoesBanco();
  const t = document.querySelector('#modal-conta-bancaria .modal-title');
  if (t) t.textContent = '🏦 Nova Conta Bancária';
  openModal('modal-conta-bancaria');
}

function popularOpcoesBanco() {
  const sel = document.getElementById('f-cb-banco');
  if (!sel) return;
  const atual = sel.value;
  sel.innerHTML = '<option value="">— Selecione —</option>' +
    BANCOS_PADRAO.map(b => `<option value="${b.nome}">${b.nome}</option>`).join('');
  if (atual) sel.value = atual;
}

// Popula select de conta no modal de lançamento financeiro
export function popularContasSelect(state, selectId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  const atual = sel.value;
  const ativas = (state.contas || []).filter(c => c.ativo !== false);
  sel.innerHTML = '<option value="">— Sem conta —</option>' +
    ativas.map(c => `<option value="${c.id}">${c.nome}${c.banco?' ('+c.banco+')':''}</option>`).join('');
  if (atual) sel.value = atual;
}

function calcSaldoConta(state, contaId) {
  const c = (state.contas || []).find(x => x.id === contaId);
  if (!c) return 0;
  const movs = (state.fin || []).filter(f => f.contaId === contaId && f.status === 'pago');
  const entradas = movs.filter(f => f.tipo === 'Receita').reduce((a,x) => a + (+x.valor||0), 0);
  const saidas = movs.filter(f => f.tipo === 'Despesa').reduce((a,x) => a + (+x.valor||0), 0);
  return (c.saldoInicial || 0) + entradas - saidas;
}

export function renderContasBancarias(state) {
  const el = document.getElementById('fin-contas');
  if (!el) return;
  const lista = state.contas || [];
  if (!lista.length) {
    el.innerHTML = `
      <div class="section" style="border-left:4px solid var(--teal)">
        <div class="section-hdr">
          <div class="section-title">🏦 Contas Bancárias</div>
          <button class="btn btn-outline btn-sm" onclick="abrirModalConta()" style="color:var(--teal);border-color:var(--teal)">＋ Nova Conta</button>
        </div>
        <div style="padding:18px;text-align:center;color:var(--muted);font-size:13px;background:#fafbff;border-radius:9px">
          Nenhuma conta cadastrada. Cadastre suas contas bancárias para acompanhar saldos por origem (BB, Caixa, Nubank, etc.)
        </div>
      </div>`;
    return;
  }
  const totalGeral = lista.reduce((a,c) => a + calcSaldoConta(state, c.id), 0);
  el.innerHTML = `
    <div class="section" style="border-left:4px solid var(--teal)">
      <div class="section-hdr" style="flex-wrap:wrap;gap:10px">
        <div class="section-title">🏦 Contas Bancárias</div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <span style="padding:4px 10px;background:#ccfbf1;color:#0f766e;border-radius:8px;font-size:12px;font-weight:700">Saldo total: ${fmt(totalGeral)}</span>
          <button class="btn btn-outline btn-sm" onclick="abrirModalConta()" style="color:var(--teal);border-color:var(--teal)">＋ Nova Conta</button>
        </div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:10px">
        ${lista.map(c => {
          const saldo = calcSaldoConta(state, c.id);
          return `
            <div class="conta-card" style="background:${c.cor||'#fff'}">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
                <div style="flex:1;min-width:0">
                  <div class="conta-nome">🏦 ${c.nome}</div>
                  <div class="conta-meta">${c.banco||''} ${c.agencia?'· Ag '+c.agencia:''} ${c.conta?'· '+c.conta:''}</div>
                  <div class="conta-saldo" style="color:${saldo>=0?'#0f766e':'var(--red)'}">${fmt(saldo)}</div>
                  <div class="conta-meta" style="font-size:10.5px">${c.tipo||'Corrente'}</div>
                </div>
                <div style="display:flex;flex-direction:column;gap:3px">
                  <button class="btn btn-outline btn-xs" onclick="openEditConta('${c.id}')" style="color:var(--amber);border-color:var(--amber);font-size:10px;padding:2px 6px">✏️</button>
                  <button class="btn btn-outline btn-xs" onclick="delConta('${c.id}')" style="color:var(--red);border-color:var(--red);font-size:10px;padding:2px 6px">✕</button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// ── PARCELAMENTO ─────────────────────────────────────────────────────
// Cria múltiplos lançamentos parcelados a partir do modal de lançamento
export function gerarParcelas(state) {
  const desc = document.getElementById('f-fin-desc')?.value?.trim();
  const valor = +document.getElementById('f-fin-valor')?.value || 0;
  const tipo = document.getElementById('f-fin-tipo')?.value || 'Receita';
  const obraId = document.getElementById('f-fin-obra')?.value || '';
  const data = document.getElementById('f-fin-data')?.value;
  const contaId = document.getElementById('f-fin-conta')?.value || '';
  const obs = document.getElementById('f-fin-obs')?.value || '';

  // Lê categoria
  const catSel = document.getElementById('f-fin-cat').value;
  const catCustom = document.getElementById('f-fin-cat-custom')?.value?.trim();
  let cat = catSel;
  if (catSel === '__custom__') {
    if (!catCustom) { showToast('⚠️ Digite a categoria personalizada'); return false; }
    cat = catCustom;
  }

  const numParcelas = +document.getElementById('f-fin-parc-num')?.value || 1;
  const valorEntrada = +document.getElementById('f-fin-parc-entrada')?.value || 0;
  const intervaloDias = +document.getElementById('f-fin-parc-dias')?.value || 30;

  if (!desc) {
    const el = document.getElementById('f-fin-desc');
    if (el) { el.style.border = '1.5px solid var(--red)'; el.focus(); }
    showToast('⚠️ Informe a descrição');
    return false;
  }
  if (valor <= 0) {
    const el = document.getElementById('f-fin-valor');
    if (el) { el.style.border = '1.5px solid var(--red)'; el.focus(); }
    showToast('⚠️ Valor total deve ser > 0');
    return false;
  }
  if (!data) { showToast('⚠️ Informe a data inicial'); return false; }
  if (numParcelas < 1 || numParcelas > 60) {
    const el = document.getElementById('f-fin-parc-num');
    if (el) { el.style.border = '1.5px solid var(--red)'; el.focus(); }
    showToast('⚠️ Parcelas: 1 a 60');
    return false;
  }
  if (valorEntrada < 0 || valorEntrada > valor) {
    const el = document.getElementById('f-fin-parc-entrada');
    if (el) { el.style.border = '1.5px solid var(--red)'; el.focus(); }
    showToast('⚠️ Entrada inválida (deve ser ≥ 0 e ≤ valor total)');
    return false;
  }
  // Limpa bordas vermelhas se passou na validação
  ['f-fin-desc','f-fin-valor','f-fin-parc-num','f-fin-parc-entrada'].forEach(k => {
    const el = document.getElementById(k); if (el) el.style.border = '';
  });

  const parcelaGroupId = 'PG-' + Date.now().toString(36);
  const restante = valor - valorEntrada;
  const valorParc = numParcelas > 0 ? restante / numParcelas : 0;
  const totalLancamentos = (valorEntrada > 0 ? 1 : 0) + numParcelas;

  if (!confirm(`Gerar ${totalLancamentos} lançamento${totalLancamentos>1?'s':''}?\n\n` +
    (valorEntrada > 0 ? `Entrada: ${fmt(valorEntrada)} (em ${data})\n` : '') +
    `${numParcelas}x de ${fmt(valorParc)} a cada ${intervaloDias} dias`)) return false;

  if (!state.counters.fin) state.counters.fin = 1;
  const dataBase = new Date(data + 'T12:00:00');
  const hojeStr = new Date().toISOString().split('T')[0];

  // Lançamento de entrada (se houver)
  let totalGerados = 0;
  if (valorEntrada > 0) {
    state.fin.push({
      id: 'FIN-' + pad(state.counters.fin),
      tipo, obraId, data, contaId,
      desc: `${desc} (Entrada)`,
      cat, status: 'pago', valor: valorEntrada,
      obs, parcelaGroupId, parcelaInfo: 'Entrada',
    });
    state.counters.fin++; totalGerados++;
  }

  // Demais parcelas
  for (let i = 1; i <= numParcelas; i++) {
    const dt = new Date(dataBase);
    dt.setDate(dt.getDate() + i * intervaloDias);
    const dataStr = dt.toISOString().split('T')[0];
    const status = dataStr < hojeStr ? 'pendente' : 'a_vencer';
    state.fin.push({
      id: 'FIN-' + pad(state.counters.fin),
      tipo, obraId, data: dataStr, contaId,
      desc: `${desc} (${i}/${numParcelas})`,
      cat, status, valor: valorParc, obs, parcelaGroupId,
      parcelaInfo: `${i}/${numParcelas}`,
    });
    state.counters.fin++; totalGerados++;
  }

  closeModal('modal-fin');
  showToast(`✅ ${totalGerados} parcelas geradas!`);
  return true;
}

// ── TRANSFERÊNCIA ENTRE CONTAS ──────────────────────────────────────
// Cria 2 lançamentos vinculados por transferGroupId:
//  - Despesa na conta de origem
//  - Receita na conta de destino
// Usado para pró-labore, aporte de sócio, pagamento de dívida pessoal, etc.
export function abrirModalTransf(state) {
  const ativas = (state.contas || []).filter(c => c.ativo !== false);
  if (ativas.length < 2) {
    showToast('⚠️ Você precisa ter pelo menos 2 contas cadastradas para transferir.');
    return;
  }
  popularContasSelect(state, 'f-tr-origem');
  popularContasSelect(state, 'f-tr-destino');
  // Pré-seleciona a primeira conta na origem e a segunda no destino
  const selO = document.getElementById('f-tr-origem');
  const selD = document.getElementById('f-tr-destino');
  if (selO && ativas[0]) selO.value = ativas[0].id;
  if (selD && ativas[1]) selD.value = ativas[1].id;
  // Limpa campos e define data de hoje
  ['f-tr-valor','f-tr-desc','f-tr-obs'].forEach(k => {
    const el = document.getElementById(k); if (el) el.value = '';
  });
  const dataEl = document.getElementById('f-tr-data');
  if (dataEl) dataEl.value = new Date().toISOString().split('T')[0];
  const catEl = document.getElementById('f-tr-cat');
  if (catEl) catEl.value = 'Pró-labore';
  // Sugere descrição padrão
  const now = new Date();
  const MES_ABR = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const descEl = document.getElementById('f-tr-desc');
  if (descEl) descEl.placeholder = `Ex: Pró-labore ${MES_ABR[now.getMonth()]}/${now.getFullYear()}`;
  openModal('modal-transf');
}

export function addTransferencia(state) {
  const origemId  = document.getElementById('f-tr-origem')?.value || '';
  const destinoId = document.getElementById('f-tr-destino')?.value || '';
  const data      = document.getElementById('f-tr-data')?.value;
  const valor     = +document.getElementById('f-tr-valor')?.value || 0;
  const cat       = document.getElementById('f-tr-cat')?.value || 'Transferência';
  const desc      = document.getElementById('f-tr-desc')?.value?.trim();
  const obs       = document.getElementById('f-tr-obs')?.value || '';

  if (!origemId)  { showToast('⚠️ Selecione a conta de origem');  return false; }
  if (!destinoId) { showToast('⚠️ Selecione a conta de destino'); return false; }
  if (origemId === destinoId) { showToast('⚠️ A origem e o destino devem ser contas diferentes'); return false; }
  if (!data)  { showToast('⚠️ Informe a data'); return false; }
  if (valor <= 0) {
    const el = document.getElementById('f-tr-valor');
    if (el) { el.style.border = '1.5px solid var(--red)'; el.focus(); }
    showToast('⚠️ Valor deve ser > 0');
    return false;
  }
  const descFinal = desc || cat;

  if (!state.counters.fin) state.counters.fin = 1;
  const transferGroupId = 'TR-' + Date.now().toString(36);
  const cOri = (state.contas || []).find(c => c.id === origemId);
  const cDst = (state.contas || []).find(c => c.id === destinoId);
  const labelOri = cOri?.nome || 'Origem';
  const labelDst = cDst?.nome || 'Destino';

  // Despesa na origem
  state.fin.push({
    id: 'FIN-' + pad(state.counters.fin),
    tipo: 'Despesa',
    obraId: '',
    data,
    contaId: origemId,
    desc: `↔ ${descFinal} (→ ${labelDst})`,
    cat,
    status: 'pago',
    valor,
    obs,
    transferGroupId,
  });
  state.counters.fin++;

  // Receita no destino
  state.fin.push({
    id: 'FIN-' + pad(state.counters.fin),
    tipo: 'Receita',
    obraId: '',
    data,
    contaId: destinoId,
    desc: `↔ ${descFinal} (← ${labelOri})`,
    cat,
    status: 'pago',
    valor,
    obs,
    transferGroupId,
  });
  state.counters.fin++;

  // Limpa borda vermelha caso tenha sido marcada
  const elV = document.getElementById('f-tr-valor');
  if (elV) elV.style.border = '';

  closeModal('modal-transf');
  showToast(`✅ Transferência de ${fmt(valor)}: ${labelOri} → ${labelDst}`);
  return true;
}

// Apaga as duas pontas de uma transferência (mantém atomicidade)
export function delTransferencia(state, transferGroupId) {
  if (!transferGroupId) return false;
  const linked = (state.fin || []).filter(f => f.transferGroupId === transferGroupId);
  if (!linked.length) return false;
  if (!confirm(`Excluir esta transferência? Os ${linked.length} lançamentos vinculados serão removidos.`)) return false;
  linked.forEach(f => markDeleted(state, 'fin', f.id));
  state.fin = state.fin.filter(f => f.transferGroupId !== transferGroupId);
  showToast(`🗑 Transferência removida (${linked.length} lançamentos)`);
  return true;
}

// ── FILTROS DA TELA FINANCEIRO ──────────────────────────────────────
let _finFiltros = { tipo:'', obraId:'', cat:'', contaId:'', status:'', q:'' };
export function aplicarFiltrosFin() {
  _finFiltros = {
    tipo: document.getElementById('fil-fin-tipo')?.value || '',
    obraId: document.getElementById('fil-fin-obra')?.value || '',
    cat: document.getElementById('fil-fin-cat')?.value || '',
    contaId: document.getElementById('fil-fin-conta')?.value || '',
    status: document.getElementById('fil-fin-status')?.value || '',
    q: (document.getElementById('fil-fin-q')?.value || '').toLowerCase().trim(),
  };
  return true;
}
export function limparFiltrosFin() {
  _finFiltros = { tipo:'', obraId:'', cat:'', contaId:'', status:'', q:'' };
  ['fil-fin-tipo','fil-fin-obra','fil-fin-cat','fil-fin-conta','fil-fin-status','fil-fin-q'].forEach(k => {
    const el = document.getElementById(k); if (el) el.value = '';
  });
  return true;
}
function aplicarFiltrosLista(lista) {
  return lista.filter(f => {
    if (_finFiltros.tipo && f.tipo !== _finFiltros.tipo) return false;
    if (_finFiltros.obraId && f.obraId !== _finFiltros.obraId) return false;
    if (_finFiltros.cat && f.cat !== _finFiltros.cat) return false;
    if (_finFiltros.contaId && f.contaId !== _finFiltros.contaId) return false;
    if (_finFiltros.status && f.status !== _finFiltros.status) return false;
    if (_finFiltros.q) {
      const txt = `${f.desc||''} ${f.cat||''} ${f.obs||''}`.toLowerCase();
      if (!txt.includes(_finFiltros.q)) return false;
    }
    return true;
  });
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
  { desc: 'Telefone / Celular', icon: '📞' },
  { desc: 'Combustível', icon: '⛽' },
  { desc: 'Material de escritório (papel, tinta, etc)', icon: '📑' },
  { desc: 'Contador / Honorários contábeis', icon: '💼' },
  { desc: 'Seguro', icon: '🛡' },
  { desc: 'Anuidade CREA', icon: '🏛' },
  { desc: 'ART avulsa (reserva mensal)', icon: '📋' },
  { desc: 'Licença AutoCAD / Software', icon: '💻' },
  { desc: 'Assinatura Adobe / PDF', icon: '📄' },
  { desc: 'Hosting / GitHub / Servidor', icon: '☁️' },
  { desc: 'Manutenção de equipamentos', icon: '🔧' },
  { desc: 'Pró-labore', icon: '👤' },
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
    const status = data < hojeStr ? 'pendente' : 'a_vencer';
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

// Renderiza card de lançamentos a vencer/pendentes (3 meses à frente)
export function renderAgendamentos(state) {
  const el = document.getElementById('fin-agendamentos');
  if (!el) return;

  const hoje = new Date();
  const hojeStr = hoje.toISOString().split('T')[0];
  const limite = new Date(hoje.getTime() + 90*86400000); // próximos 90 dias
  const limiteStr = limite.toISOString().split('T')[0];

  const futuros = state.fin
    .filter(f => (f.status === 'a_vencer' || f.status === 'pendente') && f.data >= hojeStr && f.data <= limiteStr)
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
              const sIcon = f.status === 'a_vencer' ? '📅' : '⚠️';
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

// Calcula receita de um período respeitando overrides em state.faturamentoMensal
// month=null retorna o ano inteiro (soma overrides + meses sem override calculados)
function _recYMOv(state, year, month = null) {
  if (!state.faturamentoMensal) state.faturamentoMensal = {};
  const fromFin = (y, m) => (state.fin || []).filter(f => {
    if (f.tipo !== 'Receita') return false;
    if (f.transferGroupId) return false;
    if (f.data?.substring(0,4) !== String(y)) return false;
    if (m !== null && f.data?.substring(5,7) !== String(m).padStart(2,'0')) return false;
    return true;
  }).reduce((a,x) => a + (+x.valor||0), 0);

  if (month !== null) {
    const k = `${year}-${String(month).padStart(2,'0')}`;
    const ov = state.faturamentoMensal?.[k];
    if (ov !== undefined && ov !== null) return +ov;
    return fromFin(year, month);
  }
  let total = 0;
  for (let m = 1; m <= 12; m++) {
    const k = `${year}-${String(m).padStart(2,'0')}`;
    const ov = state.faturamentoMensal?.[k];
    total += (ov !== undefined && ov !== null) ? +ov : fromFin(year, m);
  }
  return total;
}

export function renderFinanceiro(state){
  // Auto-atualiza status (a_vencer/pendente) conforme as datas
  atualizarStatusVencimentos(state);

  // Botão "Importar Histórico" só aparece se ainda não foi importado
  const btnImp = document.getElementById('btn-importar-historico-ejh');
  if (btnImp) btnImp.style.display = temFaturamentoHistoricoEJH(state) ? 'none' : '';
  // Botão "Importar Abril/2026" só aparece enquanto override de abr/2026 existir
  const btnAbr = document.getElementById('btn-importar-abril-2026');
  if (btnAbr) btnAbr.style.display = temOverrideAbril2026(state) ? '' : 'none';

  // KPIs do topo: ano corrente, respeitando overrides do comparativo (consistência)
  const anoAtual = String(new Date().getFullYear());
  const recAno = _recYMOv(state, anoAtual);
  const desAno = state.fin.filter(x=>x.tipo==='Despesa' && x.data?.startsWith(anoAtual) && _semTransf(x)).reduce((a,x)=>a+x.valor,0);
  const salAno = recAno - desAno;
  safeText('fin-kpi-rec', fmt(recAno));
  safeText('fin-kpi-des', fmt(desAno));
  const salEl=document.getElementById('fin-kpi-sal');
  if(salEl){
    salEl.textContent=fmt(salAno);
    salEl.className='kpi-value '+(salAno>=0?'saldo-positivo':'saldo-negativo');
  }
  // Atualiza labels para indicar o ano
  document.querySelectorAll('#page-financeiro .kpi-grid:first-of-type .kpi-label').forEach((el, i) => {
    const labels = ['Receitas brutas '+anoAtual, 'Despesas '+anoAtual, 'Saldo '+anoAtual];
    if (labels[i]) el.textContent = labels[i];
  });

  // Novo Dashboard Avançado (KPIs adicionais inclusos)
  renderDashFinAvancado(state);

  // Contas Bancárias com saldos
  renderContasBancarias(state);

  // Custos Fixos da Empresa (recorrentes)
  renderCustosFixos(state);

  // Card de Lançamentos Agendados (próximos 90 dias)
  renderAgendamentos(state);

  const renderObraRow = o => {
    const r=state.fin.filter(x=>x.obraId===o.id&&x.tipo==='Receita'&&_semTransf(x)).reduce((a,x)=>a+x.valor,0);
    const d=state.fin.filter(x=>x.obraId===o.id&&x.tipo==='Despesa'&&_semTransf(x)).reduce((a,x)=>a+x.valor,0);
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
  const baseFin0 = _hideRT ? state.fin.filter(f => !rtIds.has(f.obraId)) : state.fin;
  // Aplica filtros do usuário
  const baseFin = aplicarFiltrosLista(baseFin0);
  // Popula opções dos filtros (selects)
  popularFiltrosFin(state);
  const sortedFin = [...baseFin].sort((a,b)=>b.data.localeCompare(a.data));
  const totalFin = sortedFin.length;
  const visiveisFin = sortedFin.slice(0, _finLimit);
  const htmlFin = visiveisFin.map(f=>{
    const s = f.status || 'pago';
    const sBg = s==='pago' ? '#f0fdf4' : s==='pendente' ? '#fef2f2' : '#eff6ff';
    const sFg = s==='pago' ? 'var(--green)' : s==='pendente' ? 'var(--red)' : 'var(--blue)';
    const sLabel = s==='pago' ? '✅ Pago' : s==='pendente' ? '⚠️ Pendente' : '📅 A vencer';
    const sBadge = `<span class="badge" style="background:${sBg};color:${sFg}">${sLabel}</span>`;
    const conta = (state.contas || []).find(c => c.id === f.contaId);
    const contaTxt = conta ? `<span style="font-size:10px;color:var(--muted);display:block;margin-top:2px">🏦 ${conta.nome}</span>` : '';
    return `<tr>
      <td>${fmtD(f.data)}</td>
      <td><span class="badge ${f.tipo==='Receita'?'badge-green':'badge-red'}">${f.tipo}</span></td>
      <td style="font-size:12px">${obraName(state, f.obraId)}</td>
      <td style="font-weight:500">${f.desc}${contaTxt}</td>
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

  // KPIs: A Receber, A Pagar
  const aReceber = (state.fin || []).filter(f => f.tipo === 'Receita' && f.status !== 'pago' && _semTransf(f)).reduce((a,x) => a + (+x.valor||0), 0);
  const aPagar = (state.fin || []).filter(f => f.tipo === 'Despesa' && f.status !== 'pago' && _semTransf(f)).reduce((a,x) => a + (+x.valor||0), 0);
  const vencidoRec = (state.fin || []).filter(f => f.tipo === 'Receita' && f.status === 'pendente' && _semTransf(f)).reduce((a,x) => a + (+x.valor||0), 0);
  const vencidoDes = (state.fin || []).filter(f => f.tipo === 'Despesa' && f.status === 'pendente' && _semTransf(f)).reduce((a,x) => a + (+x.valor||0), 0);
  const kpiExtra = document.getElementById('fin-kpis-extras');
  if (kpiExtra) {
    kpiExtra.innerHTML = `
      <div class="kpi blue"><div class="kpi-label">A Receber</div><div class="kpi-value">${fmt(aReceber)}</div><div class="kpi-sub">${vencidoRec>0?`⚠️ ${fmt(vencidoRec)} vencido`:'a vencer'}</div></div>
      <div class="kpi amber"><div class="kpi-label">A Pagar</div><div class="kpi-value">${fmt(aPagar)}</div><div class="kpi-sub">${vencidoDes>0?`⚠️ ${fmt(vencidoDes)} vencido`:'a vencer'}</div></div>
    `;
  }

  // Garante que o mapa de overrides existe
  if (!state.faturamentoMensal) state.faturamentoMensal = {};

  // Calcula receitas a partir dos lançamentos (sem override, sem transferências)
  const recYMCalc = (year, month = null) => (state.fin || []).filter(f => {
    if (f.tipo !== 'Receita') return false;
    if (f.transferGroupId) return false;
    if (f.data?.substring(0,4) !== String(year)) return false;
    if (month !== null && f.data?.substring(5,7) !== String(month).padStart(2,'0')) return false;
    return true;
  }).reduce((a,x) => a + (+x.valor||0), 0);

  // Helper público: respeita o override do usuário se existir
  // - Para mês específico: retorna override se houver, senão calcula
  // - Para ano inteiro: soma overrides + meses sem override calculados
  const recYM = (year, month = null) => {
    if (month !== null) {
      const k = `${year}-${String(month).padStart(2,'0')}`;
      const ov = state.faturamentoMensal?.[k];
      if (ov !== undefined && ov !== null) return +ov;
      return recYMCalc(year, month);
    }
    let total = 0;
    for (let m = 1; m <= 12; m++) {
      const k = `${year}-${String(m).padStart(2,'0')}`;
      const ov = state.faturamentoMensal?.[k];
      if (ov !== undefined && ov !== null) total += +ov;
      else total += recYMCalc(year, m);
    }
    return total;
  };

  // Verifica se uma célula tem override (para mostrar marcador ✏️)
  const hasOverride = (year, month) => {
    const k = `${year}-${String(month).padStart(2,'0')}`;
    return state.faturamentoMensal?.[k] !== undefined && state.faturamentoMensal?.[k] !== null;
  };

  // R1/R2 de obras
  const finR1 = (state.fin||[]).filter(f => { const o=state.obras.find(x=>x.id===f.obraId); return o&&(o.tipo==='R1'||o.tipo==='projeto'); });
  const finR2 = (state.fin||[]).filter(f => { const o=state.obras.find(x=>x.id===f.obraId); return o&&(o.tipo==='R2'||o.tipo==='obra'||!o.tipo); });
  const r1Rec = finR1.filter(f=>f.data?.startsWith(String(yearNow))&&f.tipo==='Receita'&&_semTransf(f)).reduce((a,x)=>a+x.valor,0);
  const r2Rec = finR2.filter(f=>f.data?.startsWith(String(yearNow))&&f.tipo==='Receita'&&_semTransf(f)).reduce((a,x)=>a+x.valor,0);

  const totalRecYTD = recYM(yearNow);
  const avgMensal = monthNow > 0 ? totalRecYTD / monthNow : 0;
  const lastYearSamePeriod = Array.from({length:monthNow},(_,i)=>i+1).reduce((a,m)=>a+recYM(yearLast,m),0);
  const diffPct = lastYearSamePeriod > 0 ? ((totalRecYTD/lastYearSamePeriod)-1)*100 : 0;
  const diffColor = diffPct >= 0 ? 'var(--green)' : 'var(--red)';
  const diffIcon = diffPct >= 0 ? '↗' : '↘';

  // Saldo geral histórico
  const totalRecAll = (state.fin||[]).filter(f=>f.tipo==='Receita'&&_semTransf(f)).reduce((a,x)=>a+(+x.valor||0),0);
  const totalDesAll = (state.fin||[]).filter(f=>f.tipo==='Despesa'&&_semTransf(f)).reduce((a,x)=>a+(+x.valor||0),0);
  const saldoLiq = totalRecAll - totalDesAll;

  // Dados mensais: 2025 e 2026
  const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const pctCmp = (cur, prev) => {
    if (prev === 0) return cur > 0 ? '<span style="color:var(--green);font-weight:700">Novo</span>' : '<span style="color:var(--muted)">—</span>';
    const p = ((cur/prev)-1)*100;
    const c = p >= 0 ? 'var(--green)' : 'var(--red)';
    return `<span style="color:${c};font-weight:700">${p>=0?'↗':'↘'} ${Math.abs(p).toFixed(0)}%</span>`;
  };

  // Renderiza uma célula editável de faturamento mensal
  const cellMes = (year, month, color) => {
    const v = recYM(year, month);
    const ov = hasOverride(year, month);
    const isFuturo = year > yearNow || (year === yearNow && month > monthNow);
    const valStr = v > 0 ? fmt(v) : (isFuturo ? '<span style="color:var(--muted)">...</span>' : '—');
    const marker = ov ? '<span title="Valor editado manualmente" style="color:var(--amber);font-size:10px;margin-right:3px">✏️</span>' : '';
    return `<td style="color:${color};font-weight:${isFuturo&&!ov?'400':'700'}">
      <span style="display:inline-flex;align-items:center;gap:4px">
        <span>${marker}${valStr}</span>
        <button type="button" onclick="editarFaturamentoMes(${year},${month})" title="Editar faturamento de ${MESES[month-1]}/${year}" style="border:none;background:transparent;cursor:pointer;font-size:11px;opacity:.55;padding:0 2px">✏️</button>
      </span>
    </td>`;
  };

  const monthlyRows = MESES.map((mName, idx) => {
    const m = idx + 1;
    const v25 = recYM(2025, m);
    const v26 = recYM(2026, m);
    const isCurMonth = yearNow === 2026 && m === monthNow;
    const isFuturo = yearNow < 2026 ? false : m > monthNow;
    return `<tr style="${isCurMonth?'background:#eff6ff':''}">
      <td style="font-weight:700;color:var(--navy)">${mName}${isCurMonth?' ⭐':''}</td>
      ${cellMes(2025, m, '#1d4ed8')}
      ${cellMes(2026, m, '#7c3aed')}
      <td style="font-size:12px">${isFuturo?'':pctCmp(v26,v25)}</td>
    </tr>`;
  }).join('');

  const tot25 = MESES.reduce((_,__,i)=>_+recYM(2025,i+1),0);
  const tot26 = MESES.reduce((_,__,i)=>_+recYM(2026,i+1),0);

  // Histórico anual (2016–yearNow)
  const anoInicio = 2016;
  const anosHist = [];
  for (let y = anoInicio; y <= yearNow; y++) anosHist.push(y);
  const anualRows = anosHist.map((y, i) => {
    const rec = recYM(y);
    const prev = i > 0 ? recYM(anosHist[i-1]) : 0;
    const yoyPct = prev > 0 ? ((rec/prev)-1)*100 : null;
    const cor = yoyPct === null ? '' : yoyPct >= 0 ? 'color:var(--green)' : 'color:var(--red)';
    const icon = yoyPct !== null ? (yoyPct >= 0 ? '↗' : '↘') : '';
    const atual = y === yearNow;
    return `<tr style="${atual?'background:#eff6ff;font-weight:700':''}">
      <td style="font-weight:${atual?800:600};color:var(--navy)">${y}${atual?' ⭐':''}</td>
      <td style="color:var(--green);font-weight:600">${rec>0?fmt(rec):'—'}</td>
      <td style="${cor}">${yoyPct!==null?`${icon} ${Math.abs(yoyPct).toFixed(1)}%`:'—'}</td>
    </tr>`;
  }).reverse().join('');

  // ── Resumo do Mês: recebidos, próximos 2 meses, média últimos 5, vs ano anterior ──
  const MESES_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  // Determina mês selecionado (ou mês corrente como padrão)
  const defaultMesKey = `${yearNow}-${String(monthNow).padStart(2,'0')}`;
  let selMesKey = _resumoMesSel || defaultMesKey;
  const [selYearStr, selMonStr] = selMesKey.split('-');
  const selYear = parseInt(selYearStr);
  const selMon  = parseInt(selMonStr);
  selMesKey = `${selYear}-${String(selMon).padStart(2,'0')}`;
  const mesNomeSel = MESES_FULL[selMon - 1];

  // 1. Recebidos do mês selecionado (status = 'pago')
  const recebidosMes = (state.fin || []).filter(f =>
    f.tipo === 'Receita' && f.data?.startsWith(selMesKey) && f.status === 'pago' && _semTransf(f)
  ).reduce((a,x) => a + (+x.valor||0), 0);
  const qtdRecebidosMes = (state.fin || []).filter(f =>
    f.tipo === 'Receita' && f.data?.startsWith(selMesKey) && f.status === 'pago' && _semTransf(f)
  ).length;

  // 2. Próximos 2 meses após o mês selecionado (a receber, status != 'pago')
  const proxStart = new Date(selYear, selMon, 1);
  const proxEnd   = new Date(selYear, selMon + 2, 1);
  const fmtDataIso = d => d.toISOString().split('T')[0];
  const proxStartStr = fmtDataIso(proxStart);
  const proxEndStr   = fmtDataIso(proxEnd);
  const aReceberProx = (state.fin || []).filter(f =>
    f.tipo === 'Receita' && f.status !== 'pago' && _semTransf(f) &&
    f.data >= proxStartStr && f.data < proxEndStr
  );
  const aReceberProxTotal = aReceberProx.reduce((a,x) => a + (+x.valor||0), 0);

  // 3. Média dos últimos 5 lançamentos de receita pagos até o mês selecionado
  const selMesLastDay = `${selYear}-${String(selMon).padStart(2,'0')}-31`;
  const ultimas5 = (state.fin || [])
    .filter(f => f.tipo === 'Receita' && f.status === 'pago' && _semTransf(f) && (f.data || '') <= selMesLastDay)
    .sort((a,b) => (b.data || '').localeCompare(a.data || ''))
    .slice(0, 5);
  const media5 = ultimas5.length ? ultimas5.reduce((a,x) => a + (+x.valor||0), 0) / ultimas5.length : 0;

  // 4. Comparativo mês selecionado vs mesmo mês no ano anterior (respeita overrides)
  const recMesAtual    = recYM(selYear, selMon);
  const recMesAnterior = recYM(selYear - 1, selMon);
  const diffMesPct  = recMesAnterior > 0 ? ((recMesAtual / recMesAnterior) - 1) * 100 : null;
  const diffMesColor = diffMesPct === null ? 'var(--muted)' : (diffMesPct >= 0 ? 'var(--green)' : 'var(--red)');
  const diffMesIcon  = diffMesPct === null ? '—' : (diffMesPct >= 0 ? '↗' : '↘');

  // Gera options do select de filtro de mês (3 meses à frente até 23 meses atrás)
  const optsResumoMes = (() => {
    const opts = [];
    for (let delta = 3; delta >= -23; delta--) {
      const d = new Date(yearNow, monthNow - 1 + delta, 1);
      const y = d.getFullYear();
      const mm = d.getMonth() + 1;
      const k = `${y}-${String(mm).padStart(2,'0')}`;
      const lbl = MESES_FULL[mm-1] + ' / ' + y;
      opts.push(`<option value="${k}"${k === selMesKey ? ' selected' : ''}>${lbl}</option>`);
    }
    return opts.join('');
  })();

  // Estado de colapso (persistido em localStorage)
  const isCol = id => localStorage.getItem('ejh_sec_' + id) === '1';
  const dispCol = id => isCol(id) ? 'display:none' : '';
  const iconCol = id => isCol(id) ? '▶' : '▼';

  container.innerHTML = `
    <!-- Resumo do Mês -->
    <div class="section" style="border-left:4px solid #7c3aed;margin-top:20px;margin-bottom:18px">
      <div class="section-hdr" style="flex-wrap:wrap;gap:8px">
        <div class="section-title" style="cursor:pointer" onclick="toggleFinSection('resumo-mes')">📋 Resumo do Mês</div>
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-left:auto">
          <select onchange="setResumoMes(this.value)" style="font-size:12px;padding:3px 8px;border-radius:6px;border:1px solid #d1d5db;background:#fff;cursor:pointer" title="Filtrar por mês">${optsResumoMes}</select>
          <button class="btn btn-outline btn-xs" style="font-size:11px;padding:3px 9px;white-space:nowrap" title="Copiar lançamentos pendentes do mês atual para o próximo mês" onclick="rolarPendentesProximoMes()">🔄 Rolar pendentes</button>
          <button class="btn btn-outline btn-xs" style="font-size:11px;padding:3px 9px" id="tog-resumo-mes" type="button" onclick="toggleFinSection('resumo-mes')">${iconCol('resumo-mes')}</button>
        </div>
      </div>
      <div id="sec-resumo-mes" style="${dispCol('resumo-mes')}">
        <div class="kpi-grid" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr))">
          <div class="kpi green">
            <div class="kpi-label">💰 Recebidos do mês</div>
            <div class="kpi-value">${fmt(recebidosMes)}</div>
            <div class="kpi-sub">${qtdRecebidosMes} lançamento${qtdRecebidosMes!==1?'s':''} pago${qtdRecebidosMes!==1?'s':''} em ${mesNomeSel.toLowerCase()}</div>
          </div>
          <div class="kpi blue">
            <div class="kpi-label">📅 Próximos 2 meses</div>
            <div class="kpi-value">${fmt(aReceberProxTotal)}</div>
            <div class="kpi-sub">${aReceberProx.length} lançamento${aReceberProx.length!==1?'s':''} a receber</div>
          </div>
          <div class="kpi teal">
            <div class="kpi-label">📊 Média (últimos 5)</div>
            <div class="kpi-value">${fmt(media5)}</div>
            <div class="kpi-sub">${ultimas5.length>0?'baseado nas '+ultimas5.length+' últimas receitas pagas':'sem receitas pagas ainda'}</div>
          </div>
          <div class="kpi ${diffMesPct === null ? 'amber' : (diffMesPct >= 0 ? 'green' : 'red')}">
            <div class="kpi-label">📈 ${mesNomeSel} ${selYear} vs ${selYear-1}</div>
            <div class="kpi-value" style="color:${diffMesColor}">${diffMesPct === null ? '—' : diffMesIcon + ' ' + Math.abs(diffMesPct).toFixed(1) + '%'}</div>
            <div class="kpi-sub">${fmt(recMesAtual)} vs ${fmt(recMesAnterior)} (${selYear-1})</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Saldo Geral Histórico -->
    <div class="section" style="border-left:4px solid #0f766e;margin-bottom:18px">
      <div class="section-hdr" style="cursor:pointer" onclick="toggleFinSection('saldo-geral')">
        <div class="section-title">💰 Saldo Geral — Histórico EJH (2016–${yearNow})</div>
        <button class="btn btn-outline btn-xs" style="font-size:11px;padding:3px 9px" id="tog-saldo-geral" type="button">${iconCol('saldo-geral')}</button>
      </div>
      <div id="sec-saldo-geral" style="${dispCol('saldo-geral')}">
        <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr)">
          <div class="kpi green">
            <div class="kpi-label">Total Recebido</div>
            <div class="kpi-value">${fmt(totalRecAll)}</div>
            <div class="kpi-sub">2016 até hoje</div>
          </div>
          <div class="kpi red">
            <div class="kpi-label">Total Despesas</div>
            <div class="kpi-value">${fmt(totalDesAll)}</div>
            <div class="kpi-sub">Todas as despesas lançadas</div>
          </div>
          <div class="kpi ${saldoLiq>=0?'teal':'red'}">
            <div class="kpi-label">Saldo Líquido</div>
            <div class="kpi-value" style="color:${saldoLiq>=0?'#0f766e':'var(--red)'}">${fmt(saldoLiq)}</div>
            <div class="kpi-sub">Receitas − Despesas</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Análise Comparativa Mensal: 2025 vs 2026 -->
    <div class="section" style="border-left:4px solid #2563eb;margin-bottom:18px">
      <div class="section-hdr" style="flex-wrap:wrap;gap:8px;cursor:pointer" onclick="toggleFinSection('comp-mensal')">
        <div class="section-title">📊 Comparativo Mensal — 2025 vs 2026</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <span style="padding:3px 10px;background:#eff6ff;color:#1d4ed8;border-radius:8px;font-size:12px;font-weight:700">2025: ${fmt(tot25)}</span>
          <span style="padding:3px 10px;background:#ede9fe;color:#7c3aed;border-radius:8px;font-size:12px;font-weight:700">2026: ${fmt(tot26)}</span>
          <span style="padding:3px 10px;background:${tot26>=tot25?'#f0fdf4':'#fef2f2'};color:${tot26>=tot25?'var(--green)':'var(--red)'};border-radius:8px;font-size:12px;font-weight:700">${pctCmp(tot26,tot25)} no ano</span>
          <button class="btn btn-outline btn-xs" style="font-size:11px;padding:3px 9px" id="tog-comp-mensal" type="button" onclick="event.stopPropagation();toggleFinSection('comp-mensal')">${iconCol('comp-mensal')}</button>
        </div>
      </div>
      <div id="sec-comp-mensal" style="${dispCol('comp-mensal')}">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Mês</th>
                <th style="color:#1d4ed8">2025</th>
                <th style="color:#7c3aed">2026</th>
                <th>26 vs 25</th>
              </tr>
            </thead>
            <tbody>${monthlyRows}</tbody>
            <tfoot>
              <tr style="background:#f8faff;font-weight:800">
                <td>TOTAL</td>
                <td style="color:#1d4ed8">${fmt(tot25)}</td>
                <td style="color:#7c3aed">${fmt(tot26)}</td>
                <td style="font-size:12px">${pctCmp(tot26,tot25)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>

    <!-- Histórico Anual EJH (2016–${yearNow}) -->
    <div class="section" style="border-left:4px solid #0891b2;margin-bottom:18px">
      <div class="section-hdr" style="cursor:pointer" onclick="toggleFinSection('hist-anual')">
        <div class="section-title">📈 Histórico Anual EJH (${anoInicio}–${yearNow})</div>
        <button class="btn btn-outline btn-xs" style="font-size:11px;padding:3px 9px" id="tog-hist-anual" type="button">${iconCol('hist-anual')}</button>
      </div>
      <div id="sec-hist-anual" style="${dispCol('hist-anual')}">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Ano</th><th>Faturamento</th><th>Crescimento YoY</th></tr></thead>
            <tbody>${anualRows}</tbody>
          </table>
        </div>
        <div style="font-size:11px;color:var(--muted);margin-top:6px;padding:0 2px">
          * 2016–2024: totais anuais consolidados. 2025: totais mensais. 2026: lançamentos detalhados.
        </div>
      </div>
    </div>
  `;
}

// Alterna a exibição de uma seção do dashboard financeiro e persiste em localStorage
export function toggleFinSection(id) {
  const body = document.getElementById('sec-' + id);
  const tog = document.getElementById('tog-' + id);
  if (!body) return;
  const willCollapse = body.style.display !== 'none';
  body.style.display = willCollapse ? 'none' : '';
  if (tog) tog.textContent = willCollapse ? '▶' : '▼';
  try { localStorage.setItem('ejh_sec_' + id, willCollapse ? '1' : '0'); } catch(e) {}
}

// Define o mês selecionado no Resumo do Mês ('' = mês corrente)
export function setResumoMes(val) {
  _resumoMesSel = val || '';
  return true;
}

// Copia lançamentos pendentes do mês corrente para o próximo mês
export function rolarPendentesProximoMes(state) {
  if (!state || !Array.isArray(state.fin)) return false;
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const mesKey = `${y}-${String(m).padStart(2,'0')}`;

  const pendentes = state.fin.filter(f =>
    (f.status === 'pendente' || f.status === 'a_vencer') && f.data?.startsWith(mesKey)
  );

  if (pendentes.length === 0) {
    showToast('ℹ️ Nenhum lançamento pendente/a vencer no mês atual.');
    return false;
  }

  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  const nextMesLabel = `${ny}-${String(nm).padStart(2,'0')}`;
  if (!confirm(`Copiar ${pendentes.length} lançamento(s) pendente(s) de ${mesKey} para ${nextMesLabel}?`)) return false;

  const daysInNext = new Date(ny, nm, 0).getDate();
  pendentes.forEach(f => {
    const origDay = parseInt(f.data?.substring(8, 10) || '1');
    const safeDay = Math.min(origDay, daysInNext);
    const newData = `${ny}-${String(nm).padStart(2,'0')}-${String(safeDay).padStart(2,'0')}`;
    state.fin.push({
      ...f,
      id: 'FIN-' + pad(state.counters.fin),
      data: newData,
      status: newData >= now.toISOString().split('T')[0] ? 'a_vencer' : 'pendente',
      obs: (f.obs ? f.obs + ' | ' : '') + `Rolado de ${mesKey}`,
    });
    state.counters.fin++;
  });

  showToast(`✅ ${pendentes.length} lançamento(s) copiado(s) para ${nextMesLabel}`);
  return true;
}

// ── Importação one-shot: Abril/2026 da planilha de NF do usuário ─────
// Substitui TODAS as receitas de 04/2026 (exceto transferências) pelas
// 11 entradas exatas da planilha de NF. Mantém despesas e transferências.
// Remove o override manual após importar (passa a usar valor calculado).
const _ABRIL_2026_PLANILHA = [
  { data: '2026-04-06', valor: 2250.00, desc: 'ACOMPANHAMENTO DE OBRA — BANDEIRANTES (Bauru-SP)',                                       conta: 'nubank',  cat: '📦 Acompanhamento Técnico' },
  { data: '2026-04-07', valor:  750.00, desc: 'ELABORAÇÃO DE PROJETOS (ESTRUT/ELET/HIDRO/PCI) 50% PARCELA 2/3 — LICIA/BRUNO',           conta: 'nubank',  cat: '📐 Projetos c/ Acompanhamento da Execução' },
  { data: '2026-04-10', valor: 1000.00, desc: 'ELABORAÇÃO DE PROJETOS (ARQ/ESTRUT/HIDRO/ELET) 1/5 — DANILO',                            conta: 'sicredi', cat: '📐 Projetos c/ Acompanhamento da Execução' },
  { data: '2026-04-13', valor: 1162.50, desc: 'ELABORAÇÃO DE PROJETOS (ESTRUT/ELET/HIDRO/PCI) PARCELA 2/4 — WILLIAM',                   conta: 'nubank',  cat: '📐 Projetos c/ Acompanhamento da Execução', nf: '228' },
  { data: '2026-04-20', valor:  800.00, desc: 'ELABORAÇÃO DE LAUDO TÉCNICO 5/5 — JULIANA',                                              conta: 'nubank',  cat: '🔍 Laudo', nf: '227' },
  { data: '2026-04-22', valor:  400.00, desc: 'ACOMPANHAMENTO DE DOCUMENTAÇÃO DE DIVISÃO DE CONDOMÍNIO — PAULO CESAR',                  conta: 'nubank',  cat: '📦 Acompanhamento Técnico' },
  { data: '2026-04-23', valor:  500.00, desc: 'ELABORAÇÃO DE PROJETO ARQUITETÔNICO E ESTRUTURAL — pgto final — RODRIGO/DAVI/VINICIUS',  conta: 'nubank',  cat: '📐 Projetos c/ Acompanhamento da Execução' },
  { data: '2026-04-23', valor: 3000.00, desc: 'RT DE OBRA — GUSTAVO/STELLA',                                                             conta: 'nubank',  cat: '📦 Acompanhamento Técnico' },
  { data: '2026-04-24', valor:  600.00, desc: 'ESTUDO DE ESPAÇO GOURMET E GARAGEM (Sítio) — PEDRO ROBERTO',                              conta: 'nubank',  cat: '🔍 Estudo' },
  { data: '2026-04-27', valor: 1250.00, desc: 'ELABORAÇÃO DE PROJETO ARQ/ESTRUT/ELET/HIDRO 3/4 — JFI ADMINISTRADORA BENS',               conta: 'nubank',  cat: '📐 Projetos c/ Acompanhamento da Execução', nf: '229' },
  { data: '2026-04-27', valor: 2250.00, desc: 'ACOMPANHAMENTO DE OBRA — BANDEIRANTES (Bauru-SP)',                                       conta: 'nubank',  cat: '📦 Acompanhamento Técnico' },
];

// True se ainda há override de abril/2026 (= ainda não importou da planilha)
export function temOverrideAbril2026(state) {
  return state?.faturamentoMensal?.['2026-04'] !== undefined &&
         state?.faturamentoMensal?.['2026-04'] !== null;
}

export function importarAbril2026Planilha(state) {
  if (!Array.isArray(state.fin)) state.fin = [];
  const aApagar = state.fin.filter(f =>
    f.tipo === 'Receita' && f.data?.startsWith('2026-04') && !f.transferGroupId
  );
  const totalNovo = _ABRIL_2026_PLANILHA.reduce((a,x) => a + x.valor, 0);
  const msg = `📋 Importar Abril/2026 da Planilha\n\n` +
              `• Apaga ${aApagar.length} receitas existentes em 04/2026\n` +
              `• Cria ${_ABRIL_2026_PLANILHA.length} lançamentos novos (total ${fmt(totalNovo)})\n` +
              `• Mantém despesas e transferências do mês\n` +
              `• Remove o override manual de Abril/2026\n\n` +
              `Continuar?`;
  if (!confirm(msg)) return false;

  // 1. Remove receitas atuais de abril (exceto transferências)
  aApagar.forEach(f => markDeleted(state, 'fin', f.id));
  state.fin = state.fin.filter(f => !(
    f.tipo === 'Receita' && f.data?.startsWith('2026-04') && !f.transferGroupId
  ));

  // 2. Resolve contas por nome do banco
  const acharConta = (kw) => (state.contas || []).find(c =>
    c.ativo !== false && (
      (c.banco || '').toLowerCase().includes(kw) ||
      (c.nome  || '').toLowerCase().includes(kw)
    )
  )?.id || '';
  const contaNubank  = acharConta('nubank');
  const contaSicredi = acharConta('sicredi');

  // 3. Cria os lançamentos
  if (!state.counters) state.counters = {};
  if (!state.counters.fin) state.counters.fin = 1;
  _ABRIL_2026_PLANILHA.forEach(e => {
    state.fin.push({
      id: 'FIN-' + pad(state.counters.fin),
      tipo: 'Receita',
      obraId: '',
      data: e.data,
      contaId: e.conta === 'sicredi' ? contaSicredi : contaNubank,
      desc: e.desc,
      cat: e.cat,
      status: 'pago',
      valor: e.valor,
      obs: e.nf ? `NF ${e.nf}` : '',
    });
    state.counters.fin++;
  });

  // 4. Remove override (passa a usar valor calculado)
  if (state.faturamentoMensal) delete state.faturamentoMensal['2026-04'];

  showToast(`✅ Abril/2026 importado: ${_ABRIL_2026_PLANILHA.length} receitas (${fmt(totalNovo)})`);
  return true;
}

// ── Edição de faturamento mensal (override) ──────────────────────────
// state.faturamentoMensal['YYYY-MM'] = valor; sobrescreve a soma calculada
const _MESES_NOMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

export function editarFaturamentoMes(state, year, month) {
  if (!state.faturamentoMensal) state.faturamentoMensal = {};
  const k = `${year}-${String(month).padStart(2,'0')}`;
  // Calcula valor a partir dos lançamentos para mostrar como referência
  const calc = (state.fin || []).filter(f =>
    f.tipo === 'Receita' && f.data?.startsWith(k) && _semTransf(f)
  ).reduce((a,x) => a + (+x.valor||0), 0);
  const ovExistente = state.faturamentoMensal[k];
  const valorAtual = ovExistente !== undefined && ovExistente !== null ? +ovExistente : calc;

  document.getElementById('f-fatm-key').value = k;
  document.getElementById('f-fatm-label').textContent = `${_MESES_NOMES[month-1]} / ${year}`;
  document.getElementById('f-fatm-calc').textContent = fmt(calc);
  document.getElementById('f-fatm-valor').value = valorAtual ? valorAtual.toFixed(2) : '';
  // Mostra/esconde botão "Voltar para calculado"
  const btnReset = document.getElementById('f-fatm-btn-reset');
  if (btnReset) btnReset.style.display = (ovExistente !== undefined && ovExistente !== null) ? '' : 'none';
  openModal('modal-fatm');
}

export function salvarFaturamentoMes(state) {
  const k = document.getElementById('f-fatm-key')?.value;
  const valor = +document.getElementById('f-fatm-valor')?.value;
  if (!k) return false;
  if (isNaN(valor) || valor < 0) {
    showToast('⚠️ Informe um valor válido (≥ 0)');
    return false;
  }
  if (!state.faturamentoMensal) state.faturamentoMensal = {};
  state.faturamentoMensal[k] = valor;
  closeModal('modal-fatm');
  showToast(`✅ Faturamento de ${k} ajustado para ${fmt(valor)}`);
  return true;
}

export function resetarFaturamentoMes(state) {
  const k = document.getElementById('f-fatm-key')?.value;
  if (!k) return false;
  if (!confirm(`Voltar a usar o valor calculado dos lançamentos para ${k}?`)) return false;
  if (state.faturamentoMensal) delete state.faturamentoMensal[k];
  closeModal('modal-fatm');
  showToast(`🔄 ${k}: valor calculado restaurado`);
  return true;
}


// Popula selects de filtros com obras, categorias, contas existentes
function popularFiltrosFin(state) {
  // Obras
  const selO = document.getElementById("fil-fin-obra");
  if (selO) {
    const atual = selO.value;
    selO.innerHTML = "<option value=\"\">Todas as obras</option>" +
      (state.obras || []).map(o => `<option value="${o.id}">${o.nome}</option>`).join("");
    if (atual) selO.value = atual;
  }
  // Categorias únicas
  const selC = document.getElementById("fil-fin-cat");
  if (selC) {
    const atual = selC.value;
    const cats = [...new Set((state.fin || []).map(f => f.cat).filter(Boolean))].sort();
    selC.innerHTML = "<option value=\"\">Todas categorias</option>" +
      cats.map(c => `<option value="${c}">${c}</option>`).join("");
    if (atual) selC.value = atual;
  }
  // Contas
  const selB = document.getElementById("fil-fin-conta");
  if (selB) {
    const atual = selB.value;
    selB.innerHTML = "<option value=\"\">Todas contas</option>" +
      (state.contas || []).map(c => `<option value="${c.id}">${c.nome}</option>`).join("");
    if (atual) selB.value = atual;
  }
}

// ── Importar Faturamento Histórico EJH (2016-2026) ────────────────────
const FATURAMENTO_HISTORICO_EJH = (() => {
  const CAT = '📊 Faturamento Histórico';
  const mk = (data, valor, desc, obs='') => ({ data, valor, desc, obs, cat: CAT });
  const anuais = [
    [2016, 13135.40], [2017, 37015.67], [2018, 28809.00], [2019, 43391.66],
    [2020, 27657.76], [2021, 51973.00], [2022, 44981.60], [2023, 65865.00],
    [2024, 130494.00],
  ].map(([ano, val]) => mk(`${ano}-12-31`, val, `Faturamento anual ${ano}`, `Total consolidado de ${ano}`));
  const meses2025 = [
    ['JAN','2025-01-31',7150],['FEV','2025-02-28',18500],['MAR','2025-03-31',7643],
    ['ABR','2025-04-30',20075],['MAI','2025-05-31',3050],['JUN','2025-06-30',13150],
    ['JUL','2025-07-31',15085],['AGO','2025-08-31',9140],['SET','2025-09-30',9690],
    ['OUT','2025-10-31',14750],['NOV','2025-11-30',15700],['DEZ','2025-12-31',20589],
  ].map(([m, data, val]) => mk(data, val, `Faturamento ${m}/2025`, 'Consolidado mensal'));
  const det2026 = [
    mk('2026-01-05', 2250.00, 'Acompanhamento de Obra',                                                              'Cliente: BANDEIRANTES (Bauru-SP) | PIX-NUBANK'),
    mk('2026-01-08', 2500.00, 'Projeto Arquitetônico e Estrutural (Entrada)',                                        'Cliente: OLIVINO (Guaxupé-MG) | Em espécie'),
    mk('2026-01-13', 1500.00, 'Projetos (Estrutural, Elétrico, Hidro e PCI) 1/3',                                    'Cliente: LICIA/BRUNO (Guaxupé-MG) | PIX-NUBANK'),
    mk('2026-01-15',  800.00, 'Laudo Técnico 2/5',                                                                   'Cliente: JULIANA (Guaxupé-MG) | PIX-NUBANK'),
    mk('2026-01-20', 2250.00, 'Acompanhamento de Obra',                                                              'Cliente: BANDEIRANTES (Bauru-SP) | PIX-NUBANK'),
    mk('2026-01-22', 1000.00, 'Acompanhamento de Obra 2/4 — recálculo parcelas 4/4',                                 'Cliente: CAIO (Guaxupé-MG) | PIX-NUBANK'),
    mk('2026-01-23', 1415.00, 'Projetos (Estrutural, Elétrico e Hidro) — Parcela 2',                                 'Cliente: LUIZ CARLOS (Guaxupé-MG) | Cheque Sicredi'),
    mk('2026-02-02',  700.00, 'Acompanhamento de Obra (Caixa) — fev/mar 1 e 2 de 11',                                'Cliente: MARLIZE (Guaxupé-MG) | PIX-NUBANK'),
    mk('2026-02-05', 2250.00, 'Acompanhamento de Obra',                                                              'Cliente: BANDEIRANTES (Bauru-SP) | PIX-NUBANK'),
    mk('2026-02-08', 1500.00, 'Projeto Arquitetônico e Estrutural (Entrada)',                                        'Cliente: RODRIGO/DAVI/VINICIUS (Guaxupé-MG) | PIX-NUBANK'),
    mk('2026-02-10', 1250.00, 'Projeto Arq, Estrutural, Elétrico e Hidro 1/4',                                       'Cliente: JFI ADMINISTRADORA BENS (Guaxupé-MG) | PIX-NUBANK'),
    mk('2026-02-12', 1477.00, 'Projetos (Estrutural, Elétrico e Hidro) — Parcela 2',                                 'Cliente: LUIZ CARLOS (Guaxupé-MG) | Cheque Sicredi'),
    mk('2026-02-12',  500.00, 'Projeto Arquitetônico e Estrutural (Complemento da Entrada)',                         'Cliente: RODRIGO/DAVI/VINICIUS (Guaxupé-MG) | PIX-NUBANK'),
    mk('2026-02-18',  800.00, 'Laudo Técnico 3/5',                                                                   'Cliente: JULIANA (Guaxupé-MG) | PIX-NUBANK'),
    mk('2026-02-19',  750.00, 'Projetos (Estrutural, Elétrico, Hidro e PCI) — 50% parcela 2/3',                      'Cliente: LICIA/BRUNO (Guaxupé-MG) | PIX-NUBANK'),
    mk('2026-02-20', 2500.00, 'Projeto Arquitetônico e Estrutural (Restante)',                                       'Cliente: OLIVINO (Guaxupé-MG) | Depósito Sicredi'),
    mk('2026-02-20', 2250.00, 'Acompanhamento de Obra',                                                              'Cliente: BANDEIRANTES (Bauru-SP) | PIX-NUBANK'),
    mk('2026-03-03', 1000.00, 'Projeto Arquitetônico e Estrutural — Entrada 50%',                                    'Cliente: DAVI (Guaxupé-MG) | PIX-NUBANK'),
    mk('2026-03-05', 1500.00, 'Projetos (Estrutural, Elétrico, Hidro e PCI) Parcela 3/3',                            'Cliente: LICIA/BRUNO (Guaxupé-MG) | PIX-NUBANK'),
    mk('2026-03-09', 1162.50, 'Projetos (Estrutural, Elétrico, Hidro e PCI) Parcela 1/4',                            'Cliente: WILLIAM (Guaxupé-MG) | PIX-NUBANK'),
    mk('2026-03-10', 2250.00, 'Acompanhamento de Obra',                                                              'Cliente: BANDEIRANTES (Bauru-SP) | PIX-NUBANK'),
    mk('2026-03-11', 1250.00, 'Projeto Arq, Estrutural, Elétrico e Hidro 2/4',                                       'Cliente: JFI ADMINISTRADORA BENS (Guaxupé-MG) | PIX-NUBANK'),
    mk('2026-03-14', 1000.00, 'Projeto Arquitetônico e Estrutural — Entrada 50%',                                    'Cliente: DAVI (Guaxupé-MG) | PIX-NUBANK'),
    mk('2026-03-16',  800.00, 'Laudo Técnico 4/5',                                                                   'Cliente: JULIANA (Guaxupé-MG) | Em espécie'),
    mk('2026-03-20', 2250.00, 'Acompanhamento de Obra',                                                              'Cliente: BANDEIRANTES (Bauru-SP) | PIX-NUBANK'),
    mk('2026-03-27', 2000.00, 'Projeto Arquitetônico e Estrutural (parcial — restante R$500,00)',                    'Cliente: RODRIGO/DAVI/VINICIUS (Guaxupé-MG) | PIX-NUBANK'),
    mk('2026-03-30',  600.00, 'Solicitação de Habite-se e ISS',                                                      'Cliente: GUAXUCABOS | Em espécie'),
    mk('2026-04-06', 2250.00, 'Acompanhamento de Obra',                                                              'Cliente: BANDEIRANTES (Bauru-SP) | PIX-NUBANK'),
    mk('2026-04-07',  750.00, 'Projetos (Estrutural, Elétrico, Hidro e PCI) — 50% parcela 2/3',                      'Cliente: LICIA/BRUNO (Guaxupé-MG) | PIX-NUBANK'),
    mk('2026-04-10', 1000.00, 'Projetos (Arq, Estrutural, Hidro e Elétrico) 1/5',                                    'Cliente: DANILO (Guaxupé-MG) | Cheque Sicredi'),
    mk('2026-04-13', 1162.50, 'Projetos (Estrutural, Elétrico, Hidro e PCI) Parcela 2/4',                            'Cliente: WILLIAM (Guaxupé-MG) | PIX-NUBANK'),
    mk('2026-04-20',  800.00, 'Laudo Técnico 5/5',                                                                   'Cliente: JULIANA (Guaxupé-MG) | PIX-NUBANK'),
    mk('2026-04-22',  400.00, 'Acompanhamento de Documentação de Divisão de Condomínio',                             'Cliente: PAULO CESAR (Guaxupé-MG) | PIX-NUBANK'),
    mk('2026-04-23',  500.00, 'Projeto Arquitetônico e Estrutural — pagamento final',                                'Cliente: RODRIGO/DAVI/VINICIUS (Guaxupé-MG) | PIX-NUBANK'),
    mk('2026-04-23', 3000.00, 'RT de Obra',                                                                          'Cliente: GUSTAVO/STELLA (Guaxupé-MG) | PIX-NUBANK'),
    mk('2026-04-24',  600.00, 'Estudo de Espaço Gourmet e Garagem (sítio)',                                          'Cliente: PEDRO ROBERTO (Jacuí-MG) | PIX-NUBANK'),
    mk('2026-04-27', 1250.00, 'Projeto Arq, Estrutural, Elétrico e Hidro 3/4',                                       'Cliente: JFI ADMINISTRADORA BENS (Guaxupé-MG) | PIX-NUBANK'),
    mk('2026-04-27', 2250.00, 'Acompanhamento de Obra',                                                              'Cliente: BANDEIRANTES (Bauru-SP) | PIX-NUBANK'),
  ];
  return [...anuais, ...meses2025, ...det2026];
})();

export function temFaturamentoHistoricoEJH(state) {
  return (state.fin || []).some(f => f.cat === '📊 Faturamento Histórico');
}

export function importarFaturamentoHistoricoEJH(state) {
  if (!Array.isArray(state.fin)) state.fin = [];
  if (!state.counters) state.counters = {};
  if (!state.counters.fin) state.counters.fin = 1;

  if (temFaturamentoHistoricoEJH(state)) {
    const existentes = state.fin.filter(f => f.cat === '📊 Faturamento Histórico').length;
    if (!confirm(`⚠️ Já existem ${existentes} lançamentos com categoria "Faturamento Histórico".\n\nImportar novamente VAI DUPLICAR. Continuar mesmo assim?`)) {
      return false;
    }
  }

  const total = FATURAMENTO_HISTORICO_EJH.reduce((a, x) => a + x.valor, 0);
  const totalFmt = total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const msg =
    `IMPORTAR FATURAMENTO HISTÓRICO EJH\n\n` +
    `• 9 lançamentos anuais (2016–2024)\n` +
    `• 12 lançamentos mensais (2025) — R$ 154.522,00\n` +
    `• 38 lançamentos detalhados (jan–abr/2026) — R$ 53.467,00\n\n` +
    `TOTAL: ${FATURAMENTO_HISTORICO_EJH.length} lançamentos | R$ ${totalFmt}\n\n` +
    `Estado atual: ${state.fin.length} lançamentos.\n\n` +
    `Confirma a importação?`;
  if (!confirm(msg)) return false;

  // Backup defensivo no localStorage
  try {
    const backupKey = 'ejh_fin_backup_' + new Date().toISOString().replace(/[:.]/g, '-');
    localStorage.setItem(backupKey, JSON.stringify(state.fin));
    console.log('💾 Backup salvo:', backupKey);
  } catch(e) { console.warn('Backup falhou:', e); }

  // Insere todos de uma vez. Apenas UMA chamada a renderAtiva no wrapper de app.js
  // dispara UM saveStateLocal + UM saveToCloud (com debounce). Evita o
  // "Write stream exhausted" do Firestore.
  FATURAMENTO_HISTORICO_EJH.forEach(e => {
    state.fin.push({
      id: 'FIN-' + pad(state.counters.fin++),
      tipo: 'Receita', obraId: '', data: e.data,
      desc: e.desc, cat: e.cat, status: 'pago',
      valor: e.valor, obs: e.obs, contaId: '',
    });
  });

  showToast(`✅ ${FATURAMENTO_HISTORICO_EJH.length} lançamentos históricos importados! Total: R$ ${totalFmt}`, 6000);
  return true;
}

