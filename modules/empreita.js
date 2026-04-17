// modules/empreita.js
import { fmt, fmtD, pad, safeInner, safeText, showToast, openModal, closeModal, statusBadge } from '../utils.js';


export function addEmpreita(state){
  const id='EMP-'+pad(state.counters.emp);
  state.empreitas.push({
    id, obraId:document.getElementById('f-emp-obra').value,
    nome:document.getElementById('f-emp-nome').value||'Empreiteiro',
    tel:document.getElementById('f-emp-tel').value,
    tipo:document.getElementById('f-emp-tipo').value,
    desc:document.getElementById('f-emp-desc').value,
    valor:+document.getElementById('f-emp-valor').value||0,
    area:+document.getElementById('f-emp-area').value||0,
    inicio:document.getElementById('f-emp-inicio').value,
    prazo:+document.getElementById('f-emp-prazo').value||0,
    pgto:document.getElementById('f-emp-pgto').value,
    status:document.getElementById('f-emp-status').value,
    pagamentos:[],
  });
  state.counters.emp++;
  closeModal('modal-empreita'); return true; showToast('✅ Contrato de empreita cadastrado!');
}

export function delEmpreita(state, id){if(confirm('Remover contrato?')){state.empreitas=state.empreitas.filter(x=>x.id!==id);return true;}}

export function openEmpPag(state, id){
  document.getElementById('f-epag-id').value=id;
  document.getElementById('f-epag-data').value=new Date().toISOString().split('T')[0];
  document.getElementById('f-epag-valor').value='';
  document.getElementById('f-epag-desc').value='';
  document.getElementById('modal-emp-pag').classList.add('open');
}

export function addEmpPag(state){
  const id=document.getElementById('f-epag-id').value;
  const emp=state.empreitas.find(x=>x.id===id); if(!emp) return;
  emp.pagamentos.push({
    valor:+document.getElementById('f-epag-valor').value||0,
    data:document.getElementById('f-epag-data').value,
    desc:document.getElementById('f-epag-desc').value,
  });
  closeModal('modal-emp-pag'); return true; showToast('✅ Pagamento registrado!');
}

export function renderEmpreita(state){
  const total=state.empreitas.reduce((a,x)=>a+x.valor,0);
  const pago=state.empreitas.reduce((a,x)=>a+(x.pagamentos||[]).reduce((b,p)=>b+p.valor,0),0);
  document.getElementById('emp-kpi-total').textContent=state.empreitas.length;
  document.getElementById('emp-kpi-valor').textContent=fmt(total);
  document.getElementById('emp-kpi-pago').textContent=fmt(pago);

  document.getElementById('list-empreita').innerHTML=state.empreitas.map(e=>{
    const pago=(e.pagamentos||[]).reduce((a,p)=>a+p.valor,0);
    const saldo=e.valor-pago;
    const pct=e.valor>0?Math.min(100,(pago/e.valor*100)).toFixed(0):0;
    const col=pct>=100?'var(--green)':pct>=50?'var(--amber)':'var(--blue)';
    const valorM2=e.area>0?(e.valor/e.area).toFixed(2):null;
    return `<div class="empreita-card">
      <div class="empreita-header">
        <div>
          <div class="empreita-title">${e.nome} <span style="font-weight:400;opacity:.8">— ${e.tipo}</span></div>
          <div style="font-size:12px;opacity:.7;margin-top:2px">📍 ${obraName(e.obraId)}${e.tel?' • 📞 '+e.tel:''}</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <span class="empreita-badge">${e.status}</span>
          <button class="btn btn-outline btn-sm" style="background:rgba(255,255,255,.15);border-color:rgba(255,255,255,.3);color:#fff" onclick="openEmpPag('${e.id}')">+ Pagamento</button>
          <button class="btn btn-outline btn-xs" style="background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.2);color:#fff;opacity:.7" onclick="delEmpreita('${e.id}')">✕</button>
        </div>
      </div>
      <div class="empreita-body">
        ${e.desc?`<div style="font-size:13px;color:var(--muted);margin-bottom:12px;font-style:italic">${e.desc}</div>`:''}
        <div class="empreita-grid" style="margin-bottom:14px">
          <div class="empreita-stat"><div class="empreita-stat-val">${fmt(e.valor)}</div><div class="empreita-stat-lbl">Valor Global</div></div>
          <div class="empreita-stat"><div class="empreita-stat-val" style="color:var(--green)">${fmt(pago)}</div><div class="empreita-stat-lbl">Total Pago</div></div>
          <div class="empreita-stat"><div class="empreita-stat-val" style="color:${saldo>0?'var(--amber)':'var(--green)'}">${fmt(saldo)}</div><div class="empreita-stat-lbl">Saldo a Pagar</div></div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <div class="progress-wrap" style="flex:1;height:8px"><div class="progress-bar" style="width:${pct}%;background:${col};height:8px"></div></div>
          <span style="font-weight:700;color:${col};font-size:13px">${pct}% pago</span>
        </div>
        <div style="display:flex;gap:16px;font-size:12px;color:var(--muted);flex-wrap:wrap">
          ${e.area?`<span>📐 ${e.area} m²${valorM2?' • R$'+valorM2+'/m²':''}</span>`:''}
          ${e.inicio?`<span>📅 Início: ${fmtD(e.inicio)}</span>`:''}
          ${e.prazo?`<span>⏱ Prazo: ${e.prazo} dias</span>`:''}
          <span>💳 ${e.pgto}</span>
        </div>
        ${(e.pagamentos||[]).length?`
        <div style="margin-top:12px;border-top:1px solid var(--border);padding-top:10px">
          <div style="font-size:11.5px;font-weight:700;color:var(--muted);margin-bottom:6px;text-transform:uppercase">Histórico de Pagamentos</div>
          ${e.pagamentos.map(p=>`<div style="display:flex;justify-content:space-between;font-size:12.5px;padding:4px 0;border-bottom:1px solid var(--border)">
            <span>${p.desc||'Pagamento'}</span>
            <span style="color:var(--muted)">${fmtD(p.data)}</span>
            <span style="font-weight:700;color:var(--green)">${fmt(p.valor)}</span>
          </div>`).join('')}
        </div>`:''}
      </div>
    </div>`;
  }).join('')||'<div style="color:var(--muted);background:var(--card);border-radius:var(--radius);padding:28px;text-align:center;box-shadow:var(--shadow)">Nenhum contrato de empreita cadastrado. Clique em "＋ Novo Contrato" para começar.</div>';
}



