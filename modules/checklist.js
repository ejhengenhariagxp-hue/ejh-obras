// modules/checklist.js — Checklist de Qualidade (templates NBR)
import { fmt, fmtD, pad, safeInner, safeText, showToast, openModal, closeModal } from '../utils.js';

export const CK_TEMPLATES = {
  'Fundações':['Locação conforme projeto aprovado','Profundidade da escavação atingida',
    'Solo de fundação aprovado por RT','Armadura conforme projeto estrutural',
    'Cobrimento mínimo garantido','Limpeza do fundo da vala/estaca',
    'Fck do concreto atende ao projeto','Cura do concreto realizada',
    'Impermeabilização executada','Aterro compactado por camadas'],
  'Estrutura':['Escoramento adequado e seguro','Formas alinhadas e estanques',
    'Armadura longitudinal conforme projeto','Estribos no espaçamento correto',
    'Cobrimento das armaduras verificado','Chumbadores e esperas instalados',
    'Concreto com Fck especificado','Adensamento adequado (vibrador)',
    'Cura mínima de 7 dias','Desforma após prazo mínimo'],
  'Alvenaria':['Blocos sem fissuras ou quebras','Espessura das juntas (1 a 1,5cm)',
    'Prumo e nível verificados','Amarração das fiadas correta',
    'Vergas e contravergas instaladas','Grauteamento dos blocos executado',
    'Esperas elétricas e hidráulicas passadas','Cintas de amarração executadas'],
  'Cobertura':['Madeiramento conforme projeto','Tratamento preservativo da madeira',
    'Telhas com inclinação correta','Rufo e calha instalados',
    'Cumeeira vedada','Fixação das telhas verificada',
    'Impermeabilização de laje executada','Calhas com caimento mínimo (0,5%)'],
  'Instalações Hidráulicas':['Tubulações conforme projeto','Teste de pressão 30min',
    'Declividade mínima das tubulações de esgoto','Registros e válvulas instalados',
    'Caixas de inspeção com tampa','Caixa d\u0027água tampada',
    'Ralos sifonados instalados','Ventilação do esgoto verificada'],
  'Instalações Elétricas':['Tubulações conforme projeto elétrico','Fiação dentro dos eletrodutos',
    'Aterramento executado','Disjuntores dimensionados corretamente',
    'Identificação dos circuitos no QDC','DPS instalado',
    'Teste de continuidade realizado','Tomadas e interruptores nivelados'],
  'Revestimento Interno':['Chapisco aderente','Emboço no prumo e nível (±3mm/2m)',
    'Reboco sem fissuras','Espessura total máx. 25mm',
    'Cantos e quinas retos','Cerâmica/porcelanato alinhados','Rejuntamento completo'],
  'Pintura':['Superfície preparada (selada/lixada)','Massa corrida uniforme',
    'Mínimo 2 demãos','Ausência de marcas de rolo','Rodapés protegidos'],
  'Entrega':['Todas as instalações funcionando','Chaves entregues',
    'Manual da obra entregue','ART de execução registrada',
    'Limpeza geral realizada','Vícios aparentes inexistentes',
    'Documentação organizada','Termo de recebimento assinado'],
};

let ckItensAtual = [];

export function novoChecklist(state) {
  ckItensAtual = [];
  const obraEl = document.getElementById('f-ck-obra');
  if (obraEl) {
    obraEl.innerHTML = '<option value="">Selecione a obra...</option>';
    state.obras.forEach(o => {
      const opt = document.createElement('option');
      opt.value = o.id; opt.textContent = o.nome;
      obraEl.appendChild(opt);
    });
  }
  const dataEl = document.getElementById('f-ck-data');
  if (dataEl) dataEl.value = new Date().toISOString().split('T')[0];
  const respEl = document.getElementById('f-ck-resp');
  if (respEl) respEl.value = state.engNome || '';
  renderTemplatesNBR();
  openModal('modal-checklist');
}

export function renderTemplatesNBR() {
  const wrap = document.getElementById('ck-templates-list');
  if (!wrap) return;
  wrap.innerHTML = Object.keys(CK_TEMPLATES).map(etapa =>
    `<div style="margin-bottom:4px">
      <button onclick="window.aplicarTemplateNBR('${etapa}')"
        style="padding:4px 12px;border-radius:6px;background:var(--blue);color:#fff;border:none;font-size:12px;cursor:pointer;font-weight:600">
        ${etapa}
      </button>
    </div>`
  ).join('');
  window.aplicarTemplateNBR = (etapa) => {
    const itens = CK_TEMPLATES[etapa] || [];
    const textarea = document.getElementById('ck-itens-custom');
    if (textarea) textarea.value = itens.join('\n');
    const etapaEl = document.getElementById('f-ck-etapa');
    if (etapaEl) etapaEl.value = etapa;
    document.getElementById('ck-template-wrap').style.display = 'none';
    showToast('✅ Template NBR carregado: ' + etapa);
  };
}

export function addChecklist(state) {
  const obraId = document.getElementById('f-ck-obra')?.value;
  const etapa  = document.getElementById('f-ck-etapa')?.value?.trim();
  const itensTxt = document.getElementById('ck-itens-custom')?.value?.trim();
  if (!obraId) { showToast('⚠️ Selecione a obra'); return false; }
  if (!etapa)  { showToast('⚠️ Informe a etapa'); return false; }
  const linhas = itensTxt ? itensTxt.split('\n').filter(l=>l.trim()) : [];
  if (!linhas.length) { showToast('⚠️ Adicione itens ao checklist'); return false; }

  if (!Array.isArray(state.checklists)) state.checklists = [];
  if (!state.counters.ck) state.counters.ck = 1;

  const itens = linhas.map((t,i) => ({ id:i, texto:t.trim(), status:'pendente', obs:'' }));
  const ck = {
    id: 'CK-'+pad(state.counters.ck),
    obraId, etapa,
    inspetor: document.getElementById('f-ck-resp')?.value || '',
    data:     document.getElementById('f-ck-data')?.value  || new Date().toISOString().split('T')[0],
    obs:      document.getElementById('f-ck-obs')?.value   || '',
    itens,
    status: 'em_andamento',
    criadoEm: new Date().toISOString()
  };
  state.checklists.push(ck);
  state.counters.ck++;
  closeModal('modal-checklist');
  showToast('✅ Checklist criado!');
  return true;
}

export function renderChecklist(state) {
  if (!Array.isArray(state.checklists)) state.checklists = [];
  const filtro = document.getElementById('ck-filtro-obra')?.value || '';
  const sel = document.getElementById('ck-filtro-obra');
  if (sel && sel.options.length <= 1) {
    state.obras.forEach(o => {
      const opt = document.createElement('option');
      opt.value = o.id; opt.textContent = o.nome;
      sel.appendChild(opt);
    });
  }
  const lista = filtro ? state.checklists.filter(c=>c.obraId===filtro) : state.checklists;
  const el = document.getElementById('list-checklist');
  if (!el) return;
  if (!lista.length) {
    el.innerHTML = `<div style="background:var(--card);border-radius:var(--radius);padding:40px;text-align:center;box-shadow:var(--shadow)">
      <div style="font-size:40px">✅</div>
      <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:700;color:var(--navy);margin-top:12px">Nenhum checklist ainda</div>
      <div style="font-size:13px;color:var(--muted);margin-top:6px">Crie checklists de inspeção por etapa da obra</div>
    </div>`; return;
  }
  const corStatus = {aprovado:'var(--green)',reprovado:'var(--red)',em_andamento:'var(--amber)',pendente:'var(--muted)'};
  const iconStatus = {aprovado:'✅',reprovado:'❌',em_andamento:'🔄',pendente:'⏳'};
  el.innerHTML = lista.map(ck => {
    const obra = state.obras.find(o=>o.id===ck.obraId);
    const aprov = ck.itens.filter(x=>x.status==='aprovado').length;
    const reprov = ck.itens.filter(x=>x.status==='reprovado').length;
    const total = ck.itens.filter(x=>x.status!=='na').length;
    const pct = total > 0 ? Math.round(aprov/total*100) : 0;
    return `<div style="background:var(--card);border-radius:var(--radius);box-shadow:var(--shadow);margin-bottom:12px;border-left:4px solid ${corStatus[ck.status]||'var(--border)'}">
      <div style="padding:14px 18px;border-bottom:1px solid var(--border)">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:var(--navy)">${iconStatus[ck.status]||'⏳'} ${ck.etapa}</div>
            <div style="font-size:12px;color:var(--muted);margin-top:3px">🏗 ${obra?.nome||ck.obraId} &nbsp;•&nbsp; 👤 ${ck.inspetor} &nbsp;•&nbsp; 📅 ${fmtD(ck.data)}</div>
          </div>
          <div style="text-align:right">
            <div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:${corStatus[ck.status]}">${pct}%</div>
            <div style="font-size:10px;color:var(--muted)">${aprov}✅ ${reprov}❌ / ${total}</div>
          </div>
        </div>
        <div style="margin-top:8px;height:6px;background:#e2e8f0;border-radius:3px">
          <div style="height:100%;width:${pct}%;background:${corStatus[ck.status]};border-radius:3px"></div>
        </div>
      </div>
      <div style="padding:10px 18px;display:flex;gap:8px;flex-wrap:wrap;background:#fafbff">
        <button class="btn btn-outline btn-sm" onclick="window.abrirChecklistDetalhe('${ck.id}')">👁 Detalhes / Preencher</button>
        <button class="btn btn-outline btn-sm" onclick="window.imprimirChecklist('${ck.id}')">🖨 Imprimir</button>
        <button class="btn btn-outline btn-sm" style="color:var(--red);border-color:var(--red);margin-left:auto" onclick="if(confirm('Excluir?')){window._state.checklists=window._state.checklists.filter(x=>x.id!=='${ck.id}');window.renderAtiva()}">🗑</button>
      </div>
    </div>`;
  }).join('');

  // Expõe funções globais
  window.abrirChecklistDetalhe = (id) => abrirChecklistDetalhe(state, id);
  window.imprimirChecklist = (id) => imprimirChecklist(state, id);
}

export function abrirChecklistDetalhe(state, id) {
  const ck = state.checklists?.find(x=>x.id===id);
  if (!ck) return;
  const obra = state.obras.find(o=>o.id===ck.obraId);
  // Create inline editor
  const corStatus = {aprovado:'#f0fdf4',reprovado:'#fef2f2',pendente:'#f8faff',na:'#f1f5f9'};
  const win = window.open('','_blank');
  win.document.write(`<!DOCTYPE html><html lang="pt-BR"><head>
    <meta charset="UTF-8"><title>Checklist ${ck.id}</title>
    <style>body{font-family:Arial,sans-serif;padding:28px;max-width:700px;margin:0 auto;color:#1e293b}
    h1{font-size:17px;color:#0f2744;border-bottom:2px solid #0f2744;padding-bottom:8px}
    .meta{background:#f8faff;border-radius:8px;padding:12px;margin:14px 0;font-size:13px;display:grid;grid-template-columns:1fr 1fr;gap:6px}
    .item{display:flex;align-items:center;gap:10px;padding:7px 10px;border-radius:6px;margin-bottom:5px;font-size:13px}
    select{padding:3px 6px;border-radius:5px;border:1px solid #cbd5e1;font-size:12px}
    .footer{margin-top:30px;display:grid;grid-template-columns:1fr 1fr;gap:40px}
    .ass{border-top:1.5px solid #0f2744;padding-top:6px;font-size:12px;text-align:center;margin-top:10px}
    @media print{.no-print{display:none}}</style></head><body>
    <h1>✅ Checklist — ${ck.etapa}</h1>
    <div class="meta">
      <div><b>Obra:</b> ${obra?.nome||ck.obraId}</div>
      <div><b>Data:</b> ${fmtD(ck.data)}</div>
      <div><b>Inspetor:</b> ${ck.inspetor}</div>
      <div><b>ID:</b> ${ck.id}</div>
    </div>
    ${ck.itens.map((it,i)=>`<div class="item" id="item-${i}" style="background:${corStatus[it.status]||'#f8faff'}">
      <select onchange="updateStatus(${i},this.value)" class="no-print">
        <option value="pendente" ${it.status==='pendente'?'selected':''}>⏳ Pendente</option>
        <option value="aprovado" ${it.status==='aprovado'?'selected':''}>✅ Aprovado</option>
        <option value="reprovado" ${it.status==='reprovado'?'selected':''}>❌ Reprovado</option>
        <option value="na" ${it.status==='na'?'selected':''}>— N/A</option>
      </select>
      <span>${it.texto}</span>
    </div>`).join('')}
    <div class="footer">
      <div><div style="height:50px"></div><div class="ass">${ck.inspetor||'Responsável Técnico'}<br>Engenheiro / Fiscal</div></div>
      <div><div style="height:50px"></div><div class="ass">${obra?.cliente||'Contratante'}</div></div>
    </div>
    <div class="no-print" style="margin-top:20px;display:flex;gap:10px">
      <button onclick="window.print()" style="padding:8px 16px;background:#0f2744;color:#fff;border:none;border-radius:8px;cursor:pointer">🖨 Imprimir</button>
    </div>
    <script>function updateStatus(i,v){document.getElementById('item-'+i).style.background={aprovado:'#f0fdf4',reprovado:'#fef2f2',pendente:'#f8faff',na:'#f1f5f9'}[v]||'#f8faff';}<\/script>
    </body></html>`);
  win.document.close();
}

export function imprimirChecklist(state, id) { abrirChecklistDetalhe(state, id); }
