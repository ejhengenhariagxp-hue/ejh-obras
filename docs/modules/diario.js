// modules/diario.js
import { fmt, fmtD, pad, safeInner, safeText, showToast, openModal, closeModal, popularSelectsObras, obraName, escapeHtml, markDeleted } from '../utils.js?v=20260501a';
import { iaCall, fbUploadFoto, fbDeleteFoto } from '../services.js?v=20260515b';

let _diarioLimit = 20;
let _pendingFotos = [];
let _diarObraAtiva = null; // null = lista de obras | obraId = ver registros da obra
let _diarioBusca = '';

export function filtrarDiario() {
  _diarioBusca = (document.getElementById('fil-diario-busca')?.value || '').toLowerCase().trim();
  if (window._diarioState) _renderDiarioObras(window._diarioState);
}

export function abrirDiarioObra(obraId) {
  _diarObraAtiva = obraId;
  _diarioLimit = 99;
  return true;
}

export function voltarDiarioObras() {
  _diarObraAtiva = null;
  _diarioLimit = 20;
  return true;
}

export function addDiario(state){
  try {
    const obraId = document.getElementById('f-dia-obra')?.value;
    const data = document.getElementById('f-dia-data')?.value;
    if (!obraId) { showToast('⚠️ Selecione uma obra'); return false; }
    if (!data) { showToast('⚠️ Selecione uma data'); return false; }

    // Bloqueia save enquanto há foto ainda em upload pro Storage. Antes,
    // o save passava com dataUrl preliminar; quando o upload completava
    // em background, ph.url ficava setado em variável já descartada
    // (_pendingFotos = []), gerando arquivo órfão no Storage sem
    // referência no state.
    if (_pendingFotos.some(f => f.uploading)) {
      showToast('⚠️ Aguarde o upload das fotos terminar antes de salvar', 4000);
      return false;
    }

    state.counters = state.counters || {};
    state.counters.dia = state.counters.dia || 1;
    state.diario = state.diario || [];

    const editId = document.getElementById('f-dia-id')?.value;
    // Fotos: se foram para o Storage (têm url/storagePath), grava só esses
    // metadados — sem dataUrl pesando o state. Senão (fallback offline/sem
    // login), grava o dataUrl como antes.
    const fotosFinais = _pendingFotos.map(f => {
      const base = { name: f.name };
      if (f.url) {
        base.url = f.url;
        if (f.storagePath) base.storagePath = f.storagePath;
        return base;
      }
      if (f.dataUrl) { base.dataUrl = f.dataUrl; return base; }
      return null;
    }).filter(Boolean);
    const sig = window._diarioGetSig?.() || null;
    const equipeList = window._diarioGetEquipe?.() || [];
    const dadosForm = {
      obraId: obraId,
      data:   data,
      desc:   document.getElementById('f-dia-desc')?.value || '',
      equipe: document.getElementById('f-dia-equipe')?.value || '',
      equipeList: equipeList.filter(e => e.qtd > 0),
      clima:  document.getElementById('f-dia-clima')?.value || '',
      ocorr:  document.getElementById('f-dia-ocorr')?.value || '',
      fotos:  fotosFinais,
      assinatura: sig ? { dataUrl: sig, data: new Date().toLocaleDateString('pt-BR') } : null,
    };

    if (editId) {
      const idx = state.diario.findIndex(d => d.id === editId);
      if (idx < 0) { showToast('⚠️ Registro não encontrado'); return false; }
      // Apaga do Storage as fotos que foram removidas neste edit
      // (presentes antes, ausentes agora). Sem isso, ficavam órfãs
      // consumindo quota de Storage para sempre.
      const fotosAntes = state.diario[idx].fotos || [];
      const pathsAgora = new Set(fotosFinais.map(f => f.storagePath).filter(Boolean));
      fotosAntes.forEach(f => {
        if (f.storagePath && !pathsAgora.has(f.storagePath)) {
          fbDeleteFoto(f.storagePath); // background, não bloqueia
        }
      });
      state.diario[idx] = { ...state.diario[idx], ...dadosForm };
    } else {
      state.diario.push({ id: 'DIA-'+pad(state.counters.dia), ...dadosForm });
      state.counters.dia++;
    }
    _pendingFotos = [];
    renderFotoPreview();
    window._diarioSetSig?.(null);
    window._diarioSetEquipe?.([]);
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
  // Carrega assinatura existente (se houver)
  window._diarioSetSig?.(d.assinatura?.dataUrl || null);
  // Carrega equipe estruturada (ou tenta inferir de string legada)
  if (Array.isArray(d.equipeList) && d.equipeList.length) {
    window._diarioSetEquipe?.(d.equipeList);
  } else {
    window._diarioSetEquipe?.([]);
  }
  const t = document.querySelector('#modal-diario .modal-title');
  if (t) t.textContent = '✏️ Editar registro do diário';
  openModal('modal-diario');
}

export function delDiario(state, id){
  if(confirm('Excluir este registro?')){
    const d = state.diario.find(x => x.id === id);
    // Apaga fotos correspondentes do Storage em background — não bloqueia o delete local
    if (d && Array.isArray(d.fotos)) {
      d.fotos.forEach(f => { if (f.storagePath) fbDeleteFoto(f.storagePath); });
    }
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
      const { dataUrl: compressed, blob } = await compressImage(dataUrl);
      // Tenta subir para Firebase Storage — se logado e Storage disponível.
      // Em caso de falha (sem login, sem regra, offline), mantém dataUrl como fallback.
      if (window._fbUser && blob) {
        try {
          const { url, storagePath } = await fbUploadFoto(blob, file.name);
          ph.url = url;
          ph.storagePath = storagePath;
          ph.dataUrl = compressed; // preview local enquanto está aberto o modal
        } catch (e) {
          console.warn('upload storage falhou, fallback dataUrl:', e?.message);
          ph.dataUrl = compressed;
        }
      } else {
        ph.dataUrl = compressed;
      }
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
  window._diarioSetSig?.(null); // limpa assinatura
  window._diarioSetEquipe?.([]); // limpa equipe
  popularSelectsObras(state);
  // limpa modo edição e campos
  ['f-dia-id','f-dia-desc','f-dia-equipe','f-dia-ocorr','f-dia-equipe-outro','f-dia-equipe-outro-qtd'].forEach(k => { const el = document.getElementById(k); if (el) el.value = ''; });
  if(document.getElementById('f-dia-data')) document.getElementById('f-dia-data').value = new Date().toISOString().split('T')[0];
  // Pré-seleciona a obra ativa (quando chamado de dentro de uma obra)
  if (_diarObraAtiva) {
    const sel = document.getElementById('f-dia-obra');
    if (sel) sel.value = _diarObraAtiva;
  }
  const t = document.querySelector('#modal-diario .modal-title');
  if (t) t.textContent = '📋 Novo registro do diário';
  openModal('modal-diario');
}

export function cancelarDiario(){
  _pendingFotos=[];
  renderFotoPreview();
  window._diarioSetSig?.(null);
  window._diarioSetEquipe?.([]);
  closeModal('modal-diario');
}

// ── helpers de renderização de card de registro ──────────────────────
function _cardDiario(state, d) {
  const fotos = d.fotos || [];
  const galeriaHtml = fotos.length ? `
    <div class="foto-galeria">
      ${fotos.map((f,i) => {
        const src = f.url || f.dataUrl || '';
        return `<img src="${src}" alt="${f.name||'foto'}"
          onclick="openLightbox('${src}','${obraName(state, d.obraId)} — ${fmtD(d.data)} — Foto ${i+1}')"
          title="${f.name||'foto'}">`;
      }).join('')}
    </div>` : '';
  const ativs = (d.desc || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const ativsHtml = ativs.length
    ? `<ul class="diario-ativs">${ativs.map(a => `<li>${escapeHtml(a)}</li>`).join('')}</ul>`
    : `<div class="diario-body" style="color:var(--muted);font-style:italic">Sem descrição</div>`;
  const eqList = Array.isArray(d.equipeList) ? d.equipeList : [];
  const equipeChips = eqList.length
    ? `<div class="diario-equipe-chips">${eqList.map(e => `<span class="equipe-chip">👷 ${e.qtd} ${escapeHtml(e.cargo)}</span>`).join('')}</div>`
    : (d.equipe ? `<div class="diario-equipe-chips"><span class="equipe-chip">👷 ${escapeHtml(d.equipe)}</span></div>` : '');
  return `<div class="diario-item">
    <div class="diario-item-header">
      <div class="diario-date">${fmtD(d.data)}</div>
      <div class="diario-header-badges">
        ${d.clima ? `<span style="font-size:18px" title="${d.clima}">${d.clima.split(' ')[0]}</span>` : ''}
        ${fotos.length ? `<span style="background:rgba(255,255,255,.2);color:#fff;font-size:11px;font-weight:700;padding:3px 8px;border-radius:8px">📷 ${fotos.length}</span>` : ''}
        ${d.assinatura?.dataUrl ? `<span style="background:rgba(255,255,255,.2);color:#fff;font-size:11px;font-weight:700;padding:3px 8px;border-radius:8px">✍️</span>` : ''}
        <button class="btn btn-outline btn-xs" onclick="openEditDiario('${d.id}')" style="color:#fff;border-color:rgba(255,255,255,.4);background:rgba(255,255,255,.12);margin-left:4px" title="Editar">✏️</button>
        <button class="btn btn-outline btn-xs" onclick="delDiario('${d.id}')" style="color:#fff;border-color:rgba(239,68,68,.7);background:rgba(239,68,68,.35)" title="Excluir">🗑</button>
      </div>
    </div>
    <div class="diario-item-body">
      <div class="diario-section-title">Atividades realizadas</div>
      ${ativsHtml}
      ${equipeChips ? `<div class="diario-section-title" style="margin-top:10px">Equipe</div>${equipeChips}` : ''}
      ${d.ocorr && d.ocorr !== 'Sem ocorrências' && d.ocorr !== 'Nenhuma'
        ? `<div class="diario-ocorr">⚠️ ${escapeHtml(d.ocorr)}</div>` : ''}
      ${galeriaHtml}
      ${d.assinatura?.dataUrl ? `<div style="margin-top:10px;padding:8px 12px;background:var(--bg);border:1px solid var(--border);border-radius:8px;display:flex;align-items:center;gap:10px">
        <img src="${d.assinatura.dataUrl}" style="height:40px;max-width:160px" alt="Assinatura">
        <span style="font-size:11.5px;color:var(--muted)">Assinado em ${d.assinatura.data || ''} — ${state.engNome || 'Resp. Técnico'}${state.engRegistro ? ` (${state.engRegistro})` : ''}</span>
      </div>` : ''}
      <div class="diario-tags">
        ${d.clima ? `<span class="badge badge-amber">${d.clima}</span>` : ''}
        ${fotos.length ? `<span class="badge badge-green">📷 ${fotos.length} foto${fotos.length>1?'s':''}</span>` : ''}
        ${d.assinatura?.dataUrl ? `<span class="badge badge-teal">✍️ Assinado</span>` : ''}
      </div>
    </div>
  </div>`;
}

export function renderDiario(state) {
  if (!_diarObraAtiva) {
    _renderDiarioObras(state);
  } else {
    _renderDiarioMeses(state, _diarObraAtiva);
  }
}

// NÍVEL 1 — cards de obras
function _renderDiarioObras(state) {
  window._diarioState = state;
  // Header: título geral
  const hdrLeft = document.getElementById('dia-page-hdr-left');
  const hdrRight = document.getElementById('dia-page-hdr-right');
  if (hdrLeft) hdrLeft.innerHTML = `
    <div class="page-title">Diário de Obra</div>
    <div class="page-sub">Selecione uma obra para ver os registros</div>`;
  if (hdrRight) hdrRight.innerHTML = `
    <button class="btn btn-primary" onclick="openModalDiario()">＋ Novo Registro</button>`;

  const obras = state.obras || [];
  if (!obras.length) {
    safeInner('dia-obras-list', `<div style="background:var(--card);border-radius:var(--radius);padding:36px 20px;text-align:center;border:1.5px dashed var(--border)">
      <div style="font-size:32px;margin-bottom:8px">🏗</div>
      <div style="font-weight:600;color:var(--navy)">Nenhuma obra cadastrada</div>
    </div>`);
    safeInner('list-diario', '');
    return;
  }

  const busca = _diarioBusca;
  const filtradas = obras.filter(o => {
    if (!busca) return true;
    return (o.nome||'').toLowerCase().includes(busca) || (o.cliente||'').toLowerCase().includes(busca);
  });

  const cards = filtradas.map(o => {
    const registros = (state.diario || []).filter(d => d.obraId === o.id);
    const total = registros.length;
    const ultimo = total
      ? [...registros].sort((a,b) => b.data.localeCompare(a.data))[0]
      : null;
    const fotos = registros.reduce((acc, d) => acc + (d.fotos?.length || 0), 0);
    const statusCor = o.status === 'Em andamento' ? '#22c55e' : o.status === 'Concluído' ? '#64748b' : '#f59e0b';

    return `<div class="card" style="cursor:pointer;border-left:4px solid ${statusCor};transition:box-shadow .15s;padding:14px 16px"
        onclick="abrirDiarioObra('${o.id}')"
        onmouseover="this.style.boxShadow='0 4px 18px rgba(0,0,0,.1)'"
        onmouseout="this.style.boxShadow=''">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px">
            <span class="badge" style="background:${statusCor}22;color:${statusCor};font-weight:700;font-size:10px;padding:2px 7px">${o.status||'Ativo'}</span>
          </div>
          <div style="font-family:'Syne',sans-serif;font-weight:700;color:var(--navy);font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(o.nome)}</div>
          <div style="font-size:11.5px;color:var(--muted);margin-bottom:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(o.cliente||'')}${o.tipo ? ` · ${o.tipo}` : ''}</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            ${total ? `<span class="badge badge-blue" style="font-size:11px">📋 ${total}</span>` : `<span class="badge" style="background:#f1f5f9;color:var(--muted);font-size:11px">Sem reg.</span>`}
            ${fotos ? `<span class="badge badge-purple" style="font-size:11px">📷 ${fotos}</span>` : ''}
            ${ultimo ? `<span class="badge" style="background:#f0fdf4;color:var(--green);font-size:11px">${fmtD(ultimo.data)}</span>` : ''}
          </div>
        </div>
        <span style="font-size:20px;color:${statusCor};opacity:.6;align-self:center">›</span>
      </div>
    </div>`;
  }).join('');

  const filtroHtml = `<div style="margin-bottom:12px">
    <input id="fil-diario-busca" type="search" placeholder="🔍 Buscar obra ou cliente…"
      oninput="filtrarDiario()" value="${escapeHtml(busca)}"
      style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;box-sizing:border-box">
  </div>`;

  const grid = filtradas.length
    ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px">${cards}</div>`
    : `<div style="padding:24px;text-align:center;color:var(--muted);font-size:13px">Nenhuma obra encontrada</div>`;

  safeInner('dia-obras-list', filtroHtml + grid);
  safeInner('list-diario', '');
  const vmw = document.getElementById('dia-ver-mais-wrap');
  if (vmw) vmw.innerHTML = '';
}

// NÍVEL 2 — registros de uma obra, agrupados por mês
function _renderDiarioMeses(state, obraId) {
  const obra = (state.obras || []).find(o => o.id === obraId);
  const nomObra = obra ? obra.nome : obraId;

  // Header: botão voltar + nome da obra
  const hdrLeft = document.getElementById('dia-page-hdr-left');
  const hdrRight = document.getElementById('dia-page-hdr-right');
  if (hdrLeft) hdrLeft.innerHTML = `
    <button class="btn btn-outline btn-sm" onclick="voltarDiarioObras()" style="margin-bottom:6px;font-size:12px">← Voltar</button>
    <div class="page-title" style="font-size:17px">${escapeHtml(nomObra)}</div>
    <div class="page-sub">${escapeHtml(obra?.cliente||'')}${obra?.status ? ` · ${obra.status}` : ''}</div>`;
  if (hdrRight) hdrRight.innerHTML = `
    <select id="dia-pdf-obra" style="padding:8px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;display:none"></select>
    <button class="btn btn-outline" onclick="gerarDiarioWpp()" style="color:#25d366;border-color:#25d366">📱 WhatsApp</button>
    <button class="btn btn-outline" onclick="gerarDiarioPDF()">🖨 PDF</button>
    <button class="btn btn-primary" onclick="openModalDiario()">＋ Registro</button>`;

  // Atualiza o select oculto de PDF com a obra ativa
  const sel = document.getElementById('dia-pdf-obra');
  if (sel) { sel.innerHTML = `<option value="${obraId}">${escapeHtml(nomObra)}</option>`; sel.value = obraId; }

  const registros = [...(state.diario || [])]
    .filter(d => d.obraId === obraId)
    .sort((a, b) => b.data.localeCompare(a.data));

  safeInner('dia-obras-list', '');

  if (!registros.length) {
    safeInner('list-diario', `<div style="background:var(--card);border-radius:var(--radius);padding:36px 20px;text-align:center;border:1.5px dashed var(--border)">
      <div style="font-size:32px;margin-bottom:8px">📋</div>
      <div style="font-weight:600;color:var(--navy);font-size:14px;margin-bottom:4px">Nenhum registro para esta obra</div>
      <div style="font-size:12.5px;color:var(--muted);margin-bottom:14px">Documente as atividades, fotos e equipe</div>
      <button class="btn btn-primary btn-sm" onclick="openModalDiario()">＋ Primeiro Registro</button>
    </div>`);
    return;
  }

  // Agrupar por mês (YYYY-MM)
  const porMes = {};
  registros.forEach(d => {
    const k = d.data.substring(0, 7);
    (porMes[k] = porMes[k] || []).push(d);
  });

  const mesNome = k => {
    const [y, m] = k.split('-');
    return new Date(+y, +m - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const html = Object.keys(porMes).sort().reverse().map(mesKey => {
    const lista = porMes[mesKey];
    const fotos = lista.reduce((a, d) => a + (d.fotos?.length || 0), 0);
    return `
      <div style="margin-bottom:20px">
        <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--navy);color:#fff;border-radius:10px 10px 0 0;margin-bottom:0">
          <span style="font-family:'Syne',sans-serif;font-weight:700;font-size:14px;text-transform:capitalize">📆 ${mesNome(mesKey)}</span>
          <span style="font-size:11px;opacity:.75;margin-left:auto">${lista.length} registro${lista.length!==1?'s':''} · ${fotos} foto${fotos!==1?'s':''}</span>
        </div>
        <div style="border:1px solid var(--border);border-top:none;border-radius:0 0 10px 10px;overflow:hidden">
          ${lista.map(d => _cardDiario(state, d)).join('')}
        </div>
      </div>`;
  }).join('');

  safeInner('list-diario', html);
  const vmw = document.getElementById('dia-ver-mais-wrap');
  if (vmw) vmw.innerHTML = '';
}

export function renderFotoPreview(){
  const el = document.getElementById('foto-preview');
  if(!el) return;
  el.innerHTML = _pendingFotos.map((f,i)=>{
    const src = f.url || f.dataUrl || '';
    const overlay = f.uploading
      ? '<div style="position:absolute;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;border-radius:7px">⏳ Enviando…</div>'
      : f.error
        ? '<div style="position:absolute;inset:0;background:rgba(220,38,38,.55);display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;border-radius:7px" title="'+(f.error||'')+'">❌</div>'
        : !f.url
          ? '<div style="position:absolute;bottom:0;left:0;right:0;background:rgba(217,119,6,.85);color:#fff;font-size:9px;text-align:center;padding:2px 4px;border-radius:0 0 7px 7px;line-height:1.3">⚠️ Só neste aparelho<br>Faça login Google</div>'
          : '';
    return `<div class="foto-preview-item" style="position:relative">
      <img src="${src}" alt="${f.name||''}">
      ${overlay}
      <button class="foto-preview-del" onclick="removePendingFoto(${i})">✕</button>
    </div>`;
  }).join('');
  // Aviso geral abaixo das fotos quando alguma ficou só local
  const semSync = _pendingFotos.filter(f => !f.uploading && !f.url && f.dataUrl).length;
  let aviso = document.getElementById('foto-preview-aviso');
  if (!aviso) {
    aviso = document.createElement('div');
    aviso.id = 'foto-preview-aviso';
    el.parentNode.insertBefore(aviso, el.nextSibling);
  }
  aviso.innerHTML = semSync > 0
    ? `<div style="background:#fffbeb;border:1px solid #f59e0b;border-radius:8px;padding:8px 12px;margin-top:6px;font-size:12px;color:#92400e;line-height:1.5">
        ⚠️ <strong>${semSync} foto(s) salva(s) só neste dispositivo</strong> — sem login Google elas não sincronizam com outros aparelhos.<br>
        <span style="opacity:.8">Entre com Google antes de salvar para enviar automaticamente.</span>
       </div>`
    : '';
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
    showToast('✅ IAsô preencheu pra você, sô!');
  } catch (e) {
    showToast('❌ Erro: ' + e.message);
  } finally {
    if (btn) btn.disabled = false;
    if (loading) loading.style.display = 'none';
  }
}




