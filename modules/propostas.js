// modules/propostas.js
import { fmt, fmtD, pad, safeInner, safeText, showToast, openModal, closeModal, statusBadge } from '../utils.js';

window.projServicos = window.projServicos || [];
window.projExtras = window.projExtras || [];
window.obraItens = window.obraItens || [];
window.modoGlobalProjeto = window.modoGlobalProjeto || false;

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
];

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
        ...window.projServicos.filter(s=>s.incluso&&s.qtd>0),
        ...(window.projExtras||[]).filter(s=>s.qtd>0&&s.preco>0).map(s=>({...s,nome:s.nome||'Serviço extra',id:'EXT'}))
      ];
      const subtotal=itens.reduce((a,s)=>a+s.qtd*s.preco,0);
      proposta={...proposta,
        cliente:document.getElementById('f-pp-cliente').value||'',
        empreend:document.getElementById('f-pp-empreend').value||'',
        area, prazo:document.getElementById('f-pp-prazo').value||'',
        validade:document.getElementById('f-pp-val').value||'30',
        obs:document.getElementById('f-pp-obs').value||'',
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
        bdi, desconto:desc, subtotal:sub,
        total:sub*(1+bdi/100)*(1-desc/100),
        itens:[...window.obraItens], data:document.getElementById('f-po-data').value||new Date().toISOString().split('T')[0],
      };
      closeModal('modal-proposta-obra');
    }
  }catch(e){ showToast('⚠️ Erro: '+e.message); console.error(e); return false; }
  
  const editId = tipo === 'projeto' ? document.getElementById('f-pp-id')?.value : document.getElementById('f-po-id')?.value;
  
  if (editId) {
    const idx = state.propostas.findIndex(x => x.id === editId);
    if (idx !== -1) {
      state.propostas[idx] = { ...state.propostas[idx], ...proposta };
      showToast('✅ Proposta atualizada!');
    }
  } else {
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
    
    window.obraItens = [...(p.itens || [])];
    renderObraItens();
    calcPropostaObra(state);
    openModal('modal-proposta-obra');
  }
}

export function printProposta(state, id){
  const p=state.propostas.find(x=>x.id===id); if(!p) return;
  const hoje=new Date().toLocaleDateString('pt-BR');
  let itensHtml='';
  if(p.tipo==='projeto'){
    itensHtml=`<table style="width:100%;border-collapse:collapse;font-size:12.5px;margin-top:14px">
      <thead><tr style="background:#0f2744;color:#fff">
        <th style="padding:9px 13px;text-align:left">Serviço de Projeto</th>
        <th style="padding:9px 13px">Un.</th><th style="padding:9px 13px">Qtd</th>
        <th style="padding:9px 13px">V.Unit.</th><th style="padding:9px 13px">Total</th>
      </tr></thead>
      <tbody>${(p.itens||[]).map((s,i)=>`<tr style="background:${i%2===0?'#f8faff':'#fff'};border-bottom:1px solid #e2e8f0">
        <td style="padding:9px 13px"><b>${s.nome||s.item}</b><br><span style="font-size:11px;color:#64748b">${s.desc||''}</span></td>
        <td style="padding:9px 13px;text-align:center">${s.un}</td>
        <td style="padding:9px 13px;text-align:center">${s.qtd}</td>
        <td style="padding:9px 13px;text-align:right">${fmt(s.preco||s.vunit||0)}</td>
        <td style="padding:9px 13px;text-align:right;font-weight:700">${fmt(s.qtd*(s.preco||s.vunit||0))}</td>
      </tr>`).join('')}</tbody>
      <tfoot><tr style="background:#0f2744;color:#fff;font-weight:700">
        ${p.desconto>0?`<td colspan="4" style="padding:9px 13px;text-align:right">Subtotal</td><td style="padding:9px 13px;text-align:right">${fmt(p.subtotal)}</td></tr>
        <tr style="background:#1a3c5e;color:#fff;font-weight:700"><td colspan="4" style="padding:9px 13px;text-align:right">Desconto (${p.desconto}%)</td><td style="padding:9px 13px;text-align:right">- ${fmt(p.subtotal*p.desconto/100)}</td></tr>
        <tr style="background:#0f2744;color:#fff;font-weight:800;font-size:14px">`:''}
        <td colspan="4" style="padding:9px 13px;text-align:right">TOTAL DA PROPOSTA</td>
        <td style="padding:9px 13px;text-align:right">${fmt(p.total)}</td>
      </tr></tfoot>
    </table>`;
  } else {
    itensHtml=`<table style="width:100%;border-collapse:collapse;font-size:12.5px;margin-top:14px">
      <thead><tr style="background:#0f2744;color:#fff">
        <th style="padding:9px 13px;text-align:left">Item / Serviço</th>
        <th style="padding:9px 13px">Un.</th><th style="padding:9px 13px">Qtd</th>
        <th style="padding:9px 13px">V.Unit.</th><th style="padding:9px 13px">Total</th>
      </tr></thead>
      <tbody>${(p.itens||[]).map((x,i)=>`<tr style="background:${i%2===0?'#f8faff':'#fff'};border-bottom:1px solid #e2e8f0">
        <td style="padding:9px 13px">${x.item}</td>
        <td style="padding:9px 13px;text-align:center">${x.un}</td>
        <td style="padding:9px 13px;text-align:center">${x.qtd}</td>
        <td style="padding:9px 13px;text-align:right">${fmt(x.vunit)}</td>
        <td style="padding:9px 13px;text-align:right;font-weight:700">${fmt(x.qtd*x.vunit)}</td>
      </tr>`).join('')}</tbody>
      <tfoot>
        <tr style="background:#f8faff;font-weight:700"><td colspan="4" style="padding:9px 13px;text-align:right">Subtotal (sem BDI)</td><td style="padding:9px 13px;text-align:right">${fmt(p.subtotal)}</td></tr>
        <tr style="background:#f0f4fa;font-weight:700"><td colspan="4" style="padding:9px 13px;text-align:right">BDI (${p.bdi}%)</td><td style="padding:9px 13px;text-align:right">+ ${fmt(p.subtotal*p.bdi/100)}</td></tr>
        ${p.desconto>0?`<tr style="background:#fff3cd;font-weight:700"><td colspan="4" style="padding:9px 13px;text-align:right">Desconto (${p.desconto}%)</td><td style="padding:9px 13px;text-align:right">- ${fmt(p.subtotal*(1+p.bdi/100)*p.desconto/100)}</td></tr>`:''}
        <tr style="background:#0f2744;color:#fff;font-weight:800;font-size:14px"><td colspan="4" style="padding:9px 13px;text-align:right">TOTAL GERAL</td><td style="padding:9px 13px;text-align:right">${fmt(p.total)}</td></tr>
      </tfoot>
    </table>`;
  }

  const win=window.open('','_blank');
  win.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
    <title>Proposta ${p.id} — ${p.cliente}</title>
    <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
      body{font-family:'DM Sans',sans-serif;padding:40px;max-width:820px;margin:0 auto;color:#1e293b}
      .hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #0f2744;padding-bottom:18px;margin-bottom:24px}
      .logo{font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#0f2744}
      .logo-sub{font-size:12px;color:#64748b;margin-top:2px}
      .info-box{background:#f8faff;border-radius:10px;padding:16px 20px;margin-bottom:20px;display:grid;grid-template-columns:1fr 1fr;gap:10px}
      .info-row{font-size:13px}
      .info-label{color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.4px}
      .validade-box{background:#fef3c7;border-radius:8px;padding:10px 16px;font-size:12.5px;color:#92400e;margin-top:16px}
      .assinaturas{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:40px}
      .ass-line{border-top:1.5px solid #0f2744;padding-top:8px;font-size:12px;color:#64748b;text-align:center}
      .footer{margin-top:28px;padding-top:14px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;display:flex;justify-content:space-between}
      @media print{body{padding:20px}}
    </style></head>
    <body>
    <div class="hdr">
      <div><div class="logo">EJH ENGENHARIA</div>
        <div class="logo-sub">Engenharia Civil • Projetos • Obras<br>CREA/MG • Guaxupé/MG</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:11px;color:#64748b">Proposta Comercial</div>
        <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:#0f2744">${p.id}</div>
        <div style="font-size:12px;color:#64748b">Data: ${fmtD(p.data)}</div>
      </div>
    </div>

    <div class="info-box">
      <div><div class="info-label">Cliente</div><div class="info-row" style="font-weight:600">${p.cliente}</div></div>
      <div><div class="info-label">Empreendimento</div><div class="info-row">${p.empreend}</div></div>
      ${p.area?`<div><div class="info-label">Área</div><div class="info-row">${p.area} m²</div></div>`:''}
      ${p.prazo?`<div><div class="info-label">Prazo</div><div class="info-row">${p.prazo}</div></div>`:''}
      ${p.parcela?`<div><div class="info-label">Pagamento</div><div class="info-row" style="font-weight:600">${p.parcela}</div></div>`:''}
      ${p.validade?`<div><div class="info-label">Validade</div><div class="info-row">${p.validade} dias</div></div>`:''}
    </div>

    <div style="font-family:'Syne',sans-serif;font-size:15px;font-weight:700;color:#0f2744;margin-bottom:6px">
      ${p.tipo==='projeto'?'📐 Serviços de Elaboração de Projeto':'🏗 Orçamento de Obra'} — Escopo e Valores
    </div>
    ${p.escopo||p.obs?`<div style="font-size:13px;color:#475569;margin-bottom:10px;font-style:italic">${p.escopo||p.obs}</div>`:''}
    ${itensHtml}

    ${p.obs&&p.tipo==='projeto'?`<div style="margin-top:16px;padding:12px 16px;background:#f0f9ff;border-radius:8px;font-size:12.5px;color:#1e40af"><b>Observações:</b> ${p.obs}</div>`:''}

    ${p.validade?`<div class="validade-box">⏰ Esta proposta tem validade de <b>${p.validade} dias</b> a partir da data de emissão.</div>`:''}

    <div class="assinaturas">
      <div><div style="height:48px"></div><div class="ass-line">EJH Engenharia<br>Engenheiro Responsável</div></div>
      <div><div style="height:48px"></div><div class="ass-line">${p.cliente}<br>Contratante</div></div>
    </div>

    <div class="footer"><span>${state.relatorioRodape || 'EJH Engenharia'} — ${p.id}</span><span>Gerado em ${hoje}</span></div>
    <script>window.onload=()=>window.print()<\/script>
    </body></html>`);
  win.document.close();
}

export function compartilharWhatsApp(state, id){
  const p=state.propostas.find(x=>x.id===id); if(!p) return;
  const tipo={projeto:'Elaboração de Projetos',obra:'Orçamento de Obra',completa:'Projeto + Obra'}[p.tipo]||'Proposta';
  const msg=`*EJH ENGENHARIA — ${tipo}*\n\n`+
    `*Cliente:* ${p.cliente||'—'}\n`+
    `*Empreendimento:* ${p.empreend||'—'}\n`+
    (p.area?`*Área:* ${p.area} m²\n`:'')+
    (p.prazo?`*Prazo:* ${p.prazo}\n`:'')+
    `*Data:* ${fmtD(p.data)}\n\n`+
    `*VALOR TOTAL: ${fmt(p.total||0)}*\n\n`+
    (p.validade?`_Proposta válida por ${p.validade} dias_\n\n`:'')+
    (p.parcela?`*Pagamento:* ${p.parcela}\n`:'')+
    `Para visualizar a proposta completa, solicite o PDF pelo retorno desta mensagem.\n\n`+
    `*EJH Engenharia* • Guaxupé/MG`;
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
    const itensTop=(p.itens||[]).filter(s=>s.incluso!==false&&(s.nome||s.item)).slice(0,4)
      .map(s=>`<span style="background:#f1f5f9;padding:2px 8px;border-radius:12px;font-size:11px;color:#475569">${(s.nome||s.item||'').substring(0,30)}</span>`).join(' ');
    return `<div style="background:var(--card);border-radius:var(--radius);box-shadow:var(--shadow);margin-bottom:14px;overflow:hidden;border-left:4px solid ${cor}">
      <div style="padding:14px 18px;border-bottom:1px solid var(--border)">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">
          <div style="flex:1;min-width:200px">
            <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:var(--navy)">${p.empreend||p.cliente||'Sem título'}</div>
            <div style="font-size:12px;color:var(--muted);margin-top:2px;display:flex;gap:10px;flex-wrap:wrap">
              <span>👤 ${p.cliente||'—'}</span>
              <span>📅 ${fmtD(p.data)}</span>
              ${p.area?`<span>📐 ${p.area} m²</span>`:''}
              ${p.parcela?`<span>💳 ${p.parcela}</span>`:''}
              ${p.prazo?`<span>⏱ ${p.prazo}</span>`:''}
              <span style="background:${cor}22;color:${cor};padding:1px 8px;border-radius:12px;font-size:11px;font-weight:700">${isTipo}</span>
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
      <div style="padding:10px 18px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;background:#fafbff">
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
