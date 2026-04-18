// modules/sinapi.js
import { fmt, fmtD, pad, safeInner, safeText, showToast, openModal, closeModal, statusBadge } from '../utils.js';


const SINAPI = [
  // Serviços preliminares
  {cod:"73798",cat:"Serviços Preliminares",desc:"Mobilização e desmobilização de canteiro",un:"vb",preco:3200.00},
  {cod:"73800",cat:"Serviços Preliminares",desc:"Tapume em chapa compensada e=10mm",un:"m²",preco:48.50},
  {cod:"74209",cat:"Serviços Preliminares",desc:"Locação de obra — edificação",un:"m²",preco:5.20},
  // Fundações
  {cod:"94966",cat:"Fundações",desc:"Estaca hélice contínua, D=30cm, fck=25MPa",un:"m",preco:98.40},
  {cod:"97632",cat:"Fundações",desc:"Sapata isolada em concreto armado fck=20MPa",un:"m³",preco:892.00},
  {cod:"96512",cat:"Fundações",desc:"Bloco sobre estacas, concreto fck=25MPa",un:"m³",preco:945.00},
  {cod:"73824",cat:"Fundações",desc:"Escavação manual de valas até 1,5m",un:"m³",preco:42.80},
  {cod:"73826",cat:"Fundações",desc:"Escavação mecânica de valas",un:"m³",preco:18.60},
  // Estrutura
  {cod:"94990",cat:"Estrutura",desc:"Concreto estrutural fck=25MPa, bombeado",un:"m³",preco:520.00},
  {cod:"94991",cat:"Estrutura",desc:"Concreto estrutural fck=30MPa, bombeado",un:"m³",preco:565.00},
  {cod:"94407",cat:"Estrutura",desc:"Armação de estruturas — CA-50/CA-60",un:"kg",preco:14.80},
  {cod:"94408",cat:"Estrutura",desc:"Fôrma de madeira compensada resinada 12mm",un:"m²",preco:68.50},
  {cod:"92780",cat:"Estrutura",desc:"Laje pré-moldada h=12cm (sobrecarga 200kg/m²)",un:"m²",preco:112.00},
  // Alvenaria
  {cod:"87435",cat:"Alvenaria",desc:"Alvenaria bloco cerâmico 14x19x29cm",un:"m²",preco:85.00},
  {cod:"87436",cat:"Alvenaria",desc:"Alvenaria bloco concreto 14x19x39cm",un:"m²",preco:78.50},
  {cod:"87530",cat:"Alvenaria",desc:"Alvenaria bloco cerâmico 09x19x29cm",un:"m²",preco:72.00},
  // Cobertura
  {cod:"91006",cat:"Cobertura",desc:"Telhamento cerâmico tipo capa-canal",un:"m²",preco:145.00},
  {cod:"91010",cat:"Cobertura",desc:"Telhamento fibrocimento ondulado e=6mm",un:"m²",preco:68.00},
  {cod:"91027",cat:"Cobertura",desc:"Estrutura de madeira para cobertura",un:"m²",preco:92.00},
  {cod:"91030",cat:"Cobertura",desc:"Calha em chapa de aço galvanizado",un:"m",preco:38.50},
  // Revestimentos
  {cod:"87251",cat:"Revestimentos",desc:"Reboco paulista (chapisco + emboço + reboco)",un:"m²",preco:42.00},
  {cod:"87279",cat:"Revestimentos",desc:"Cerâmica esmaltada 30x30cm, assentamento",un:"m²",preco:62.00},
  {cod:"87284",cat:"Revestimentos",desc:"Porcelanato 60x60cm, assentamento",un:"m²",preco:95.00},
  {cod:"88309",cat:"Revestimentos",desc:"Gesso liso em paredes internas",un:"m²",preco:28.50},
  // Instalações
  {cod:"89725",cat:"Instalações",desc:"Instalação hidráulica ponto (água fria)",un:"pt",preco:285.00},
  {cod:"89726",cat:"Instalações",desc:"Instalação elétrica ponto (tomada/interruptor)",un:"pt",preco:195.00},
  {cod:"89843",cat:"Instalações",desc:"Tubo PVC rígido 50mm, esgoto predial",un:"m",preco:38.00},
  // Estrutura metálica
  {cod:"92545",cat:"Estrutura Metálica",desc:"Estrutura metálica — perfil I/H, galpão",un:"kg",preco:12.50},
  {cod:"92546",cat:"Estrutura Metálica",desc:"Telha metálica trapezoidal e=0,5mm",un:"m²",preco:58.00},
  {cod:"92553",cat:"Estrutura Metálica",desc:"Painel sandwich para fechamento lateral",un:"m²",preco:148.00},
  // Demolição
  {cod:"73859",cat:"Demolição",desc:"Demolição de alvenaria com reaproveitamento",un:"m³",preco:32.00},
  {cod:"73861",cat:"Demolição",desc:"Remoção e carga de entulho",un:"m³",preco:28.50},
];

const SINAPI_CATS = [...new Set(SINAPI.map(x=>x.cat))];

const SICOR = [
  // Serviços preliminares
  {cod:"S001",cat:"Serviços Preliminares",desc:"Limpeza e preparo do terreno",un:"m²",preco:4.80,fonte:"SICOR-MG"},
  {cod:"S002",cat:"Serviços Preliminares",desc:"Locação de obra (mão de obra)",un:"m²",preco:2.90,fonte:"SICOR-MG"},
  {cod:"S003",cat:"Serviços Preliminares",desc:"Instalação de canteiro de obras",un:"vb",preco:2800.00,fonte:"SICOR-MG"},
  // Fundações
  {cod:"S010",cat:"Fundações",desc:"Escavação e execução de sapatas (M.O.)",un:"m³",preco:95.00,fonte:"SICOR-MG"},
  {cod:"S011",cat:"Fundações",desc:"Execução de blocos e baldrames (M.O.)",un:"m³",preco:110.00,fonte:"SICOR-MG"},
  {cod:"S012",cat:"Fundações",desc:"Armação de fundações — M.O. (CA-50/60)",un:"kg",preco:4.20,fonte:"SICOR-MG"},
  {cod:"S013",cat:"Fundações",desc:"Forma e concretagem de fundações (M.O.)",un:"m³",preco:220.00,fonte:"SICOR-MG"},
  // Estrutura
  {cod:"S020",cat:"Estrutura",desc:"Armação de pilares/vigas (M.O.)",un:"kg",preco:4.50,fonte:"SICOR-MG"},
  {cod:"S021",cat:"Estrutura",desc:"Forma e desforma de estrutura (M.O.)",un:"m²",preco:38.00,fonte:"SICOR-MG"},
  {cod:"S022",cat:"Estrutura",desc:"Concretagem de laje com bomba (M.O.)",un:"m³",preco:95.00,fonte:"SICOR-MG"},
  {cod:"S023",cat:"Estrutura",desc:"Montagem de laje pré-moldada (M.O.)",un:"m²",preco:28.00,fonte:"SICOR-MG"},
  {cod:"S024",cat:"Estrutura",desc:"Estrutura metálica — montagem (M.O.)",un:"kg",preco:3.80,fonte:"SICOR-MG"},
  // Alvenaria
  {cod:"S030",cat:"Alvenaria",desc:"Alvenaria blocos cerâmicos 14cm (M.O.)",un:"m²",preco:32.00,fonte:"SICOR-MG"},
  {cod:"S031",cat:"Alvenaria",desc:"Alvenaria blocos de concreto (M.O.)",un:"m²",preco:28.00,fonte:"SICOR-MG"},
  {cod:"S032",cat:"Alvenaria",desc:"Vergas e contravergas (M.O.)",un:"m",preco:18.50,fonte:"SICOR-MG"},
  // Cobertura
  {cod:"S040",cat:"Cobertura",desc:"Telhamento cerâmico capa-canal (M.O.)",un:"m²",preco:38.00,fonte:"SICOR-MG"},
  {cod:"S041",cat:"Cobertura",desc:"Estrutura de madeira para telhado (M.O.)",un:"m²",preco:42.00,fonte:"SICOR-MG"},
  {cod:"S042",cat:"Cobertura",desc:"Telhamento fibrocimento (M.O.)",un:"m²",preco:22.00,fonte:"SICOR-MG"},
  {cod:"S043",cat:"Cobertura",desc:"Calhas e rufos — instalação (M.O.)",un:"m",preco:18.00,fonte:"SICOR-MG"},
  // Revestimentos
  {cod:"S050",cat:"Revestimentos",desc:"Chapisco, emboço e reboco (M.O.)",un:"m²",preco:28.00,fonte:"SICOR-MG"},
  {cod:"S051",cat:"Revestimentos",desc:"Assentamento de cerâmica (M.O.)",un:"m²",preco:32.00,fonte:"SICOR-MG"},
  {cod:"S052",cat:"Revestimentos",desc:"Assentamento porcelanato (M.O.)",un:"m²",preco:42.00,fonte:"SICOR-MG"},
  {cod:"S053",cat:"Revestimentos",desc:"Aplicação de gesso liso (M.O.)",un:"m²",preco:22.00,fonte:"SICOR-MG"},
  {cod:"S054",cat:"Revestimentos",desc:"Contrapiso (M.O.)",un:"m²",preco:18.00,fonte:"SICOR-MG"},
  // Instalações
  {cod:"S060",cat:"Instalações",desc:"Instalação hidráulica por ponto (M.O.)",un:"pt",preco:120.00,fonte:"SICOR-MG"},
  {cod:"S061",cat:"Instalações",desc:"Instalação elétrica por ponto (M.O.)",un:"pt",preco:95.00,fonte:"SICOR-MG"},
  {cod:"S062",cat:"Instalações",desc:"Esgoto e águas pluviais (M.O.)",un:"m",preco:22.00,fonte:"SICOR-MG"},
  // Esquadrias / acabamentos
  {cod:"S070",cat:"Acabamentos",desc:"Colocação de esquadrias (M.O.)",un:"m²",preco:48.00,fonte:"SICOR-MG"},
  {cod:"S071",cat:"Acabamentos",desc:"Pintura interna 2 demãos (M.O.)",un:"m²",preco:14.00,fonte:"SICOR-MG"},
  {cod:"S072",cat:"Acabamentos",desc:"Pintura externa (M.O.)",un:"m²",preco:18.00,fonte:"SICOR-MG"},
  {cod:"S073",cat:"Acabamentos",desc:"Louças e metais sanitários (M.O.)",un:"pt",preco:85.00,fonte:"SICOR-MG"},
];

const PRECO_PROJETOS = [
  {id:"ARQ", nome:"Projeto Arquitetônico",           un:"m²",  preco:35.00,  desc:"Planta baixa, cortes, fachadas, perspectiva, memoriais e aprovação"},
  {id:"EST", nome:"Projeto Estrutural",               un:"m²",  preco:28.00,  desc:"Cálculo estrutural, detalhamento de armaduras, formas e locação — com ART"},
  {id:"HID", nome:"Projeto Hidrossanitário",          un:"m²",  preco:12.00,  desc:"Projeto de água fria/quente, esgoto sanitário e águas pluviais — com ART"},
  {id:"ELE", nome:"Projeto Elétrico",                un:"m²",  preco:14.00,  desc:"Instalações elétricas residenciais/comerciais e quadro de cargas — com ART"},
  {id:"PREV",nome:"PPCI / Incêndio",                 un:"m²",  preco:8.00,   desc:"Projeto de prevenção e combate a incêndio conforme normas do CBMMG"},
  {id:"AR2", nome:"Regularização / Prefeitura",      un:"vb",  preco:1800.00,desc:"Processo administrativo de regularização e obtenção de Habite-se"},
  {id:"TOP", nome:"Topografia",                      un:"vb",  preco:2200.00,desc:"Levantamento planialtimétrico georreferenciado com locação de divisas"},
  {id:"SOLO",nome:"Sondagem SPT",                    un:"furo",preco:1800.00,desc:"Sondagem a percussão com relatório de resistência (NSTP)"},
  {id:"GER", nome:"Gerenciamento de Obra",            un:"mês", preco:1200.00,desc:"Controle de custos, cronograma, compras e gestão de contratos"},
  {id:"ACO", nome:"Acompanhamento Técnico",           un:"mês", preco:900.00, desc:"Visitas técnicas periódicas para verificação de conformidade do projeto"},
  {id:"VIS", nome:"Vistoria Técnica",                 un:"vb",  preco:800.00, desc:"Vistoria pontual com emissão de relatório técnico fotográfico"},
  {id:"LAU", nome:"Laudo de Engenharia",              un:"vb",  preco:1400.00,desc:"Laudo pericial ou de patologia com diagnóstico e recomendações"},
  {id:"ASB", nome:"Consultoria Técnica",              un:"hr",  preco:280.00, desc:"Assessoria técnica especializada por hora consultada"},
];

export function renderTabelas(state){
  const src = currentTabelaSource;
  const data = src==='sinapi' ? SINAPI : SICOR;
  const cats = ['Todos',...new Set(data.map(x=>x.cat))];
  const filter = state.sinapiCatFilter||'Todos';

  document.getElementById('sinapi-filter').innerHTML = cats.map(c=>`
    <div class="sinapi-tag ${filter===c?'active':''}" onclick="setSinapiCat('${c}')">${c}</div>`).join('');

  // Removemos a filtragem por texto aqui, deixando apenas a filtragem por categoria
  let items=data;
  if(filter!=='Todos') items=items.filter(x=>x.cat===filter);

  document.getElementById('sinapi-list').innerHTML = items.map(s=>`
    <div class="${src==='sinapi'?'sinapi-item':'sicor-item'}" data-txt="${(s.cod+' '+s.desc).toLowerCase()}">
      <span class="${src==='sinapi'?'sinapi-code':'sicor-code'}">${s.cod}</span>
      <span class="${src==='sinapi'?'sinapi-desc':'sicor-desc'}">${s.desc}
        <br><span style="font-size:11px;color:var(--muted)">${s.cat}${src==='sicor'?' — '+s.fonte:''}</span>
      </span>
      <span class="${src==='sinapi'?'sinapi-un':'sicor-un'}">${s.un}</span>
      ${src==='sicor'?`<span class="sicor-region">MG</span>`:''}
      <span class="${src==='sinapi'?'sinapi-price':'sicor-price'}">${fmt(s.preco)}</span>
      <button class="btn btn-primary btn-xs sinapi-add" onclick="selectTabelaItem('${s.cod}','${src}')">+ Usar</button>
    </div>`).join('')||'<div style="padding:20px;color:var(--muted)">Nenhum item encontrado.</div>';
  
  // Aplica o filtro atual de busca
  filterSinapi(document.getElementById('sinapi-search').value||'');
}

export function renderSinapi(state){
  // filter tags
  const cats=['Todos',...SINAPI_CATS];
  document.getElementById('sinapi-filter').innerHTML=cats.map(c=>`
    <div class="sinapi-tag ${state.sinapiCatFilter===c?'active':''}" onclick="setSinapiCat('${c}')">${c}</div>`).join('');

  const q=(document.getElementById('sinapi-search').value||'').toLowerCase();
  let items=SINAPI;
  if(state.sinapiCatFilter!=='Todos') items=items.filter(x=>x.cat===state.sinapiCatFilter);
  if(q) items=items.filter(x=>x.cod.includes(q)||x.desc.toLowerCase().includes(q)||x.un.includes(q));

  document.getElementById('sinapi-list').innerHTML=items.map(s=>`
    <div class="sinapi-item">
      <span class="sinapi-code">${s.cod}</span>
      <span class="sinapi-desc">${s.desc}<br><span style="font-size:11px;color:var(--muted)">${s.cat}</span></span>
      <span class="sinapi-un">${s.un}</span>
      <span class="sinapi-price">${fmt(s.preco)}</span>
      <button class="btn btn-primary btn-xs sinapi-add" onclick="selectSinapi('${s.cod}')">+ Usar</button>
    </div>`).join('')||'<div style="padding:20px;color:var(--muted)">Nenhum item encontrado.</div>';
}

export function filterSinapi(state, q){
  q = q.toLowerCase();
  const els = document.getElementById('sinapi-list').children;
  for(let i=0; i<els.length; i++){
    const el = els[i];
    if(!el.dataset.txt) continue;
    if(!q || el.dataset.txt.includes(q)) el.style.display='';
    else el.style.display='none';
  }
}

export function setSinapiCat(state, c){ state.sinapiCatFilter=c; renderTabelas(); }

export function setTabelaSrc(state, src){
  currentTabelaSource=src;
  state.tabelaSource=src;
  const tSin=document.getElementById('tab-sinapi'); if(tSin) tSin.classList.toggle('active',src==='sinapi');
  const tSic=document.getElementById('tab-sicor'); if(tSic) tSic.classList.toggle('active',src==='sicor');
  renderTabelas();
}

export function selectSinapi(state, cod){ selectTabelaItem(cod,'sinapi'); }

export function selectTabelaItem(state, cod, src){
  const data = src==='sinapi' ? SINAPI : SICOR;
  const s = data.find(x=>x.cod===cod); if(!s) return;
  selectedSinapiItem={...s};
  populateSelects();
  document.getElementById('f-simp-item').value=`[${s.cod}] ${s.desc} — ${s.un} — ${fmt(s.preco)}`;
  openModal('modal-sinapi-import');
  showToast('✅ Item selecionado — defina a quantidade e a obra');
}

export function importSinapi(state){
  if(!selectedSinapiItem){showToast('⚠️ Selecione um item SINAPI');return}
  const s=selectedSinapiItem;
  state.orc.push({id:'ORC-'+pad(state.counters.orc),
    obraId:document.getElementById('f-simp-obra').value,
    item:s.desc,sinapi:s.cod,un:s.un,
    qtd:+document.getElementById('f-simp-qtd').value||1,
    vunit:s.preco,
    real:+document.getElementById('f-simp-real').value||0,
  });
  state.counters.orc++;
  closeModal('modal-sinapi-import');selectedSinapiItem=null;
  return true;showToast('✅ Item SINAPI importado para orçamento!');
}



