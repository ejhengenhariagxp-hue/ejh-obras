// utils.js — Funções utilitárias puras
// ══════════════════════════════════════════════════════════════════════

export const fmt  = v => (+(v)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
export const fmtD = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—';
export const pad  = n => String(n).padStart(3,'0');

export function safeInner(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}
export function safeText(id, txt) {
  const el = document.getElementById(id);
  if (el) el.textContent = txt;
}

let _toastTimer = null;
export function showToast(msg, dur=3000) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  clearTimeout(_toastTimer);
  t.textContent = msg;
  t.style.opacity = '1';
  _toastTimer = setTimeout(() => { t.style.opacity = '0'; }, dur);
}

export function statusBadge(s) {
  const c = {
    'Em andamento':'#2563eb','Planejada':'#7c3aed',
    'Paralisada':'#d97706','Concluída':'#10b981'
  }[s] || '#64748b';
  return `<span style="background:${c}18;color:${c};padding:2px 10px;border-radius:12px;font-size:11.5px;font-weight:700">${s||'—'}</span>`;
}

export function tipoLabel(tipo) {
  return {'projeto':'Projeto','obra':'Obra','R1':'Projeto','R2':'Obra'}[tipo] || tipo || 'Obra';
}

export function openModal(id) {
  const m = document.getElementById(id);
  if (m) { m.style.display = 'flex'; m.classList.add('open'); }
}
export function closeModal(id) {
  const m = document.getElementById(id);
  if (m) { m.style.display = 'none'; m.classList.remove('open'); }
}

export function nav(pageId, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const page = document.getElementById('page-' + pageId);
  if (page) page.classList.add('active');
  if (el) el.classList.add('active');
  document.querySelectorAll('.bn-item').forEach(b => b.classList.remove('active'));
  const bn = document.querySelector(`.bn-item[onclick*="${pageId}"]`);
  if (bn) bn.classList.add('active');
}

export function setBnActive(el) {
  document.querySelectorAll('.bn-item').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
}

export function openLightbox(src, caption) {
  const lb  = document.getElementById('lightbox');
  const img = document.getElementById('lightbox-img');
  const cap = document.getElementById('lightbox-caption');
  if (lb && img) {
    img.src = src;
    if (cap) cap.textContent = caption || '';
    lb.style.display = 'flex';
  }
}
export function closeLightbox() {
  const lb = document.getElementById('lightbox');
  if (lb) lb.style.display = 'none';
}

export function toggleFab() {
  const m = document.getElementById('fab-menu');
  const b = document.getElementById('fab-btn');
  if (!m) return;
  const open = m.style.display === 'flex';
  m.style.display = open ? 'none' : 'flex';
  if (b) b.textContent = open ? '＋' : '✕';
}
export function closeFab() {
  const m = document.getElementById('fab-menu');
  const b = document.getElementById('fab-btn');
  if (m) m.style.display = 'none';
  if (b) b.textContent = '＋';
}

export function popularSelectsObras(state, ids) {
  const defaults = [
    'f-orc-obra','f-cron-obra','f-dia-obra','f-fin-obra',
    'f-med-obra','f-emp-obra','f-imp-obra','f-ck-obra',
    'f-simp-obra','rel-obra-sel','ia-orc-obra',
    'ck-filtro-obra','gantt-obra-sel','cap-obra-sel','cap-hist-filtro'
  ];
  (ids || defaults).forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const current = el.value;
    const first = el.options[0];
    const placeholder = first ? first.text : 'Selecione...';
    el.innerHTML = `<option value="">${placeholder}</option>`;
    (state.obras || []).forEach(o => {
      const opt = document.createElement('option');
      opt.value = o.id;
      opt.textContent = o.nome;
      el.appendChild(opt);
    });
    if (current) el.value = current;
  });
}

export function modalidadeIcon(m) {
  const icons  = { privada:'🏠', financiada:'🏦', publica:'🏛', minha_casa:'🏡', empreita:'🔨' };
  const labels = { privada:'Privada', financiada:'Financiada (Caixa)', publica:'Pública', minha_casa:'MCMV', empreita:'Empreita Global' };
  const colors = { privada:'#2563eb', financiada:'#0891b2', publica:'#7c3aed', minha_casa:'#059669', empreita:'#d97706' };
  const icon = icons[m]||'🏠', label = labels[m]||'Privada', color = colors[m]||'#2563eb';
  return `<span title="${label}" style="background:${color}18;color:${color};padding:2px 7px;border-radius:10px;font-size:11px;font-weight:700">${icon} ${label}</span>`;
}

export function verificarAvisosObra(o) {
  if (!o.periodicidade) return null;
  const hoje = new Date();
  const ultima = o.ultimaMedicao ? new Date(o.ultimaMedicao) : (o.inicio ? new Date(o.inicio) : null);
  if (!ultima) return null;
  const ciclo = { mensal:30, quinzenal:15, semanal:7, por_pl:30 }[o.periodicidade] || 30;
  const proxima = new Date(ultima.getTime() + ciclo*86400000);
  const dias = Math.ceil((proxima - hoje) / 86400000);
  if (dias < 0)  return { tipo:'vencida', dias: Math.abs(dias), proxima };
  if (dias <= 5) return { tipo:'proxima', dias, proxima };
  return null;
}

export function obraName(state, id) {
  if (!state || !Array.isArray(state.obras)) return id || '—';
  const o = state.obras.find(x => x.id === id);
  return o ? o.nome : id || '—';
}

export function showSaveIndicator() {
  const el = document.getElementById('save-indicator');
  if (!el) return;
  el.style.opacity = '1';
  el.textContent = '💾 Salvo';
  setTimeout(() => { el.style.opacity = '0.4'; el.textContent = ''; }, 2000);
}
