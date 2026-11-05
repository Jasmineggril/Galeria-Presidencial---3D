import { PRESIDENTS as INITIAL_PRESIDENTS } from './content.js';
let PRESIDENTS=INITIAL_PRESIDENTS, exhibition, roomInfo;
import { clampPosition } from './model.js';
import { registerBustComponent } from './busts.js';
import { registerBustReferenceComponent } from './bustos-referencias/bustos.js';
const INK='#193f36',PAPER='#f3eee0',GOLD='#ad915e';
let scene,rig,camera,callbacks,overlay,assets,currentMode='desktop';
const $=id=>document.getElementById(id);
function entity(tag,attrs={},parent){const e=document.createElement(tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));if(parent)parent.append(e);return e;}
function wrap(ctx,text,x,y,width,lineHeight){
 let words=text.split(/\s+/),line='';for(const word of words){const test=line?line+' '+word:word;if(ctx.measureText(test).width>width&&line){ctx.fillText(line,x,y);line=word;y+=lineHeight;}else line=test;}if(line)ctx.fillText(line,x,y);return y+lineHeight;
}
let textureId=0;
function canvasTexture(draw,w=1024,h=1024){
 const c=document.createElement('canvas');c.width=w;c.height=h;c.id='gp-texture-'+(++textureId);if(overlay)c.dataset.xrTransient='true';const ctx=c.getContext('2d');draw(ctx,w,h);assets.append(c);return '#'+c.id;
}
function textTexture(lines,{w=1024,h=320,bg=PAPER,color=INK,pad=55}={}){
 return canvasTexture((c,w,h)=>{c.fillStyle=bg;c.fillRect(0,0,w,h);let y=pad;for(const l of lines){c.fillStyle=l.color||color;c.font=(l.bold?'600 ':'')+(l.size||36)+'px '+(l.serif?'Georgia':'Arial');c.textBaseline='top';y=wrap(c,l.text,pad,y,w-2*pad,l.lineHeight||((l.size||36)*1.28))+(l.gap??15);}},w,h);
}
function plane(parent,attrs={}){return entity('a-plane',{material:'shader: flat; side: double',...attrs},parent);}
function button(parent,label,pos,width,height,onClick,{dark=false}={}){
 const tex=textTexture([{text:label,size:34,bold:true}],{w:900,h:150,pad:42,bg:dark?INK:PAPER,color:dark?'#ffffff':INK});
 const e=plane(parent,{position:pos,width,height,src:tex,class:'gp-interactive'});e.addEventListener('click',evt=>{evt.stopPropagation();onClick();});return e;
}
function register(){
 registerBustComponent(window.AFRAME);
 registerBustReferenceComponent(window.AFRAME);
 if(!window.AFRAME.components['gp-bounds'])window.AFRAME.registerComponent('gp-bounds',{
  tick(){if(scene?.is('vr-mode'))return;const pos=this.el.getAttribute('position'),r=rig.getAttribute('position');const yaw=rig.object3D.rotation.y;const x=r.x+pos.x*Math.cos(yaw)+pos.z*Math.sin(yaw),z=r.z-pos.x*Math.sin(yaw)+pos.z*Math.cos(yaw);const cl=clampPosition({x,y:pos.y,z},{obstacles:window.GP_OBSTACLES||[]});if(cl.x!==x||cl.z!==z){const dx=cl.x-r.x,dz=cl.z-r.z;this.el.setAttribute('position',{x:dx*Math.cos(yaw)-dz*Math.sin(yaw),y:1.65,z:dx*Math.sin(yaw)+dz*Math.cos(yaw)});}}
 });
}
function buildRoom(){
 entity('a-sky',{color:'#c8c8bc'},scene);
 // A single lightweight room, without remote models or texture dependencies.
 entity('a-box',{position:'0 -0.12 -4.5',width:18,height:.24,depth:27,color:'#c4b79c',roughness:1},scene);
 entity('a-box',{position:'-9 3 -4.5',width:.25,height:6,depth:27,color:'#dedbcf',roughness:1},scene);
 entity('a-box',{position:'9 3 -4.5',width:.25,height:6,depth:27,color:'#dedbcf',roughness:1},scene);
 entity('a-box',{position:'0 3 -18',width:18,height:6,depth:.25,color:'#325247',roughness:1},scene);
 entity('a-box',{position:'0 3 9',width:18,height:6,depth:.25,color:'#d8d5c7',roughness:1},scene);
 entity('a-box',{position:'0 6 -4.5',width:18,height:.18,depth:27,color:'#eeede4',roughness:1},scene);
 // Raised skirting and parquet seams give orientation without expensive assets.
 for(const x of [-8.83,8.83])entity('a-box',{position:`${x} .14 -4.5`,width:.07,height:.28,depth:26.7,color:'#667262'},scene);
 for(let z=-17;z<9;z+=1.4)entity('a-box',{position:`0 .008 ${z}`,width:17.7,height:.008,depth:.012,color:'#a99d84'},scene);
 for(let x=-8.4;x<9;x+=1.4)entity('a-box',{position:`${x} .007 -4.5`,width:.012,height:.008,depth:26.8,color:'#b3a68d'},scene);
 entity('a-plane',{position:'0 .012 -4.5',rotation:'-90 0 0',width:3.4,height:24,color:'#607164',material:'roughness: 1'},scene);
 for(let z=-14;z<8;z+=7){
  entity('a-box',{position:`0 5.84 ${z}`,width:6.5,height:.06,depth:1.8,color:'#fff5d8',material:'shader: flat'},scene);
 }
 entity('a-light',{type:'ambient',intensity:.92,color:'#fff7e4'},scene);
 entity('a-light',{type:'directional',intensity:.65,color:'#fff3d6',position:'-3 5 4'},scene);
 const title=textTexture([{text:roomInfo?.name||'GALERIA PRESIDENCIAL',size:60,serif:true,color:'#eee7d7',gap:24},{text:(roomInfo?.years||'')+' · MUSEU DA REPÚBLICA',size:28,color:'#d7c493'}],{w:1500,h:300,pad:45,bg:'#325247'});
 plane(scene,{position:'0 4.4 -17.83',width:8.6,height:1.72,src:title});
 const note=textTexture([{text:'Bustos estilizados e provisórios.',size:41,serif:true},{text:'Selecione uma peça para conhecer e ouvir sua história.',size:26}],{w:1200,h:260,pad:40,bg:'#325247',color:'#e9e4d5'});
 plane(scene,{position:'0 2.95 -17.8',width:7,height:1.52,src:note});
 button(scene,'REVISAR A VISITA  →','0 1.4 -17.7',4,.68,()=>callbacks.quiz(),{dark:false});
 button(scene,'← SALA ANTERIOR','-5.7 1.4 -17.7',3.2,.65,()=>callbacks.room?.(-1));
 button(scene,'PRÓXIMA SALA →','5.7 1.4 -17.7',3.2,.65,()=>callbacks.room?.(1));
 // Benches leave a wide central route and sit outside the navigation bounds.
 for(const z of [-4,-11]){
  for(const x of [-2.8,2.8]){
   entity('a-box',{position:`${x} .46 ${z}`,width:1.35,height:.14,depth:1.6,color:'#775e42'},scene);
   for(const off of [-.5,.5])entity('a-box',{position:`${x+off} .22 ${z}`,width:.1,height:.44,depth:1.3,color:'#34443d'},scene);
  }
 }
 // An exit and tutorial target remain available inside immersive sessions.
 const back=entity('a-entity',{position:'0 0 8.82',rotation:'0 180 0'},scene);
 button(back,'VOLTAR À ENTRADA','0 2.2 0',3,.65,()=>goHome());
 button(back,'SAIR DO MODO RV','0 1.3 0',3,.65,()=>scene.exitVR());
}
function addPortraits(){
 PRESIDENTS.forEach((p,i)=>{
  const parent=entity('a-entity',{id:'exhibit-'+p.id,position:p.position.join(' '),rotation:`0 ${p.rotation} 0`,scale:'.52 .52 .52'},scene);
  entity('a-box',{position:'0 0 -.08',width:2.65,height:3.05,depth:.12,color:'#f4eddd',roughness:1},parent);
  entity('a-box',{position:'0 0 -.005',width:2.43,height:2.83,depth:.055,color:'#8e7951',metalness:.3,roughness:.6},parent);
  // Assets are locally packaged; image dimensions are cropped in the asset step.
  const image=plane(parent,{position:'0 0 .035',width:2.28,height:2.68,src:'#portrait-'+p.id,class:'gp-interactive',material:'shader: flat; side: front'});
  image.addEventListener('click',()=>callbacks.detail(p.id));
  image.addEventListener('mouseenter',()=>{image.setAttribute('scale','1.025 1.025 1');});
  image.addEventListener('mouseleave',()=>{image.setAttribute('scale','1 1 1');});
  const plaque=textTexture([{text:String(i+1).padStart(2,'0')+'  /  '+p.years,size:28,color:'#786a4f'},{text:p.name,size:47,serif:true},{text:p.era+'  ·  Selecione para conhecer',size:25}],{w:1100,h:300,pad:36});
  const label=plane(parent,{position:'0 -1.93 .035',width:2.8,height:.76,src:plaque,class:'gp-interactive'});label.addEventListener('click',()=>callbacks.detail(p.id));
  addBustStation(p,i);
  // Clickable floor markers implement discrete locomotion for VR and desktop.
  const marker=entity('a-circle',{position:`${p.view[0]} .026 ${p.view[2]}`,rotation:'-90 0 0',radius:.43,color:'#b89d69',material:'shader: flat; side: double',class:'gp-interactive'},scene);
  marker.addEventListener('click',()=>goTo(p.id));
  entity('a-ring',{position:`${p.view[0]} .03 ${p.view[2]}`,rotation:'-90 0 0','radius-inner':.47,'radius-outer':.5,color:'#e4d6b4',material:'shader: flat; side: double'},scene);
 });
}

let selectedBust=null;
function addBustStation(p,index){
 const x=p.position[0]<0?-7.05:7.05;
 const station=entity('a-entity',{id:'bust-station-'+p.id,position:`${x} 0 ${p.position[2]}`,rotation:`0 ${p.rotation} 0`},scene);
 (window.GP_OBSTACLES ||= []).push({x,z:p.position[2],radius:0.9});
 entity('a-cylinder',{position:'0 .045 0',height:.09,radius:.8,color:'#58685c','segments-radial':48},station);
 entity('a-box',{position:'0 .5 0',width:1.06,height:.84,depth:.86,color:'#e8e1d1',roughness:1},station);
 entity('a-box',{position:'0 .95 0',width:1.16,height:.1,depth:.98,color:'#677065',roughness:.8},station);
 const mount=entity('a-entity',{id:'bust-'+p.id,position:'0 1.01 0',rotation:'0 0 0','gp-bust':`president: ${p.id}; external: ${p.model||''}`,class:'gp-interactive'},station);
 mount.addEventListener('click',()=>{selectedBust=p.id;callbacks.detail(p.id);});
 mount.addEventListener('mouseenter',()=>{document.body.style.cursor='pointer';});
 mount.addEventListener('mouseleave',()=>{document.body.style.cursor='';});
 const title=textTexture([{text:String(index+1).padStart(2,'0')+'  ·  '+p.name,size:39,serif:true,gap:8},{text:p.years,size:25,gap:6},{text:'Busto estilizado · versão provisória',size:21,color:'#7a6744'}],{w:1000,h:220,pad:27});
 const plaque=plane(station,{position:'0 .57 .439',width:1,height:.22,src:title,class:'gp-interactive'});plaque.addEventListener('click',()=>callbacks.detail(p.id));
 button(station,'↶  GIRAR','-.32 .33 .445',.29,.11,()=>rotateBust(p.id,-30));
 button(station,'OUVIR / LER','0 .33 .445',.29,.11,()=>callbacks.detail(p.id),{dark:true});
 button(station,'GIRAR  ↷','.32 .33 .445',.29,.11,()=>rotateBust(p.id,30));
 const reference=entity('a-entity',{id:'bust-reference-'+p.id,position:'1.08 .86 .37','busto-referencia':`presidente: ${p.id}; largura: .74`},station);
 reference.addEventListener('busto-referencia-erro',event=>{
  console.error('Falha ao carregar referência visual 2D para '+p.id+':',event.detail.message);
  const fallback=textTexture([{text:'REFERÊNCIA VISUAL 2D',size:32,bold:true},{text:'Não foi possível carregar esta imagem.',size:24}],{w:800,h:1000,pad:50,bg:'#efe8d8'});
  reference.setAttribute('geometry',{primitive:'plane',width:.74,height:.92});
  reference.setAttribute('material',{shader:'flat',side:'double',src:fallback});
 });
 const referenceLabel=textTexture([{text:'REFERÊNCIA 2D · CONCEITO DE IA',size:20,bold:true},{text:'Não é modelo 3D nem textura facial',size:17}],{w:900,h:180,pad:18,bg:'#efe8d8'});
 plane(station,{position:'1.08 1.49 .37',width:.88,height:.18,src:referenceLabel});
}
export function rotateBust(id,delta=30){
 const target=document.getElementById('bust-'+id);if(!target)return false;
 selectedBust=id;const rotation=target.getAttribute('rotation');target.setAttribute('rotation',{x:0,y:(rotation.y+delta)%360,z:0});return true;
}
export function resetBust(id){const target=document.getElementById('bust-'+id);if(target)target.setAttribute('rotation','0 0 0');}

export function initializeScene(handlers,members=INITIAL_PRESIDENTS,room=null){
 callbacks=handlers;PRESIDENTS=members;roomInfo=room;
 if(!window.AFRAME){callbacks.error('A biblioteca da sala 3D não carregou. Você pode explorar todos os painéis em texto.');return;}
 const gl=document.createElement('canvas');if(!gl.getContext('webgl2')&&!gl.getContext('webgl')){callbacks.error('O dispositivo não disponibilizou WebGL. A coleção em texto continua acessível.');return;}
 register();
 scene=entity('a-scene',{embedded:'',renderer:'antialias: true; colorManagement: true; sortObjects: true; physicallyCorrectLights: false','vr-mode-ui':'enabled: false','device-orientation-permission-ui':'enabled: false','loading-screen':'enabled: false',webxr:'referenceSpaceType: local-floor; optionalFeatures: local-floor, bounded-floor',background:'color: #d2cec1'},$('scene-container'));
 assets=entity('a-assets',{timeout:15000},scene);
 // Portrait assets are installed per active room inside buildExhibition.
 buildExhibition();
 rig=entity('a-entity',{id:'camera-rig',position:'0 0 6.7'},scene);
  camera=entity('a-camera',{id:'visitor-camera',position:'0 2.0 -3.5',rotation:'15 0 0','look-controls':'pointerLockEnabled: false; touchEnabled: true','wasd-controls':'acceleration: 16','gp-bounds':''},rig);
  const visitorAvatar=entity('a-entity',{id:'visitor-avatar',position:'0 -2.0 3.5'},camera);
  entity('a-cylinder',{position:'0 0.9 0',radius:0.35,height:1.8,color:'#233e34'},visitorAvatar);
  entity('a-sphere',{position:'0 2.0 0',radius:0.32,color:'#c99a73'},visitorAvatar);
  entity('a-box',{position:'0 0.15 0',width:0.5,height:0.12,depth:0.7,color:'#3a2a1a'},visitorAvatar);
 entity('a-entity',{id:'mouse-cursor',cursor:'rayOrigin: mouse; fuse: false',raycaster:'objects: .gp-interactive; far: 24'},scene);
 entity('a-entity',{'laser-controls':'hand: right; model: false',raycaster:'objects: .gp-interactive; far: 24; lineColor: #c9af76'},rig);
 entity('a-entity',{'laser-controls':'hand: left; model: false',raycaster:'objects: .gp-interactive; far: 24; lineColor: #c9af76'},rig);
 const gaze=entity('a-entity',{id:'gaze-cursor',position:'0 0 -1',geometry:'primitive: ring; radiusInner: 0.008; radiusOuter: 0.012',material:'color: #d4b879; shader: flat',visible:false,raycaster:'objects: .gp-interactive; far: 24; enabled: false'},camera);
 const onReady=()=>callbacks.ready();scene.addEventListener('loaded',onReady,{once:true});if(scene.hasLoaded)onReady();
 scene.addEventListener('render-target-loaded',()=>callbacks.rendered?.(),{once:true});
 scene.addEventListener('enter-vr',()=>{
  currentMode='vr';$('mouse-cursor').setAttribute('raycaster','enabled',false);camera.setAttribute('wasd-controls','enabled',false);
  gaze.setAttribute('visible',true);gaze.setAttribute('cursor','fuse: true; fuseTimeout: 1800');gaze.setAttribute('raycaster','enabled',true);
  callbacks.xr(true);
 });
 scene.addEventListener('exit-vr',()=>{currentMode='desktop';$('mouse-cursor').setAttribute('raycaster','enabled',true);camera.setAttribute('wasd-controls','enabled',true);gaze.setAttribute('visible',false);gaze.removeAttribute('cursor');gaze.setAttribute('raycaster','enabled',false);closeXR();callbacks.xr(false);});
 document.addEventListener('keydown',e=>{if(e.code==='Escape')closeXR();if(selectedBust&&!document.querySelector('dialog[open]')){if(e.code==='KeyQ')rotateBust(selectedBust,-15);if(e.code==='KeyE')rotateBust(selectedBust,15);}});
}
export function setMovement(enabled){if(camera){camera.setAttribute('wasd-controls','enabled',enabled&&currentMode!=='vr');camera.setAttribute('look-controls','enabled',enabled);}}
export function isXR(){return !!scene?.is('vr-mode');}
export function goHome(){goTo(null);}
export function goTo(id){
 if(!rig||!camera)return false;
 closeXR();const p=PRESIDENTS.find(p=>p.id===id),point=p?p.view:[0,0,6.7],yaw=p?p.heading:0;
 rig.setAttribute('position',point.join(' '));rig.setAttribute('rotation',`0 ${yaw} 0`);camera.setAttribute('position','0 2.0 -3.5');camera.setAttribute('rotation','15 0 0');
 const look=camera.components['look-controls'];if(look&&!isXR()){look.yawObject.rotation.y=0;look.pitchObject.rotation.x=0;}
 selectedBust=p?.id||null;callbacks.location(p||null);return true;
}
function placeOverlay(){
 closeXR();overlay=entity('a-entity',{id:'xr-info'},scene);
 const v=new window.AFRAME.THREE.Vector3(),dir=new window.AFRAME.THREE.Vector3();camera.object3D.getWorldPosition(v);camera.getObject3D('camera').getWorldDirection(dir);dir.y=0;dir.normalize();
 overlay.object3D.position.copy(v).addScaledVector(dir,2.8);overlay.object3D.position.y=v.y+.1;overlay.object3D.lookAt(v.x,v.y+.1,v.z);overlay.object3D.scale.set(.75,.75,.75);
 return overlay;
}
export function closeXR(){if(overlay){
 // Dispose only the transient overlay's geometry. The cached texture assets are shared.
 overlay.object3D.traverse(o=>{if(o.isMesh){o.geometry?.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>{m?.map?.dispose();m?.dispose();});}});overlay.remove();overlay=null;assets.querySelectorAll('[data-xr-transient]').forEach(c=>c.remove());
}}
export function showXRDetail(p,index){
 const root=placeOverlay();
 const tex=textTexture([{text:p.era.toUpperCase(),size:23,color:'#8a754f',gap:15},{text:p.name,size:57,serif:true,gap:8},{text:p.years,size:31,color:'#8a754f',gap:25},{text:p.summary,size:31,lineHeight:42,gap:20},{text:p.milestone,size:32,serif:true,gap:12},{text:p.detail,size:27,lineHeight:35}],{w:1100,h:1100,pad:55});
 plane(root,{position:'0 .2 0',width:3.4,height:3.4,src:tex});
 button(root,'OUVIR HISTÓRIA','0 -2.2 .02',2.5,.3,()=>callbacks.narrate?.(p));
 button(root,'← ANTERIOR','-1.15 -1.8 .02',1.04,.25,()=>callbacks.detail(PRESIDENTS[(index+PRESIDENTS.length-1)%PRESIDENTS.length].id));
 button(root,'FECHAR','0 -1.8 .02',1,.25,()=>closeXR(),{dark:true});
 button(root,'PRÓXIMO →','1.15 -1.8 .02',1.04,.25,()=>callbacks.detail(PRESIDENTS[(index+1)%PRESIDENTS.length].id));
}
export function showXRQuiz(state,handlers){
 const root=placeOverlay();
 if(state.complete){
  const tex=textTexture([{text:'REVISÃO CONCLUÍDA',size:29,color:'#8a754f'},{text:`${state.score} de ${state.total} acertos`,size:64,serif:true},{text:'Você pode revisitar os painéis e tentar novamente. O quiz é uma revisão, não uma avaliação escolar.',size:35,lineHeight:49}],{w:1100,h:700,pad:60});
  plane(root,{width:3.4,height:2.16,src:tex});button(root,'REFAZER QUIZ','-.87 -1.35 .02',1.6,.38,handlers.restart,{dark:true});button(root,'VOLTAR À SALA','.87 -1.35 .02',1.6,.38,closeXR);return;
 }
 const q=state.current,feedback=state.answered?((state.answers[state.index]===q.answer?'Resposta correta. ':'Resposta incorreta. ')+q.explanation):'Selecione uma alternativa para responder.';
 const tex=textTexture([{text:`QUESTÃO ${state.index+1} DE ${state.total}`,size:25,color:'#8a754f'},{text:q.question,size:43,serif:true,lineHeight:55}],{w:1100,h:390,pad:48});
 plane(root,{position:'0 1.05 0',width:3.4,height:1.2,src:tex});
 q.options.forEach((o,i)=>button(root,`${String.fromCharCode(65+i)}  ·  ${o}` ,`0 ${.12-i*.42} .02`,3.4,.36,()=>handlers.answer(i),{dark:state.answered&&i===q.answer}));
 const feed=textTexture([{text:feedback,size:28,lineHeight:37}],{w:1100,h:280,pad:35});plane(root,{position:'0 -1.45 0',width:3.4,height:.87,src:feed});
 button(root,'VOLTAR À SALA','-.9 -2.08 .03',1.55,.32,closeXR);
 if(state.answered)button(root,state.index===state.total-1?'VER RESULTADO':'PRÓXIMA →','.9 -2.08 .03',1.55,.32,handlers.next,{dark:true});
}
export async function enterXR(){if(!scene)throw new Error('A sala ainda não está pronta.');await scene.enterVR();}
export async function supportsXR(){try{return !!(navigator.xr&&await navigator.xr.isSessionSupported('immersive-vr'));}catch{return false;}}
export async function toggleFullscreen(){const el=document.querySelector('.gallery');if(document.fullscreenElement)await document.exitFullscreen();else if(el.requestFullscreen)await el.requestFullscreen();else throw new Error('Tela cheia não disponível neste navegador.');}
export function getScene(){return scene;}

function buildExhibition(){
 const actualScene=scene;exhibition=entity('a-entity',{id:'active-exhibition'},scene);
 for(const p of PRESIDENTS){if(!p.image)continue;const img=document.createElement('img');img.id='portrait-'+p.id;img.src=p.image;img.crossOrigin='anonymous';img.dataset.portrait='true';assets.append(img);}
 scene=exhibition;buildRoom();addPortraits();scene=actualScene;
}
export function switchRoom(members,room){
 if(!scene||!assets)return false;closeXR();selectedBust=null;setMovement(false);
 if(exhibition){
 const textures=new Set(),materials=new Set(),geometries=new Set();
 exhibition.object3D.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:[o.material])){if(m){materials.add(m);if(m.map)textures.add(m.map);}}}});
 exhibition.remove();geometries.forEach(g=>g?.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
 }
 assets.querySelectorAll('canvas,img[data-portrait]').forEach(e=>e.remove());
 PRESIDENTS=members;roomInfo=room;window.GP_OBSTACLES=[];buildExhibition();goHome();return true;
}
export function showXRNarration(p,caption,handlers){
 if(!isXR())return;const root=placeOverlay();
 const tex=textTexture([{text:p.name,size:53,serif:true},{text:'DRAMATIZAÇÃO EDUCATIVA · VOZ SINTÉTICA',size:24,color:'#8a754f'},{text:caption,size:36,lineHeight:49}],{w:1100,h:700,pad:55});
 plane(root,{width:3.4,height:2.16,src:tex});button(root,'PAUSAR','-1.15 -1.4 .02',1.04,.32,handlers.pause);button(root,'CONTINUAR','0 -1.4 .02',1.04,.32,handlers.play);button(root,'VOLTAR','1.15 -1.4 .02',1.04,.32,handlers.back);
}
