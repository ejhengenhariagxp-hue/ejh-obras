// modules/relatorio.js
import { fmt, fmtD, pad, safeInner, safeText, showToast, openModal, closeModal, statusBadge, escapeHtml } from '../utils.js?v=20260514c';


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

  // Modo RT: quando todas as obras do escopo são de acompanhamento (RT)
  const rtMode = obras.length > 0 && obras.every(o => o.tipo === 'acompanhamento');
  const visitasEscopo = state.diario.filter(d => obras.some(o => o.id === d.obraId));
  const ultimaVisita = visitasEscopo.length
    ? visitasEscopo.map(v => v.data).sort().slice(-1)[0]
    : '';

  const totalOrc=state.orc.filter(x=>!obraId||x.obraId===obraId).reduce((a,x)=>a+x.qtd*x.vunit,0);
  const totalReal=state.orc.filter(x=>!obraId||x.obraId===obraId).reduce((a,x)=>a+x.real,0);
  const rec=state.fin.filter(x=>(!obraId||x.obraId===obraId)&&x.tipo==='Receita').reduce((a,x)=>a+x.valor,0);
  const des=state.fin.filter(x=>(!obraId||x.obraId===obraId)&&x.tipo==='Despesa').reduce((a,x)=>a+x.valor,0);

  const tipoLabel={gerencial:'Relatório Gerencial',avanco:'Relatório de Avanço',financeiro:'Resumo Financeiro',medicao:'Relatório de Medição',diario:'Relatório do Diário de Obra'}[tipo]||'Relatório';
  const tituloRel = rtMode && tipo !== 'diario' ? 'Relatório de Acompanhamento Técnico (RT)' : tipoLabel;

  document.getElementById('report-content').innerHTML=`
  <div style="font-family:'DM Sans',sans-serif;max-width:820px;margin:0 auto">
    <!-- Cabeçalho -->
    <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:24px;padding-bottom:16px;border-bottom:3px solid #1c2126">
      <div>
        ${state.logoData?`<img src="${state.logoData}" style="height:48px;max-width:180px;object-fit:contain;margin-bottom:8px">`:''}
        <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#1c2126">${state.empNome || 'EJH ENGENHARIA'}</div>
        <div style="font-size:12px;color:#6b7068">Engenharia Civil • Projetos • Obras</div>
        <div style="font-size:13px;font-weight:600;color:#2c657a;margin-top:4px">${tituloRel}</div>
      </div>
      <div style="text-align:right;font-size:12.5px;color:#6b7068">
        <div><strong>Emissão:</strong> ${hoje}</div>
        ${obraId?`<div><strong>Obra:</strong> ${obras[0]?.nome||''}</div>`:'<div><strong>Escopo:</strong> Todas as obras</div>'}
      </div>
    </div>

    ${tipo !== 'diario' ? (rtMode ? `
    <!-- KPIs (modo RT) -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px">
      <div style="background:#f0edea;border-radius:10px;padding:14px;text-align:center">
        <div style="font-size:11px;font-weight:700;color:#6b7068;text-transform:uppercase">Obras (RT)</div>
        <div style="font-family:'Syne',sans-serif;font-size:24px;font-weight:800;color:#1c2126">${obras.length}</div>
      </div>
      <div style="background:#ccfbf1;border-radius:10px;padding:14px;text-align:center">
        <div style="font-size:11px;font-weight:700;color:#6b7068;text-transform:uppercase">Visitas</div>
        <div style="font-family:'Syne',sans-serif;font-size:24px;font-weight:800;color:#0d9488">${visitasEscopo.length}</div>
      </div>
      <div style="background:#e8f4f8;border-radius:10px;padding:14px;text-align:center">
        <div style="font-size:11px;font-weight:700;color:#6b7068;text-transform:uppercase">Última visita</div>
        <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:800;color:#2c657a">${ultimaVisita ? fmtD(ultimaVisita) : '—'}</div>
      </div>
      <div style="background:#fffbeb;border-radius:10px;padding:14px;text-align:center">
        <div style="font-size:11px;font-weight:700;color:#6b7068;text-transform:uppercase">Etapas ativas</div>
        <div style="font-family:'Syne',sans-serif;font-size:24px;font-weight:800;color:#f59e0b">${state.cron.filter(c => obras.some(o => o.id === c.obraId) && c.conc > 0 && c.conc < 100).length}</div>
      </div>
    </div>` : `
    <!-- KPIs -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px">
      <div style="background:#f0edea;border-radius:10px;padding:14px;text-align:center">
        <div style="font-size:11px;font-weight:700;color:#6b7068;text-transform:uppercase">Obras</div>
        <div style="font-family:'Syne',sans-serif;font-size:24px;font-weight:800;color:#1c2126">${obras.length}</div>
      </div>
      <div style="background:#f0fdf4;border-radius:10px;padding:14px;text-align:center">
        <div style="font-size:11px;font-weight:700;color:#6b7068;text-transform:uppercase">Orçamento</div>
        <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800;color:#10b981">${fmt(totalOrc)}</div>
      </div>
      <div style="background:#fffbeb;border-radius:10px;padding:14px;text-align:center">
        <div style="font-size:11px;font-weight:700;color:#6b7068;text-transform:uppercase">Realizado</div>
        <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800;color:#f59e0b">${fmt(totalReal)}</div>
      </div>
      <div style="background:${(rec-des)>=0?'#f0fdf4':'#fef2f2'};border-radius:10px;padding:14px;text-align:center">
        <div style="font-size:11px;font-weight:700;color:#6b7068;text-transform:uppercase">Saldo</div>
        <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800;color:${(rec-des)>=0?'#10b981':'#ef4444'}">${fmt(rec-des)}</div>
      </div>
    </div>`) : ''}

    <!-- Conteúdo do Relatório -->
    ${tipo === 'diario' 
      ? obras.map(o => {
          const entries = state.diario.filter(d => d.obraId === o.id).sort((a,b) => b.data.localeCompare(a.data));
          return `
          <div style="margin-bottom:32px">
            <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800;color:#1c2126;border-bottom:2px solid #dbd9d4;padding-bottom:8px;margin-bottom:16px">${escapeHtml(o.nome)}</div>
            ${entries.length ? entries.map(e => `
              <div style="background:#faf9f7;border:1px solid #dbd9d4;border-radius:12px;padding:20px;margin-bottom:12px">
                <div style="display:flex;justify-content:space-between;border-bottom:1px solid #f0edea;padding-bottom:8px;margin-bottom:10px">
                  <div style="font-weight:700;color:#1c2126">${fmtD(e.data)}</div>
                  <div style="font-size:11.5px;color:#6b7068">${escapeHtml(e.clima || '')} • Equipe: ${escapeHtml(e.equipe || '')}</div>
                </div>
                <div style="font-size:13.5px;line-height:1.6;color:#1c1e1a;white-space:pre-wrap">${escapeHtml(e.desc || '')}</div>
                ${e.ocorr && e.ocorr !== 'Sem ocorrências' ? `
                  <div style="margin-top:10px;font-size:12.5px;color:#ef4444;background:#fef2f2;padding:10px;border-radius:8px">
                    <strong>⚠️ Ocorrências/Observações:</strong><br>${escapeHtml(e.ocorr)}
                  </div>` : ''}
                ${e.fotos && e.fotos.length ? `
                  <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(140px, 1fr));gap:10px;margin-top:14px">
                    ${e.fotos.map(f => `<img src="${f.url||f.dataUrl||''}" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;border:1px solid #dbd9d4">`).join('')}
                  </div>
                ` : ''}
              </div>
            `).join('') : '<div style="color:#6b7068;font-size:13px;padding:30px;text-align:center;border:1.5px dashed #dbd9d4;border-radius:12px;background:#f0edea">Nenhum registro de diário encontrado para esta obra.</div>'}
          </div>`;
        }).join('')
      : obras.map(o=>{
          const isRT = o.tipo === 'acompanhamento';
          const etapas=state.cron.filter(c=>c.obraId===o.id);
          const avg=etapas.length?Math.round(etapas.reduce((a,x)=>a+x.conc,0)/etapas.length):0;
          const orcObra=state.orc.filter(x=>x.obraId===o.id).reduce((a,x)=>a+x.qtd*x.vunit,0);
          const realObra=state.orc.filter(x=>x.obraId===o.id).reduce((a,x)=>a+x.real,0);
          const recObra=state.fin.filter(x=>x.obraId===o.id&&x.tipo==='Receita').reduce((a,x)=>a+x.valor,0);
          const desObra=state.fin.filter(x=>x.obraId===o.id&&x.tipo==='Despesa').reduce((a,x)=>a+x.valor,0);
          const diasRestantes=o.fim?Math.ceil((new Date(o.fim)-new Date())/86400000):null;
          const cor=avg>=80?'#10b981':avg>=40?'#f59e0b':'#ef4444';
          const statusIcon=avg>=80?'✅':avg>=40?'⚠️':'🔴';
          const rtTag = isRT ? '<span style="background:#ccfbf1;color:#0d9488;font-size:10.5px;font-weight:700;padding:2px 6px;border-radius:6px;margin-left:6px">🔍 RT</span>' : '';
          const visitasObra = state.diario.filter(d => d.obraId === o.id).sort((a,b)=>b.data.localeCompare(a.data));
          const ultimas3 = visitasObra.slice(0,3);
          return `<div style="background:#faf9f7;border:1px solid #dbd9d4;border-radius:12px;padding:20px;margin-bottom:16px;border-left:4px solid ${cor}">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
              <div>
                <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:700;color:#1c2126">${statusIcon} ${o.nome}${rtTag}</div>
                <div style="font-size:12px;color:#6b7068;margin-top:2px">👤 ${o.cliente} ${o.area?' • 📐 '+o.area+' m²':''} ${diasRestantes!==null?' • ⏱ '+(diasRestantes>0?diasRestantes+'d restantes':Math.abs(diasRestantes)+'d atrasada'):''}${isRT?' • 🗓 '+visitasObra.length+' visita(s)':''}</div>
              </div>
              <div style="text-align:right">
                <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:${cor}">${avg}%</div>
                <div style="font-size:11px;color:#6b7068">avanço</div>
              </div>
            </div>
            <!-- Barra de progresso -->
            <div style="height:8px;background:#dbd9d4;border-radius:4px;margin-bottom:14px">
              <div style="height:100%;width:${avg}%;background:${cor};border-radius:4px;transition:width .6s"></div>
            </div>
            ${!isRT && orcObra>0?`<!-- Financeiro da obra -->
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;font-size:12px">
              <div style="background:#f0edea;padding:8px;border-radius:7px;text-align:center">
                <div style="color:#6b7068">Orçado</div><div style="font-weight:700">${fmt(orcObra)}</div>
              </div>
              <div style="background:#f0edea;padding:8px;border-radius:7px;text-align:center">
                <div style="color:#6b7068">Realizado</div><div style="font-weight:700">${fmt(realObra)}</div>
              </div>
              <div style="background:${(recObra-desObra)>=0?'#f0fdf4':'#fef2f2'};padding:8px;border-radius:7px;text-align:center">
                <div style="color:#6b7068">Saldo</div><div style="font-weight:700;color:${(recObra-desObra)>=0?'#10b981':'#ef4444'}">${fmt(recObra-desObra)}</div>
              </div>
            </div>`:''}
            ${etapas.filter(e=>e.conc>0&&e.conc<100).length?`<div style="margin-top:10px;font-size:12px;color:#6b7068">
              🔨 Em execução: <strong>${etapas.filter(e=>e.conc>0&&e.conc<100).map(e=>e.etapa).join(' • ')}</strong>
            </div>`:''}
            ${isRT && ultimas3.length?`<div style="margin-top:12px;padding-top:10px;border-top:1px solid #dbd9d4">
              <div style="font-size:11.5px;font-weight:700;color:#0d9488;text-transform:uppercase;margin-bottom:6px">Últimas visitas técnicas</div>
              ${ultimas3.map(v => `<div style="font-size:12.5px;color:#1c1e1a;margin-bottom:4px">
                <strong>${fmtD(v.data)}</strong> — ${(v.desc||'').substring(0,140)}${(v.desc||'').length>140?'…':''}
              </div>`).join('')}
            </div>`:''}
          </div>`;
        }).join('')}

    <!-- Rodapé -->
    <div style="margin-top:24px;padding-top:14px;border-top:1px solid #dbd9d4;display:flex;justify-content:space-between;font-size:11px;color:#6b7068">
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

export function gerarTextoRelatorio(state, obraId, tipo){
  const obras=obraId?state.obras.filter(o=>o.id===obraId):state.obras;
  const hoje=new Date().toLocaleDateString('pt-BR');

  // Modo "Diário": texto focado no diário de obra (atividades por dia)
  if (tipo === 'diario') {
    let msg = `*EJH ENGENHARIA — Relatório do Diário de Obra*\n*Data:* ${hoje}\n\n`;
    obras.forEach(o => {
      const entries = state.diario.filter(d => d.obraId === o.id).sort((a,b) => b.data.localeCompare(a.data));
      msg += `*${o.nome}*\n`;
      msg += `👤 Cliente: ${o.cliente}\n\n`;
      if (!entries.length) {
        msg += `_Sem registros._\n\n`;
      } else {
        entries.forEach(e => {
          msg += `📅 *${fmtD(e.data)}*  ${e.clima || ''}  👷 ${e.equipe || '—'}\n`;
          if (e.desc)  msg += `${e.desc}\n`;
          if (e.ocorr && e.ocorr !== 'Sem ocorrências' && e.ocorr !== 'Nenhuma') msg += `⚠️ ${e.ocorr}\n`;
          if (e.fotos?.length) msg += `📷 ${e.fotos.length} foto(s) anexa(s)\n`;
          msg += '\n';
        });
      }
    });
    msg += `_Gerado por ${state.engNome || 'EJH Engenharia'} — Sistema de Gestão de Obras_`;
    return msg;
  }

  let msg=`*EJH ENGENHARIA — Relatório de Obras*
*Data:* ${hoje}

`;
  obras.forEach(o=>{
    const isRT = o.tipo === 'acompanhamento';
    const etapas=state.cron.filter(c=>c.obraId===o.id);
    const avg=etapas.length?Math.round(etapas.reduce((a,x)=>a+x.conc,0)/etapas.length):0;
    const orc=state.orc.filter(x=>x.obraId===o.id).reduce((a,x)=>a+x.qtd*x.vunit,0);
    const real=state.orc.filter(x=>x.obraId===o.id).reduce((a,x)=>a+x.real,0);
    const rec=state.fin.filter(x=>x.obraId===o.id&&x.tipo==='Receita').reduce((a,x)=>a+x.valor,0);
    const des=state.fin.filter(x=>x.obraId===o.id&&x.tipo==='Despesa').reduce((a,x)=>a+x.valor,0);
    const status=avg>=80?'✅ No prazo':avg>=40?'⚠️ Em andamento':'🔴 Atenção';
    msg+=`*${o.nome}*${isRT?' 🔍 RT':''} ${status}
`;
    msg+=`👤 Cliente: ${o.cliente}
`;
    msg+=`📊 Avanço: *${avg}%*
`;
    if(!isRT && orc>0) msg+=`💰 Orçado: ${fmt(orc)} | Realizado: ${fmt(real)}
`;
    if(!isRT && (rec>0||des>0)) msg+=`🏦 Saldo: ${fmt(rec-des)}
`;
    if(o.fim) msg+=`📅 Prazo: ${fmtD(o.fim)}
`;
    const emExec=etapas.filter(e=>e.conc>0&&e.conc<100);
    if(emExec.length) msg+='🔨 Em execução: '+emExec.map(e=>e.etapa).join(', ')+'\n';
    if(isRT) {
      const visitas = state.diario.filter(d => d.obraId === o.id).sort((a,b)=>b.data.localeCompare(a.data));
      msg+=`🗓 Visitas técnicas: ${visitas.length}`+(visitas[0]?` (última: ${fmtD(visitas[0].data)})`:'')+'\n';
    }
    msg+='\n';
  });
  msg+=`_Gerado por ${state.engNome || 'EJH Engenharia'} — Sistema de Gestão de Obras_`;
  return msg;
}

// Coleta fotos do diário (filtradas por obra/tipo) como objetos File para
// compartilhamento via Web Share API. URL → fetch; dataUrl → blob direto.
async function _coletarFotosDiario(state, obraId) {
  const entries = (state.diario || [])
    .filter(d => !obraId || d.obraId === obraId)
    .sort((a, b) => b.data.localeCompare(a.data));
  const files = [];
  let count = 0;
  for (const e of entries) {
    if (!Array.isArray(e.fotos)) continue;
    for (const f of e.fotos) {
      if (count >= 10) return files; // WhatsApp suporta até ~10 anexos
      try {
        let blob;
        if (f.dataUrl) {
          const r = await fetch(f.dataUrl);
          blob = await r.blob();
        } else if (f.url) {
          const r = await fetch(f.url);
          blob = await r.blob();
        }
        if (!blob) continue;
        const safe = (f.name || `foto_${e.data}_${count+1}.jpg`).replace(/[^a-zA-Z0-9._-]/g, '_');
        files.push(new File([blob], safe, { type: blob.type || 'image/jpeg' }));
        count++;
      } catch (err) {
        console.warn('coletarFotos:', err?.message);
      }
    }
  }
  return files;
}

export async function gerarRelatorioWpp(state){
  const obraId=document.getElementById('rel-obra-sel')?.value||'';
  const tipo=document.getElementById('rel-tipo-sel')?.value||'gerencial';
  const msg=gerarTextoRelatorio(state, obraId, tipo);

  // Modo Diário em dispositivo com Web Share API: tenta compartilhar com fotos
  if (tipo === 'diario' && navigator.canShare && navigator.share) {
    try {
      const files = await _coletarFotosDiario(state, obraId);
      const payload = { title: 'Diário de Obra — EJH', text: msg };
      if (files.length && navigator.canShare({ files })) {
        payload.files = files;
      }
      await navigator.share(payload);
      return;
    } catch (e) {
      if (e?.name === 'AbortError') return; // usuário cancelou
      console.warn('navigator.share falhou:', e?.message);
      // fallback abaixo
    }
  }
  window.open('https://api.whatsapp.com/send?text='+encodeURIComponent(msg),'_blank');
}

export function gerarRelatorioEmail(state){
  const obraId=document.getElementById('rel-obra-sel')?.value||'';
  const tipo=document.getElementById('rel-tipo-sel')?.value||'gerencial';
  const msg=gerarTextoRelatorio(state, obraId, tipo);
  const subject='Relatório de Obras — EJH Engenharia — '+new Date().toLocaleDateString('pt-BR');
  // Convert markdown-like to plain text
  const body=msg.replace(/\*/g,'').replace(/_/g,'');
  window.open('mailto:?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body),'_blank');
}



