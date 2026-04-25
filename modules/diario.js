// modules/diario.js
import { fmt, fmtD, pad, safeInner, safeText, showToast, openModal, closeModal, popularSelectsObras, obraName, escapeHtml, markDeleted } from '../utils.js?v=20260425i';
import { iaCall } from '../services.js?v=20260425i';

let _diarioLimit = 20;
let _pendingFotos = [];

export function addDiario(state){
  try {
    const obraId = document.getElementById('f-dia-obra')?.value;
    const data = document.getElementById('f-dia-data')?.value;
    if (!obraId) { showToast('⚠️ Selecione uma obra'); return false; }
    if (!data) { showToast('⚠️ Selecione uma data'); return false; }

    state.counters = state.counters || {};
    state.counters.dia = state.counters.dia || 1;
    state.diario = state.diario || [];

    const editId = document.getElementById('f-dia-id')?.value;
    // Caminho B (Firestore puro): foto fica como dataUrl no sub-doc do registro
    const fotosFinais = _pendingFotos.map(f => ({
      dataUrl: f.dataUrl,
      name: f.name
    })).filter(f => f.dataUrl);
    const dadosForm = {
      obraId: obraId,
      data:   data,
      desc:   document.getElementById('f-dia-desc')?.value || '',
      equipe: document.getElementById('f-dia-equipe')?.value || '',
      clima:  document.getElementById('f-dia-clima')?.value || '',
      ocorr:  document.getElementById('f-dia-ocorr')?.value || '',
      fotos:  fotosFinais,
    };

    if (editId) {
      const idx = state.diario.findIndex(d => d.id === editId);
      if (idx < 0) { showToast('⚠️ Registro não encontrado'); return false; }
      state.diario[idx] = { ...state.diario[idx], ...dadosForm };
    } else {
      state.diario.push({ id: 'DIA-'+pad(state.counters.dia), ...dadosForm });
      state.counters.dia++;
    }
    _pendingFotos = [];
    renderFotoPreview();
    closeModal('modal-diario');
    showToast(editId ? '✅ Registro atualizado!' : '✅ Registro salvo!');
    return true;
  } catch (e) {
    console.error('addDiario falhou:', e);
    showToast('❌ Erro ao salvar: ' + (e.message || 'desconhecido'), 5000);
    return false;
  }
}

export function openEditDiario(state, id) {
  const d = state.diario.find(x => x.id === id);
  if (!d) { showToast('⚠️ Registro não encontrado'); return; }
  popularSelectsObras(state);
  _pendingFotos = [...(d.fotos || [])];
  renderFotoPreview();
  const set = (k, v) => { const el = document.getElementById(k); if (el) el.value = v ?? ''; };
  set('f-dia-id', d.id);
  set('f-dia-obra', d.obraId);
  set('f-dia-data', d.data);
  set('f-dia-desc', d.desc);
  set('f-dia-equipe', d.equipe);
  set('f-dia-clima', d.clima);
  set('f-dia-ocorr', d.ocorr);
  const t = document.querySelector('#modal-diario .modal-title');
  if (t) t.textContent = '✏️ Editar registro do diário';
  openModal('modal-diario');
}

export function delDiario(state, id){
  if(confirm('Excluir este registro?')){
    state.diario=state.diario.filter(x=>x.id!==id);
    markDeleted(state, 'diario', id);
    _diarioLimit=20;
    return true;
  }
  return false;
}

// Compressão alvo: ~80–120KB por foto, pra caber 6+ fotos por diário no
// limite de 1MB do sub-doc Firestore.
function compressImage(dataUrl, maxWidth = 1024, quality = 0.65) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width, h = img.height;
      if (w > maxWidth) {
        h = (h * maxWidth) / w;
        w = maxWidth;
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(blob => resolve({ dataUrl: canvas.toDataURL('image/jpeg', quality), blob }), 'image/jpeg', quality);
    };
    img.src = dataUrl;
  });
}

export async function handleFotos(state, input){
  const files = Array.from(input.files);
  const placeholders = [];
  for (const file of files) {
    const ph = { dataUrl: '', name: file.name, uploading: true };
    _pendingFotos.push(ph);
    placeholders.push(ph);
  }
  renderFotoPreview();
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ph = placeholders[i];
    try {
      const dataUrl = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = e => res(e.target.result);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const { dataUrl: compressed } = await compressImage(dataUrl);
      ph.dataUrl = compressed;
      ph.uploading = false;
      renderFotoPreview();
    } catch (e) {
      console.error('handleFotos:', e);
      ph.uploading = false;
      ph.error = (e?.message || 'erro');
      renderFotoPreview();
    }
  }
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
  // limpa modo edição e campos
  ['f-dia-id','f-dia-desc','f-dia-equipe','f-dia-ocorr'].forEach(k => { const el = document.getElementById(k); if (el) el.value = ''; });
  if(document.getElementById('f-dia-data')) document.getElementById('f-dia-data').value = new Date().toISOString().split('T')[0];
  const t = document.querySelector('#modal-diario .modal-title');
  if (t) t.textContent = '📋 Novo registro do diário';
  openModal('modal-diario');
}

export function cancelarDiario(){
  _pendingFotos=[];
  renderFotoPreview();
  closeModal('modal-diario');
}

export function renderDiario(state){
  const sorted = [...state.diario].sort((a,b)=>b.data.localeCompare(a.data));
  const total = sorted.length;
  const visiveis = sorted.slice(0, _diarioLimit);
  const html = visiveis.map(d=>{
      const fotos=d.fotos||[];
      const galeriaHtml=fotos.length?`
        <div class="foto-galeria">
          ${fotos.map((f,i)=>{const src=f.url||f.dataUrl||'';return `<img src="${src}" alt="${f.name||'foto'}"
            onclick="openLightbox('${src}','${obraName(state, d.obraId)} — ${fmtD(d.data)} — Foto ${i+1}')"
            title="${f.name||'foto'}">`}).join('')}
        </div>`:'';
      return `<div class="diario-item">
        <div style="display:flex;justify-content:space-between">
          <div style="flex:1">
            <div class="diario-date">${fmtD(d.data)} — ${obraName(state, d.obraId)}</div>
            <div class="diario-body">${escapeHtml(d.desc)}</div>
            ${d.ocorr&&d.ocorr!=='Sem ocorrências' && d.ocorr!=='Nenhuma'?`<div style="margin-top:5px;font-size:12px;color:var(--red)">⚠️ ${escapeHtml(d.ocorr)}</div>`:''}
            <div class="diario-tags">
              <span class="badge badge-blue">${d.equipe}</span>
              <span class="badge badge-amber">${d.clima}</span>
              ${fotos.length?`<span class="badge badge-purple">📷 ${fotos.length} foto${fotos.length>1?'s':''}</span>`:''}
            </div>
            ${galeriaHtml}
          </div>
          <div style="display:flex;gap:6px;margin-left:12px;align-self:flex-start">
            <button class="btn btn-outline btn-xs" onclick="openEditDiario('${d.id}')" style="color:var(--amber);border-color:var(--amber)" title="Editar registro">✏️</button>
            <button class="btn btn-outline btn-xs" onclick="delDiario('${d.id}')" style="color:var(--red);border-color:var(--red)" title="Excluir">✕</button>
          </div>
        </div>
      </div>`;
    }).join('')||`<div style="background:var(--card);border-radius:var(--radius);padding:36px 20px;text-align:center;border:1.5px dashed var(--border)">
      <div style="font-size:32px;margin-bottom:8px">📋</div>
      <div style="font-weight:600;color:var(--navy);font-size:14px;margin-bottom:4px">Nenhum registro de diário</div>
      <div style="font-size:12.5px;color:var(--muted);margin-bottom:14px">Documente o que aconteceu na obra hoje — fotos, equipe, clima e ocorrências</div>
      <button class="btn btn-primary btn-sm" onclick="openModalDiario()">＋ Primeiro Registro</button>
    </div>`;
    
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
  el.innerHTML = _pendingFotos.map((f,i)=>{
    const src = f.url || f.dataUrl || '';
    const overlay = f.uploading ? '<div style="position:absolute;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;border-radius:7px">⏳</div>' :
                    f.error ? '<div style="position:absolute;inset:0;background:rgba(220,38,38,.55);display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;border-radius:7px" title="'+(f.error||'')+'">❌</div>' : '';
    return `<div class="foto-preview-item" style="position:relative">
      <img src="${src}" alt="${f.name||''}">
      ${overlay}
      <button class="foto-preview-del" onclick="removePendingFoto(${i})">✕</button>
    </div>`;
  }).join('');
}

export async function gerarDiarioComFoto(state) {
  if (!_pendingFotos.length) { showToast('⚠️ Tire uma foto primeiro'); return; }
  const btn = document.getElementById('dia-ia-btn');
  const loading = document.getElementById('dia-ia-loading');
  if (btn) btn.disabled = true;
  if (loading) loading.style.display = 'block';
  try {
    const content = [];
    const obra = state?.obras?.find(o => o.id === document.getElementById('f-dia-obra')?.value);
    const obraCtx = obra ? `Obra: ${obra.nome} | Cliente: ${obra.cliente} | Área: ${obra.area}m²` : '';
    content.push({type:'text', text:`Contexto: ${obraCtx}\n\nAnalise a(s) foto(s) e preencha:\n- desc: atividades observadas (máx 200 chars)\n- clima: ☀️ Ensolarado / ⛅ Parcialmente nublado / 🌧 Chuva / ⛈ Tempestade / 🌥 Nublado\n- equipe: "X operários" ou estimativa\n\nJSON: {"desc":"...","clima":"...","equipe":"..."}`});
    for (const foto of _pendingFotos) {
      const b64 = foto.dataUrl.split(',')[1];
      const mediaType = foto.dataUrl.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
      content.push({ type:'image', source:{ type:'base64', media_type: mediaType, data: b64 } });
    }
    const resp = await iaCall(
      'Supervisor de obras. Analise fotos, preencha descrição, clima e equipe.',
      content, 500);
    const data = JSON.parse(resp.replace(/```json|```/g, '').trim());
    if (data.desc) document.getElementById('f-dia-desc').value = data.desc;
    if (data.clima) document.getElementById('f-dia-clima').value = data.clima;
    if (data.equipe) document.getElementById('f-dia-equipe').value = data.equipe;
    showToast('✅ Preenchido pela IA!');
  } catch (e) {
    showToast('❌ Erro: ' + e.message);
  } finally {
    if (btn) btn.disabled = false;
    if (loading) loading.style.display = 'none';
  }
}




