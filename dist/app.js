import {PRESIDENTS,QUESTIONS,TEAM} from './content.js';
import {createQuiz} from './model.js';
import {initializeScene,goTo,goHome,setMovement,isXR,showXRDetail,showXRQuiz,closeXR,enterXR,supportsXR,toggleFullscreen,rotateBust,resetBust} from './scene.js';
const $=id=>document.getElementById(id),visited=new Set(),quiz=createQuiz(QUESTIONS);
let currentIndex=0,entered=false,sceneReady=false,toastTimer;
let imageCredits=[];
function el(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,5000);}
function openDialog(dialog){if(dialog.open)return;setMovement(false);if(document.fullscreenElement)document.exitFullscreen?.().catch(()=>{});dialog.showModal();}
for(const d of document.querySelectorAll('dialog')){
 d.querySelector('[data-close]').addEventListener('click',()=>d.close());
 d.addEventListener('close',()=>{if(entered)setMovement(true);});
 d.addEventListener('click',e=>{if(e.target===d){const b=d.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)d.close();}});
}
function updateProgress(){
 $('visited-count').textContent=`${visited.size} de ${PRESIDENTS.length}`;
 for(const p of PRESIDENTS){const button=$('nav-'+p.id);button.classList.toggle('visited',visited.has(p.id));button.setAttribute('aria-label',p.name+', '+p.years+(visited.has(p.id)?', painel lido':''));}
}
function renderCollection(){
 PRESIDENTS.forEach((p,i)=>{
  const nav=el('button',undefined,'president-stop');nav.id='nav-'+p.id;nav.append(el('span',String(i+1).padStart(2,'0'),'stop-number'),el('span',p.short,'stop-name'),el('span',p.years,'stop-years'));nav.addEventListener('click',()=>{if(sceneReady){startVisit(false);goTo(p.id);toast('Use os botões para girar o busto ou selecione-o para ler a ficha.');}else openDetail(p.id);});$('president-nav').append(nav);
  const article=el('article',undefined,'collection-card');article.append(el('span',String(i+1).padStart(2,'0')+' / BRASIL','card-num'));
  const img=el('img');img.className='card-photo';img.src=p.image;img.alt='Retrato de '+p.name;img.loading='lazy';img.width=480;img.height=600;
  const btn=el('button',undefined,'card-button');btn.append(el('span','↗'),document.createTextNode('Conhecer este período'));btn.setAttribute('aria-label','Ler painel de '+p.name);btn.addEventListener('click',()=>openDetail(p.id));
  const view=el('button','Ver busto na sala →','card-button');view.addEventListener('click',()=>{startVisit(false);goTo(p.id);document.querySelector('.gallery').scrollIntoView({behavior:'smooth'});});article.append(img,el('h3',p.name),el('p',p.years,'years'),el('p',p.era,'era'),view,btn);$('collection-grid').append(article);
 });
}
function startVisit(tutorial=true){
 if(!sceneReady){$('collection').scrollIntoView({behavior:'smooth'});return;}
 entered=true;$('entry-overlay').hidden=true;$('scene-tools').hidden=false;setMovement(true);$('onboarding').hidden=!tutorial;
}
function openDetail(id){
 currentIndex=PRESIDENTS.findIndex(p=>p.id===id);if(currentIndex<0)return;const p=PRESIDENTS[currentIndex];visited.add(id);updateProgress();
 if(isXR()){showXRDetail(p,currentIndex);return;}
 $('detail-image').src=p.image;$('detail-image').alt='Retrato de '+p.name;$('detail-era').textContent=p.era;$('detail-name').textContent=p.name;$('detail-years').textContent=p.years;$('detail-summary').textContent=p.summary;$('detail-milestone').textContent=p.milestone;$('detail-context').textContent=p.detail;$('detail-source').href=p.source;$('observe-bust').onclick=()=>{$('detail-dialog').close();startVisit(false);goTo(p.id);document.querySelector('.gallery').scrollIntoView({behavior:'smooth'});};$('rotate-left').onclick=()=>rotateBust(p.id,-30);$('rotate-right').onclick=()=>rotateBust(p.id,30);$('reset-bust').onclick=()=>resetBust(p.id);$('detail-index').textContent=`${currentIndex+1} / ${PRESIDENTS.length}`;openDialog($('detail-dialog'));
}
function drawQuiz(){
 if(isXR()){showXRQuiz(quiz,{answer:answerQuiz,next:nextQuiz,restart:restartQuiz});return;}
 $('quiz-feedback').textContent='';$('quiz-options').replaceChildren();$('quiz-progress-bar').style.width=`${quiz.index/quiz.total*100}%`;
 if(quiz.complete){
  $('quiz-counter').textContent='REVISÃO CONCLUÍDA';$('quiz-title').textContent='A história continua além da sala.';
  $('quiz-options').append(el('div',`${quiz.score} / ${quiz.total}`,'result-number'));
  $('quiz-feedback').textContent=quiz.score===quiz.total?'Você acertou todas as perguntas. Continue explorando as fontes para conhecer outros contextos.':'Você pode revisitar os painéis e tentar novamente. Cada resposta é uma oportunidade de revisar o conteúdo.';
  $('quiz-next').disabled=false;$('quiz-next').textContent='Refazer o quiz';return;
 }
 const q=quiz.current;$('quiz-counter').textContent=`QUESTÃO ${quiz.index+1} DE ${quiz.total}`;$('quiz-title').textContent=q.question;
 q.options.forEach((o,i)=>{const b=el('button',undefined,'quiz-option');b.append(el('span',String.fromCharCode(65+i),'letter'),el('span',o));b.disabled=quiz.answered;
  if(quiz.answered){if(i===q.answer)b.classList.add('correct');else if(i===quiz.answers[quiz.index])b.classList.add('incorrect');}
  b.addEventListener('click',()=>answerQuiz(i));$('quiz-options').append(b);
 });
 if(quiz.answered)$('quiz-feedback').textContent=(quiz.answers[quiz.index]===q.answer?'Resposta correta. ':'Resposta incorreta. ')+q.explanation;
 $('quiz-next').disabled=!quiz.answered;$('quiz-next').textContent=quiz.index===quiz.total-1?'Ver resultado →':'Próxima pergunta →';
}
function startQuiz(){quiz.reset();drawQuiz();if(!isXR())openDialog($('quiz-dialog'));}
function answerQuiz(i){if(quiz.answer(i))drawQuiz();}
function nextQuiz(){if(quiz.complete){restartQuiz();return;}if(quiz.next())drawQuiz();}
function restartQuiz(){quiz.reset();drawQuiz();}
function info(title,build){$('info-title').textContent=title;$('info-content').replaceChildren();build($('info-content'));openDialog($('info-dialog'));}
function showAbout(){info('O projeto e a equipe',root=>{
 root.append(el('p','A Galeria Presidencial é um protótipo acadêmico de experiência educativa em realidade virtual, produzido para Projeto Aplicado V — Gestão e Produção, semestre 2026.2, da UnDF. Professora: Cíntia da Costa Souza.'));
 root.append(el('h3','Quem faz a galeria'));const list=el('ul');TEAM.forEach(name=>list.append(el('li',name)));root.append(list);
 root.append(el('h3','Uma seleção histórica'));root.append(el('p','São cinco painéis com contextos distintos. A exposição não representa a lista completa de presidentes e não é uma classificação de governos. Conteúdo e funcionalidades devem passar por revisão do grupo e avaliação da professora.'));
 root.append(el('h3','Sobre os bustos'));root.append(el('p','Os cinco bustos são representações 3D estilizadas e provisórias, criadas por geometria no projeto. Não são digitalizações de esculturas, modelos oficiais ou reconstituições fiéis dos rostos. Os retratos históricos permanecem como referência. Modelos GLB revisados podem substituir as peças posteriormente.'));root.append(el('h3','Como visitar'));root.append(el('p','No computador: arraste para olhar; use WASD ou as setas para caminhar. Selecione bustos, placas ou círculos no chão. Os botões do pedestal giram cada escultura; Q e E também giram a peça selecionada. Os nomes abaixo da sala permitem ir diretamente aos painéis. No celular, use o toque e os botões do percurso. A coleção em texto oferece acesso alternativo.'));
 root.append(el('p','Em equipamento WebXR compatível, use Entrar em RV. Controle com raio ou cursor por olhar permitem selecionar painéis e pontos de visita. Interrompa a experiência se sentir desconforto. O modo imersivo ainda precisa de validação em headset.','credits-line'));
 root.append(el('p','Não há cadastro nem envio de respostas. As respostas do quiz e o progresso da visita ficam apenas na memória da página; ao recarregar, são apagados.','credits-line'));
});}
function showSources(){info('Fontes e créditos',root=>{
 root.append(el('p','Os textos são sínteses para uma exposição acadêmica. Consulte as fontes originais para aprofundar o contexto histórico. Pesquisa e créditos registrados em 16/10/2026.'));
 const list=el('ul');PRESIDENTS.forEach(p=>{const item=el('li');const a=el('a',p.name+' · '+p.sourceName);a.href=p.source;a.target='_blank';a.rel='noopener noreferrer';item.append(a);if(p.extraSource){const extra=el('a',' / Senado Federal');extra.href=p.extraSource;extra.target='_blank';extra.rel='noopener noreferrer';item.append(extra);}list.append(item);});root.append(list);
 root.append(el('h3','Imagens da exposição'));
 if(!imageCredits.length)root.append(el('p','Os créditos completos de cada retrato estão no arquivo assets/credits.json, incluído com o projeto.'));
 imageCredits.forEach(c=>{const paragraph=el('p');const a=el('a',c.title);a.href=c.page;a.target='_blank';a.rel='noopener noreferrer';paragraph.append(a,document.createTextNode(' — '+c.artist+'. '+c.license+'. Recorte e ajuste de tamanho para o painel.'));if(c.licenseUrl){const license=el('a',' Licença de uso ↗');license.href=c.licenseUrl;license.target='_blank';license.rel='noopener noreferrer';paragraph.append(license);}paragraph.className='credits-line';root.append(paragraph);});
 const download=el('a','Baixar o código e as instruções ↗');download.href='downloads/Galeria_Presidencial_Prototipo.zip';download.setAttribute('download','');root.append(download);root.append(el('h3','Esculturas 3D'));root.append(el('p','Bustos originais gerados pela geometria do projeto, em acabamento de bronze. São estudos estilizados provisórios, sem fidelidade facial garantida. Os arquivos GLB e o código gerador estão incluídos no pacote.'));root.append(el('h3','Tecnologia'));root.append(el('p','A-Frame 1.7.0, distribuído sob licença MIT, com Three.js. A biblioteca e os retratos são servidos com o projeto; a consulta às fontes externas requer internet.'));
});}
renderCollection();
$('enter-button').addEventListener('click',()=>startVisit());$('read-button').addEventListener('click',()=>$('collection').scrollIntoView({behavior:'smooth'}));$('collection-button').addEventListener('click',()=>$('collection').scrollIntoView({behavior:'smooth'}));$('fallback-collection').addEventListener('click',()=>$('collection').scrollIntoView({behavior:'smooth'}));
$('dismiss-tutorial').addEventListener('click',()=>$('onboarding').hidden=true);$('help-button').addEventListener('click',()=>$('onboarding').hidden=!$('onboarding').hidden);
$('home-link').addEventListener('click',e=>{e.preventDefault();goHome();window.scrollTo({top:0,behavior:'smooth'});});$('reset-view').addEventListener('click',()=>{goHome();toast('Você voltou à entrada. Seu progresso foi mantido.');});
$('start-quiz').addEventListener('click',startQuiz);$('quiz-next').addEventListener('click',nextQuiz);$('quiz-back').addEventListener('click',()=>$('quiz-dialog').close());
$('next-panel').addEventListener('click',()=>openDetail(PRESIDENTS[(currentIndex+1)%PRESIDENTS.length].id));$('previous-panel').addEventListener('click',()=>openDetail(PRESIDENTS[(currentIndex+PRESIDENTS.length-1)%PRESIDENTS.length].id));
$('sources-button').addEventListener('click',showSources);$('about-button').addEventListener('click',showAbout);$('footer-credits').addEventListener('click',showSources);
$('fullscreen-button').addEventListener('click',()=>toggleFullscreen().catch(()=>toast('A tela cheia não está disponível. Você pode continuar pela página.')));
$('vr-button').addEventListener('click',async()=>{try{$('onboarding').hidden=true;startVisit(false);await enterXR();}catch{toast('Não foi possível iniciar a sessão de RV. Confira o headset e as permissões do navegador.');}});
function failed(reason){$('scene-fallback').hidden=false;$('fallback-reason').textContent=reason;$('gallery-status').textContent='COLEÇÃO DISPONÍVEL EM TEXTO';$('entry-overlay').hidden=true;}
let loadTimeout=setTimeout(()=>{if(!sceneReady)failed('A sala está demorando para carregar. A coleção completa pode ser consultada em texto.');},25000);
initializeScene({
 ready(){sceneReady=true;clearTimeout(loadTimeout);$('scene-fallback').hidden=true;$('gallery-status').textContent='GALERIA 3D · SALA 01';$('enter-button').disabled=false;$('enter-button').textContent='Entrar na galeria  →';setMovement(false);},
 rendered(){},error:failed,
 detail:openDetail,quiz:startQuiz,
 location(p){$('current-location').textContent=p?p.name:'História em perspectiva';PRESIDENTS.forEach(item=>$('nav-'+item.id).classList.toggle('active',p?.id===item.id));},
 xr(active){if(active){document.querySelectorAll('dialog[open]').forEach(d=>d.close());$('onboarding').hidden=true;}else if(entered)setMovement(true);}
});
supportsXR().then(supported=>{if(supported){$('vr-button').disabled=false;$('vr-button').textContent='Entrar em RV';}else{$('vr-button').title='Requer HTTPS ou localhost e navegador com headset WebXR compatível.';}});
fetch('assets/credits.json').then(r=>r.ok?r.json():[]).then(data=>imageCredits=data).catch(()=>{});
// Public, read-only diagnostics for the group's manual checklist.
window.GALERIA={version:'0.3.0',get visited(){return [...visited];},get ready(){return sceneReady;}};
