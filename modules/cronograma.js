// modules/cronograma.js
import { fmt, fmtD, pad, safeInner, safeText, showToast, openModal, closeModal, statusBadge, obraName } from '../utils.js';

let cronView = 'tabela';

export function addCron(state){
  const etapa=document.getElementById('f-cron-etapa').value.trim();
  if(!etapa){
    document.getElementById('f-cron-etapa').style.border='1.5px solid var(--red)';
    showToast('⚠️ Informe o nome da etapa.');
    return;
  }
  document.getElementById('f-cron-etapa').style.border='';
  state.cron.push({id:'CRN-'+pad(state.counters.cron),
    obraId:document.getElementById('f-cron-obra').value,
    etapa:etapa||'Etapa',
    inicio:document.getElementById('f-cron-inicio').value,
    fim:document.getElementById('f-cron-fim').value,
    prev:+document.getElementById('f-cron-prev').value||100,
    conc:+document.getElementById('f-cron-conc').value||0,
  });
  state.counters.cron++;
  closeModal('modal-cron');
  showToast('✅ Etapa adicionada!');
  return true;
}

export function delCron(state, id){
  if(confirm('Excluir este estágio?')){
    state.cron=state.cron.filter(x=>x.id!==id);
    return true;
  }
  return false;
}

export function saveCronEdit(state){
  const id=document.getElementById('f-edit-cron-id').value;
  const c=state.cron.find(x=>x.id===id);
  if(!c)return;
  c.conc=+document.getElementById('f-edit-conc').value;
  c.prev=+document.getElementById('f-edit-prev').value||c.prev;
  const newFim=document.getElementById('f-edit-fim').value;
  if(newFim) c.fim=newFim;
  closeModal('modal-cron-edit');
  showToast(`✅ ${c.etapa} atualizada para ${c.conc}%`);
  return true;
}

export function openCronEdit(state, id){
  const c=state.cron.find(x=>x.id===id);
  if(!c)return;
  document.getElementById('f-edit-cron-id').value=id;
  document.getElementById('f-edit-cron-nome').textContent=`${obraName(state, c.obraId)} — ${c.etapa}`;
  document.getElementById('f-edit-conc').value=c.conc;
  document.getElementById('edit-pct-label').textContent=c.conc+'%';
  document.getElementById('f-edit-prev').value=c.prev;
  document.getElementById('f-edit-fim').value=c.fim;
  document.getElementById('f-edit-obs').value='';
  openModal('modal-cron-edit');
}

export function setCronView(v){
  document.getElementById('cron-tabela-view').style.display=v==='tabela'?'block':'none';
  document.getElementById('cron-gantt-view').style.display=v==='gantt'?'block':'none';
  document.getElementById('gantt-filter').style.display=v==='gantt'?'block':'none';
  document.getElementById('btn-tabela').classList.toggle('active',v==='tabela');
  document.getElementById('btn-gantt').classList.toggle('active',v==='gantt');
}

export function renderCron(state){
  safeInner('tbody-cron', state.cron.map(x=>{
    const col=x.conc>=100?'var(--green)':x.conc===0?'#94a3b8':'var(--blue)';
    const sit=x.conc>=100?'<span class="badge badge-green">✅ Concluída</span>':
              x.conc===0?'<span class="badge badge-amber">⏳ Aguardando</span>':
              '<span class="badge badge-blue">🔨 Em execução</span>';
    return `<tr>
      <td class="td-id">${x.id}</td><td>${obraName(state, x.obraId)}</td>
      <td style="font-weight:500">${x.etapa}</td>
      <td>${fmtD(x.inicio)}</td><td>${fmtD(x.fim)}</td>
      <td>${x.prev}%</td>
      <td><div style="display:flex;align-items:center;gap:9px">
        <div class="progress-wrap" style="flex:1"><div class="progress-bar" style="width:${x.conc}%;background:${col}"></div></div>
        <span style="font-weight:700;color:${col};min-width:34px">${x.conc}%</span>
      </div></td>
      <td>${sit}</td>
      <td style="white-space:nowrap">
        <button class="btn btn-primary btn-xs" onclick="openCronEdit('${x.id}')" style="margin-right:4px">✏️ Atualizar</button>
        <button class="btn btn-outline btn-xs" onclick="delCron('${x.id}')" style="color:var(--red);border-color:var(--red)">✕</button>
      </td>
    </tr>`;
  }).join(''));
}

export function renderGantt(state){
  const obraSelEl=document.getElementById('gantt-obra-sel');
  if(!obraSelEl) return;
  const obraOpts=state.obras.map(o=>`<option value="${o.id}">${o.nome}</option>`).join('');
  obraSelEl.innerHTML='<option value="">Todas as obras</option>'+obraOpts;

  const filterObraId=obraSelEl.value;
  let etapas=filterObraId?state.cron.filter(c=>c.obraId===filterObraId):[...state.cron];
  
  const ganttContainer = document.getElementById('gantt-container');
  if(!ganttContainer) return;

  if(!etapas.length){
    ganttContainer.innerHTML='<div style="padding:32px;text-align:center;color:var(--muted)">Nenhuma etapa cadastrada.</div>';
    return;
  }
  
  const withDate=etapas.filter(e=>e.inicio&&e.fim);
  if(!withDate.length){
    ganttContainer.innerHTML='<div style="padding:32px;text-align:center;color:var(--muted)">Adicione datas nas etapas para ver o Gantt.</div>';
    return;
  }

  const allDates=withDate.flatMap(e=>[new Date(e.inicio),new Date(e.fim)]);
  let minD=new Date(Math.min(...allDates));
  let maxD=new Date(Math.max(...allDates));
  minD=new Date(minD.getFullYear(),minD.getMonth(),1);
  maxD=new Date(maxD.getFullYear(),maxD.getMonth()+2,0);
  const totalMs=maxD-minD;

  const LABEL_W=180, ROW_H=34, HDR_H=40, PAD=16;
  const SVG_W=900;
  const CHART_W=SVG_W-LABEL_W-PAD*2;
  const SVG_H=HDR_H+(etapas.length+1)*ROW_H+PAD;

  function dToX(d) { return LABEL_W+PAD+(((new Date(d))-minD)/totalMs)*CHART_W; }

  let months=''; let d=new Date(minD);
  while(d<=maxD){
    const x=dToX(d);
    const label=d.toLocaleDateString('pt-BR',{month:'short',year:'2-digit'});
    months+=`<line x1="${x}" y1="${HDR_H-8}" x2="${x}" y2="${SVG_H-PAD}" stroke="#e2e8f0" stroke-width="1"/>`;
    months+=`<text x="${x+4}" y="${HDR_H/2}" style="font-size:10px;fill:var(--muted);font-weight:700;text-transform:uppercase">${label}</text>`;
    d=new Date(d.getFullYear(),d.getMonth()+1,1);
  }

  let bars='';
  etapas.forEach((e,i)=>{
    const y=HDR_H+i*ROW_H;
    const cy=y+ROW_H/2;
    const oName=obraName(state, e.obraId);
    const label=filterObraId?e.etapa:`${e.etapa} (${oName.substring(0,10)})`;
    bars+=`<text x="${LABEL_W-6}" y="${cy}" text-anchor="end" style="font-size:11px;fill:var(--navy);font-weight:500" dominant-baseline="middle">${label.substring(0,25)}</text>`;
    if(i%2===0) bars+=`<rect x="${LABEL_W+PAD}" y="${y+2}" width="${CHART_W}" height="${ROW_H-4}" fill="#f8faff" rx="4"/>`;
    if(!e.inicio||!e.fim) return;

    const x1=dToX(e.inicio), x2=dToX(e.fim);
    const w=Math.max(x2-x1,4);
    const col=e.conc>=100?'#10b981':e.conc>0?'#3b82f6':'#94a3b8';
    bars+=`<rect x="${x1}" y="${y+6}" width="${w}" height="${ROW_H-12}" fill="${col}22" rx="4" cursor="pointer" onclick="openCronEdit('${e.id}')"/>`;
    const pw=w*(e.conc/100);
    if(pw>0) bars+=`<rect x="${x1}" y="${y+6}" width="${pw}" height="${ROW_H-12}" fill="${col}" rx="4" cursor="pointer" onclick="openCronEdit('${e.id}')"/>`;
  });

  const todayX=dToX(new Date());
  let todayLine='';
  if(todayX>LABEL_W+PAD && todayX<SVG_W-PAD){
    todayLine=`<line x1="${todayX}" y1="${HDR_H-4}" x2="${todayX}" y2="${SVG_H-PAD}" stroke="var(--red)" stroke-width="2" stroke-dasharray="4"/>
    <text x="${todayX+4}" y="${HDR_H-10}" fill="var(--red)" font-size="10" font-weight="800">Hoje</text>`;
  }

  ganttContainer.innerHTML=`<svg width="100%" height="${SVG_H}" viewBox="0 0 ${SVG_W} ${SVG_H}" xmlns="http://www.w3.org/2000/svg">
    ${months}${bars}${todayLine}
  </svg>`;
}
