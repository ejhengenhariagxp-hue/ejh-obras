// modules/captura.js — Central de Comunicação da Obra
import { fmt, fmtD, pad, safeInner, safeText, showToast, openModal, closeModal, statusBadge } from '../utils.js';
import { iaCall } from '../services.js';

var capResultadoAtual = null;
var capArquivos = [];
var capView = 'hist';
var CAP_TIPOS={
  diario:   {label:'Diário de Obra',    icon:'📋',cor:'#2563eb',bg:'#eff6ff'},
  pendencia:{label:'Pendência',          icon:'⚠️',cor:'#d97706',bg:'#fffbeb'},
  orcamento:{label:'Orçamento',          icon:'💰',cor:'#7c3aed',bg:'#f5f3ff'},
  financeiro:{label:'Financeiro',        icon:'🏦',cor:'#0891b2',bg:'#f0fdfa'},
  medicao:  {label:'Medição',            icon:'📏',cor:'#059669',bg:'#f0fdf4'},
  alteracao:{label:'Alteração Projeto',  icon:'📐',cor:'#dc2626',bg:'#fef2f2'},
  material: {label:'Material',           icon:'🧱',cor:'#ca8a04',bg:'#fefce8'},
  cronograma:{label:'Cronograma',        icon:'📅',cor:'#0ea5e9',bg:'#f0f9ff'},
  geral:    {label:'Anotação Geral',     icon:'📝',cor:'#64748b',bg:'#f8faff'},
};

// ── Parser WhatsApp ──────────────────────────────────────────────────
// Remove timestamps e nomes de remetentes das mensagens coladas
export function capLimparWhatsApp(){
  var ta = document.getElementById('cap-texto');
  if(!ta || !ta.value) return;
  var txt = ta.value;
  // Formato iOS: [07/04/2024, 14:32:15] Nome: mensagem
  // Formato Android: 07/04/2024 14:32 - Nome: mensagem
  var linhas = txt.split(/\r?\n/).map(function(l){
    return l
      .replace(/^\[?\d{1,2}\/\d{1,2}\/\d{2,4},?\s*\d{1,2}:\d{2}(?::\d{2})?\]?\s*(?:-\s*)?[^:]{1,40}:\s*/,'')
      .replace(/^\d{1,2}\/\d{1,2}\/\d{2,4}\s+\d{1,2}:\d{2}\s+-\s+[^:]{1,40}:\s*/,'')
      .replace(/\s*<Mídia oculta>\s*/gi,'')
      .replace(/\s*<Media omitted>\s*/gi,'')
      .replace(/\s*\(arquivo anexado\)\s*/gi,'');
  }).filter(function(l){ return l.trim().length > 0; });
  ta.value = linhas.join('\n');
  showToast('🧹 Formato WhatsApp removido');
}

export function renderCaptura(state){
  var sel=document.getElementById('cap-obra-sel');
  var hist=document.getElementById('cap-hist-filtro');
  if(sel&&sel.options.length<=1){
    state.obras.forEach(function(o){
      [sel,hist].forEach(function(el){
        if(!el)return;
        var opt=document.createElement('option');
        opt.value=o.id;opt.textContent=o.nome;el.appendChild(opt);
      });
    });
  }
  renderHistoricoCaptura(state);
}

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    var reader = new FileReader();
    reader.onload = () => resolve({
      type: file.type.includes('pdf') ? 'document' : 'image',
      media_type: file.type,
      data: reader.result.split(',')[1]
    });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function capProcessarIA(state){
  var texto = document.getElementById('cap-texto')?.value?.trim();
  var obraId = document.getElementById('cap-obra-sel')?.value;
  if(!texto && capArquivos.length === 0){ showToast('⚠️ Cole texto ou anexe arquivos primeiro'); return; }
  
  var btn = document.getElementById('cap-btn-processar');
  var loading = document.getElementById('cap-loading');
  if(btn) btn.disabled = true;
  if(loading) loading.style.display = 'flex';
  document.getElementById('cap-resultado').style.display = 'none';

  try {
    var obra = state.obras.find(function(o){ return o.id === obraId; });
    var obraCtx = obra ? ('Obra: '+obra.nome+' | Cliente: '+obra.cliente+' | Área: '+obra.area+'m²') : 'Obra não selecionada';
    
    var system = 'Você é assistente especializado em gestão de obras no Brasil.\n' +
      'Analise o texto/imagem/PDF (inclusive mensagens de WhatsApp) e identifique registros para o sistema.\n' +
      'Classifique em: diario, pendencia, orcamento, financeiro, medicao, alteracao, material, cronograma, geral.\n' +
      'Um mesmo texto pode gerar MÚLTIPLOS registros (ex: concretagem = diario + pendencia de material).\n' +
      'RESPONDA APENAS com JSON válido:\n' +
      '{"resumo":"resumo curto","registros":[{"tipo":"tipo","titulo":"titulo","descricao":"desc","data":"YYYY-MM-DD ou null","valor":numero_ou_null,"urgente":bool,"confirmar":true}],"sugestoes":["sugestao"]}';

    var userContent = [{ type: 'text', text: 'Contexto: ' + obraCtx + '\n\nConteúdo: ' + (texto || '(Anexo)') }];
    
    // Processar arquivos em paralelo
    var filesData = await Promise.all(capArquivos.map(fileToBase64));
    filesData.forEach(function(f) {
      if (f.type === 'image') {
        userContent.push({ type: 'image', source: { type: 'base64', media_type: f.media_type, data: f.data } });
      } else {
        userContent.push({ type: 'document', source: { type: 'base64', media_type: f.media_type, data: f.data } });
      }
    });

    var raw = await iaCall(system, userContent, 2500);
    var resultado = JSON.parse(raw.replace(/```json|```/g, '').trim());
    
    capResultadoAtual = { ...resultado, obraId: obraId, textoOriginal: texto, ts: Date.now() };
    capRenderResultado(state, resultado, obraId);
  } catch(e) {
    showToast('❌ Erro: ' + e.message);
    console.error('Captura erro:', e);
  } finally {
    if(btn) btn.disabled = false;
    if(loading) loading.style.display = 'none';
  }
}

export function capRenderResultado(state, r,obraId){
  var el=document.getElementById('cap-resultado');
  var cards=document.getElementById('cap-cards');
  if(!el||!cards)return;
  var obra=state.obras.find(function(o){return o.id===obraId;});
  cards.innerHTML='<div style="background:#f0fdf4;border-radius:10px;padding:12px 16px;border-left:3px solid var(--green);margin-bottom:12px">'+
    '<span style="font-weight:700;color:var(--green)">✅ '+r.registros.length+' registro(s) identificado(s)</span>'+
    '<span style="font-size:12.5px;color:#065f46;margin-left:8px">'+r.resumo+'</span></div>'+
    r.registros.map(function(reg,i){
      var tipo=CAP_TIPOS[reg.tipo]||CAP_TIPOS.geral;
      return '<div class="cap-card" id="cap-card-'+i+'" style="border-left-color:'+tipo.cor+'">'+
        '<div class="cap-card-hdr" style="background:'+tipo.bg+'">'+
          '<div style="display:flex;align-items:center;gap:8px">'+
            '<label class="cap-check"><input type="checkbox" id="cap-ck-'+i+'" '+(reg.confirmar?'checked':'')+
              ' onchange="capToggleCard('+i+',this.checked)">'+
            '<span style="font-size:16px">'+tipo.icon+'</span></label>'+
            '<span class="cap-tag" style="background:'+tipo.cor+'20;color:'+tipo.cor+'">'+tipo.label+'</span>'+
            (reg.urgente?'<span style="background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:8px;font-size:10px;font-weight:800">⚡ URGENTE</span>':'')+
          '</div>'+
          '<span style="font-size:11px;color:'+tipo.cor+';font-weight:700">'+(obra?obra.nome:'—')+'</span>'+
        '</div>'+
        '<div class="cap-card-body">'+
          '<div class="cap-card-field"><label>Título</label><input value="'+reg.titulo+'" id="cap-f-titulo-'+i+'"></div>'+
          '<div class="cap-card-field"><label>Descrição</label><textarea id="cap-f-desc-'+i+'">'+reg.descricao+'</textarea></div>'+
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'+
            '<div class="cap-card-field"><label>Data</label><input type="date" id="cap-f-data-'+i+'" value="'+(reg.data||new Date().toISOString().split('T')[0])+'"></div>'+
            (reg.valor!==null&&reg.valor!==undefined?'<div class="cap-card-field"><label>Valor R$</label><input type="number" id="cap-f-valor-'+i+'" value="'+(reg.valor||0)+'"></div>':'<div></div>')+
          '</div>'+
        '</div>'+
      '</div>';
    }).join('')+
    (r.sugestoes&&r.sugestoes.length?'<div style="background:#f0f9ff;border-radius:10px;padding:12px 16px;border-left:3px solid #2563eb"><div style="font-weight:700;font-size:12.5px;color:#1e40af;margin-bottom:6px">💡 Sugestões</div>'+r.sugestoes.map(function(s){return '<div style="font-size:12px;color:#1e3a5f;margin-bottom:3px">• '+s+'</div>';}).join('')+'</div>':'');
  el.style.display='block';
  el.scrollIntoView({behavior:'smooth',block:'nearest'});
}

export function capConfirmarTodos(state){
  if(!capResultadoAtual)return;
  var registros=capResultadoAtual.registros;
  var obraId=capResultadoAtual.obraId;
  var salvos=0;
  var hoje=new Date().toISOString().split('T')[0];
  registros.forEach(function(reg,i){
    var ck=document.getElementById('cap-ck-'+i);
    if(!ck||!ck.checked)return;
    var titulo=document.getElementById('cap-f-titulo-'+i)?.value||reg.titulo;
    var desc=document.getElementById('cap-f-desc-'+i)?.value||reg.descricao;
    var data=document.getElementById('cap-f-data-'+i)?.value||hoje;
    var valor=+(document.getElementById('cap-f-valor-'+i)?.value)||reg.valor||0;
    if(!state.counters.dia)state.counters.dia=1;
    if(!state.counters.orc)state.counters.orc=1;
    if(!state.counters.fin)state.counters.fin=1;
    if(reg.tipo==='financeiro'){
      if(!Array.isArray(state.fin))state.fin=[];
      state.fin.push({
        id: 'FIN-'+pad(state.counters.fin),
        obraId: obraId,
        tipo: valor>0?'Receita':'Despesa',
        data: data,
        desc: titulo,
        cat: 'Outros',
        valor: Math.abs(valor),
        obs: desc,
        status: 'Pago' // Compatibilidade com novo campo
      });
      state.counters.fin++;
    }else if(reg.tipo==='orcamento'||reg.tipo==='material'){
      if(!Array.isArray(state.orc))state.orc=[];
      state.orc.push({id:'ORC-'+pad(state.counters.orc),obraId:obraId,item:titulo,sinapi:'',un:'vb',qtd:1,vunit:valor||0,real:0});
      state.counters.orc++;
    }else if(reg.tipo==='cronograma'){
      if(!Array.isArray(state.cron))state.cron=[];
      if(!state.counters.cron)state.counters.cron=1;
      state.cron.push({id:'CRN-'+pad(state.counters.cron),obraId:obraId,etapa:titulo,inicio:data,fim:'',prev:100,conc:0,obs:desc});
      state.counters.cron++;
    }else{
      if(!Array.isArray(state.diario))state.diario=[];
      var icon=(CAP_TIPOS[reg.tipo]||CAP_TIPOS.geral).icon;
      state.diario.push({id:'DIA-'+pad(state.counters.dia),obraId:obraId,data:data,
        desc:'['+((CAP_TIPOS[reg.tipo]||CAP_TIPOS.geral).label)+'] '+titulo+': '+desc,
        equipe:'',clima:'',ocorr:reg.tipo==='pendencia'?titulo:'',fotos:[]});
      state.counters.dia++;
    }
    salvos++;
  });
  if(!Array.isArray(state.capturas))state.capturas=[];
  state.capturas.unshift({id:'CAP-'+Date.now(),obraId:obraId,textoOriginal:capResultadoAtual.textoOriginal,resumo:capResultadoAtual.resumo,registros:registros.length,salvos:salvos,ts:Date.now()});
  state.capturas=state.capturas.slice(0,50);
  renderAtiva();
  showToast('✅ '+salvos+' registro(s) salvo(s)!',4000);
  capLimpar();
  document.getElementById('cap-resultado').style.display='none';
  capResultadoAtual=null;
}

export function capLimpar(state){
  var el=document.getElementById('cap-texto');if(el)el.value='';
  capArquivos=[];
  var prev=document.getElementById('cap-arquivos-preview');if(prev)prev.innerHTML='';
}

export function capToggleCard(state, i,checked){
  var c=document.getElementById('cap-card-'+i);
  if(c)c.style.opacity=checked?'1':'0.4';
}

export function capDescartarResultado(state){
  document.getElementById('cap-resultado').style.display='none';
  capResultadoAtual=null;
}

export function capProcessarArquivo(state, input){
  var prev=document.getElementById('cap-arquivos-preview');
  Array.from(input.files).forEach(function(file){
    capArquivos.push(file);
    var s=document.createElement('span');
    s.style.cssText='background:rgba(255,255,255,.2);padding:4px 10px;border-radius:6px;font-size:11px;color:#fff;display:inline-block;margin:2px';
    s.textContent=(file.type.includes('pdf')?'📄':'🖼')+' '+file.name.substring(0,20);
    if(prev)prev.appendChild(s);
  });
}

export function capSetView(v){
  capView = v;
  var h = document.getElementById('cap-historico');
  var t = document.getElementById('cap-timeline');
  var tbH = document.getElementById('cap-tab-hist');
  var tbT = document.getElementById('cap-tab-timeline');
  if(h) h.style.display = v==='hist' ? 'block':'none';
  if(t) t.style.display = v==='timeline' ? 'block':'none';
  if(tbH) tbH.classList.toggle('btn-primary', v==='hist');
  if(tbT) tbT.classList.toggle('btn-primary', v==='timeline');
  if(v==='timeline' && window._state) renderTimelineCaptura(window._state);
}

export function renderTimelineCaptura(state){
  var filtro = document.getElementById('cap-hist-filtro')?.value || '';
  var lista = Array.isArray(state.capturas) ? state.capturas.slice() : [];
  if(filtro) lista = lista.filter(function(c){ return c.obraId===filtro; });
  lista.sort(function(a,b){ return b.ts - a.ts; });
  var el = document.getElementById('cap-timeline');
  if(!el) return;
  if(!lista.length){ el.innerHTML='<div style="color:var(--muted);font-size:13px;text-align:center;padding:20px">Sem comunicações nesta obra ainda</div>'; return; }
  // Agrupar por dia
  var grupos = {};
  lista.forEach(function(c){
    var dt = new Date(c.ts);
    var key = dt.toISOString().split('T')[0];
    (grupos[key] = grupos[key] || []).push(c);
  });
  var keys = Object.keys(grupos).sort().reverse();
  el.innerHTML = keys.map(function(k){
    var dia = new Date(k+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric',weekday:'long'});
    return '<div style="margin-bottom:18px">'+
      '<div style="font-family:\'Syne\',sans-serif;font-weight:700;color:var(--navy);font-size:13px;padding:6px 10px;background:#f1f5f9;border-radius:6px;margin-bottom:8px;display:inline-block">📅 '+dia+'</div>'+
      grupos[k].map(function(c){
        var obra = state.obras.find(function(o){ return o.id===c.obraId; });
        var hora = new Date(c.ts).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
        return '<div style="border-left:3px solid var(--blue);padding:10px 14px;margin-left:14px;margin-bottom:8px;background:var(--card);border-radius:0 8px 8px 0;box-shadow:var(--shadow)">'+
          '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">'+
            '<span style="font-weight:700;font-size:12.5px;color:var(--navy)">🏗 '+(obra?obra.nome:c.obraId||'—')+'</span>'+
            '<span style="font-size:11px;color:var(--muted)">⏱ '+hora+' • '+(c.salvos||0)+'/'+(c.registros||0)+' registros</span>'+
          '</div>'+
          '<div style="font-size:12.5px;color:var(--text)">'+(c.resumo||'Comunicação processada')+'</div>'+
          (c.textoOriginal?'<div style="font-size:11px;color:var(--muted);margin-top:6px;font-style:italic;border-left:2px solid var(--border);padding-left:8px">"'+c.textoOriginal.substring(0,160)+(c.textoOriginal.length>160?'...':'')+'"</div>':'')+
        '</div>';
      }).join('')+
    '</div>';
  }).join('');
}

export function renderHistoricoCaptura(state){
  var filtro=document.getElementById('cap-hist-filtro')?.value||'';
  var lista=Array.isArray(state.capturas)?state.capturas:[];
  if(filtro)lista=lista.filter(function(c){return c.obraId===filtro;});
  if(capView==='timeline'){ renderTimelineCaptura(state); return; }
  var el=document.getElementById('cap-historico');
  if(!el)return;
  if(!lista.length){el.innerHTML='<div style="color:var(--muted);font-size:13px;text-align:center;padding:20px">Nenhuma captura realizada ainda</div>';return;}
  el.innerHTML=lista.slice(0,20).map(function(c){
    var obra=state.obras.find(function(o){return o.id===c.obraId;});
    var dt=new Date(c.ts).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
    return '<div class="hist-item">'+
      '<div style="font-weight:600;font-size:13px;color:var(--navy)">'+(c.resumo||'Captura processada')+'</div>'+
      '<div class="hist-item-meta">'+
        '<span>🏗 '+(obra?obra.nome:c.obraId||'—')+'</span>'+
        '<span>📅 '+dt+'</span>'+
        '<span style="color:var(--green)">✅ '+(c.salvos||0)+' salvos</span>'+
        '<span style="color:var(--muted)">'+(c.registros||0)+' identificados</span>'+
      '</div>'+
      (c.textoOriginal?'<div style="font-size:11.5px;color:var(--muted);margin-top:6px;font-style:italic">"'+c.textoOriginal.substring(0,120)+(c.textoOriginal.length>120?'...':'')+'"</div>':'')+
    '</div>';
  }).join('');
}



