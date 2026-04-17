// modules/medicoes.js
import { fmt, fmtD, pad, safeInner, safeText, showToast, openModal, closeModal, statusBadge, obraName } from '../utils.js';

export function addMedicao(state){
  const obraId=document.getElementById('f-med-obra')?.value;
  if(!obraId) { showToast('⚠️ Selecione uma obra'); return false; }
  
  const itens=[];
  document.querySelectorAll('.med-item-row').forEach(row=>{
    const qtdMed=+row.querySelector('.med-qtd').value||0;
    if(qtdMed>0){
      const orcId=row.dataset.orcid;
      const orc=state.orc.find(x=>x.id===orcId);
      if(orc) itens.push({item:orc.item,un:orc.un,qtd:orc.qtd,vunit:orc.vunit,qtdMed,valorMed:qtdMed*orc.vunit});
    }
  });
  
  state.medicoes.push({
    id:'MED-'+pad(state.counters.med),
    obraId,
    num:+document.getElementById('f-med-num').value||state.medicoes.filter(m=>m.obraId===obraId).length+1,
    periodo:document.getElementById('f-med-periodo').value,
    data:document.getElementById('f-med-data').value,
    resp:document.getElementById('f-med-resp').value,
    itens,
  });
  
  state.counters.med++;
  closeModal('modal-medicao');
  showToast('✅ Medição gerada!');
  return true;
}

export function updateMedVal(state, input, orcId){
  const orc=state.orc.find(x=>x.id===orcId);
  if(!orc) return;
  const v=+input.value||0;
  const target = document.getElementById('med-val-'+orcId);
  if(target) target.textContent=v>0?fmt(v*orc.vunit):'—';
}

export function loadMedItems(state){
  const obraId=document.getElementById('f-med-obra')?.value;
  if(!obraId) return;
  const itens=state.orc.filter(x=>x.obraId===obraId);
  safeInner('med-items-list', itens.length?
    `<table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead><tr style="background:var(--navy);color:#fff">
        <th style="padding:8px 12px;text-align:left">Item</th>
        <th style="padding:8px 12px">Un.</th>
        <th style="padding:8px 12px">Qtd Total</th>
        <th style="padding:8px 12px">V.Unit</th>
        <th style="padding:8px 12px">Qtd. desta Medição</th>
        <th style="padding:8px 12px">Valor</th>
      </tr></thead>
      <tbody>${itens.map((x,i)=>`
        <tr data-orcid="${x.id}" class="med-item-row" style="background:${i%2===0?'#f8faff':'#fff'};border-bottom:1px solid var(--border)">
          <td style="padding:8px 12px;font-weight:500">${x.item}</td>
          <td style="padding:8px 12px;text-align:center">${x.un}</td>
          <td style="padding:8px 12px;text-align:center">${x.qtd}</td>
          <td style="padding:8px 12px;text-align:right">${fmt(x.vunit)}</td>
          <td style="padding:8px 12px;text-align:center">
            <input type="number" step="0.01" min="0" class="med-qtd" placeholder="0"
              style="width:80px;padding:5px 8px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;text-align:center"
              oninput="updateMedVal(this,'${x.id}')">
          </td>
          <td id="med-val-${x.id}" style="padding:8px 12px;text-align:right;font-weight:700;color:var(--navy)">—</td>
        </tr>`).join('')}
      </tbody>
    </table>`
    :'<div style="color:var(--muted);padding:16px">Nenhum item de orçamento para esta obra.</div>');
}

export function printMedicao(state, id){
  const m=state.medicoes.find(x=>x.id===id);
  if(!m) return;
  const totalMed=m.itens.reduce((a,x)=>a+x.valorMed,0);
  const win=window.open('','_blank');
  
  // Signature defaults
  const engSig = state.engSig || ''; 
  
  win.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
    <title>Medição ${m.num} — ${obraName(state, m.obraId)}</title>
    <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
      body{font-family:'DM Sans',sans-serif;padding:40px;max-width:800px;margin:0 auto;color:#1e293b}
      h1{font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#0f2744}
      .hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #0f2744;padding-bottom:16px;margin-bottom:24px}
      .logo-img{height:54px;max-width:200px;object-fit:contain;margin-bottom:8px}
      .badge{background:#dbeafe;color:#1d4ed8;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600}
      table{width:100%;border-collapse:collapse;font-size:13px;margin-top:16px}
      th{background:#0f2744;color:#fff;padding:10px 14px;text-align:left;font-size:11.5px;text-transform:uppercase;letter-spacing:.4px}
      td{padding:10px 14px;border-bottom:1px solid #e2e8f0}
      tr:nth-child(even){background:#f8faff}
      tfoot td{font-weight:700;background:#f0f4fa;border-top:2px solid #0f2744}
      .footer{margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;display:flex;justify-content:space-between}
      @media print{body{padding:20px}}
    </style></head><body>
    <div class="hdr">
      <div>
        ${state.empresaLogo?`<img src="${state.empresaLogo}" class="logo-img">`:''}
        <div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:#0f2744">${state.empresaNome || 'EJH ENGENHARIA'}</div>
        <div style="font-size:12px;color:#64748b;margin-top:2px">Boletim de Medição</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:13px"><strong>Obra:</strong> ${obraName(state, m.obraId)}</div>
        <div style="font-size:13px"><strong>Medição nº:</strong> ${m.num}</div>
        <div style="font-size:13px"><strong>Período:</strong> ${m.periodo}</div>
        <div style="font-size:13px"><strong>Emissão:</strong> ${fmtD(m.data)}</div>
      </div>
    </div>
    <table>
      <thead><tr><th>Item</th><th>Un.</th><th>Qtd Contrat.</th><th>V. Unitário</th><th>Qtd. Medida</th><th>Valor</th></tr></thead>
      <tbody>${m.itens.map((it)=>`<tr>
        <td>${it.item}</td><td style="text-align:center">${it.un}</td>
        <td style="text-align:center">${it.qtd}</td>
        <td style="text-align:right">${fmt(it.vunit)}</td>
        <td style="text-align:center;font-weight:700">${it.qtdMed}</td>
        <td style="text-align:right;font-weight:700">${fmt(it.valorMed)}</td>
      </tr>`).join('')}</tbody>
      <tfoot><tr>
        <td colspan="5" style="text-align:right">TOTAL DA MEDIÇÃO</td>
        <td style="text-align:right;font-size:15px">${fmt(totalMed)}</td>
      </tr></tfoot>
    </table>
    <div style="margin-top:28px;display:grid;grid-template-columns:1fr 1fr;gap:24px">
      <div style="border-top:2px solid #0f2744;padding-top:8px;text-align:center;font-size:12px">
        ${engSig?`<img src="${engSig}" style="height:64px;margin-bottom:4px;display:block;margin-left:auto;margin-right:auto" alt="Assinatura">`:'<div style="height:64px"></div>'}
        <div>${m.resp || state.engNome || 'Responsável Técnico'}</div>
        <div style="color:#64748b">${state.engRegistro || ''} — ${new Date().toLocaleDateString('pt-BR')}</div>
      </div>
      <div style="border-top:2px solid #0f2744;padding-top:8px;text-align:center;font-size:12px">
        ${m.assinatura?.dataUrl?`<img src="${m.assinatura.dataUrl}" style="height:64px;margin-bottom:4px;display:block;margin-left:auto;margin-right:auto" alt="Assinatura contratante">`:'<div style="height:64px"></div>'}
        <div>${m.assinatura?.nome||'Representante do Contratante'}</div>
        <div style="color:#64748b">Aprovação${m.assinatura?.data?' — '+m.assinatura.data:''}</div>
      </div>
    </div>
    <div class="footer"><span>${state.relatorioRodape || 'EJH Engenharia'} — ${m.id}</span><span>Gerado em ${new Date().toLocaleDateString('pt-BR')}</span></div>
    <script>window.onload=()=>window.print()<\/script>
  </body></html>`);
  win.document.close();
}

export function colherAssinatura(state, medId){
  const m = state.medicoes.find(x=>x.id===medId);
  if(!m) return;
  document.getElementById('sig-cli-med-id').value=medId;
  const clearSig = window.clearSig; 
  if(clearSig) clearSig('cli');
  
  if(document.getElementById('sig-cli-nome')) {
    document.getElementById('sig-cli-nome').value = m.assinatura?.nome || '';
  }
  openModal('modal-assinatura-cliente');
  const initSigPad = window.initSigPad;
  if(initSigPad) setTimeout(()=>initSigPad('sig-cli-canvas','sig-cli-wrap','sig-cli-ph','cli'),100);
}

export function renderMedicoes(state){
  const list = document.getElementById('list-medicoes');
  if(!list) return;
  list.innerHTML=state.medicoes.map(m=>{
    const totalMed=m.itens.reduce((a,x)=>a+x.valorMed,0);
    return `<div class="medicao-card">
      <div class="medicao-header">
        <div>
          <div class="medicao-title">Medição nº ${m.num} — ${obraName(state, m.obraId)}</div>
          <div style="font-size:12px;opacity:.7;margin-top:2px">Período: ${m.periodo} • Emissão: ${fmtD(m.data)}</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800">${fmt(totalMed)}</div>
          <button class="btn btn-outline btn-sm" onclick="printMedicao('${m.id}')">🖨 Imprimir</button>
          <button class="btn btn-outline btn-sm" onclick="colherAssinatura('${m.id}')" style="color:var(--purple);border-color:var(--purple)">✍️ Assinar</button>
        </div>
      </div>
      <div class="medicao-body">
        <table>
          <thead><tr><th>Item</th><th>Un.</th><th>Qtd Total</th><th>V.Unit.</th><th>Qtd. Medida</th><th>Valor Medição</th></tr></thead>
          <tbody>
            ${m.itens.map((it,i)=>`<tr style="background:${i%2===0?'#f8faff':'#fff'}">
              <td style="padding:10px 15px;font-weight:500">${it.item}</td>
              <td style="padding:10px 15px;text-align:center">${it.un}</td>
              <td style="padding:10px 15px;text-align:center">${it.qtd}</td>
              <td style="padding:10px 15px;text-align:right">${fmt(it.vunit)}</td>
              <td style="padding:10px 15px;text-align:center;font-weight:700">${it.qtdMed}</td>
              <td style="padding:10px 15px;text-align:right;font-weight:700">${fmt(it.valorMed)}</td>
            </tr>`).join('')}
          </tbody>
          <tfoot><tr>
            <td colspan="5" style="padding:10px 15px;text-align:right;font-weight:700">TOTAL DA MEDIÇÃO</td>
            <td style="padding:10px 15px;text-align:right;font-weight:800;font-size:15px;color:var(--navy)">${fmt(totalMed)}</td>
          </tr></tfoot>
        </table>
        <div style="padding:16px 20px;font-size:12px;color:var(--muted);border-top:1px solid var(--border)">
          Responsável Técnico: <strong>${m.resp}</strong> • ID: ${m.id}
        </div>
      </div>
    </div>`;
  }).join('')||'<div style="color:var(--muted);padding:20px">Nenhuma medição gerada ainda.</div>';
}

export function getImpMed(){    return document.getElementById('f-imp-med')?.value==='sim'; }




