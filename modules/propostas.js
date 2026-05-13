// modules/propostas.js
import { fmt, fmtD, pad, safeInner, safeText, showToast, openModal, closeModal, statusBadge, markDeleted, escapeHtml } from '../utils.js?v=20260501g';

window.projServicos = window.projServicos || [];
window.projExtras = window.projExtras || [];
window.obraItens = window.obraItens || [];
window.modoGlobalProjeto = window.modoGlobalProjeto || false;
window.propFotos = window.propFotos || [];

const PROP_STATUS = {
  em_negociacao: { label: 'Em Negociação', icon: '🤝', bg: '#dbeafe', color: '#1d4ed8' },
  em_revisao:    { label: 'Em Revisão',    icon: '📝', bg: '#fef3c7', color: '#92400e' },
  fechado:       { label: 'Fechado',       icon: '✅', bg: '#d1fae5', color: '#065f46' },
  nao_fechou:    { label: 'Não Fechou',    icon: '❌', bg: '#fee2e2', color: '#991b1b' },
};

// Fecha pickers de status ao clicar fora (inicializado uma vez)
if (!window._propPickerListener) {
  window._propPickerListener = true;
  document.addEventListener('click', e => {
    if (!e.target.closest('[data-status-toggle]') && !e.target.closest('[id^="status-picker-"]')) {
      document.querySelectorAll('[id^="status-picker-"]').forEach(el => el.style.display = 'none');
    }
  });
}
window.toggleStatusPickerProp = function(id) {
  const picker = document.getElementById('status-picker-' + id);
  if (!picker) return;
  const isOpen = picker.style.display !== 'none';
  document.querySelectorAll('[id^="status-picker-"]').forEach(el => el.style.display = 'none');
  if (!isOpen) picker.style.display = '';
};

const PRECO_PROJETOS = [
    {id:'ARQ', nome:'Projeto Arquitetônico', un:'m²', preco:35.00, desc:'Planta baixa, cortes, fachadas, perspectiva, memoriais e aprovação'},
    {id:'EST', nome:'Projeto Estrutural', un:'m²', preco:28.00, desc:'Cálculo estrutural, detalhamento de armaduras, formas e locação – com ART'},
    {id:'HID', nome:'Projeto Hidrossanitário', un:'m²', preco:12.00, desc:'Projeto de água fria/quente, esgoto sanitário e águas pluviais – com ART'},
    {id:'ELE', nome:'Projeto Elétrico', un:'m²', preco:14.00, desc:'Instalações elétricas residenciais/comerciais e quadro de cargas – com ART'},
    {id:'PREV',nome:'PPCI / Incêndio', un:'m²', preco:8.00, desc:'Projeto de prevenção e combate a incêndio conforme normas do CBMMG'},
    {id:'AR2', nome:'Regularização / Prefeitura', un:'vb', preco:1800.00, desc:'Processo administrativo de regularização e obtenção de Habite-se'},
    {id:'TOP', nome:'Topografia', un:'vb', preco:2200.00, desc:'Levantamento planialtimétrico georreferenciado com locação de divisas'},
    {id:'SOLO',nome:'Sondagem SPT', un:'furo', preco:1800.00, desc:'Sondagem a percussão com relatório de resistência (NSTP)'},
    {id:'GER', nome:'Gerenciamento de Obra', un:'mês', preco:1200.00, desc:'Controle de custos, cronograma, compras e gestão de contratos'},
    {id:'ACO', nome:'Acompanhamento Técnico', un:'mês', preco:900.00, desc:'Visitas técnicas periódicas para verificação de conformidade do projeto'},
    {id:'VIS', nome:'Vistoria Técnica', un:'vb', preco:800.00, desc:'Vistoria pontual com emissão de relatório técnico fotográfico'},
    {id:'LAU', nome:'Laudo de Engenharia', un:'vb', preco:1400.00, desc:'Laudo pericial ou de patologia com diagnóstico e recomendações'},
    {id:'ASB', nome:'Consultoria Técnica', un:'hr', preco:280.00, desc:'Assessoria técnica especializada por hora consultada'},
    {id:'PCI', nome:'PCI — Planilha Caixa Inicial', un:'vb', preco:1200.00, desc:'Planilha inicial para análise e liberação do financiamento na Caixa Econômica Federal'},
    {id:'PLS', nome:'PLS — Planilha de Medição Caixa', un:'mês', preco:600.00, desc:'Planilha de medição mensal da Caixa, incluindo reprogramação caso necessário no decorrer da obra'},
];

const ENTREGAS_PROJ = {
  'ARQ': { titulo: 'Projeto Arquitetônico',        itens: ['Plantas baixas de todos os pavimentos', 'Cortes e fachadas', 'Planta de situação e locação', 'Memorial descritivo', 'Perspectiva 3D ilustrativa'] },
  'EST': { titulo: 'Projeto Estrutural',            itens: ['Cálculo estrutural completo', 'Pranchas de forma e locação', 'Detalhamento de armaduras', 'Memorial de cálculo', 'ART de projeto incluída'] },
  'HID': { titulo: 'Projeto Hidrossanitário',       itens: ['Planta de água fria e quente', 'Planta de esgoto sanitário', 'Rede de águas pluviais', 'Detalhes isométricos', 'Lista de materiais', 'ART de projeto incluída'] },
  'ELE': { titulo: 'Projeto Elétrico',              itens: ['Planta de iluminação e tomadas', 'Rede de comunicação (TV, internet)', 'Diagrama unifilar', 'Quadro de cargas e demandas', 'Lista de materiais', 'ART de projeto incluída'] },
  'PREV':{ titulo: 'PPCI — Prevenção de Incêndio', itens: ['Projeto conforme normas CBMMG', 'Memória de cálculo', 'Pranchas técnicas', 'ART de projeto incluída'] },
  'ACO': { titulo: 'Acompanhamento Técnico',        itens: ['Visitas técnicas periódicas', 'Relatórios fotográficos de vistoria', 'Verificação de conformidade com projeto', 'Orientação à equipe de obra'] },
  'GER': { titulo: 'Gerenciamento de Obra',         itens: ['Controle de cronograma', 'Gestão de contratos e fornecedores', 'Controle de custos e medições', 'Relatórios mensais de andamento'] },
  'LAU': { titulo: 'Laudo de Engenharia',           itens: ['Vistoria técnica detalhada', 'Diagnóstico de patologias', 'Recomendações técnicas', 'Relatório com registro fotográfico', 'ART incluída'] },
  'VIS': { titulo: 'Vistoria Técnica',              itens: ['Vistoria in loco', 'Relatório técnico fotográfico', 'Recomendações de intervenção'] },
  'TOP': { titulo: 'Topografia',                    itens: ['Levantamento planialtimétrico', 'Georreferenciamento', 'Locação de divisas', 'Relatório técnico', 'ART incluída'] },
  'AR2': { titulo: 'Regularização / Prefeitura',   itens: ['Processo administrativo completo', 'Projeto de regularização', 'Acompanhamento junto à Prefeitura', 'Obtenção de Habite-se'] },
  'PCI': { titulo: 'PCI — Planilha Caixa Inicial',  itens: ['Preenchimento da PCI (planilha inicial Caixa)', 'Memorial descritivo conforme padrão Caixa', 'Cronograma físico-financeiro inicial', 'Orçamento detalhado para análise', 'Documentação para liberação do financiamento'] },
  'PLS': { titulo: 'PLS — Planilha de Medição Caixa', itens: ['Planilha de medição mensal da Caixa', 'Relatório fotográfico de execução', 'Reprogramação do cronograma quando necessário', 'Atualização de quantitativos executados', 'Acompanhamento até liberação de cada parcela'] },
};

export function openPropProjeto(state){
  const draftStr = localStorage.getItem('rascunho_proposta');
  if (draftStr) {
    try {
      const draft = JSON.parse(draftStr);
      if (draft.tipo === 'projeto') {
        if (Date.now() - (draft.ts || 0) > 86400000) {
          localStorage.removeItem('rascunho_proposta');
        } else if (confirm('Você possui um rascunho não-salvo. Deseja restaurá-lo?')) {
          window.projServicos = draft.projServicos || [];
          window.projExtras = draft.projExtras || [];
          if(draft.cliente) document.getElementById('f-pp-cliente').value = draft.cliente;
          if(draft.empreend) document.getElementById('f-pp-empreend').value = draft.empreend;
          renderProjServicos(); renderProjExtras(); calcPropProjeto(state);
          document.getElementById('modal-proposta-projeto').classList.add('open');
          return;
        } else { localStorage.removeItem('rascunho_proposta'); }
      }
    } catch(e){}
  }
  if(document.getElementById('f-pp-id')) document.getElementById('f-pp-id').value='';
  window.modoGlobalProjeto=false;
  window.projServicos=PRECO_PROJETOS.map(p=>({...p,qtd:0,incluso:false}));
  window.projExtras=[];
  renderProjServicos();
  renderProjExtras();
  document.getElementById('f-pp-data').value=new Date().toISOString().split('T')[0];
  const btn=document.getElementById('btn-modo-global');
  if(btn){ btn.textContent='💰 Modo: Por Unidade'; btn.style.background='#fff'; btn.style.color='var(--muted)'; btn.style.borderColor='var(--border)'; }
  window.propFotos = [];
  setTimeout(() => renderPropFotos(), 50);
  document.getElementById('modal-proposta-projeto').classList.add('open');
}

export function openPropObra(state){
  const draftStr = localStorage.getItem('rascunho_proposta');
  if (draftStr) {
    try {
      const draft = JSON.parse(draftStr);
      if (draft.tipo === 'obra') {
        if (Date.now() - (draft.ts || 0) > 86400000) {
          localStorage.removeItem('rascunho_proposta');
        } else if (confirm('Você possui um rascunho de obra não-salvo. Deseja restaurá-lo?')) {
          window.obraItens = draft.obraItens || [];
          if(draft.cliente) document.getElementById('f-po-cliente').value = draft.cliente;
          renderObraItens(); calcPropostaObra(state);
          document.getElementById('modal-proposta-obra').classList.add('open');
          return;
        } else { localStorage.removeItem('rascunho_proposta'); }
      }
    } catch(e){}
  }
  if(document.getElementById('f-po-id')) document.getElementById('f-po-id').value='';
  window.obraItens=[];
  renderObraItens();
  document.getElementById('f-po-data').value=new Date().toISOString().split('T')[0];
  calcPropostaObra(state);
  document.getElementById('modal-proposta-obra').classList.add('open');
}

export function calcPropProjeto(state){
  const sub1=window.projServicos.filter(s=>s.incluso&&s.qtd>0).reduce((a,s)=>a+s.qtd*s.preco,0);
  const sub2=(window.projExtras||[]).filter(s=>s.qtd>0&&s.preco>0).reduce((a,s)=>a+s.qtd*s.preco,0);
  const subtotal=sub1+sub2;
  const desc=+document.getElementById('f-pp-desc').value||0;
  const total=subtotal*(1-desc/100);
  document.getElementById('f-pp-total').value=fmt(total);
  const inl=document.getElementById('pp-subtotal-inline');
  if(inl) inl.textContent=fmt(subtotal);
  try{
    localStorage.setItem('rascunho_proposta', JSON.stringify({
      tipo:'projeto', projServicos: window.projServicos, projExtras: window.projExtras,
      cliente: document.getElementById('f-pp-cliente')?.value||'',
      empreend: document.getElementById('f-pp-empreend')?.value||'',
      ts: Date.now()
    }));
  }catch(e){}
}

export function calcPropostaObra(state){
  const sub=window.obraItens.reduce((a,x)=>a+x.qtd*x.vunit,0);
  const bdi=+document.getElementById('f-po-bdi').value||25;
  const desc=+document.getElementById('f-po-desc').value||0;
  const total=sub*(1+bdi/100)*(1-desc/100);
  document.getElementById('f-po-sub').value=fmt(sub);
  document.getElementById('f-po-total').value=fmt(total);
  try{
    localStorage.setItem('rascunho_proposta', JSON.stringify({
      tipo:'obra', obraItens: window.obraItens,
      cliente: document.getElementById('f-po-cliente')?.value||'',
      ts: Date.now()
    }));
  }catch(e){}
}

export function addObraItem(state){
  window.obraItens.push({item:'',un:'m²',qtd:0,vunit:0});
  renderObraItens();
}

export function addProjServico(state, a){
  window.projServicos.push({id:'CUSTOM',nome:'Serviço adicional',un:'vb',preco:0,qtd:1,incluso:true,desc:'Descreva o serviço'});
  renderProjServicos();
  calcPropProjeto(state);
}

export function addProjExtra(state){
  window.projExtras.push({nome:'',un:'vb',qtd:1,preco:0});
  renderProjExtras();
}

// Funções de Renderização Intermediária para propostas 
export function renderProjServicos(){
  const UNS_PROJ=['m²','vb','mês','hr','un','verba','furo','m','m³','kg'];
  document.getElementById('pp-servicos-list').innerHTML=`
  <div style="display:grid;grid-template-columns:28px 1fr 100px 90px 110px 120px;gap:8px;align-items:center;padding:6px 0;border-bottom:2px solid var(--navy)">
    <span></span>
    <span style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase">Serviço</span>
    <span style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;text-align:center">Unidade</span>
    <span style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;text-align:right">Quantidade</span>
    <span style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;text-align:right">Preço Unit.</span>
    <span style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;text-align:right">Subtotal</span>
  </div>
  `+window.projServicos.map((s,i)=>`
    <div style="display:grid;grid-template-columns:28px 1fr 100px 90px 110px 120px;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
      <input type="checkbox" ${s.incluso?'checked':''} onchange="projServicos[${i}].incluso=this.checked;calcPropProjeto()" style="width:16px;height:16px;cursor:pointer;accent-color:var(--blue)">
      <div>
        <div style="font-size:13px;font-weight:600;color:var(--navy)">${s.nome}</div>
        <textarea oninput="projServicos[${i}].desc=this.value" 
          placeholder="Escopo / Descrição do serviço..."
          style="width:100%;font-size:11px;color:var(--muted);border:none;background:transparent;resize:vertical;min-height:34px;padding:0;font-family:inherit;margin-top:2px;display:block">${s.desc||''}</textarea>
      </div>
      <select onchange="projServicos[${i}].un=this.value;calcPropProjeto()"
        style="padding:5px 7px;border:1.5px solid var(--border);border-radius:8px;font-size:12px;cursor:pointer">
        ${UNS_PROJ.map(u=>`<option ${u===s.un?'selected':''}>${u}</option>`).join('')}
      </select>
      <input type="number" step="0.01" min="0" value="${s.qtd||''}"
        id="pp-qtd-${i}"
        oninput="projServicos[${i}].qtd=+this.value;projServicos[${i}].incluso=+this.value>0;calcPropProjeto()"
        style="padding:5px 7px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;text-align:right;width:100%"
        placeholder="${s.un==='vb'||s.un==='verba'||s.un==='mês'?'1':'0'}">
      <input type="number" step="0.01" min="0" value="${s.preco}"
        id="pp-preco-${i}"
        oninput="projServicos[${i}].preco=+this.value;calcPropProjeto()"
        style="padding:5px 7px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;text-align:right;width:100%">
      <div id="pp-sub-${i}" style="font-size:13px;font-weight:700;color:${s.incluso&&s.qtd>0?'var(--navy)':'var(--muted)'};text-align:right">
        ${s.incluso&&s.qtd>0?fmt(s.qtd*s.preco):'—'}
      </div>
    </div>`).join('')+`
  <div style="display:grid;grid-template-columns:28px 1fr 100px 90px 110px 120px;gap:8px;padding:10px 0;border-top:2px solid var(--navy);margin-top:4px;align-items:center">
    <span></span>
    <span style="font-weight:700;color:var(--navy);font-size:13px">SUBTOTAL DOS SERVIÇOS PADRÃO</span>
    <span></span><span></span><span></span>
    <div id="pp-subtotal-inline" style="font-family:'Syne',sans-serif;font-size:16px;font-weight:800;color:var(--navy);text-align:right">R$ 0,00</div>
  </div>`;
  setTimeout(()=>calcPropProjeto(window.state), 0);
}

export function renderProjExtras(){
  const UNS_PROJ=['m²','vb','hr','un','verba','furo','m','m³','kg'];
  const el=document.getElementById('pp-extras-list');
  if(!el) return;
  if(!window.projExtras.length){
    el.innerHTML='<div style="font-size:12.5px;color:var(--muted);padding:8px 0">Nenhum serviço extra. Clique em "＋ Adicionar" abaixo.</div>';
    return;
  }
  el.innerHTML=window.projExtras.map((s,i)=>`
    <div style="display:grid;grid-template-columns:1fr 100px 80px 110px 100px auto;gap:8px;align-items:center;padding:7px 0;border-bottom:1px solid var(--border)">
      <input value="${s.nome}" placeholder="Descreva o serviço extra…"
        oninput="projExtras[${i}].nome=this.value;calcPropProjeto()"
        style="padding:6px 10px;border:1.5px solid var(--border);border-radius:8px;font-size:13px">
      <select onchange="projExtras[${i}].un=this.value;calcPropProjeto()"
        style="padding:6px 8px;border:1.5px solid var(--border);border-radius:8px;font-size:12px">
        ${UNS_PROJ.map(u=>`<option ${u===s.un?'selected':''}>${u}</option>`).join('')}
      </select>
      <input type="number" step="0.01" min="0" value="${s.qtd}" placeholder="Qtd"
        oninput="projExtras[${i}].qtd=+this.value;calcPropProjeto()"
        style="padding:6px 8px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;text-align:right">
      <input type="number" step="0.01" min="0" value="${s.preco}" placeholder="Valor (R$)"
        oninput="projExtras[${i}].preco=+this.value;calcPropProjeto()"
        style="padding:6px 8px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;text-align:right">
      <div style="font-size:13px;font-weight:700;color:var(--navy);text-align:right">${s.qtd&&s.preco?fmt(s.qtd*s.preco):'—'}</div>
      <button class="btn btn-outline btn-xs" style="color:var(--red)" onclick="projExtras.splice(${i},1);renderProjExtras();calcPropProjeto()">✕</button>
    </div>`).join('');
}

export function renderObraItens(){
  document.getElementById('po-itens-list').innerHTML=window.obraItens.length?
    `<table style="width:100%;border-collapse:collapse;font-size:12.5px">
      <thead><tr style="background:var(--navy);color:#fff">
        <th style="padding:7px 10px;text-align:left">Item / Serviço</th>
        <th style="padding:7px 10px;width:52px">Un.</th>
        <th style="padding:7px 10px;width:70px;text-align:right">Qtd</th>
        <th style="padding:7px 10px;width:90px;text-align:right">V.Unit R$</th>
        <th style="padding:7px 10px;width:100px;text-align:right">Total R$</th>
        <th style="width:32px"></th>
      </tr></thead>
      <tbody>${window.obraItens.map((x,i)=>`<tr style="border-bottom:1px solid var(--border)">
        <td style="padding:5px 8px"><input value="${(x.item||'').replace(/"/g,'&quot;')}" oninput="obraItens[${i}].item=this.value" style="width:100%;padding:4px;border:1px solid var(--border);border-radius:4px" placeholder="Item/Serviço"></td>
        <td style="padding:5px 8px"><input value="${x.un||'m²'}" oninput="obraItens[${i}].un=this.value" style="width:100%;padding:4px;border:1px solid var(--border);border-radius:4px;text-align:center"></td>
        <td style="padding:5px 8px"><input type="number" step="0.01" min="0" value="${x.qtd||0}" oninput="obraItens[${i}].qtd=+this.value;atualizarLinhaObra(${i});calcPropostaObra()" style="width:100%;padding:4px;border:1px solid var(--border);border-radius:4px;text-align:right"></td>
        <td style="padding:5px 8px"><input type="number" step="0.01" min="0" value="${x.vunit||0}" oninput="obraItens[${i}].vunit=+this.value;atualizarLinhaObra(${i});calcPropostaObra()" style="width:100%;padding:4px;border:1px solid var(--border);border-radius:4px;text-align:right"></td>
        <td style="padding:5px 8px;text-align:right;font-weight:700;color:var(--navy)" id="po-tot-${i}">${fmt((x.qtd||0)*(x.vunit||0))}</td>
        <td style="padding:5px 8px;text-align:center"><button class="btn btn-outline btn-xs" style="color:var(--red);padding:2px 6px;min-width:auto" onclick="obraItens.splice(${i},1);renderObraItens();calcPropostaObra()">✕</button></td>
      </tr>`).join('')}</tbody>
    </table>
    <div style="display:flex;justify-content:flex-end;margin-top:10px;padding-right:20px;align-items:center;gap:15px">
      <span style="font-weight:700;color:var(--navy);font-size:12px">SUBTOTAL DOS ITENS:</span>
      <span id="po-sub-inline" style="font-weight:800;font-size:15px;color:var(--navy)">${fmt(window.obraItens.reduce((a,v)=>a+(v.qtd||0)*(v.vunit||0),0))}</span>
    </div>` : '<div style="font-size:12.5px;color:var(--muted);padding:8px 0;text-align:center">Nenhum item adicionado à proposta comercial de obra.</div>';
}

window.renderProjServicos = renderProjServicos;
window.renderProjExtras = renderProjExtras;
window.renderObraItens = renderObraItens;
window.calcPropProjeto = calcPropProjeto;
window.calcPropostaObra = calcPropostaObra;

// ── Fotos de portfolio por proposta ─────────────────────────────────
function _resizePropFoto(file) {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const maxW = 900, scale = Math.min(1, maxW / img.width);
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.75));
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

export function renderPropFotos() {
  const container = document.getElementById('prop-fotos-preview');
  if (!container) return;
  if (!window.propFotos.length) {
    container.innerHTML = '<div style="color:var(--muted);font-size:12px;padding:4px 0">Nenhuma foto. Adicione fotos de projetos similares para incluir na página 2 do PDF.</div>';
    return;
  }
  container.innerHTML = window.propFotos.map((f, i) => `
    <div style="position:relative;flex-shrink:0;width:100px">
      <img src="${f.dataUrl}" style="width:100px;height:70px;object-fit:cover;border-radius:6px;border:1.5px solid var(--border)">
      <input value="${escapeHtml(f.legenda || '')}" placeholder="Legenda…"
        oninput="propFotos[${i}].legenda=this.value"
        style="width:100%;display:block;margin-top:3px;font-size:10px;padding:2px 4px;border:1px solid var(--border);border-radius:4px;box-sizing:border-box">
      <button onclick="removePropFoto(${i})"
        style="position:absolute;top:2px;right:2px;background:rgba(0,0,0,.65);color:#fff;border:none;border-radius:50%;width:18px;height:18px;font-size:9px;cursor:pointer;line-height:1.8;padding:0">✕</button>
    </div>`).join('');
}

export async function addPropFoto(input) {
  const files = Array.from(input.files || []);
  const available = 6 - window.propFotos.length;
  if (available <= 0) { showToast('⚠️ Máximo de 6 fotos por proposta.'); input.value=''; return; }
  for (const file of files.slice(0, available)) {
    if (!file.type.startsWith('image/')) continue;
    const dataUrl = await _resizePropFoto(file);
    if (dataUrl) window.propFotos.push({ dataUrl, legenda: '' });
  }
  renderPropFotos();
  input.value = '';
}

export function removePropFoto(idx) {
  window.propFotos.splice(idx, 1);
  renderPropFotos();
}

window.renderPropFotos = renderPropFotos;
window.removePropFoto = removePropFoto;

export function saveProposta(state, tipo){
  if(!Array.isArray(state.propostas)) state.propostas=[];
  if(!state.counters.prop) state.counters.prop=1;
  const id='PROP-'+pad(state.counters.prop);
  let proposta={id, tipo, data:new Date().toISOString().split('T')[0]};
  try{
    if(tipo==='projeto'){
      const _cli=document.getElementById('f-pp-cliente').value.trim();
      if(!_cli){
        document.getElementById('f-pp-cliente').style.border='1.5px solid var(--red)';
        showToast('⚠️ Informe o nome do cliente antes de salvar.');
        return false;
      }
      document.getElementById('f-pp-cliente').style.border='';
      const sel=document.getElementById('f-pp-parcela');
      const customEl=document.getElementById('f-pp-parcela-custom');
      const parcela=sel?(sel.value==='custom'?(customEl?customEl.value:''):sel.value):'';
      const area=+document.getElementById('f-pp-area').value||0;
      const desc=+document.getElementById('f-pp-desc').value||0;
      const itens=[
        ...window.projServicos.filter(s=>s.incluso&&s.qtd>0).map(s=>({...s})),
        ...(window.projExtras||[]).filter(s=>s.qtd>0&&s.preco>0).map(s=>({...s,nome:s.nome||'Serviço extra',id:'EXT'}))
      ];
      const subtotal=itens.reduce((a,s)=>a+s.qtd*s.preco,0);
      proposta={...proposta,
        cliente:document.getElementById('f-pp-cliente').value||'',
        empreend:document.getElementById('f-pp-empreend').value||'',
        area, prazo:document.getElementById('f-pp-prazo').value||'',
        validade:document.getElementById('f-pp-val').value||'30',
        obs:document.getElementById('f-pp-obs').value||'',
        metodologia:document.getElementById('f-pp-metod')?.value||'',
        fotos:[...(window.propFotos||[])],
        parcela, desconto:desc, subtotal, total:subtotal*(1-desc/100),
        itens, data:document.getElementById('f-pp-data').value||new Date().toISOString().split('T')[0],
      };
      closeModal('modal-proposta-projeto');
    } else {
      const _cliObra=document.getElementById('f-po-cliente').value.trim();
      if(!_cliObra){
        document.getElementById('f-po-cliente').style.border='1.5px solid var(--red)';
        showToast('⚠️ Informe o nome do cliente antes de salvar.');
        return false;
      }
      document.getElementById('f-po-cliente').style.border='';
      const bdi=+document.getElementById('f-po-bdi').value||25;
      const desc=+document.getElementById('f-po-desc').value||0;
      const sub=window.obraItens.reduce((a,x)=>a+x.qtd*x.vunit,0);
      const parcObraEl=document.getElementById('f-po-parcela');
      const valdEl=document.getElementById('f-po-validade');
      proposta={...proposta,
        cliente:document.getElementById('f-po-cliente').value||'',
        empreend:document.getElementById('f-po-empreend').value||'',
        area:+document.getElementById('f-po-area').value||0,
        prazo:document.getElementById('f-po-prazo').value||'',
        validade:valdEl?valdEl.value:'30',
        tipoObra:document.getElementById('f-po-tipo').value||'obra',
        escopo:document.getElementById('f-po-escopo').value||'',
        obs:document.getElementById('f-po-obs').value||'',
        parcela:parcObraEl?parcObraEl.value:'Por medição',
        metodologia:document.getElementById('f-po-metod')?.value||'',
        fotos:[...(window.propFotos||[])],
        bdi, desconto:desc, subtotal:sub,
        total:sub*(1+bdi/100)*(1-desc/100),
        itens:window.obraItens.map(x=>({...x})), data:document.getElementById('f-po-data').value||new Date().toISOString().split('T')[0],
      };
      closeModal('modal-proposta-obra');
    }
  }catch(e){ showToast('⚠️ Erro: '+e.message); console.error(e); return false; }
  
  const editId = tipo === 'projeto' ? document.getElementById('f-pp-id')?.value : document.getElementById('f-po-id')?.value;

  if (editId) {
    const idx = state.propostas.findIndex(x => x.id === editId);
    if (idx !== -1) {
      // Preserva id original e status (edit não deve resetar negociação para em_negociacao)
      state.propostas[idx] = { ...state.propostas[idx], ...proposta, id: editId, status: state.propostas[idx].status || 'em_negociacao' };
      showToast('✅ Proposta atualizada!');
    }
  } else {
    if (!proposta.status) proposta.status = 'em_negociacao';
    state.propostas.push(proposta);
    state.counters.prop++;
    showToast('✅ Proposta salva! Veja em Propostas.');
  }
  
  try{localStorage.setItem('ejh_propostas_bak',JSON.stringify(state.propostas));}catch(e){}
  try{localStorage.removeItem('rascunho_proposta');}catch(e){}

  setTimeout(()=>{
    try{
      document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
      document.getElementById('page-propostas').classList.add('active');
      document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
      const navEl=document.querySelector('.nav-item[onclick*="propostas"]');
      if(navEl) navEl.classList.add('active');
      renderPropostas(state);
    }catch(e){console.error('nav error:',e);}
  },400);
  return true;
}

export function delProposta(state, id){
  if(confirm('Excluir proposta?')){
    state.propostas=state.propostas.filter(x=>x.id!==id);
    markDeleted(state, 'propostas', id);
    return true;
  }
  return false;
}

export function editProposta(state, id) {
  const p = state.propostas.find(x => x.id === id);
  if (!p) return;

  if (p.tipo === 'projeto') {
    document.getElementById('f-pp-id').value = p.id;
    document.getElementById('f-pp-cliente').value = p.cliente || '';
    document.getElementById('f-pp-empreend').value = p.empreend || '';
    document.getElementById('f-pp-area').value = p.area || '';
    document.getElementById('f-pp-data').value = p.data || '';
    document.getElementById('f-pp-val').value = p.validade || '30';
    document.getElementById('f-pp-prazo').value = p.prazo || '';
    document.getElementById('f-pp-desc').value = p.desconto || 0;
    document.getElementById('f-pp-obs').value = p.obs || '';
    if(document.getElementById('f-pp-metod')) document.getElementById('f-pp-metod').value = p.metodologia || '';
    window.propFotos = [...(p.fotos || [])];
    setTimeout(() => renderPropFotos(), 50);

    // Carregar itens
    window.projServicos = PRECO_PROJETOS.map(def => {
      const match = (p.itens || []).find(it => it.id === def.id);
      return match ? { ...def, ...match, incluso: true } : { ...def, incluso: false, qtd: 0 };
    });
    // Itens extras
    window.projExtras = (p.itens || []).filter(it => it.id === 'CUSTOM' || it.id === 'EXT');
    
    renderProjServicos();
    renderProjExtras();
    calcPropProjeto(state);
    openModal('modal-proposta-projeto');
  } else {
    document.getElementById('f-po-id').value = p.id;
    document.getElementById('f-po-cliente').value = p.cliente || '';
    document.getElementById('f-po-empreend').value = p.empreend || '';
    document.getElementById('f-po-area').value = p.area || '';
    document.getElementById('f-po-data').value = p.data || '';
    document.getElementById('f-po-prazo').value = p.prazo || '';
    document.getElementById('f-po-bdi').value = p.bdi || 25;
    document.getElementById('f-po-desc').value = p.desconto || 0;
    document.getElementById('f-po-escopo').value = p.escopo || '';
    if (document.getElementById('f-po-tipo')) document.getElementById('f-po-tipo').value = p.tipoObra || 'obra';
    if(document.getElementById('f-po-metod')) document.getElementById('f-po-metod').value = p.metodologia || '';
    window.propFotos = [...(p.fotos || [])];
    setTimeout(() => renderPropFotos(), 50);

    window.obraItens = [...(p.itens || [])];
    renderObraItens();
    calcPropostaObra(state);
    openModal('modal-proposta-obra');
  }
}

export function printProposta(state, id){
  const p=state.propostas.find(x=>x.id===id);
  if(!p){ showToast('⚠️ Proposta não encontrada'); return; }
  const itens = Array.isArray(p.itens) ? p.itens : [];
  const subtotal = +p.subtotal || 0;
  const total = +p.total || 0;
  const bdi = +p.bdi || 0;
  const desconto = +p.desconto || 0;
  const hoje = new Date().toLocaleDateString('pt-BR');
  const fotos = Array.isArray(p.fotos) ? p.fotos : [];
  const engNome = state.engNome || 'Eng. Responsável';
  const rodape = state.relatorioRodape || 'RUA SEBASTIÃO VITOR, 325 – AGENOR DE LIMA – GUAXUPÉ/MG';

  // ── Tabela de serviços ────────────────────────────────────────────
  let itensHtml = '';
  if(p.tipo==='projeto'){
    itensHtml=`<table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead><tr style="background:#1c2126;color:#fff">
        <th style="padding:10px 14px;text-align:left">Serviço de Projeto</th>
        <th style="padding:10px 8px;width:44px;text-align:center">Un.</th>
        <th style="padding:10px 8px;width:40px;text-align:center">Qtd</th>
        <th style="padding:10px 12px;width:105px;text-align:right">V.Unit.</th>
        <th style="padding:10px 12px;width:105px;text-align:right">Total</th>
      </tr></thead>
      <tbody>${itens.map((s,i)=>{
        const preco=+(s.preco??s.vunit??0), qtd=+(s.qtd||0);
        return `<tr style="border-bottom:1px solid #e8e6e1;background:${i%2===0?'#faf9f7':'#fff'}">
          <td style="padding:10px 14px">
            <div style="font-weight:700;color:#1c2126;font-size:12.5px">${escapeHtml(s.nome||s.item||'—')}</div>
            ${s.desc?`<div style="font-size:10.5px;color:#6b7068;margin-top:2px;line-height:1.4">${escapeHtml(s.desc)}</div>`:''}
          </td>
          <td style="padding:10px 8px;text-align:center;color:#6b7068;font-size:11px">${escapeHtml(s.un||'')}</td>
          <td style="padding:10px 8px;text-align:center">${qtd}</td>
          <td style="padding:10px 12px;text-align:right;color:#6b7068">${fmt(preco)}</td>
          <td style="padding:10px 12px;text-align:right;font-weight:700;color:#1c2126">${fmt(qtd*preco)}</td>
        </tr>`;}).join('')}
      </tbody>
      <tfoot>
        ${desconto>0?`
        <tr style="background:#f5f3f0"><td colspan="4" style="padding:9px 12px;text-align:right;color:#6b7068;font-weight:600">Subtotal</td><td style="padding:9px 12px;text-align:right;font-weight:700">${fmt(subtotal)}</td></tr>
        <tr style="background:#fef3c7"><td colspan="4" style="padding:9px 12px;text-align:right;color:#92400e;font-weight:600">Desconto (${desconto}%)</td><td style="padding:9px 12px;text-align:right;font-weight:700;color:#92400e">− ${fmt(subtotal*desconto/100)}</td></tr>`:''}
        <tr style="background:#1c2126;color:#fff">
          <td colspan="4" style="padding:11px 14px;text-align:right;font-weight:700;letter-spacing:.3px">TOTAL DA PROPOSTA</td>
          <td style="padding:11px 12px;text-align:right;font-weight:800;font-size:15px;color:#b87333">${fmt(total)}</td>
        </tr>
      </tfoot>
    </table>`;
  } else {
    itensHtml=`<table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead><tr style="background:#1c2126;color:#fff">
        <th style="padding:10px 14px;text-align:left">Item / Serviço</th>
        <th style="padding:10px 8px;width:44px;text-align:center">Un.</th>
        <th style="padding:10px 8px;width:40px;text-align:center">Qtd</th>
        <th style="padding:10px 12px;width:105px;text-align:right">V.Unit.</th>
        <th style="padding:10px 12px;width:105px;text-align:right">Total</th>
      </tr></thead>
      <tbody>${itens.map((x,i)=>{
        const vu=+(x.vunit||x.preco||0), qt=+(x.qtd||0);
        return `<tr style="border-bottom:1px solid #e8e6e1;background:${i%2===0?'#faf9f7':'#fff'}">
          <td style="padding:10px 14px;font-size:12.5px">${escapeHtml(x.item||x.nome||'—')}</td>
          <td style="padding:10px 8px;text-align:center;color:#6b7068;font-size:11px">${escapeHtml(x.un||'')}</td>
          <td style="padding:10px 8px;text-align:center">${qt}</td>
          <td style="padding:10px 12px;text-align:right;color:#6b7068">${fmt(vu)}</td>
          <td style="padding:10px 12px;text-align:right;font-weight:700;color:#1c2126">${fmt(qt*vu)}</td>
        </tr>`;}).join('')}
      </tbody>
      <tfoot>
        <tr style="background:#f5f3f0"><td colspan="4" style="padding:9px 12px;text-align:right;color:#6b7068;font-weight:600">Subtotal (sem BDI)</td><td style="padding:9px 12px;text-align:right;font-weight:700">${fmt(subtotal)}</td></tr>
        <tr style="background:#eef2f5"><td colspan="4" style="padding:9px 12px;text-align:right;color:#4b6880;font-weight:600">BDI (${bdi}%)</td><td style="padding:9px 12px;text-align:right;font-weight:700">+ ${fmt(subtotal*bdi/100)}</td></tr>
        ${desconto>0?`<tr style="background:#fef3c7"><td colspan="4" style="padding:9px 12px;text-align:right;color:#92400e;font-weight:600">Desconto (${desconto}%)</td><td style="padding:9px 12px;text-align:right;font-weight:700;color:#92400e">− ${fmt(subtotal*(1+bdi/100)*desconto/100)}</td></tr>`:''}
        <tr style="background:#1c2126;color:#fff">
          <td colspan="4" style="padding:11px 14px;text-align:right;font-weight:700">TOTAL GERAL</td>
          <td style="padding:11px 12px;text-align:right;font-weight:800;font-size:15px;color:#b87333">${fmt(total)}</td>
        </tr>
      </tfoot>
    </table>`;
  }

  // ── Seção de metodologia ──────────────────────────────────────────
  const metodHtml = p.metodologia ? `
    <div style="margin:18px 0;padding:16px 20px;background:#f0edea;border-radius:10px;border-left:4px solid #2c657a">
      <div style="font-weight:700;font-size:12px;color:#2c657a;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">📋 Metodologia de Trabalho</div>
      <div style="font-size:12.5px;color:#1c2126;line-height:1.65;white-space:pre-line">${escapeHtml(p.metodologia)}</div>
    </div>` : '';

  // ── Página 2 — Fotos + Entregas ───────────────────────────────────
  const fotosPage = fotos.length > 0 ? `
    <div style="page-break-before:always;padding:40px 40px 30px">
      <div style="text-align:center;margin-bottom:28px;border-bottom:2px solid #1c2126;padding-bottom:16px">
        <div style="font-size:20px;font-weight:800;color:#1c2126;letter-spacing:-.5px">Nossos Projetos</div>
        <div style="font-size:12px;color:#6b7068;margin-top:4px">Referências de projetos realizados pela EJHV Engenharia</div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(${fotos.length>4?3:2},1fr);gap:14px;margin-bottom:32px">
        ${fotos.map(f=>`
          <div style="text-align:center">
            <img src="${f.dataUrl}" style="width:100%;height:190px;object-fit:cover;border-radius:8px;border:1px solid #dbd9d4;display:block">
            ${f.legenda?`<div style="font-size:11px;color:#6b7068;margin-top:6px;font-style:italic">${escapeHtml(f.legenda)}</div>`:''}
          </div>`).join('')}
      </div>
      ${_buildEntregasHtml(itens)}
      <div style="margin-top:32px;padding-top:12px;border-top:1px solid #dbd9d4;font-size:10px;color:#94a3b8;display:flex;justify-content:space-between">
        <span>${escapeHtml(rodape)}</span><span>${p.id} — Gerado em ${hoje}</span>
      </div>
    </div>` : '';

  // ── Carta de apresentação ─────────────────────────────────────────
  const nomeCliente = p.cliente ? p.cliente.split('/')[0].trim() : 'Cliente';
  const tipoServico = p.tipo==='projeto' ? 'elaboração dos projetos técnicos' : 'execução dos serviços de engenharia';
  const introHtml = `
    <div style="margin:18px 0 22px;font-size:13px;color:#3a3a38;line-height:1.7">
      <p style="margin:0 0 10px">Prezado(a) <strong>${escapeHtml(nomeCliente)}</strong>,</p>
      <p style="margin:0 0 10px">Agradecemos a oportunidade de apresentar nossa proposta técnica e comercial para ${escapeHtml(p.empreend?`"${p.empreend}"`:tipoServico)}. Com base nas informações fornecidas, elaboramos uma solução que garante segurança técnica, conformidade com as normas vigentes e agilidade na entrega.</p>
      <p style="margin:0">Nossa equipe está comprometida com a qualidade e o prazo estabelecido, mantendo você informado em cada etapa do processo. Estamos à disposição para qualquer esclarecimento.</p>
    </div>`;

  const win=window.open('','_blank');
  if(!win){ showToast('⚠️ Pop-up bloqueado. Permita pop-ups deste site no navegador para gerar o PDF.', 6000); return; }
  try {
    win.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
      <title>Proposta ${p.id} — ${escapeHtml(p.cliente||'')}</title>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'DM Sans',sans-serif;color:#1c2126;background:#fff;font-size:13px}
        .pg1{padding:36px 40px 28px;max-width:840px;margin:0 auto}
        .hdr{background:#1c2126;color:#fff;border-radius:10px;padding:18px 24px;display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:22px}
        .hdr-logo{font-family:'Syne',sans-serif;font-size:21px;font-weight:800;letter-spacing:-.5px}
        .hdr-logo span{color:#b87333}
        .hdr-sub{font-size:11px;opacity:.6;margin-top:3px}
        .hdr-right{text-align:right}
        .hdr-id{font-family:'Syne',sans-serif;font-size:16px;font-weight:800;color:#b87333}
        .hdr-meta{font-size:11px;opacity:.65;margin-top:3px}
        .info-box{display:grid;grid-template-columns:1fr 1fr;gap:10px;background:#f5f3f0;border-radius:10px;padding:16px 20px;margin-bottom:16px}
        .info-cell .lbl{font-size:10px;font-weight:700;color:#6b7068;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px}
        .info-cell .val{font-size:13px;font-weight:600;color:#1c2126}
        .sec-title{font-family:'Syne',sans-serif;font-size:14px;font-weight:800;color:#1c2126;padding:10px 0 8px;border-bottom:2px solid #1c2126;margin-bottom:0;letter-spacing:-.2px}
        .pay-box{background:#f0f9f4;border:1.5px solid #a7f3d0;border-radius:8px;padding:12px 16px;margin-top:16px;font-size:12.5px;display:flex;align-items:center;gap:10px}
        .pay-icon{font-size:22px;flex-shrink:0}
        .val-box{background:#fef9ec;border:1.5px solid #fcd34d;border-radius:8px;padding:11px 16px;margin-top:10px;font-size:12px;color:#78350f}
        .obs-box{background:#f0f6ff;border-radius:8px;padding:12px 16px;font-size:12px;color:#1e3a5f;margin-top:10px;line-height:1.55}
        .assinaturas{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:36px}
        .ass-blk .ass-line{border-top:1.5px solid #1c2126;padding-top:9px;font-size:12px;color:#6b7068;text-align:center}
        .footer{margin-top:22px;padding-top:12px;border-top:1px solid #dbd9d4;font-size:10px;color:#94a3b8;display:flex;justify-content:space-between}
        @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.pg1{padding:24px 28px}}
      </style>
    </head><body>
    <div class="pg1">
      <div class="hdr">
        <div>
          <div class="hdr-logo">EJH<span>V</span> ENGENHARIA</div>
          <div class="hdr-sub">Engenharia Civil • Projetos • Obras<br>CREA/MG • Guaxupé/MG</div>
        </div>
        <div class="hdr-right">
          <div style="font-size:10px;opacity:.65;margin-bottom:4px">Proposta Comercial</div>
          <div class="hdr-id">${p.id}</div>
          <div class="hdr-meta">Data: ${fmtD(p.data)}</div>
        </div>
      </div>

      ${introHtml}

      <div class="info-box">
        <div class="info-cell"><div class="lbl">Cliente</div><div class="val">${escapeHtml(p.cliente||'—')}</div></div>
        <div class="info-cell"><div class="lbl">Empreendimento</div><div class="val">${escapeHtml(p.empreend||'—')}</div></div>
        ${p.area?`<div class="info-cell"><div class="lbl">Área</div><div class="val">${p.area} m²</div></div>`:''}
        ${p.prazo?`<div class="info-cell"><div class="lbl">Prazo de entrega</div><div class="val">${escapeHtml(p.prazo)}</div></div>`:''}
      </div>

      ${metodHtml}

      <div class="sec-title">${p.tipo==='projeto'?'📐 Serviços de Elaboração de Projeto':'🏗 Orçamento de Execução de Obra'}</div>
      ${p.escopo?`<div style="font-size:12.5px;color:#475569;padding:8px 0 6px;font-style:italic">${escapeHtml(p.escopo)}</div>`:''}
      <div style="margin-bottom:2px">${itensHtml}</div>

      ${p.parcela?`<div class="pay-box"><div class="pay-icon">💳</div><div><div style="font-weight:700;color:#064e3b;font-size:13px">Condições de Pagamento</div><div style="margin-top:3px;color:#065f46">${escapeHtml(p.parcela)}</div></div></div>`:''}
      ${p.obs?`<div class="obs-box"><strong>Observações:</strong> ${escapeHtml(p.obs)}</div>`:''}
      ${p.validade?`<div class="val-box">⏰ Esta proposta tem validade de <strong>${p.validade} dias</strong> a partir da data de emissão.</div>`:''}

      <div class="assinaturas">
        <div class="ass-blk"><div style="height:46px"></div><div class="ass-line">EJHV Engenharia<br>${escapeHtml(engNome)}</div></div>
        <div class="ass-blk"><div style="height:46px"></div><div class="ass-line">${escapeHtml(p.cliente||'')}<br>Contratante</div></div>
      </div>

      <div class="footer"><span>${escapeHtml(rodape)} — ${p.id}</span><span>Gerado em ${hoje}</span></div>
    </div>
    ${fotosPage}
    <script>window.onload=()=>window.print()<\/script>
    </body></html>`);
    win.document.close();
  } catch(e) {
    console.error('Erro ao gerar PDF:', e);
    showToast('❌ Erro ao gerar PDF: ' + (e.message||'desconhecido'), 5000);
    try { win.close(); } catch(_){}
  }
}

function _buildEntregasHtml(itens) {
  const ids = itens.map(s => s.id).filter(Boolean);
  const relevantes = Object.entries(ENTREGAS_PROJ).filter(([k]) => ids.includes(k));
  if (!relevantes.length) return '';
  return `
    <div style="border-top:1px solid #dbd9d4;padding-top:24px">
      <div style="font-size:14px;font-weight:800;color:#1c2126;margin-bottom:14px;font-family:'Syne',sans-serif">O que está incluído na proposta</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px">
        ${relevantes.map(([,e]) => `
          <div style="background:#f5f3f0;border-radius:8px;padding:14px 16px">
            <div style="font-weight:700;color:#1c2126;font-size:12.5px;margin-bottom:8px">${escapeHtml(e.titulo)}</div>
            ${e.itens.map(it=>`<div style="display:flex;align-items:flex-start;gap:6px;font-size:11.5px;color:#3a3a38;margin-bottom:4px"><span style="color:#2c657a;font-weight:800;flex-shrink:0">✓</span>${escapeHtml(it)}</div>`).join('')}
          </div>`).join('')}
      </div>
    </div>`;
}

export function compartilharWhatsApp(state, id){
  const p=state.propostas.find(x=>x.id===id); if(!p) return;
  const tipo={projeto:'Elaboração de Projetos',obra:'Orçamento de Obra',completa:'Projeto + Obra'}[p.tipo]||'Proposta';
  const msg=`*EJHV ENGENHARIA — ${tipo}*\n\n`+
    `*Cliente:* ${p.cliente||'—'}\n`+
    `*Empreendimento:* ${p.empreend||'—'}\n`+
    (p.area?`*Área:* ${p.area} m²\n`:'')+
    (p.prazo?`*Prazo:* ${p.prazo}\n`:'')+
    `*Data:* ${fmtD(p.data)}\n\n`+
    `*VALOR TOTAL: ${fmt(p.total||0)}*\n\n`+
    (p.validade?`_Proposta válida por ${p.validade} dias_\n\n`:'')+
    (p.parcela?`*Pagamento:* ${p.parcela}\n`:'')+
    `Para visualizar a proposta completa, solicite o PDF pelo retorno desta mensagem.\n\n`+
    `*EJHV Engenharia* • Guaxupé/MG`;
  const url='https://api.whatsapp.com/send?text='+encodeURIComponent(msg);
  window.open(url,'_blank');
}

export function colherAssinaturaProposta(state, id){
  document.getElementById('sig-cli-med-id').value='PROP-'+id;
  if(window.clearSig) window.clearSig('cli');
  const p=state.propostas.find(x=>x.id===id);
  document.getElementById('sig-cli-nome').value=p?.cliente||'';
  document.getElementById('modal-assinatura-cliente').classList.add('open');
  if(window.initSigPad) setTimeout(()=>window.initSigPad('sig-cli-canvas','sig-cli-wrap','sig-cli-ph','cli'),100);
}

export function importFromOrcamento(state){
  if(window.populateSelects) window.populateSelects();
  const obraId = prompt('Selecione a obra de origem:', state.obras[0]?.id);
  if(!obraId) return;
  const items = state.orc.filter(x => x.obraId === obraId).slice(0, 50);
  window.obraItens=[...items.map(x=>({item:x.item,un:x.un,qtd:x.qtd,vunit:x.vunit}))];
  renderObraItens(); calcPropostaObra(state);
  showToast('✅ Itens importados do orçamento');
}

export function saveCliSig(state){
  const rawId=document.getElementById('sig-cli-med-id').value;
  if(rawId.startsWith('PROP-')){
    const propId=rawId.replace('PROP-','');
    const c=window.sigPads&&window.sigPads['cli']; if(!c)return;
    const ctx=c.getContext('2d');
    const data=ctx.getImageData(0,0,c.width,c.height).data;
    if(!data.some(v=>v!==0)){showToast('⚠️ Assine antes de confirmar.');return;}
    const p=state.propostas.find(x=>x.id===propId);
    if(p){
      p.assinatura={
        dataUrl:c.toDataURL('image/png'),
        nome:document.getElementById('sig-cli-nome').value,
        data:new Date().toLocaleDateString('pt-BR')
      };
    }
    closeModal('modal-assinatura-cliente');
    showToast('✅ Proposta assinada pelo contratante!');
    return true;
  } else {
    if(window._origSaveCliSig) window._origSaveCliSig();
  }
}

export function toggleModoGlobal(state){
  window.modoGlobalProjeto=!window.modoGlobalProjeto;
  const btn=document.getElementById('btn-modo-global');
  if(btn) btn.textContent=window.modoGlobalProjeto?'💰 Modo: Valor Global':'💰 Modo: Por Unidade';
  if(btn) btn.style.background=window.modoGlobalProjeto?'var(--amber)':'#fff';
  if(btn) btn.style.color=window.modoGlobalProjeto?'#fff':'var(--muted)';
  if(btn) btn.style.borderColor=window.modoGlobalProjeto?'var(--amber)':'var(--border)';
  if(window.modoGlobalProjeto){
    window.projServicos.forEach(s=>{ if(s.incluso){ s.un='vb'; s.qtd=1; } });
  }
  renderProjServicos();
  showToast(window.modoGlobalProjeto?'💰 Modo Valor Global — defina o preço total de cada serviço':'📐 Modo Por Unidade — quantidade × preço unitário');
}

export function renderPropostas(state){
  const lista=document.getElementById('list-propostas');
  if(!lista) return;
  if(!Array.isArray(state.propostas)) state.propostas=[];
  if(!state.propostas.length){
    lista.innerHTML=`<div style="background:var(--card);border-radius:var(--radius);padding:40px;text-align:center;box-shadow:var(--shadow)">
      <div style="font-size:48px;margin-bottom:12px">📝</div>
      <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:700;color:var(--navy);margin-bottom:6px">Nenhuma proposta ainda</div>
      <div style="font-size:13px;color:var(--muted)">Use os botões acima para criar</div>
    </div>`;
    return;
  }
  lista.innerHTML=[...state.propostas].reverse().map(p=>{
    const tipos={projeto:'📐 Projetos',obra:'🏗 Obra',completa:'📦 Projeto+Obra'};
    const isTipo=tipos[p.tipo]||p.tipo;
    const cor={projeto:'#0d9488',obra:'#2563eb',completa:'#7c3aed'}[p.tipo]||'#2563eb';
    const temAssinatura=!!(p.assinatura&&p.assinatura.dataUrl);
    const st = PROP_STATUS[p.status] || PROP_STATUS.em_negociacao;
    const statusAtual = p.status || 'em_negociacao';
    const itensTop=(p.itens||[]).filter(s=>s.incluso!==false&&(s.nome||s.item)).slice(0,4)
      .map(s=>`<span style="background:#f1f5f9;padding:2px 8px;border-radius:12px;font-size:11px;color:#475569">${(s.nome||s.item||'').substring(0,30)}</span>`).join(' ');
    const pickerHtml = Object.entries(PROP_STATUS).map(([k,v])=>
      `<button onclick="atualizarStatusProposta('${p.id}','${k}')" style="display:block;width:100%;text-align:left;padding:8px 12px;border:none;background:${k===statusAtual?v.bg:'transparent'};color:${v.color};font-size:12.5px;font-weight:600;border-radius:8px;cursor:pointer;margin:2px 0">${v.icon} ${v.label}</button>`
    ).join('');
    return `<div style="background:var(--card);border-radius:var(--radius);box-shadow:var(--shadow);margin-bottom:14px;overflow:visible;border-left:4px solid ${cor}">
      <div style="padding:14px 18px;border-bottom:1px solid var(--border)">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">
          <div style="flex:1;min-width:200px">
            <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:var(--navy)">${p.empreend||p.cliente||'Sem título'}</div>
            <div style="font-size:12px;color:var(--muted);margin-top:2px;display:flex;gap:10px;flex-wrap:wrap;align-items:center">
              <span>👤 ${p.cliente||'—'}</span>
              <span>📅 ${fmtD(p.data)}</span>
              ${p.area?`<span>📐 ${p.area} m²</span>`:''}
              ${p.parcela?`<span>💳 ${p.parcela}</span>`:''}
              ${p.prazo?`<span>⏱ ${p.prazo}</span>`:''}
              <span style="background:${cor}22;color:${cor};padding:1px 8px;border-radius:12px;font-size:11px;font-weight:700">${isTipo}</span>
              <span style="background:${st.bg};color:${st.color};padding:1px 9px;border-radius:12px;font-size:11px;font-weight:700">${st.icon} ${st.label}</span>
              ${p.obraId?`<span style="background:#f0fdf4;color:#166534;border:1px solid #bbf7d0;padding:1px 8px;border-radius:12px;font-size:11px;font-weight:700">🏗 ${p.obraId}</span>`:''}
              ${temAssinatura?'<span style="color:var(--green);font-weight:600">✅ Assinada</span>':''}
            </div>
            ${itensTop?`<div style="margin-top:7px;display:flex;gap:5px;flex-wrap:wrap">${itensTop}</div>`:''}
          </div>
          <div style="text-align:right">
            <div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:var(--navy)">${fmt(p.total||0)}</div>
            ${p.desconto>0?`<div style="font-size:11px;color:var(--muted)">Desc: ${p.desconto}%</div>`:''}
          </div>
        </div>
      </div>
      <div style="padding:10px 18px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;background:#fafbff;position:relative">
        <div style="position:relative;flex-shrink:0">
          <button data-status-toggle="${p.id}" onclick="toggleStatusPickerProp('${p.id}')" class="btn btn-sm" style="background:${st.bg};color:${st.color};border:1.5px solid ${st.color}40;font-weight:700;white-space:nowrap">${st.icon} ${st.label} ▾</button>
          <div id="status-picker-${p.id}" style="display:none;position:absolute;bottom:calc(100% + 4px);left:0;z-index:300;background:#fff;border:1.5px solid var(--border);border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,0.18);padding:6px;min-width:175px">${pickerHtml}</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="printProposta('${p.id}')">🖨 Imprimir</button>
        <button class="btn btn-outline btn-sm" onclick="compartilharWhatsApp('${p.id}')" style="color:#25d366;border-color:#25d366">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="#25d366" style="vertical-align:middle;margin-right:3px"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>WhatsApp
        </button>
        <button class="btn btn-outline btn-sm" onclick="colherAssinaturaProposta('${p.id}')" style="${temAssinatura?'color:var(--green);border-color:var(--green)':'color:var(--purple);border-color:var(--purple)'}">
          ✍️ ${temAssinatura?'Ver Assinatura':'Assinar'}
        </button>
        <button class="btn btn-outline btn-sm" onclick="editProposta('${p.id}')" style="color:var(--blue);border-color:var(--blue)">
          ✏️ Editar
        </button>
        <button class="btn btn-outline btn-xs" style="color:var(--red);border-color:var(--red);margin-left:auto" onclick="delProposta('${p.id}')">🗑 Excluir</button>
      </div>
    </div>`;
  }).join('');
}

export function atualizarLinhaObra(i){
  const el=document.getElementById('po-tot-'+i);
  const sub=document.getElementById('po-sub-inline');
  const x=window.obraItens[i];
  if(el) el.textContent=fmt((x.qtd||0)*(x.vunit||0));
  if(sub) sub.textContent=fmt(window.obraItens.reduce((a,v)=>a+(v.qtd||0)*(v.vunit||0),0));
}

window.atualizarLinhaObra = atualizarLinhaObra;

// ── Status & Auto-Criação de Obra ────────────────────────────────────
export function atualizarStatusProposta(state, id, novoStatus) {
  if (!PROP_STATUS[novoStatus]) return false;
  const idx = state.propostas.findIndex(x => x.id === id);
  if (idx < 0) return false;
  const p = state.propostas[idx];
  const jaFechado = p.status === 'fechado';
  p.status = novoStatus;
  document.querySelectorAll('[id^="status-picker-"]').forEach(el => el.style.display = 'none');
  if (novoStatus === 'fechado' && !jaFechado && !p.obraId) {
    if (confirm(`🎉 Proposta ${id} FECHADA!\nDeseja criar a obra/projeto automaticamente no sistema?`)) {
      gerarObraDeProposta(state, id);
    }
  }
  return true;
}

export function gerarObraDeProposta(state, propostaId) {
  const p = state.propostas.find(x => x.id === propostaId);
  if (!p) { showToast('⚠️ Proposta não encontrada'); return null; }
  if (p.obraId) { showToast('⚠️ Esta proposta já gerou ' + p.obraId); return p.obraId; }
  if (!Array.isArray(state.obras)) state.obras = [];
  if (!state.counters) state.counters = {};
  if (!state.counters.obra) state.counters.obra = 1;
  const obraId = 'OBR-' + pad(state.counters.obra);
  const tipoObra = p.tipo === 'projeto' ? 'projeto' : 'obra';
  state.obras.push({
    id: obraId,
    nome: p.empreend || p.cliente || 'Nova Obra',
    cliente: p.cliente || '',
    cliTel: '', cliEmail: '', cliDoc: '',
    area: +p.area || 0,
    tipo: tipoObra,
    contrato: +p.total || 0,
    status: 'Em andamento',
    propostaId: propostaId,
    inicio: new Date().toISOString().split('T')[0],
    fim: '', endereco: '', rt: '', crea: '',
    modalidade: 'privada',
    numcontrato: '', periodicidade: '', diamed: 0, obscontrato: '',
    ultimaMedicao: '', proximaMedicao: '',
  });
  state.counters.obra++;
  p.obraId = obraId;
  const labelTipo = tipoObra === 'projeto' ? 'Projeto' : 'Obra';
  showToast(`✅ ${labelTipo} ${obraId} criado(a) a partir de ${propostaId}!`, 4000);
  return obraId;
}
