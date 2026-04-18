// modules/excel_export.js — Exportação profissional para Excel (SheetJS)
// ══════════════════════════════════════════════════════════════════════
import { fmt, fmtD } from '../utils.js';

// Cores EJH
const COR_HEADER  = { fgColor: { rgb: '1A3A8C' } }; // azul EJH
const COR_TITULO  = { fgColor: { rgb: 'CC0000' } }; // vermelho EJH
const COR_SUBTOT  = { fgColor: { rgb: 'E8F0FB' } }; // azul claro
const COR_TOTAL   = { fgColor: { rgb: '1A3A8C' } };
const FONTE_HDR   = { bold: true, color: { rgb: 'FFFFFF' }, sz: 11, name: 'Calibri' };
const FONTE_TITULO = { bold: true, sz: 14, name: 'Calibri', color: { rgb: '1A3A8C' } };
const FONTE_BOLD  = { bold: true, sz: 10, name: 'Calibri' };
const FONTE_NORM  = { sz: 10, name: 'Calibri' };
const BORDA = {
  top:    { style: 'thin', color: { rgb: 'CBD5E1' } },
  bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
  left:   { style: 'thin', color: { rgb: 'CBD5E1' } },
  right:  { style: 'thin', color: { rgb: 'CBD5E1' } },
};

function cell(v, bold=false, bg=null, numFmt=null, align='left') {
  const s = {
    font: bold ? FONTE_BOLD : FONTE_NORM,
    alignment: { horizontal: align, wrapText: true },
    border: BORDA,
  };
  if (bg) s.fill = { patternType: 'solid', fgColor: { rgb: bg } };
  if (numFmt) s.numFmt = numFmt;
  return { v, t: typeof v === 'number' ? 'n' : 's', s };
}

function hdrCell(v) {
  return { v, t: 's', s: { font: FONTE_HDR, fill: COR_HEADER, alignment: { horizontal: 'center', wrapText: true }, border: BORDA }};
}

// ── EXPORTAR ORÇAMENTO COMPLETO (todas as obras) ──────────────────────
export function exportarOrcamentoExcel(state) {
  if (typeof XLSX === 'undefined') { alert('SheetJS não carregado. Recarregue a página.'); return; }
  const wb = XLSX.utils.book_new();

  // Uma aba "Resumo" + uma aba por obra
  const obras = state.obras.filter(o => state.orc.some(x => x.obraId === o.id));
  if (!obras.length) { alert('Nenhum orçamento cadastrado ainda.'); return; }

  // Aba RESUMO
  const resumo = gerarAbaResumo(state, obras);
  XLSX.utils.book_append_sheet(wb, resumo, 'Resumo');

  // Aba por obra
  obras.forEach(o => {
    const ws = gerarAbaObra(state, o);
    const nomAba = o.nome.replace(/[\\/:*?"<>|]/g,'').substring(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, nomAba);
  });

  const hoje = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `EJH_Orcamento_${hoje}.xlsx`);
}

// ── EXPORTAR ORÇAMENTO DE UMA OBRA ESPECÍFICA ─────────────────────────
export function exportarOrcamentoExcelObra(state) {
  const obraId = window._currentOrcObraId;
  if (!obraId) { alert('Abra o orçamento de uma obra primeiro.'); return; }
  const obra = state.obras.find(o => o.id === obraId);
  if (!obra) return;
  if (typeof XLSX === 'undefined') { alert('SheetJS não carregado.'); return; }

  const wb = XLSX.utils.book_new();
  const ws = gerarAbaObra(state, obra);
  XLSX.utils.book_append_sheet(wb, ws, obra.nome.replace(/[\\/:*?"<>|]/g,'').substring(0,31));
  XLSX.writeFile(wb, `EJH_Orc_${obra.nome.replace(/\s+/g,'_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

function gerarAbaResumo(state, obras) {
  const rows = [];
  const hoje = new Date().toLocaleDateString('pt-BR');
  const engNome = state.engNome || 'EJH Engenharia';
  const engReg  = state.engRegistro || '';

  // Cabeçalho
  rows.push([{ v: 'EJH ENGENHARIA — RESUMO GERAL DE ORÇAMENTOS', t:'s', s:{ font:FONTE_TITULO, alignment:{horizontal:'left'} }}]);
  rows.push([{ v: `Gerado em: ${hoje}  |  ${engNome}  ${engReg}`, t:'s', s:{ font:FONTE_NORM, font2:{italic:true}, alignment:{horizontal:'left'}, fill:{patternType:'solid',fgColor:{rgb:'F0F5FF'}} }}]);
  rows.push([]);
  rows.push([
    hdrCell('Obra'), hdrCell('Cliente'), hdrCell('Área (m²)'),
    hdrCell('Modalidade'), hdrCell('Status'),
    hdrCell('Total Orçado (R$)'), hdrCell('Total Realizado (R$)'),
    hdrCell('Desvio (%)'), hdrCell('Itens'),
  ]);

  let somaTot = 0, somaReal = 0;
  obras.forEach(o => {
    const itens = state.orc.filter(x => x.obraId === o.id);
    const tot   = itens.reduce((a,x) => a + x.qtd*x.vunit, 0);
    const real  = itens.reduce((a,x) => a + x.real, 0);
    const dev   = tot > 0 ? ((real/tot)-1)*100 : 0;
    const modalMap = {privada:'Privada',financiada:'Financiada CEF',publica:'Pública',minha_casa:'MCMV',empreita:'Empreita'};
    somaTot  += tot;
    somaReal += real;
    rows.push([
      cell(o.nome, true),
      cell(o.cliente || '—'),
      cell(o.area || 0, false, null, '#,##0.00', 'right'),
      cell(modalMap[o.modalidade||'privada'] || 'Privada'),
      cell(o.status || '—'),
      cell(tot,  false, null, 'R$ #,##0.00', 'right'),
      cell(real, false, null, 'R$ #,##0.00', 'right'),
      cell(dev,  false, dev > 10 ? 'FEE2E2' : dev < -10 ? 'F0FDF4' : null, '0.0"%"', 'right'),
      cell(itens.length, false, null, null, 'center'),
    ]);
  });

  // Total geral
  const devTotal = somaTot > 0 ? ((somaReal/somaTot)-1)*100 : 0;
  rows.push([
    { v:'TOTAL GERAL', t:'s', s:{ font:FONTE_HDR, fill:COR_TOTAL, border:BORDA }},
    {v:'',t:'s',s:{fill:COR_TOTAL,border:BORDA}},{v:'',t:'s',s:{fill:COR_TOTAL,border:BORDA}},
    {v:'',t:'s',s:{fill:COR_TOTAL,border:BORDA}},{v:'',t:'s',s:{fill:COR_TOTAL,border:BORDA}},
    { v:somaTot,  t:'n', s:{ font:FONTE_HDR, fill:COR_TOTAL, border:BORDA, numFmt:'R$ #,##0.00', alignment:{horizontal:'right'} }},
    { v:somaReal, t:'n', s:{ font:FONTE_HDR, fill:COR_TOTAL, border:BORDA, numFmt:'R$ #,##0.00', alignment:{horizontal:'right'} }},
    { v:devTotal, t:'n', s:{ font:FONTE_HDR, fill:COR_TOTAL, border:BORDA, numFmt:'0.0"%"',       alignment:{horizontal:'right'} }},
    {v:'',t:'s',s:{fill:COR_TOTAL,border:BORDA}},
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch:32 },{ wch:22 },{ wch:10 },{ wch:16 },{ wch:14 },{ wch:18 },{ wch:18 },{ wch:12 },{ wch:8 }];
  ws['!merges'] = [{ s:{r:0,c:0}, e:{r:0,c:8} }, { s:{r:1,c:0}, e:{r:1,c:8} }];
  return ws;
}

function gerarAbaObra(state, obra) {
  const itens = state.orc.filter(x => x.obraId === obra.id);
  const hoje  = new Date().toLocaleDateString('pt-BR');
  const engNome = state.engNome || 'EJH Engenharia';
  const engReg  = state.engRegistro || '';
  const rows = [];

  // Header da proposta
  rows.push([{ v: 'EJH ENGENHARIA — ORÇAMENTO DE OBRA', t:'s', s:{ font:FONTE_TITULO, alignment:{horizontal:'left'} }}]);
  rows.push([{ v: `Obra: ${obra.nome}  |  Cliente: ${obra.cliente||'—'}  |  Área: ${obra.area||0} m²`, t:'s', s:{ font:{bold:true,sz:11,name:'Calibri'}, alignment:{horizontal:'left'}, fill:{patternType:'solid',fgColor:{rgb:'EBF5FF'}} }}]);
  rows.push([{ v: `${engNome}  ${engReg}  |  Data: ${hoje}`, t:'s', s:{ font:FONTE_NORM, alignment:{horizontal:'left'} }}]);
  rows.push([]);

  // Cabeçalho da tabela
  rows.push([
    hdrCell('Cód.'), hdrCell('Item / Serviço'), hdrCell('SINAPI'),
    hdrCell('Un.'), hdrCell('Qtd'), hdrCell('V. Unit. (R$)'),
    hdrCell('Total Orçado (R$)'), hdrCell('Realizado (R$)'), hdrCell('Desvio (%)'),
  ]);

  // Agrupar por etapa se disponível
  const etapas = [...new Set(itens.map(x => x.etapa || 'Geral'))];
  let i = 5; // linha atual (0-indexed)

  etapas.forEach(etapa => {
    const grupo = itens.filter(x => (x.etapa||'Geral') === etapa);
    if (etapas.length > 1) {
      // Subtítulo da etapa
      rows.push([
        { v: `📌 ${etapa}`, t:'s', s:{ font:{bold:true,sz:11,name:'Calibri',color:{rgb:'1A3A8C'}}, fill:{patternType:'solid',fgColor:{rgb:'EBF5FF'}}, alignment:{horizontal:'left'}, border:BORDA }},
        {v:'',t:'s',s:{fill:{patternType:'solid',fgColor:{rgb:'EBF5FF'}},border:BORDA}},
        {v:'',t:'s',s:{fill:{patternType:'solid',fgColor:{rgb:'EBF5FF'}},border:BORDA}},
        {v:'',t:'s',s:{fill:{patternType:'solid',fgColor:{rgb:'EBF5FF'}},border:BORDA}},
        {v:'',t:'s',s:{fill:{patternType:'solid',fgColor:{rgb:'EBF5FF'}},border:BORDA}},
        {v:'',t:'s',s:{fill:{patternType:'solid',fgColor:{rgb:'EBF5FF'}},border:BORDA}},
        {v:'',t:'s',s:{fill:{patternType:'solid',fgColor:{rgb:'EBF5FF'}},border:BORDA}},
        {v:'',t:'s',s:{fill:{patternType:'solid',fgColor:{rgb:'EBF5FF'}},border:BORDA}},
        {v:'',t:'s',s:{fill:{patternType:'solid',fgColor:{rgb:'EBF5FF'}},border:BORDA}},
      ]);
      i++;
    }

    let subtot = 0, subreal = 0;
    grupo.forEach((it, idx) => {
      const tot = it.qtd * it.vunit;
      const dev = tot > 0 ? ((it.real/tot)-1)*100 : 0;
      subtot  += tot;
      subreal += it.real;
      const bg = idx % 2 === 1 ? 'F8FAFF' : null;
      rows.push([
        cell(it.id || '', false, bg, null, 'center'),
        cell(it.item || '', false, bg),
        cell(it.sinapi || '—', false, bg, null, 'center'),
        cell(it.un || 'vb', false, bg, null, 'center'),
        cell(it.qtd || 0, false, bg, '#,##0.000', 'right'),
        cell(it.vunit || 0, false, bg, 'R$ #,##0.00', 'right'),
        cell(tot, false, bg, 'R$ #,##0.00', 'right'),
        cell(it.real || 0, false, bg, 'R$ #,##0.00', 'right'),
        cell(dev, false, dev > 10 ? 'FEE2E2' : dev < -10 ? 'F0FDF4' : bg, '0.0"%"', 'right'),
      ]);
      i++;
    });

    if (etapas.length > 1) {
      // Subtotal da etapa
      rows.push([
        {v:'',t:'s',s:{fill:{patternType:'solid',fgColor:{rgb:'E8F0FB'}},border:BORDA}},
        { v:`Subtotal ${etapa}`, t:'s', s:{ font:FONTE_BOLD, fill:{patternType:'solid',fgColor:{rgb:'E8F0FB'}}, alignment:{horizontal:'right'}, border:BORDA }},
        {v:'',t:'s',s:{fill:{patternType:'solid',fgColor:{rgb:'E8F0FB'}},border:BORDA}},
        {v:'',t:'s',s:{fill:{patternType:'solid',fgColor:{rgb:'E8F0FB'}},border:BORDA}},
        {v:'',t:'s',s:{fill:{patternType:'solid',fgColor:{rgb:'E8F0FB'}},border:BORDA}},
        {v:'',t:'s',s:{fill:{patternType:'solid',fgColor:{rgb:'E8F0FB'}},border:BORDA}},
        { v:subtot,  t:'n', s:{ font:FONTE_BOLD, fill:{patternType:'solid',fgColor:{rgb:'E8F0FB'}}, numFmt:'R$ #,##0.00', alignment:{horizontal:'right'}, border:BORDA }},
        { v:subreal, t:'n', s:{ font:FONTE_BOLD, fill:{patternType:'solid',fgColor:{rgb:'E8F0FB'}}, numFmt:'R$ #,##0.00', alignment:{horizontal:'right'}, border:BORDA }},
        {v:'',t:'s',s:{fill:{patternType:'solid',fgColor:{rgb:'E8F0FB'}},border:BORDA}},
      ]);
      i++;
    }
  });

  // TOTAL GERAL
  const totOrc  = itens.reduce((a,x) => a + x.qtd*x.vunit, 0);
  const totReal = itens.reduce((a,x) => a + x.real, 0);
  const devTotal = totOrc > 0 ? ((totReal/totOrc)-1)*100 : 0;
  rows.push([]);
  rows.push([
    {v:'TOTAL GERAL',t:'s',s:{font:FONTE_HDR,fill:COR_TOTAL,border:BORDA}},
    {v:'',t:'s',s:{fill:COR_TOTAL,border:BORDA}},
    {v:'',t:'s',s:{fill:COR_TOTAL,border:BORDA}},
    {v:'',t:'s',s:{fill:COR_TOTAL,border:BORDA}},
    {v:'',t:'s',s:{fill:COR_TOTAL,border:BORDA}},
    {v:'',t:'s',s:{fill:COR_TOTAL,border:BORDA}},
    {v:totOrc, t:'n',s:{font:FONTE_HDR,fill:COR_TOTAL,numFmt:'R$ #,##0.00',alignment:{horizontal:'right'},border:BORDA}},
    {v:totReal,t:'n',s:{font:FONTE_HDR,fill:COR_TOTAL,numFmt:'R$ #,##0.00',alignment:{horizontal:'right'},border:BORDA}},
    {v:devTotal,t:'n',s:{font:FONTE_HDR,fill:COR_TOTAL,numFmt:'0.0"%"',alignment:{horizontal:'right'},border:BORDA}},
  ]);

  // Rodapé
  rows.push([]);
  rows.push([{ v: `${engNome} — CREA: ${engReg} — Emitido em ${hoje}`, t:'s', s:{ font:{sz:9,name:'Calibri',italic:true,color:{rgb:'94A3B8'}}, alignment:{horizontal:'left'} }}]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch:10 },{ wch:38 },{ wch:12 },{ wch:7 },{ wch:10 },{ wch:14 },{ wch:16 },{ wch:16 },{ wch:12 }];
  ws['!merges'] = [
    { s:{r:0,c:0}, e:{r:0,c:8} },
    { s:{r:1,c:0}, e:{r:1,c:8} },
    { s:{r:2,c:0}, e:{r:2,c:8} },
    { s:{r:rows.length-1,c:0}, e:{r:rows.length-1,c:8} },
  ];
  return ws;
}
