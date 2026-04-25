// modules/importar.js — Importar orçamento (Excel/CSV/JSON/Manual/PDF)
import { fmt, pad, showToast } from '../utils.js?v=20260425i';
import { iaCall } from '../services.js?v=20260425i';

let _importItens = [];
let _rawData = [];
let _currentSheet = null;

function parseNum(v) {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return isNaN(v) ? 0 : v;
  let s = String(v).replace(/R\$\s*/gi, '').trim();
  // Formato BR ("1.234,56"): remove pontos (milhar) e troca vírgula por ponto
  // Formato US ("1,234.56"): remove vírgulas (milhar) mantém ponto decimal
  // Formato simples ("1234.56" ou "1234,56"): trata cada caso
  const hasComma = s.includes(',');
  const hasDot = s.includes('.');
  if (hasComma && hasDot) {
    // Detecta qual é decimal pelo que vem por último
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (hasComma) {
    s = s.replace(',', '.');
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function detectColumns(headers) {
  const H = headers.map(h => String(h || '').toLowerCase());
  const find = (...terms) => H.findIndex(h => terms.some(t => h.includes(t)));
  return {
    item:  find('desc', 'item', 'servi', 'discrimin'),
    un:    find('un', 'unid'),
    qtd:   find('qtd', 'quant'),
    vunit: find('v.unit', 'unit', 'valor un', 'preço un', 'preco un'),
    etapa: find('etapa', 'fase', 'grupo'),
  };
}

function linhasToItens(linhas, skip, cols) {
  return linhas.slice(skip).map(r => ({
    item:  cols.item  >= 0 ? String(r[cols.item]  || '').trim() : '',
    un:    cols.un    >= 0 ? String(r[cols.un]    || 'vb').trim() : 'vb',
    qtd:   cols.qtd   >= 0 ? parseNum(r[cols.qtd])   : 0,
    vunit: cols.vunit >= 0 ? parseNum(r[cols.vunit]) : 0,
    etapa: cols.etapa >= 0 ? String(r[cols.etapa] || '').trim() : '',
  })).filter(x => x.item && (x.qtd > 0 || x.vunit > 0));
}

export function importExcel(input) {
  const file = input.files[0];
  if (!file) return;
  if (typeof XLSX === 'undefined') { showToast('⚠️ SheetJS não carregado'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const wb = XLSX.read(e.target.result, { type: 'array' });
      const sheets = wb.SheetNames;
      if (!sheets.length) { showToast('⚠️ Planilha vazia'); return; }
      renderSheetTabs(wb, sheets);
      loadSheet(wb, sheets[0]);
    } catch (err) {
      showToast('❌ Erro ao ler Excel: ' + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
  input.value = '';
}

function renderSheetTabs(wb, sheets) {
  const wrap = document.getElementById('sheet-selector-wrap');
  const tabs = document.getElementById('sheet-tabs');
  if (!wrap || !tabs) return;
  wrap.style.display = sheets.length > 1 ? 'block' : 'none';
  tabs.innerHTML = sheets.map(s =>
    `<button class="btn btn-outline btn-xs" onclick="_selectSheet('${s.replace(/'/g, "\\'")}')">${s}</button>`
  ).join('');
  window._importWb = wb;
}

function loadSheet(wb, sheetName) {
  _currentSheet = sheetName;
  const ws = wb.Sheets[sheetName];
  _rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  if (!_rawData.length) { showToast('⚠️ Aba vazia'); return; }
  renderColMapper();
}

export function _selectSheet(name) {
  if (!window._importWb) return;
  loadSheet(window._importWb, name);
}

function renderColMapper() {
  const wrap = document.getElementById('col-mapper-wrap');
  if (!wrap) return;
  wrap.style.display = 'block';
  const headers = _rawData[0] || [];
  const opts = headers.map((h, i) => `<option value="${i}">${String(h || 'Col ' + (i+1))}</option>`).join('');
  const optsEtapa = '<option value="-1">(automático)</option>' + opts;
  ['map-item', 'map-un', 'map-qtd', 'map-vunit'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = opts;
  });
  const etapaEl = document.getElementById('map-etapa');
  if (etapaEl) etapaEl.innerHTML = optsEtapa;
  const det = detectColumns(headers);
  const setSel = (id, v) => { const el = document.getElementById(id); if (el && v >= 0) el.value = v; };
  setSel('map-item', det.item);
  setSel('map-un', det.un);
  setSel('map-qtd', det.qtd);
  setSel('map-vunit', det.vunit);
  setSel('map-etapa', det.etapa);
  renderRawPreview();
  applyMapping();
}

function renderRawPreview() {
  const tbl = document.getElementById('raw-preview-table');
  if (!tbl) return;
  const rows = _rawData.slice(0, 8);
  tbl.innerHTML = rows.map((r, i) =>
    `<tr style="${i===0?'background:#f1f5f9;font-weight:700':''}">${
      r.map(c => `<td style="border:1px solid #e2e8f0;padding:4px 8px">${String(c||'').substring(0,30)}</td>`).join('')
    }</tr>`
  ).join('');
}

export function applyMapping() {
  const skip = +document.getElementById('map-skip')?.value || 1;
  const cols = {
    item:  +document.getElementById('map-item')?.value,
    un:    +document.getElementById('map-un')?.value,
    qtd:   +document.getElementById('map-qtd')?.value,
    vunit: +document.getElementById('map-vunit')?.value,
    etapa: +document.getElementById('map-etapa')?.value,
  };
  _importItens = linhasToItens(_rawData, skip, cols);
  renderPreview();
}

export function importCSV(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const txt = e.target.result;
    try {
      if (file.name.endsWith('.json')) {
        const j = JSON.parse(txt);
        _importItens = (Array.isArray(j) ? j : j.itens || []).map(x => ({
          item: x.item || x.descricao || '',
          un: x.un || x.unidade || 'vb',
          qtd: +x.qtd || +x.quantidade || 0,
          vunit: +x.vunit || +x.valorUnitario || 0,
          etapa: x.etapa || '',
        }));
      } else {
        const sep = txt.includes(';') ? ';' : ',';
        const linhas = txt.split(/\r?\n/).filter(l => l.trim());
        _rawData = linhas.map(l => l.split(sep));
        renderColMapper();
        return;
      }
      renderPreview();
    } catch (err) {
      showToast('❌ Erro: ' + err.message);
    }
  };
  reader.readAsText(file, 'UTF-8');
  input.value = '';
}

export function importPDF(input) {
  const file = input.files[0];
  if (!file) return;
  input.value = '';
  if (file.size > 10 * 1024 * 1024) {
    showToast('⚠️ PDF maior que 10MB. Tente um arquivo menor ou use Excel/CSV');
    return;
  }
  showToast('🤖 Analisando PDF com IA...', 8000);
  const reader = new FileReader();
  reader.onload = async e => {
    try {
      const b64 = e.target.result.split(',')[1];
      const system = 'Você extrai itens de orçamentos de obra a partir de PDFs. ' +
        'Retorne APENAS JSON válido no formato: ' +
        '{"itens":[{"item":"descrição do serviço","un":"un/m²/m³/kg/vb","qtd":numero,"vunit":numero,"etapa":"fase ou grupo"}]}. ' +
        'Valores numéricos em formato JS (ponto decimal). Ignore cabeçalhos, totais gerais e linhas de subtotal. ' +
        'Se o documento não for um orçamento, retorne {"itens":[]}.';
      const content = [
        { type:'text', text:'Extraia todos os itens deste orçamento.' },
        { type:'document', source:{ type:'base64', media_type:'application/pdf', data:b64 } }
      ];
      const raw = await iaCall(system, content, 4000);
      const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
      const itens = Array.isArray(parsed.itens) ? parsed.itens : [];
      if (!itens.length) {
        showToast('⚠️ Nenhum item identificado no PDF');
        return;
      }
      _importItens = itens.map(x => ({
        item:  String(x.item || '').trim(),
        un:    String(x.un || 'vb').trim(),
        qtd:   parseNum(x.qtd),
        vunit: parseNum(x.vunit),
        etapa: String(x.etapa || '').trim(),
      })).filter(x => x.item && (x.qtd > 0 || x.vunit > 0));
      renderPreview();
      showToast(`✅ ${_importItens.length} itens extraídos! Revise antes de importar.`);
    } catch (err) {
      showToast('❌ Erro ao ler PDF: ' + err.message);
    }
  };
  reader.readAsDataURL(file);
}

export function importManual() {
  const txt = document.getElementById('f-imp-texto')?.value?.trim();
  if (!txt) { showToast('⚠️ Cole o orçamento no campo'); return; }
  const linhas = txt.split('\n').filter(l => l.trim());
  _importItens = linhas.map(l => {
    const p = l.split(';').map(x => x.trim());
    return {
      item: p[0] || '',
      un: p[1] || 'vb',
      qtd: parseNum(p[2]),
      vunit: parseNum(p[3]),
      etapa: p[4] || '',
    };
  }).filter(x => x.item);
  renderPreview();
}

function renderPreview() {
  const prev = document.getElementById('import-preview');
  const tbody = document.getElementById('tbody-import');
  const lbl = document.getElementById('import-count-label');
  const tfoot = document.getElementById('tfoot-import-total');
  if (!prev || !tbody) return;
  if (!_importItens.length) { prev.style.display = 'none'; return; }
  prev.style.display = 'block';
  const total = _importItens.reduce((a, x) => a + x.qtd * x.vunit, 0);
  if (lbl) lbl.textContent = `${_importItens.length} itens • Total: ${fmt(total)}`;
  if (tfoot) tfoot.textContent = fmt(total);
  tbody.innerHTML = _importItens.map((x, i) => `
    <tr>
      <td style="font-size:11px;color:var(--muted)">${i+1}</td>
      <td><input value="${x.item.replace(/"/g,'&quot;')}" oninput="_updateImportItem(${i},'item',this.value)" style="width:100%;padding:4px;border:1px solid var(--border);border-radius:4px"></td>
      <td><input value="${x.un}" oninput="_updateImportItem(${i},'un',this.value)" style="width:60px;padding:4px;border:1px solid var(--border);border-radius:4px"></td>
      <td><input type="number" value="${x.qtd}" oninput="_updateImportItem(${i},'qtd',+this.value)" style="width:70px;padding:4px;border:1px solid var(--border);border-radius:4px"></td>
      <td><input type="number" value="${x.vunit}" oninput="_updateImportItem(${i},'vunit',+this.value)" style="width:90px;padding:4px;border:1px solid var(--border);border-radius:4px"></td>
      <td style="font-weight:700">${fmt(x.qtd * x.vunit)}</td>
      <td><input value="${x.etapa||''}" oninput="_updateImportItem(${i},'etapa',this.value)" style="width:100px;padding:4px;border:1px solid var(--border);border-radius:4px"></td>
      <td><button class="btn btn-outline btn-xs" style="color:var(--red);border-color:var(--red)" onclick="_removeImportItem(${i})">✕</button></td>
    </tr>`).join('');
}

export function _updateImportItem(i, f, v) { if (_importItens[i]) _importItens[i][f] = v; renderPreview(); }
export function _removeImportItem(i) { _importItens.splice(i, 1); renderPreview(); }

export function addImportRow() {
  _importItens.push({ item: '', un: 'vb', qtd: 0, vunit: 0, etapa: '' });
  renderPreview();
}

export function cancelImport() {
  _importItens = [];
  const prev = document.getElementById('import-preview');
  if (prev) prev.style.display = 'none';
  showToast('❌ Importação cancelada');
}

export function confirmImport(state) {
  const obraId = document.getElementById('f-imp-obra')?.value;
  if (!obraId) { showToast('⚠️ Selecione a obra de destino'); return false; }
  if (!_importItens.length) { showToast('⚠️ Nada a importar'); return false; }
  const gerarCron = document.getElementById('f-imp-cron')?.value === 'sim';
  const prepMed = document.getElementById('f-imp-med')?.value === 'sim';

  _importItens.forEach(x => {
    if (!x.item || (x.qtd <= 0 && x.vunit <= 0)) return;
    state.orc.push({
      id: 'ORC-' + pad(state.counters.orc),
      obraId, item: x.item, sinapi: '',
      un: x.un || 'vb', qtd: x.qtd, vunit: x.vunit, real: 0,
    });
    state.counters.orc++;
  });

  if (gerarCron) {
    const etapas = [...new Set(_importItens.map(x => x.etapa).filter(Boolean))];
    (etapas.length ? etapas : ['Execução Geral']).forEach(et => {
      state.cron.push({
        id: 'CRN-' + pad(state.counters.cron),
        obraId, etapa: et, inicio: '', fim: '', prev: 100, conc: 0,
      });
      state.counters.cron++;
    });
  }

  showToast(`✅ ${_importItens.length} itens importados!`);
  _importItens = [];
  const prev = document.getElementById('import-preview');
  if (prev) prev.style.display = 'none';
  const txt = document.getElementById('f-imp-texto');
  if (txt) txt.value = '';
  return true;
}
