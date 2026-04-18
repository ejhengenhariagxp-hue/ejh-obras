// modules/financeiro.js
import { fmt, fmtD, pad, safeInner, safeText, showToast, openModal, closeModal, statusBadge, popularSelectsObras, obraName } from '../utils.js';

let _finLimit = 20;

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
  
  state.fin.push({
    id:    'FIN-'+pad(state.counters.fin),
    tipo:   document.getElementById('f-fin-tipo').value,
    obraId: document.getElementById('f-fin-obra').value,
    data:   document.getElementById('f-fin-data').value,
    desc:   desc,
    cat:    document.getElementById('f-fin-cat').value,
    status: document.getElementById('f-fin-status').value, // Novo campo
    valor:  valor,
    obs:    document.getElementById('f-fin-obs').value,
  });
  state.counters.fin++;
  closeModal('modal-fin');
  showToast('✅ Lançamento registrado!');
  return true;
}

export function delFin(state, id){
  if(confirm('Excluir este lançamento?')){
    state.fin=state.fin.filter(x=>x.id!==id);
    _finLimit=20;
    return true;
  }
  return false;
}

export function openModalFin(state, tipo){
  popularSelectsObras(state);
  if(document.getElementById('f-fin-tipo')) document.getElementById('f-fin-tipo').value=tipo;
  if(document.getElementById('fin-modal-title')) document.getElementById('fin-modal-title').textContent=(tipo==='Receita'?'💚 Nova Receita':'🔴 Nova Despesa');
  if(document.getElementById('f-fin-data')) document.getElementById('f-fin-data').value = new Date().toISOString().split('T')[0];
  openModal('modal-fin');
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
  const sortedFin = [...state.fin].sort((a,b)=>b.data.localeCompare(a.data));
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
      <td><button class="btn btn-outline btn-xs" onclick="delFin('${f.id}')" style="color:var(--red);border-color:var(--red)">✕</button></td>
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
