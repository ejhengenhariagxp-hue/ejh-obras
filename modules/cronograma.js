// modules/cronograma.js
import { fmt, fmtD, pad, safeInner, safeText, showToast, openModal, closeModal, statusBadge } from '../utils.js';

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
  state.counters.cron++;closeModal('modal-cron');return true;showToast('✅ Etapa adicionada!');
}

export function delCron(state, id){if(confirm('Excluir este estágio?')){state.cron=state.cron.filter(x=>x.id!==id);render()}}

export function saveCronEdit(state){
  const id=document.getElementById('f-edit-cron-id').value;
  const c=state.cron.find(x=>x.id===id);if(!c)return;
  c.conc=+document.getElementById('f-edit-conc').value;
  c.prev=+document.getElementById('f-edit-prev').value||c.prev;
  const newFim=document.getElementById('f-edit-fim').value;
  if(newFim) c.fim=newFim;
  closeModal('modal-cron-edit');return true;
  showToast(`✅ ${c.etapa} atualizada para ${c.conc}%`);
}

export function openCronEdit(state, id){
  const c=state.cron.find(x=>x.id===id);if(!c)return;
  document.getElementById('f-edit-cron-id').value=id;
  document.getElementById('f-edit-cron-nome').textContent=`${obraName(c.obraId)} — ${c.etapa}`;
  document.getElementById('f-edit-conc').value=c.conc;
  document.getElementById('edit-pct-label').textContent=c.conc+'%';
  document.getElementById('f-edit-prev').value=c.prev;
  document.getElementById('f-edit-fim').value=c.fim;
  document.getElementById('f-edit-obs').value='';
  document.getElementById('modal-cron-edit').classList.add('open');
}

export function setCronView(state, v){
  cronView=v;
  document.getElementById('cron-tabela-view').style.display=v==='tabela'?'block':'none';
  document.getElementById('cron-gantt-view').style.display=v==='gantt'?'block':'none';
  document.getElementById('gantt-filter').style.display=v==='gantt'?'block':'none';
  document.getElementById('btn-tabela').classList.toggle('active',v==='tabela');
  document.getElementById('btn-gantt').classList.toggle('active',v==='gantt');
  if(v==='gantt') renderGantt();
}

export function renderCron(state){
  safeInner('tbody-cron', state.cron.map(x=>{
    const col=x.conc>=100?'var(--green)':x.conc===0?'#94a3b8':'var(--blue)';
    const sit=x.conc>=100?'<span class="badge badge-green">✅ Concluída</span>':
              x.conc===0?'<span class="badge badge-amber">⏳ Aguardando</span>':
              '<span class="badge badge-blue">🔨 Em execução</span>';
    return `<tr>
      <td class="td-id">${x.id}</td><td>${obraName(x.obraId)}</td>
      <td style="font-weight:500">${x.etapa}</td>
      <td>${fmtD(x.inicio)}</td><td>${fmtD(x.fim)}</td>
      <td>${x.prev}%</td>
      <td><div style="display:flex;align-items:center;gap:9px">
        <div class="progress-wrap" style="flex:1"><div class="progress-bar" style="width:${x.conc}%;background:${col}"></div></div>
        <span style="font-weight:700;color:${col};min-width:34px">${x.conc}%</span>
      </div></td>
      <td>${sit}</td>
      <td style="white-space:nowrap">
        <button class="btn btn-primary btn-xs cron-edit-btn" onclick="openCronEdit('${x.id}')" style="margin-right:4px">✏️ Atualizar</button>
        <button class="btn btn-outline btn-xs" onclick="delCron('${x.id}')" style="color:var(--red);border-color:var(--red)">✕</button>
      </td>
    </tr>`;
  }).join(''));
}

export function renderGantt(state){
  const obraSelEl=document.getElementById('gantt-obra-sel');
  // Populate obra filter
  const obraOpts=state.obras.map(o=>`<option value="${o.id}">${o.nome}</option>`).join('');
  obraSelEl.innerHTML='<option value="">Todas as obras</option>'+obraOpts;

  const filterObraId=obraSelEl.value;
  let etapas=filterObraId?state.cron.filter(c=>c.obraId===filterObraId):[...state.cron];
  if(!etapas.length){
    document.getElementById('gantt-container').innerHTML='<div style="padding:32px;text-align:center;color:var(--muted)">Nenhuma etapa cadastrada.<br>Adicione etapas no cronograma com datas de início e fim.</div>';
    return;
  }
  // Filtra etapas com datas válidas; as sem data ficam no fim
  const withDate=etapas.filter(e=>e.inicio&&e.fim);
  const noDate  =etapas.filter(e=>!e.inicio||!e.fim);

  if(!withDate.length){
    document.getElementById('gantt-container').innerHTML='<div style="padding:32px;text-align:center;color:var(--muted)">Adicione datas de início e fim nas etapas para visualizar o Gantt.</div>';
    return;
  }

  // Timeline range
  const allDates=withDate.flatMap(e=>[new Date(e.inicio),new Date(e.fim)]);
  let minD=new Date(Math.min(...allDates));
  let maxD=new Date(Math.max(...allDates));
  // Pad by 1 month each side
  minD=new Date(minD.getFullYear(),minD.getMonth(),1);
  maxD=new Date(maxD.getFullYear(),maxD.getMonth()+2,0);
  const totalMs=maxD-minD;

  // SVG dimensions
  const LABEL_W=180, ROW_H=34, HDR_H=40, PAD=16;
  const SVG_W=Math.max(900,LABEL_W+600);
  const CHART_W=SVG_W-LABEL_W-PAD*2;
  const SVG_H=HDR_H+(etapas.length+1)*ROW_H+PAD;

export function dateToX(state, d){ return LABEL_W+PAD+(((new Date(d))-minD)/totalMs)*CHART_W; }
export function pct2color(state, p){ return p>=100?'#10b981':p>0?'#3b82f6':'#94a3b8'; }

  // Build months header
  let months=''; let d=new Date(minD);
  while(d<=maxD){
    const x=dateToX(d);
    const label=d.toLocaleDateString('pt-BR',{month:'short',year:'2-digit'});
    months+=`<line x1="${x}" y1="${HDR_H-8}" x2="${x}" y2="${SVG_H-PAD}" stroke="#e2e8f0" stroke-width="1"/>`;
    months+=`<text x="${x+4}" y="${HDR_H/2}" class="gantt-header">${label}</text>`;
    d=new Date(d.getFullYear(),d.getMonth()+1,1);
  }

  // Bars
  let bars='';
  etapas.forEach((e,i)=>{
    const y=HDR_H+i*ROW_H;
    const cy=y+ROW_H/2;
    const oName=obraName(e.obraId);
    const label=filterObraId?e.etapa:`${e.etapa} (${oName.substring(0,12)})`;
    // Label
    bars+=`<text x="${LABEL_W-6}" y="${cy}" class="gantt-label" text-anchor="end" style="font-size:11.5px">${label.substring(0,26)}</text>`;
    // Row bg
    if(i%2===0) bars+=`<rect x="${LABEL_W+PAD}" y="${y+2}" width="${CHART_W}" height="${ROW_H-4}" fill="#f8faff" rx="2"/>`;

    if(!e.inicio||!e.fim){
      bars+=`<text x="${LABEL_W+PAD+8}" y="${cy}" fill="#94a3b8" font-size="11" dominant-baseline="middle">sem data</text>`;
      return;
    }
    const x1=dateToX(e.inicio), x2=dateToX(e.fim);
    const w=Math.max(x2-x1,4);
    const col=pct2color(e.conc);
    // Background bar (previsto)
    bars+=`<rect class="gantt-bar" x="${x1}" y="${y+6}" width="${w}" height="${ROW_H-12}" fill="${col}22" rx="4" onclick="openCronEdit('${e.id}')"/>`;
    // Progress bar (realizado)
    const pw=w*(e.conc/100);
    if(pw>0) bars+=`<rect class="gantt-bar" x="${x1}" y="${y+6}" width="${pw}" height="${ROW_H-12}" fill="${col}" rx="4" onclick="openCronEdit('${e.id}')"/>`;
    // % label
    if(w>36) bars+=`<text x="${x1+pw/2}" y="${cy}" fill="#fff" font-size="11" font-weight="700" text-anchor="middle" dominant-baseline="middle">${e.conc}%</text>`;
  });

  // Today line
  const todayX=dateToX(new Date());
  let todayLine='';
  if(todayX>LABEL_W+PAD&&todayX<SVG_W-PAD){
    todayLine=`<line class="gantt-today" x1="${todayX}" y1="${HDR_H-4}" x2="${todayX}" y2="${SVG_H-PAD}"/>
    <text x="${todayX+4}" y="${HDR_H-10}" fill="#ef4444" font-size="10" font-weight="700">Hoje</text>`;
  }

  document.getElementById('gantt-container').innerHTML=`
    <svg class="gantt-svg" viewBox="0 0 ${SVG_W} ${SVG_H}" xmlns="http://www.w3.org/2000/svg" style="height:${SVG_H}px">
      <rect width="${SVG_W}" height="${SVG_H}" fill="#fff" rx="14"/>
      ${months}${bars}${todayLine}
      <rect x="${LABEL_W+PAD}" y="${HDR_H-8}" width="${CHART_W}" height="1" fill="#e2e8f0"/>
    </svg>`;
}

export function detectEtapa(state, desc){
  const d=(desc||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  for(const [k,v] of Object.entries(ETAPA_MAP)) if(d.includes(k)) return v;
  return 'Complementares';
}

export function dateToX(state, d){ return LABEL_W+PAD+(((new Date(d))-minD)/totalMs)*CHART_W; }

export function getPos(state, e){
    const r=canvas.getBoundingClientRect();
    const src=e.touches?e.touches[0]:e;
    return{x:(src.clientX-r.left)*(canvas.width/r.width),y:(src.clientY-r.top)*(canvas.height/r.height)};
  }

export function bc(state){
    var patterns=Array.from(arguments);
    var idx=rawImportHeaders.findIndex(function(h){
      var n=h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
      return patterns.some(function(p){return n.includes(p);});
    });
    return idx;
  }

export function fC(state, ...ps){return colX.findIndex(col=>{const n=col.name.toLowerCase().normalize('NFD').replace(/[^a-z]/g,'');return ps.some(p=>n.includes(p));});}

export function gCell(state, lineCells,colDef){
    if(!colDef)return'';
    return lineCells.filter(c=>c.x>=colDef.xMin&&c.x<=colDef.xMax).map(c=>c.str).join(' ').trim();
  }

export function move(state, e){e.preventDefault();if(!drawing)return;const p=getPos(e);ctx.lineTo(p.x,p.y);ctx.stroke();
    document.getElementById(phId).style.display='none';
    document.getElementById(wrapId).classList.add('has-sig');
  }

export function sv(state, id,v){if(v>=0){var el=document.getElementById(id);if(el)el.value=v;}}

export function stop(state){drawing=false;}

export function start(state, e){e.preventDefault();drawing=true;const p=getPos(e);ctx.beginPath();ctx.moveTo(p.x,p.y);}

export function getImpCron(state){   return document.getElementById('f-imp-cron').value==='sim'; }

export function pct2color(state, p){ return p>=100?'#10b981':p>0?'#3b82f6':'#94a3b8'; }



