// modules/relatorio.js
import { fmt, fmtD, pad, safeInner, safeText, showToast, openModal, closeModal, statusBadge } from '../utils.js';


export function renderReport(state){
  // Populate obra selector — sempre sincroniza com estado atual
  const sel=document.getElementById('rel-obra-sel');
  if(sel){
    const valorAtual=sel.value;
    sel.innerHTML='<option value="">Todas as obras</option>';
    state.obras.forEach(o=>{const opt=document.createElement('option');opt.value=o.id;opt.textContent=o.nome;sel.appendChild(opt);});
    if(valorAtual) sel.value=valorAtual;
  }
  const obraId=sel?.value||'';
  const tipo=document.getElementById('rel-tipo-sel')?.value||'gerencial';
  const obras=obraId?state.obras.filter(o=>o.id===obraId):state.obras;
  const hoje=new Date().toLocaleDateString('pt-BR');

  const totalOrc=state.orc.filter(x=>!obraId||x.obraId===obraId).reduce((a,x)=>a+x.qtd*x.vunit,0);
  const totalReal=state.orc.filter(x=>!obraId||x.obraId===obraId).reduce((a,x)=>a+x.real,0);
  const rec=state.fin.filter(x=>(!obraId||x.obraId===obraId)&&x.tipo==='Receita').reduce((a,x)=>a+x.valor,0);
  const des=state.fin.filter(x=>(!obraId||x.obraId===obraId)&&x.tipo==='Despesa').reduce((a,x)=>a+x.valor,0);

  const tipoLabel={gerencial:'Relatório Gerencial',avanco:'Relatório de Avanço',financeiro:'Resumo Financeiro',medicao:'Relatório de Medição',diario:'Relatório do Diário de Obra'}[tipo]||'Relatório';

  document.getElementById('report-content').innerHTML=`
  <div style="font-family:'DM Sans',sans-serif;max-width:820px;margin:0 auto">
    <!-- Cabeçalho -->
    <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:24px;padding-bottom:16px;border-bottom:3px solid #0f2744">
      <div>
        ${state.empresaLogo?`<img src="${state.empresaLogo}" style="height:48px;max-width:180px;object-fit:contain;margin-bottom:8px">`:''}
        <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#0f2744">${state.empresaNome || 'EJH ENGENHARIA'}</div>
        <div style="font-size:12px;color:#64748b">Engenharia Civil • Projetos • Obras</div>
        <div style="font-size:13px;font-weight:600;color:#2563eb;margin-top:4px">${tipoLabel}</div>
      </div>
      <div style="text-align:right;font-size:12.5px;color:#64748b">
        <div><strong>Emissão:</strong> ${hoje}</div>
        ${obraId?`<div><strong>Obra:</strong> ${obras[0]?.nome||''}</div>`:'<div><strong>Escopo:</strong> Todas as obras</div>'}
      </div>
    </div>

    ${tipo !== 'diario' ? `
    <!-- KPIs -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px">
      <div style="background:#f0f9ff;border-radius:10px;padding:14px;text-align:center">
        <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase">Obras</div>
        <div style="font-family:'Syne',sans-serif;font-size:24px;font-weight:800;color:#0f2744">${obras.length}</div>
      </div>
      <div style="background:#f0fdf4;border-radius:10px;padding:14px;text-align:center">
        <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase">Orçamento</div>
        <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800;color:#065f46">${fmt(totalOrc)}</div>
      </div>
      <div style="background:#fffbeb;border-radius:10px;padding:14px;text-align:center">
        <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase">Realizado</div>
        <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800;color:#92400e">${fmt(totalReal)}</div>
      </div>
      <div style="background:${(rec-des)>=0?'#f0fdf4':'#fef2f2'};border-radius:10px;padding:14px;text-align:center">
        <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase">Saldo</div>
        <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800;color:${(rec-des)>=0?'#065f46':'#991b1b'}">${fmt(rec-des)}</div>
      </div>
    </div>` : ''}

    <!-- Conteúdo do Relatório -->
    ${tipo === 'diario' 
      ? obras.map(o => {
          const entries = state.diario.filter(d => d.obraId === o.id).sort((a,b) => b.data.localeCompare(a.data));
          return `
          <div style="margin-bottom:32px">
            <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800;color:#0f2744;border-bottom:2px solid #e2e8f0;padding-bottom:8px;margin-bottom:16px">${o.nome}</div>
            ${entries.length ? entries.map(e => `
              <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:12px">
                <div style="display:flex;justify-content:space-between;border-bottom:1px solid #f1f5f9;padding-bottom:8px;margin-bottom:10px">
                  <div style="font-weight:700;color:#0f2744">${fmtD(e.data)}</div>
                  <div style="font-size:11.5px;color:#64748b">${e.clima} • Equipe: ${e.equipe}</div>
                </div>
                <div style="font-size:13.5px;line-height:1.6;color:#1e293b;white-space:pre-wrap">${e.desc}</div>
                ${e.ocorr && e.ocorr !== 'Sem ocorrências' ? `
                  <div style="margin-top:10px;font-size:12.5px;color:#b91c1c;background:#fef2f2;padding:10px;border-radius:8px">
                    <strong>⚠️ Ocorrências/Observações:</strong><br>${e.ocorr}
                  </div>` : ''}
                ${e.fotos && e.fotos.length ? `
                  <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(140px, 1fr));gap:10px;margin-top:14px">
                    ${e.fotos.map(f => `<img src="${f.dataUrl}" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;border:1px solid #e2e8f0">`).join('')}
                  </div>
                ` : ''}
              </div>
            `).join('') : '<div style="color:#64748b;font-size:13px;padding:30px;text-align:center;border:1.5px dashed #e2e8f0;border-radius:12px;background:#f8faff">Nenhum registro de diário encontrado para esta obra.</div>'}
          </div>`;
        }).join('')
      : obras.map(o=>{
          const etapas=state.cron.filter(c=>c.obraId===o.id);
          const avg=etapas.length?Math.round(etapas.reduce((a,x)=>a+x.conc,0)/etapas.length):0;
          const orcObra=state.orc.filter(x=>x.obraId===o.id).reduce((a,x)=>a+x.qtd*x.vunit,0);
          const realObra=state.orc.filter(x=>x.obraId===o.id).reduce((a,x)=>a+x.real,0);
          const recObra=state.fin.filter(x=>x.obraId===o.id&&x.tipo==='Receita').reduce((a,x)=>a+x.valor,0);
          const desObra=state.fin.filter(x=>x.obraId===o.id&&x.tipo==='Despesa').reduce((a,x)=>a+x.valor,0);
          const diasRestantes=o.fim?Math.ceil((new Date(o.fim)-new Date())/86400000):null;
          const cor=avg>=80?'#10b981':avg>=40?'#f59e0b':'#ef4444';
          const statusIcon=avg>=80?'✅':avg>=40?'⚠️':'🔴';
          return `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:16px;border-left:4px solid ${cor}">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
              <div>
                <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:700;color:#0f2744">${statusIcon} ${o.nome}</div>
                <div style="font-size:12px;color:#64748b;margin-top:2px">👤 ${o.cliente} ${o.area?' • 📐 '+o.area+' m²':''} ${diasRestantes!==null?' • ⏱ '+(diasRestantes>0?diasRestantes+'d restantes':Math.abs(diasRestantes)+'d atrasada'):''}</div>
              </div>
              <div style="text-align:right">
                <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:${cor}">${avg}%</div>
                <div style="font-size:11px;color:#64748b">avanço</div>
              </div>
            </div>
            <!-- Barra de progresso -->
            <div style="height:8px;background:#e2e8f0;border-radius:4px;margin-bottom:14px">
              <div style="height:100%;width:${avg}%;background:${cor};border-radius:4px;transition:width .6s"></div>
            </div>
            <!-- Financeiro da obra -->
            ${orcObra>0?`<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;font-size:12px">
              <div style="background:#f8faff;padding:8px;border-radius:7px;text-align:center">
                <div style="color:#64748b">Orçado</div><div style="font-weight:700">${fmt(orcObra)}</div>
              </div>
              <div style="background:#f8faff;padding:8px;border-radius:7px;text-align:center">
                <div style="color:#64748b">Realizado</div><div style="font-weight:700">${fmt(realObra)}</div>
              </div>
              <div style="background:${(recObra-desObra)>=0?'#f0fdf4':'#fef2f2'};padding:8px;border-radius:7px;text-align:center">
                <div style="color:#64748b">Saldo</div><div style="font-weight:700;color:${(recObra-desObra)>=0?'#065f46':'#991b1b'}">${fmt(recObra-desObra)}</div>
              </div>
            </div>`:''}
            <!-- Etapas em execução -->
            ${etapas.filter(e=>e.conc>0&&e.conc<100).length?`<div style="margin-top:10px;font-size:12px;color:#64748b">
              🔨 Em execução: <strong>${etapas.filter(e=>e.conc>0&&e.conc<100).map(e=>e.etapa).join(' • ')}</strong>
            </div>`:''}
          </div>`;
        }).join('')}

    <!-- Rodapé -->
    <div style="margin-top:24px;padding-top:14px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:11px;color:#94a3b8">
      <span>${state.relatorioRodape || 'EJH Engenharia — Sistema de Gestão de Obras'}</span>
      <span>Emitido em ${hoje}</span>
    </div>

    <!-- Share bar -->
    <div class="share-bar no-print">
      <button class="btn btn-outline btn-sm" onclick="gerarRelatorioWpp()" style="color:#25d366;border-color:#25d366">📱 Compartilhar WhatsApp</button>
      <button class="btn btn-outline btn-sm" onclick="gerarRelatorioEmail()">📧 Enviar por E-mail</button>
      <button class="btn btn-primary btn-sm" onclick="window.print()">🖨 Gerar PDF</button>
    </div>
  </div>`;
}

export function gerarTextoRelatorio(state, obraId){
  const obras=obraId?state.obras.filter(o=>o.id===obraId):state.obras;
  const hoje=new Date().toLocaleDateString('pt-BR');
  let msg=`*EJH ENGENHARIA — Relatório de Obras*
*Data:* ${hoje}

`;
  obras.forEach(o=>{
    const etapas=state.cron.filter(c=>c.obraId===o.id);
    const avg=etapas.length?Math.round(etapas.reduce((a,x)=>a+x.conc,0)/etapas.length):0;
    const orc=state.orc.filter(x=>x.obraId===o.id).reduce((a,x)=>a+x.qtd*x.vunit,0);
    const real=state.orc.filter(x=>x.obraId===o.id).reduce((a,x)=>a+x.real,0);
    const rec=state.fin.filter(x=>x.obraId===o.id&&x.tipo==='Receita').reduce((a,x)=>a+x.valor,0);
    const des=state.fin.filter(x=>x.obraId===o.id&&x.tipo==='Despesa').reduce((a,x)=>a+x.valor,0);
    const status=avg>=80?'✅ No prazo':avg>=40?'⚠️ Em andamento':'🔴 Atenção';
    msg+=`*${o.nome}* ${status}
`;
    msg+=`👤 Cliente: ${o.cliente}
`;
    msg+=`📊 Avanço: *${avg}%*
`;
    if(orc>0) msg+=`💰 Orçado: ${fmt(orc)} | Realizado: ${fmt(real)}
`;
    if(rec>0||des>0) msg+=`🏦 Saldo: ${fmt(rec-des)}
`;
    if(o.fim) msg+=`📅 Prazo: ${fmtD(o.fim)}
`;
    // Últimas etapas
    const emExec=etapas.filter(e=>e.conc>0&&e.conc<100);
    if(emExec.length) msg+='🔨 Em execução: '+emExec.map(e=>e.etapa).join(', ')+'\n';
    msg+='\n';
  });
  msg+=`_Gerado por ${state.engNome || 'EJH Engenharia'} — Sistema de Gestão de Obras_`;
  return msg;
}

export function gerarRelatorioWpp(state){
  const obraId=document.getElementById('rel-obra-sel')?.value||'';
  const msg=gerarTextoRelatorio(obraId);
  window.open('https://api.whatsapp.com/send?text='+encodeURIComponent(msg),'_blank');
}

export function gerarRelatorioEmail(state){
  const obraId=document.getElementById('rel-obra-sel')?.value||'';
  const msg=gerarTextoRelatorio(obraId);
  const subject='Relatório de Obras — EJH Engenharia — '+new Date().toLocaleDateString('pt-BR');
  // Convert markdown-like to plain text
  const body=msg.replace(/\*/g,'').replace(/_/g,'');
  window.open('mailto:?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body),'_blank');
}



