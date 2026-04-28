// modules/financeiro.js
import { fmt, fmtD, pad, safeInner, safeText, showToast, openModal, closeModal, statusBadge, popularSelectsObras, obraName, markDeleted } from '../utils.js?v=20260425p';

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
    </tr>`;
  };

  // Por categoria R1 (Projetos)
  const tbR1 = document.getElementById('tbody-fin-r1');
  if(tbR1) {
    const obrasR1 = state.obras.filter(o => o.tipo === 'R1' || o.tipo === 'projeto');
    tbR1.innerHTML = obrasR1.map(renderObraRow).join('') || '<tr><td colspan="5" style="color:var(--muted);padding:10px">Nenhum R1 (Projeto) encontrado.</td></tr>';
  }

  // Por categoria R2 (Obras)
  const tbR2 = document.getElementById('tbody-fin-r2');
  if(tbR2) {
    const obrasR2 = state.obras.filter(o => o.tipo === 'R2' || o.tipo === 'obra' || !o.tipo);
    tbR2.innerHTML = obrasR2.map(renderObraRow).join('') || '<tr><td colspan="5" style="color:var(--muted);padding:10px">Nenhum R2 (Obra) encontrado.</td></tr>';
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
