// modules/financeiro.js
import { fmt, fmtD, pad, safeInner, safeText, showToast, openModal, closeModal, statusBadge } from '../utils.js';

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
  state.fin.push({id:'FIN-'+pad(state.counters.fin),
    tipo:document.getElementById('f-fin-tipo').value,
    obraId:document.getElementById('f-fin-obra').value,
    data:document.getElementById('f-fin-data').value,
    desc:desc,
    cat:document.getElementById('f-fin-cat').value,
    valor:valor,
    obs:document.getElementById('f-fin-obs').value,
  });
  state.counters.fin++;closeModal('modal-fin');showToast('✅ Lançamento registrado!');return true;
}

export function delFin(state, id){if(confirm('Excluir este lançamento?')){state.fin=state.fin.filter(x=>x.id!==id);_finLimit=20;return true;}}

export function openModalFin(state, tipo){
  populateSelects();
  document.getElementById('f-fin-tipo').value=tipo;
  document.getElementById('fin-modal-title').textContent=(tipo==='Receita'?'💚 Nova Receita':'🔴 Nova Despesa');
  document.getElementById('modal-fin').classList.add('open');
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
    const obrasR1 = state.obras.filter(o => o.tipo === 'R1');
    tbR1.innerHTML = obrasR1.map(renderObraRow).join('') || '<tr><td colspan="5" style="color:var(--muted);padding:10px">Nenhum R1 (Projeto) encontrado.</td></tr>';
  }

  // Por categoria R2 (Obras)
  const tbR2 = document.getElementById('tbody-fin-r2');
  if(tbR2) {
    const obrasR2 = state.obras.filter(o => o.tipo !== 'R1'); // Default to R2 to support legacy
    tbR2.innerHTML = obrasR2.map(renderObraRow).join('') || '<tr><td colspan="5" style="color:var(--muted);padding:10px">Nenhum R2 (Obra) encontrado.</td></tr>';
  }

  // Lançamentos — com paginação
  const sortedFin = [...state.fin].sort((a,b)=>b.data.localeCompare(a.data));
  const totalFin = sortedFin.length;
  const visiveisFin = sortedFin.slice(0, _finLimit);
  const htmlFin = visiveisFin.map(f=>`<tr>
      <td>${fmtD(f.data)}</td>
      <td><span class="badge ${f.tipo==='Receita'?'badge-green':'badge-red'}">${f.tipo}</span></td>
      <td>${obraName(f.obraId)}</td>
      <td style="font-weight:500">${f.desc}</td>
      <td><span class="badge badge-blue">${f.cat}</span></td>
      <td style="font-weight:700;color:${f.tipo==='Receita'?'var(--green)':'var(--red)'}">${f.tipo==='Receita'?'+':'-'}${fmt(f.valor)}</td>
      <td><button class="btn btn-outline btn-xs" onclick="delFin('${f.id}')" style="color:var(--red);border-color:var(--red)">✕</button></td>
    </tr>`).join('');
  safeInner('tbody-fin', htmlFin);
  if(totalFin > _finLimit){
    const el=document.getElementById('tbody-fin');
    if(el) el.insertAdjacentHTML('afterend',
      `<tr id="fin-ver-mais"><td colspan="7" style="text-align:center;padding:12px">
        <button class="btn btn-outline btn-sm" onclick="_finLimit+=20;renderFinanceiro()">Ver mais (${totalFin-_finLimit} restantes)</button>
      </td></tr>`);
  } else {
    const old=document.getElementById('fin-ver-mais'); if(old) old.remove();
  }
}

export function renderDashFinAvancado(state) {
  const container = document.getElementById('dash-fin-avancado');
  if(!container) return;

  const now = new Date();
  const yearNow = now.getFullYear();
  const yearLast = yearNow - 1;
  const monthNow = now.getMonth() + 1; // 1-12

  // Filtros por Categoria e Ano
  const finR1 = state.fin.filter(f => {
    const o = state.obras.find(x => x.id === f.obraId);
    return o && o.tipo === 'R1';
  });
  const finR2 = state.fin.filter(f => {
    const o = state.obras.find(x => x.id === f.obraId);
    return o && (o.tipo === 'R2' || !o.tipo);
  });

  const sum = (arr, year, tipo) => arr.filter(f => f.data.startsWith(year) && (!tipo || f.tipo === tipo)).reduce((a,x) => a + x.valor, 0);

  const r1Rec = sum(finR1, yearNow, 'Receita');
  const r2Rec = sum(finR2, yearNow, 'Receita');
  
  // Média Anual (YTD)
  const totalRecYTD = state.fin.filter(f => f.data.startsWith(yearNow) && f.tipo === 'Receita').reduce((a,x) => a+x.valor, 0);
  const avgMensal = totalRecYTD / monthNow;

  // YoY Comparison (Full Year vs Full Year or YTD vs YTD?)
  // Vamos fazer YTD vs Same Period Last Year para ser mais justo
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



