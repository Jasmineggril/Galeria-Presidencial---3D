import {TalkingBustView} from './talking-bust.js';
import {DATA_SOURCES} from './public-data.js';
import {CATALOG,ROOMS,SPECIALS,ROOM_QUESTIONS,GENERAL_QUESTIONS} from './catalog.js';
import {TEAM} from './content.js';
import {registerCatalogBusts} from './catalog-busts.js';
import {getBustReference} from './bustos-referencias/bustos.js';
import {AudioGuide} from './recorded-narrator.js';
import {createQuiz} from './model.js';
import {AVATAR_OPTIONS,loadAvatar,saveAvatar,clearAvatar,normalizeAvatar,renderAvatarPreview,avatarSummary} from './avatar.js';
import {backendConfig,isGuestMode,loadSession,saveSession,clearSession,signUp,signIn,signOut,requestPasswordReset,currentAccountLabel} from './account.js';
import {initializeScene,switchRoom,goTo,goHome,setMovement,isXR,showXRDetail,showXRQuiz,closeXR,enterXR,supportsXR,toggleFullscreen,rotateBust,resetBust,showXRNarration} from './scene.js';
const $=id=>document.getElementById(id),visited=new Set();
let recordings={};let detailAvatar=null,bustReferenceRequest=0;let currentAvatar=loadAvatar();
const recordingsReady=fetch('assets/audio/manifest.json').then(r=>{if(!r.ok)throw Error('Manifest unavailable');return r.json();}).then(d=>{recordings=d.recordings||{};renderCollection();}).catch(()=>{});
let detailRequest=0;
let activeRoom=1,ready=false,entered=false,current=null,viewIndex=-1,toastTimer,loadTimeout,quiz=createQuiz(GENERAL_QUESTIONS),quizLabel='Revisão geral';
const find=id=>CATALOG.find(p=>p.id===id),room=id=>ROOMS.find(r=>r.id===id),normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const bustReferencePanel=el('section',undefined,'bust-reference-panel');
bustReferencePanel.setAttribute('aria-labelledby','bust-reference-heading');
const bustReferenceLabel=el('span','REFERÊNCIA VISUAL 2D · CONCEITO GERADO POR IA','eyebrow');
const bustReferenceHeading=el('h3','Conceito visual de um busto');
bustReferenceHeading.id='bust-reference-heading';
const bustReferenceStatus=el('p','A referência visual ainda não foi carregada.','bust-reference-status');
bustReferenceStatus.id='bust-reference-status';bustReferenceStatus.setAttribute('role','status');
const bustReferenceDisplay=el('div',undefined,'bust-reference-display');
bustReferenceDisplay.id='bust-reference-display';
const bustReferenceNote=el('p','Imagem conceitual 2D. Não é fotografia histórica, modelo 3D nem textura facial pronta.','bust-reference-note');
bustReferencePanel.append(bustReferenceLabel,bustReferenceHeading,bustReferenceStatus,bustReferenceDisplay,bustReferenceNote);
$('detail-facts').after(bustReferencePanel);
const link=(text,href)=>{const a=el('a',text);a.href=href;a.target='_blank';a.rel='noopener noreferrer';return a;};
function toast(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4500);}
function members(id){return CATALOG.filter(p=>p.room===id).map((p,i)=>{const left=i%2===0,z=2-Math.floor(i/2)*3;return {...p,era:room(id).title,image:p.image||'assets/studies/'+p.id+'.webp',model:'url(assets/busts/'+p.id+'.glb)',position:[left?-8.72:8.72,2.55,z],rotation:left?90:-90,view:[left?-4.7:4.7,0,z],heading:left?90:-90,milestone:p.years,detail:p.regime+' · '+p.accession};});}
registerCatalogBusts(CATALOG);
function progress(){ $('visited-count').textContent=visited.size+' de '+CATALOG.length;document.querySelectorAll('[data-record]').forEach(n=>{n.dataset.visited=String(visited.has(n.dataset.record));}); }
function optionGroup(container,labelText,group,field,selected){
  const wrapper=document.createElement('div');wrapper.className='option-group-wrapper';
  const label=document.createElement('span');label.textContent=labelText;label.className='eyebrow';wrapper.append(label);
  const groupEl=document.createElement('div');groupEl.className='option-group';
  AVATAR_OPTIONS[group].forEach(option=>{
    const chip=document.createElement('button');chip.type='button';chip.className='option-chip'+(option.id===selected?' active':'');chip.textContent=option.label;chip.dataset.value=option.id;
    chip.onclick=()=>{currentAvatar[field]=option.id;refreshAvatarForm();};
    groupEl.append(chip);
  });
  wrapper.append(groupEl);container.append(wrapper);
}
function buildAvatarForm(){
  const form=$('avatar-form');form.replaceChildren();
  const name=document.createElement('label');name.textContent='Nome de exibição';const input=document.createElement('input');input.type='text';input.value=currentAvatar.displayName;input.maxLength=24;input.oninput=()=>{currentAvatar.displayName=input.value;};name.append(input);form.append(name);
  optionGroup(form,'Tom de pele','skinTones','skinTone',currentAvatar.skinTone);
  optionGroup(form,'Penteado','hairStyles','hairStyle',currentAvatar.hairStyle);
  optionGroup(form,'Cor do cabelo','hairColors','hairColor',currentAvatar.hairColor);
  optionGroup(form,'Roupa','outfits','outfit',currentAvatar.outfit);
  optionGroup(form,'Cor da roupa','outfitColors','outfitColor',currentAvatar.outfitColor);
  optionGroup(form,'Calçado','shoes','shoes',currentAvatar.shoes);
  optionGroup(form,'Acessório','accessories','accessory',currentAvatar.accessory);
  refreshAvatarPreview();
}
function refreshAvatarForm(){buildAvatarForm();}
function refreshAvatarPreview(){renderAvatarPreview($('avatar-preview'),currentAvatar);$('avatar-status').textContent=avatarSummary(currentAvatar);}
function openAvatar(){currentAvatar=loadAvatar();buildAvatarForm();openDialog($('avatar-dialog'));}
function openAccount(){
  const mode=$('account-mode');mode.textContent=currentAccountLabel()+' · '+(isGuestMode()?'Sem backend configurado: modo convidado.':'Backend configurado.');
  $('account-status').textContent=isGuestMode()?'Cadastro e login reais requerem backend. O progresso local do convidado permanece neste dispositivo.':'Informe e-mail e senha para entrar ou cadastrar.';
  openDialog($('account-dialog'));
}
function openDialog(d){document.querySelectorAll('dialog[open]').forEach(x=>{if(x!==d)x.close();});setMovement(false);if(document.fullscreenElement)document.exitFullscreen?.().catch(()=>{});if(!d.open)d.showModal();}
for(const d of document.querySelectorAll('dialog')){d.querySelector('[data-close]').onclick=()=>d.close();d.addEventListener('close',()=>{detailAvatar?.destroy();detailAvatar=null;narrator.stop();if(d.id==='detail-dialog'){bustReferenceRequest++;bustReferenceDisplay.replaceChildren();bustReferenceStatus.textContent='A referência visual ainda não foi carregada.';}if(entered)setMovement(true);});d.addEventListener('click',e=>{if(e.target===d){const b=d.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)d.close();}});}
const narrator=new AudioGuide({onChange:s=>{
 detailAvatar?.setState(s.state);
 $('narrate-pause').disabled=s.state!=='playing';$('narrate-play').disabled=['playing','loading'].includes(s.state);$('narrate-play').textContent=s.state==='paused'?'▶ Continuar':'▶ Ouvir minha história';
 $('audio-caption').textContent=s.caption||'Selecione Ouvir minha história para iniciar.';
 const labels={idle:'O roteiro pode ser lido mesmo sem áudio.',loading:'Carregando a narração…',playing:s.mode==='recorded'?(s.synchronized?'Narração gravada com legendas sincronizadas.':'Narração gravada. Leia o roteiro completo abaixo.'):'Narração sintética em reprodução. Legendas por trecho.',paused:'Narração pausada.',ended:'Narração concluída.',unavailable:'Síntese de voz indisponível neste navegador. Leia o roteiro abaixo.',error:'Não foi possível reproduzir a voz. O roteiro permanece disponível.'};$('audio-status').textContent=labels[s.state];
 $('narration-script').replaceChildren(...s.parts.map((part,i)=>el('p',part,i===s.index?'spoken':'')));
 $('audio-dock').hidden=!['playing','paused'].includes(s.state)||$('detail-dialog').open;
 $('dock-caption').textContent=(current?.name||'')+' · '+s.caption;
 if(isXR()&&current&&['playing','paused'].includes(s.state))showXRNarration({...current,era:room(current.room).title},s.caption,{pause:()=>narrator.pause(),play:()=>narrator.play(),back:()=>{narrator.stop();showXRDetail(members(activeRoom).find(p=>p.id===current.id),members(activeRoom).findIndex(p=>p.id===current.id));}});
}});
function renderRooms(){
 $('rooms-list').replaceChildren();ROOMS.forEach(r=>{const b=el('button',undefined,'room-button'+(r.id===activeRoom?' active':''));b.setAttribute('aria-label','Sala '+r.id+' — '+r.title);b.setAttribute('aria-pressed',String(r.id===activeRoom));b.append(el('b',String(r.id).padStart(2,'0')),el('strong',r.title),el('small',r.years));b.onclick=()=>changeRoom(r.id);$('rooms-list').append(b);});
 const r=room(activeRoom);$('room-title').textContent=r.title;$('room-dates').textContent=r.years+' · '+members(activeRoom).length+' PRESIDENTES';$('room-description').textContent=r.description+(activeRoom===4?' A ficha de Vargas também aparece no filtro desta sala para contextualizar seu retorno em 1951.':activeRoom===5?' A ficha de Mazzilli também aparece no filtro desta sala pela interinidade de 1964.':'');$('room-label').textContent='SALA '+String(activeRoom).padStart(2,'0');$('current-location').textContent=r.title;
}
function changeRoom(id,filter=true){if(!room(id))return;detailRequest++;narrator.stop();document.querySelectorAll('dialog[open]').forEach(d=>d.close());activeRoom=id;viewIndex=-1;renderRooms();if(ready){switchRoom(members(id),{...room(id),name:room(id).title});if(entered)setMovement(true);$('gallery-status').textContent='GALERIA 3D · SALA '+String(id).padStart(2,'0');}if(filter){$('search').value='';$('room-filter').value=String(id);renderCollection();} }
function startVisit(tutorial=true){if(!ready){$('collection').scrollIntoView({behavior:'smooth'});return;}entered=true;$('entry-overlay').hidden=true;$('scene-tools').hidden=false;$('mobile-move').hidden=false;$('mobile-pad').hidden=false;$('onboarding').hidden=!tutorial;setMovement(true);}
function observe(p){narrator.stop();if(p.room!==activeRoom)changeRoom(p.room);if(ready){startVisit(false);goTo(p.id);document.querySelector('.gallery').scrollIntoView({behavior:'smooth'});}else{openDetail(p.id);toast('A sala 3D está indisponível neste dispositivo. A ficha e a narração continuam acessíveis.');}}
function renderCollection(){const term=normalize($('search').value.trim()),filter=$('room-filter').value;const matches=CATALOG.filter(p=>(filter==='all'||String(p.room)===filter||p.relatedRooms?.some(r=>String(r)===filter))&&normalize(p.name+' '+p.summary+' '+room(p.room).title).includes(term));$('collection-grid').replaceChildren();
 matches.forEach(p=>{const article=el('article',undefined,'collection-card');article.dataset.record=p.id;article.append(el('span','SALA '+String(p.room).padStart(2,'0')+' / '+room(p.room).title,'card-num'));const image=el('img');image.src=p.image||'assets/studies/'+p.id+'.webp';image.alt=p.image?'Retrato histórico de '+p.name:'Prévia do busto 3D estilizado e provisório de '+p.name;image.loading='lazy';image.width=480;image.height=600;image.className='card-photo';article.append(image,el('span',p.image?'RETRATO HISTÓRICO · FONTE PÚBLICA':'ESTUDO ESCULTÓRICO PROVISÓRIO','model-tag'),el('h3',p.name),el('p',p.years,'years'),el('p',p.regime,'era'));const read=el('button','▶ Conhecer e ouvir sua história','card-button');read.setAttribute('aria-label','Conhecer '+p.name);read.onclick=()=>openDetail(p.id);const see=el('button','Observar o busto na sala ↗','card-button');see.onclick=()=>observe(p);article.append(el('p',recordings[p.id]?'Áudio ElevenLabs disponível':'Narração pela voz do navegador','audio-origin'),read,see);$('collection-grid').append(article);});
 $('record-count').textContent=matches.length+' de '+CATALOG.length+' presidentes no acervo · '+Object.keys(recordings).length+' narrações ElevenLabs';$('empty-state').hidden=!!matches.length;progress();
}
async function renderBustReference(p){
 const request=++bustReferenceRequest;
 bustReferenceDisplay.replaceChildren();bustReferenceStatus.textContent='Carregando conceito visual 2D…';
 try{
  const {president,canvas}=await getBustReference(p.id);
  if(request!==bustReferenceRequest||!$('detail-dialog').open||current?.id!==p.id)return;
  canvas.className='bust-reference-canvas';bustReferenceDisplay.replaceChildren(canvas);
  bustReferenceStatus.textContent='Referência visual de '+president.name+' carregada.';
 }catch(error){
  if(request!==bustReferenceRequest)return;
  bustReferenceStatus.textContent='Não foi possível carregar a referência visual 2D de '+p.name+'. A ficha e o modelo 3D continuam disponíveis.';
  console.error('Falha ao carregar referência visual 2D para '+p.id+':',error);
 }
}
async function openDetail(id){const request=++detailRequest;await recordingsReady;if(request!==detailRequest)return;const p=find(id);if(!p)return;current=p;visited.add(id);progress();narrator.stop();if(isXR()){if(activeRoom!==p.room)changeRoom(p.room,false);const m=members(p.room);showXRDetail(m.find(x=>x.id===id),m.findIndex(x=>x.id===id));return;}
 $('detail-image').src=p.image||'assets/studies/'+p.id+'.webp';$('detail-image').alt=p.image?'Retrato de '+p.name:'Prévia do busto estilizado provisório de '+p.name;$('detail-era').textContent=room(p.room).title;$('detail-name').textContent=p.name;$('detail-years').textContent=p.years;const credit=p.portraitCredit;$('portrait-credit').replaceChildren();if(credit){$('portrait-credit').append(document.createTextNode('Imagem: '+credit.artist+' · '+credit.license+' · '),link('Origem e licença ↗',credit.page));} $('comparison-image').src='assets/studies/'+p.id+'.webp';$('comparison-image').alt='Estudo 3D provisório de '+p.name+' para comparar com o retrato histórico';$('detail-facts').textContent=p.regime+' · '+p.accession;$('detail-summary').textContent=p.summary;if(p.id==='lula')$('detail-summary').append(document.createTextNode(' '),link('Ver Lula animado e ouvir a narração ↗','lula-piloto.html'));$('detail-milestone').textContent='Contexto e fontes';$('detail-context').textContent='O acervo reúne 36 presidentes individuais, incluindo interinos, sem contar substituições ocasionais em viagens. Retornos ao cargo estão reunidos na mesma ficha. As esculturas são estudos estilizados, sem fidelidade facial garantida.';$('detail-source').href=p.source;if(p.sourceAccessed)$('detail-source').title='Fonte consultada em '+p.sourceAccessed+'. '+ (p.sourceUse||'');$('detail-source').textContent='Consultar '+p.sourceName+' ↗';$('detail-index').textContent=(CATALOG.indexOf(p)+1)+' / '+CATALOG.length;
 $('observe-bust').onclick=()=>{$('detail-dialog').close();observe(p);};$('rotate-left').onclick=()=>{if(p.room!==activeRoom||!ready){toast('Abra este busto na sala 3D para girar a peça.');return;}rotateBust(p.id,-30);};$('rotate-right').onclick=()=>{if(p.room!==activeRoom||!ready){toast('Abra este busto na sala 3D para girar a peça.');return;}rotateBust(p.id,30);};$('reset-bust').onclick=()=>resetBust(p.id);
 bustReferenceHeading.textContent='Conceito visual de '+p.name;
 detailAvatar?.destroy();detailAvatar=null;$('detail-avatar').hidden=p.id!=='lula';openDialog($('detail-dialog'));renderBustReference(p);narrator.load(p.narration,recordings[p.id]);if(p.id==='lula')detailAvatar=new TalkingBustView($('detail-avatar'),{audio:()=>narrator.recorded.audio});$('detail-dialog').scrollTop=0;document.querySelector('.detail-copy').scrollTop=0;
}
function startQuiz(scope){narrator.stop();quizLabel=scope==='all'?'Revisão geral':'Sala '+activeRoom+' · '+room(activeRoom).title;quiz=createQuiz(scope==='all'?GENERAL_QUESTIONS:ROOM_QUESTIONS[activeRoom]);drawQuiz();if(!isXR())openDialog($('quiz-dialog'));}
function drawQuiz(){if(isXR()){showXRQuiz(quiz,{answer:answerQuiz,next:nextQuiz,restart:()=>{quiz.reset();drawQuiz();}});return;}$('quiz-options').replaceChildren();$('quiz-feedback').textContent='';$('quiz-progress-bar').style.width=(quiz.index/quiz.total*100)+'%';
 if(quiz.complete){$('quiz-counter').textContent=quizLabel+' · REVISÃO CONCLUÍDA';$('quiz-title').textContent='A história continua além da sala.';$('quiz-options').append(el('div',quiz.score+' / '+quiz.total,'result-number'));$('quiz-feedback').textContent='Revisite as fichas e consulte as fontes para aprofundar o contexto.';$('quiz-next').disabled=false;$('quiz-next').textContent='Refazer o quiz';return;}
 const q=quiz.current;$('quiz-counter').textContent=quizLabel+' · QUESTÃO '+(quiz.index+1)+' DE '+quiz.total;$('quiz-title').textContent=q.question;q.options.forEach((o,i)=>{const b=el('button',undefined,'quiz-option');b.append(el('span',String.fromCharCode(65+i),'letter'),el('span',o));b.disabled=quiz.answered;if(quiz.answered){if(i===q.answer)b.classList.add('correct');else if(i===quiz.answers[quiz.index])b.classList.add('incorrect');}b.onclick=()=>answerQuiz(i);$('quiz-options').append(b);});if(quiz.answered)$('quiz-feedback').textContent=(quiz.answers[quiz.index]===q.answer?'Resposta correta. ':'Resposta incorreta. ')+q.explanation;$('quiz-next').disabled=!quiz.answered;$('quiz-next').textContent=quiz.index===quiz.total-1?'Ver resultado →':'Próxima pergunta →';
}
function answerQuiz(i){if(quiz.answer(i))drawQuiz();}function nextQuiz(){if(quiz.complete)quiz.reset();else quiz.next();drawQuiz();}
function info(title,build){narrator.stop();$('info-title').textContent=title;$('info-content').replaceChildren();build($('info-content'));openDialog($('info-dialog'));}
function showAbout(){info('O projeto e a equipe',root=>{root.append(el('p','Museu virtual educativo desenvolvido em A-Frame e JavaScript para Projeto Aplicado V — Gestão e Produção, UnDF, 2026.2. Professora Cíntia da Costa Souza.'));const list=el('ul');TEAM.forEach(x=>list.append(el('li',x)));root.append(list,el('h3','Uma experiência em construção'),el('p','O acervo reúne 36 presidentes individuais, incluindo interinos, com corte histórico em 02/11/2026. Juntas e pessoas que não exerceram o cargo aparecem separadamente. Bustos são estudos originais estilizados e provisórios; não são digitalizações nem reconstruções fiéis. Os 36 registros possuem retratos históricos com autoria, origem e licença. Os estudos 3D permanecem provisórios e podem ser comparados às fotografias.'),el('h3','Áudio e acessibilidade'),el('p','As narrações são dramatizações educativas com síntese de voz do navegador. Não imitam vozes reais. Disponibilidade e qualidade dependem das vozes instaladas; alguns dispositivos podem utilizar serviços de voz online. Os roteiros permanecem disponíveis em texto. Não há sincronização labial.'),el('h3','Como visitar'),el('p','Escolha uma sala, selecione um busto ou consulte o acervo. Mouse orienta a câmera, WASD e setas movem no computador. Q/E giram a peça selecionada. No celular, use os pontos fixos e as setas de observação. WebXR exige equipamento compatível e HTTPS; a validação em headset permanece pendente.'),el('p','Sem cadastro, banco de dados ou envio de respostas pelo aplicativo. Progresso e quiz ficam na memória da sessão e são apagados ao recarregar.'));});}
async function showSources(){info('Fontes e créditos',root=>{root.append(el('p','As fichas e dramatizações são sínteses educativas. A classificação separa período histórico, regime e forma de acesso ao cargo. Consulte as fontes originais. Revisão do acervo ampliado em 02/11/2026.'));root.append(el('h3','Dados públicos e referências'));DATA_SOURCES.forEach(s=>{const entry=el('p');entry.append(link(s.name,s.url),document.createTextNode(' · '+s.use));root.append(entry);});const list=el('ul');CATALOG.forEach(p=>{const li=el('li');li.append(link(p.name+' · '+p.sourceName,p.source));list.append(li);});root.append(list,el('h3','Bustos e ilustração'),el('p','Estudos originais gerados por geometria no projeto. Fotografias públicas foram utilizadas como referências para comparação e revisão manual de cabelo, barba, bigode e óculos; as proporções permanecem procedurais. Todas as 36 representações são provisórias e não têm fidelidade facial garantida. A ilustração de pedestal é uma composição vetorial original, não um retrato histórico.'));fetch('assets/credits.json').then(r=>r.json()).then(credits=>{const heading=el('h3','36 retratos históricos com licença');root.append(heading);credits.forEach(c=>{const item=el('p',undefined,'credits-line');item.append(link(c.title,c.page),document.createTextNode(' · '+c.artist+' · '+c.license+'. '+c.changes));if(c.licenseUrl)item.append(link(' Licença',c.licenseUrl));root.append(item);});}).catch(()=>root.append(el('p','Créditos completos incluídos no arquivo assets/credits.json.')));root.append(el('h3','Tecnologia'),el('p','A-Frame 1.7.0 e Three.js, conforme licença MIT empacotada. Narrações ElevenLabs e síntese do navegador. Para executar localmente, extraia os dois pacotes na mesma pasta.'),link('Baixar código, modelos e roteiros ↗','downloads/Galeria_Presidencial_Prototipo.zip'),document.createTextNode(' · '),link('Baixar pacote de áudios ↗','downloads/Galeria_Presidencial_Audios.zip'));});}
ROOMS.forEach(r=>{const option=el('option',r.title);option.value=r.id;$('room-filter').append(option);const t=el('button');t.append(el('b',r.years),el('span',r.title));t.onclick=()=>{changeRoom(r.id);document.querySelector('.museum-layout').scrollIntoView({behavior:'smooth'});};$('timeline-items').append(t);});
SPECIALS.forEach(s=>{const a=el('article',undefined,'special-item');a.append(el('small',s.kind),el('h3',s.name),el('p',s.years),el('p',s.summary),link('Consultar a fonte ↗',s.source));$('special-grid').append(a);});
$('search').oninput=()=>{if($('search').value.trim())$('room-filter').value='all';renderCollection();};$('room-filter').onchange=()=>renderCollection();$('previous-room').onclick=()=>changeRoom(activeRoom===1?6:activeRoom-1);$('next-room').onclick=()=>changeRoom(activeRoom===6?1:activeRoom+1);$('specials-button').onclick=()=>$('specials').scrollIntoView({behavior:'smooth'});
$('enter-button').onclick=()=>startVisit();for(const id of ['read-button','collection-button','fallback-collection'])$(id).onclick=()=>$('collection').scrollIntoView({behavior:'smooth'});$('dismiss-tutorial').onclick=()=>$('onboarding').hidden=true;$('help-button').onclick=()=>$('onboarding').hidden=!$('onboarding').hidden;$('reset-view').onclick=goHome;$('fullscreen-button').onclick=()=>toggleFullscreen().catch(()=>toast('Tela cheia indisponível neste navegador.'));
$('home-link').onclick=e=>{e.preventDefault();goHome();window.scrollTo({top:0,behavior:'smooth'});};$('vr-button').onclick=async()=>{try{startVisit(false);await enterXR();}catch{toast('Não foi possível iniciar a sessão de realidade virtual.');}};
document.querySelectorAll('.mobile-pad button[data-key]').forEach(btn=>{
 const code=btn.dataset.key;
 const down=e=>{e.preventDefault();window.dispatchEvent(new KeyboardEvent('keydown',{code,key:code.replace('Key','').toLowerCase()}));};
 const up=e=>{e.preventDefault();window.dispatchEvent(new KeyboardEvent('keyup',{code,key:code.replace('Key','').toLowerCase()}));};
 btn.addEventListener('pointerdown',down);btn.addEventListener('pointerup',up);btn.addEventListener('pointercancel',up);btn.addEventListener('pointerleave',up);
});
$('interact-button').onclick=()=>{if(current)openDetail(current.id);else toast('Aproxime-se de um busto para interagir.');};
for(const [id,delta] of [['prev-view',-1],['next-view',1]])$(id).onclick=()=>{const m=members(activeRoom);viewIndex=(viewIndex+delta+m.length)%m.length;goTo(m[viewIndex].id);};
$('narrate-play').onclick=()=>narrator.play();$('narrate-pause').onclick=()=>narrator.pause();$('narrate-restart').onclick=()=>narrator.restart();$('narrate-stop').onclick=()=>narrator.stop();$('dock-stop').onclick=()=>narrator.stop();$('narrate-volume').oninput=()=>narrator.setVolume(Number($('narrate-volume').value));
$('next-panel').onclick=()=>openDetail(CATALOG[(CATALOG.indexOf(current)+1)%CATALOG.length].id);$('previous-panel').onclick=()=>openDetail(CATALOG[(CATALOG.indexOf(current)+CATALOG.length-1)%CATALOG.length].id);
$('start-quiz').onclick=()=>startQuiz('room');$('general-quiz').onclick=()=>startQuiz('all');$('quiz-next').onclick=nextQuiz;$('quiz-back').onclick=()=>$('quiz-dialog').close();$('sources-button').onclick=showSources;$('footer-credits').onclick=showSources;$('about-button').onclick=showAbout;
$('avatar-button').onclick=openAvatar;$('account-button').onclick=openAccount;
$('avatar-save').onclick=()=>{currentAvatar=saveAvatar(currentAvatar);refreshAvatarPreview();toast('Aparência salva neste dispositivo.');$('avatar-dialog').close();};
$('avatar-reset').onclick=()=>{currentAvatar=clearAvatar();buildAvatarForm();toast('Aparência restaurada.');};
$('account-signup').onclick=async()=>{const result=await signUp({name:$('account-name').value,email:$('account-email').value,password:$('account-password').value});$('account-status').textContent=result.message||'Operação concluída.';if(result.ok){saveSession(result.session);openAccount();}};
$('account-signin').onclick=async()=>{const result=await signIn({email:$('account-email').value,password:$('account-password').value});$('account-status').textContent=result.message||'Operação concluída.';if(result.ok)openAccount();};
$('account-signout').onclick=async()=>{await signOut();$('account-status').textContent='Sessão encerrada.';openAccount();};
$('account-reset').onclick=async()=>{const result=await requestPasswordReset($('account-email').value);$('account-status').textContent=result.message||'Operação concluída.';};
function failed(reason){clearTimeout(loadTimeout);$('scene-fallback').hidden=false;$('fallback-reason').textContent=reason;$('gallery-status').textContent='ACERVO ACESSÍVEL EM TEXTO';$('entry-overlay').hidden=true;}
renderRooms();renderCollection();loadTimeout=setTimeout(()=>{if(!ready)failed('A sala 3D está demorando para carregar. Continue pelo acervo em texto.');},25000);
initializeScene({ready(){ready=true;clearTimeout(loadTimeout);$('scene-fallback').hidden=true;$('gallery-status').textContent='GALERIA 3D · SALA 01';$('enter-button').disabled=false;$('enter-button').textContent='Entrar no museu →';setMovement(false);},error:failed,detail:openDetail,quiz:()=>startQuiz('room'),room:delta=>changeRoom(((activeRoom-1+delta+6)%6)+1),narrate:p=>{current=find(p.id);narrator.load(current.narration,recordings[current.id]);narrator.play();},location:p=>{$('current-location').textContent=p?p.name:room(activeRoom).title;},xr:active=>{narrator.stop();if(active){document.querySelectorAll('dialog[open]').forEach(d=>d.close());$('onboarding').hidden=true;}else if(entered)setMovement(true);}},members(1),{...room(1),name:room(1).title});
supportsXR().then(s=>{if(s){$('vr-button').disabled=false;$('vr-button').textContent='Entrar em RV';}});window.addEventListener('pagehide',()=>narrator.stop());
