// modules/diario.js
import { fmt, fmtD, pad, safeInner, safeText, showToast, openModal, closeModal, popularSelectsObras, obraName } from '../utils.js';

let _diarioLimit = 20;
let _pendingFotos = [];

export function addDiario(state){
  const obraId = document.getElementById('f-dia-obra')?.value;
  if (!obraId) { showToast('⚠️ Selecione uma obra'); return false; }

  state.diario.push({
    id:     'DIA-'+pad(state.counters.dia),
    obraId: obraId,
    data:   document.getElementById('f-dia-data').value,
    desc:   document.getElementById('f-dia-desc').value,
    equipe: document.getElementById('f-dia-equipe').value,
    clima:  document.getElementById('f-dia-clima').value,
    ocorr:  document.getElementById('f-dia-ocorr').value,
    fotos:  [..._pendingFotos],
  });
  _pendingFotos = [];
  renderFotoPreview();
  state.counters.dia++;
  closeModal('modal-diario');
  showToast('✅ Registro salvo!');
  return true;
}

export function delDiario(state, id){
  if(confirm('Excluir este registro?')){
    state.diario=state.diario.filter(x=>x.id!==id);
    _diarioLimit=20;
    return true;
  }
  return false;
}

export function handleFotos(state, input){
  const files = Array.from(input.files);
  files.forEach(file=>{
    const reader = new FileReader();
    reader.onload = e => {
      _pendingFotos.push({dataUrl:e.target.result, name:file.name});
      renderFotoPreview();
    };
    reader.readAsDataURL(file);
  });
  input.value=''; // permite reusar
}

export function removePendingFoto(state, i){ 
  _pendingFotos.splice(i,1); 
  renderFotoPreview(); 
}

export function openModalDiario(state){
  _pendingFotos=[];
  renderFotoPreview();
  popularSelectsObras(state);
  if(document.getElementById('f-dia-data')) document.getElementById('f-dia-data').value = new Date().toISOString().split('T')[0];
  openModal('modal-diario');
}

export function renderDiario(state){
  const sorted = [...state.diario].sort((a,b)=>b.data.localeCompare(a.data));
  const total = sorted.length;
  const visiveis = sorted.slice(0, _diarioLimit);
  const html = visiveis.map(d=>{
      const fotos=d.fotos||[];
      const galeriaHtml=fotos.length?`
        <div class="foto-galeria">
          ${fotos.map((f,i)=>`<img src="${f.dataUrl}" alt="${f.name||'foto'}"
            onclick="openLightbox('${f.dataUrl}','${obraName(state, d.obraId)} — ${fmtD(d.data)} — Foto ${i+1}')"
            title="${f.name||'foto'}">`).join('')}
        </div>`:'';
      return `<div class="diario-item">
        <div style="display:flex;justify-content:space-between">
          <div style="flex:1">
            <div class="diario-date">${fmtD(d.data)} — ${obraName(state, d.obraId)}</div>
            <div class="diario-body">${d.desc}</div>
            ${d.ocorr&&d.ocorr!=='Sem ocorrências' && d.ocorr!=='Nenhuma'?`<div style="margin-top:5px;font-size:12px;color:var(--red)">⚠️ ${d.ocorr}</div>`:''}
            <div class="diario-tags">
              <span class="badge badge-blue">${d.equipe}</span>
              <span class="badge badge-amber">${d.clima}</span>
              ${fotos.length?`<span class="badge badge-purple">📷 ${fotos.length} foto${fotos.length>1?'s':''}</span>`:''}
            </div>
            ${galeriaHtml}
          </div>
          <button class="btn btn-outline btn-xs" onclick="delDiario('${d.id}')" style="color:var(--red);border-color:var(--red);margin-left:12px;align-self:flex-start">✕</button>
        </div>
      </div>`;
    }).join('')||'<div style="color:var(--muted);padding:20px">Nenhum registro ainda.</div>';
    
  safeInner('list-diario', html);
  
  const verMaisWrap = document.getElementById('dia-ver-mais-wrap');
  if(total > _diarioLimit && verMaisWrap){
    verMaisWrap.innerHTML = `<button class="btn btn-outline" onclick="window._state.diaLimit+=20; renderAtiva()">Ver mais (${total-_diarioLimit} restantes)</button>`;
  } else if (verMaisWrap) {
    verMaisWrap.innerHTML = '';
  }
}

export function renderFotoPreview(){
  const el = document.getElementById('foto-preview');
  if(!el) return;
  el.innerHTML = _pendingFotos.map((f,i)=>`
    <div class="foto-preview-item">
      <img src="${f.dataUrl}" alt="${f.name}">
      <button class="foto-preview-del" onclick="removePendingFoto(${i})">✕</button>
    </div>`).join('');
}




