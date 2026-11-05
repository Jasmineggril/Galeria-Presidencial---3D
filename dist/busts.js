/** Original, stylized meshes for the prototype. Not scans or historically exact likenesses.
 * All dimensions are in metres. The same geometry is used in the room and in GLB exports.
 */
export const BUST_PROFILES = {
 deodoro:{headWidth:.269,headDepth:.245,headHeight:.35,hair:'receding',beard:true,moustache:true,military:true,brow:.012,cheek:.009,color:'#a88956'},
 vargas:{headWidth:.283,headDepth:.245,headHeight:.342,hair:'swept',hairline:1.08,cheek:.017,brow:.018,color:'#a88956'},
 jk:{headWidth:.253,headDepth:.235,headHeight:.362,hair:'swept',hairline:1.13,cheek:.007,brow:.013,color:'#a88956'},
 castello:{headWidth:.278,headDepth:.246,headHeight:.346,hair:'receding',cheek:.013,brow:.019,color:'#a88956'},
 sarney:{headWidth:.272,headDepth:.245,headHeight:.35,hair:'swept',hairline:1.1,moustache:true,cheek:.012,brow:.014,color:'#a88956'},
  lula:{headWidth:.285,headDepth:.255,headHeight:.348,hair:'swept',hairline:1.02,beard:true,cheek:.018,brow:.016,color:'#a88956'}
};
const gauss=(x,s)=>Math.exp(-(x*x)/(s*s));
export function createBust(THREE,id){
 const p=BUST_PROFILES[id];if(!p)throw new Error('Unknown bust profile: '+id);
 const root=new THREE.Group();root.name='Busto estilizado '+id;
 const bronze=new THREE.MeshStandardMaterial({color:p.color,metalness:.64,roughness:.43});
 const hair=new THREE.MeshStandardMaterial({color:'#75603d',metalness:.57,roughness:.55});
 const recess=new THREE.MeshStandardMaterial({color:'#5c4e36',metalness:.5,roughness:.6});
 const highlight=new THREE.MeshStandardMaterial({color:'#b39761',metalness:.67,roughness:.4});
 function mesh(name,geo,mat=bronze,pos=[0,0,0],rot=[0,0,0]){const m=new THREE.Mesh(geo,mat);m.name=name;m.position.set(...pos);m.rotation.set(...rot);m.castShadow=true;m.receiveShadow=true;root.add(m);return m;}
 function oval(name,pos,scale,mat=bronze){const m=mesh(name,new THREE.SphereGeometry(1,28,20),mat,pos);m.scale.set(...scale);return m;}
 function curve(name,points,radius,mat=bronze){return mesh(name,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(v=>new THREE.Vector3(...v))),24,radius,7,false),mat);}
 function surface(name,rings,segments=64,mat=bronze){
  const vertices=[],indices=[];
  rings.forEach(([y,rx,rz],j)=>{for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2;vertices.push(Math.sin(a)*rx,y,Math.cos(a)*rz);if(j&&i){const b=j*(segments+1)+i;indices.push(b,b-1,b-segments-2,b,b-segments-2,b-segments-1);}}});
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();return mesh(name,geo,mat);
 }
 surface('Volume dos ombros e tronco',[[.015,.37,.19],[.06,.43,.22],[.14,.52,.245],[.27,.61,.23],[.35,.57,.21],[.45,.44,.185],[.54,.27,.15],[.6,.145,.12],[.61,.01,.01]]);
 // Collar, lapels and tie are sculptural relief, all in the same bronze family.
 oval('Pescoço',[0,.635,0],[.135,.19,.12]);
 const shape=(pts)=>{const sh=new THREE.Shape();pts.forEach((v,i)=>i?sh.lineTo(v[0],v[1]):sh.moveTo(v[0],v[1]));sh.closePath();return new THREE.ShapeGeometry(sh);};
 mesh('Lapela esquerda',shape([[-.12,.58],[-.38,.39],[-.25,.23],[-.07,.12],[-.02,.31]]),highlight,[0,0,.212]);
 mesh('Lapela direita',shape([[.12,.58],[.38,.39],[.25,.23],[.07,.12],[.02,.31]]),highlight,[0,0,.212]);
 if(!p.feminine)mesh('Gravata',shape([[-.035,.49],[.035,.49],[.06,.15],[0,.08],[-.06,.15]]),hair,[0,0,.253]);
 if(!p.feminine)oval('Nó da gravata',[0,.51,.23],[.046,.046,.03],highlight);
 for(const sign of [-1,1])curve('Costura da lapela '+sign,[[sign*.12,.575,.222],[sign*.3,.4,.24],[sign*.09,.15,.25]],.006,hair);
 // A continuous head surface supplies cheek, brow and eye-socket relief.
 const nlat=42,nlon=64,pos=[],ind=[];
 for(let j=0;j<=nlat;j++){
  const theta=j/nlat*Math.PI,yy=Math.cos(theta)*p.headHeight,ring=Math.sin(theta);
  for(let i=0;i<=nlon;i++){
   const phi=i/nlon*Math.PI*2;let x=Math.sin(phi)*p.headWidth*ring,y=1.025+yy,z=Math.cos(phi)*p.headDepth*ring;
   // Narrow the lower jaw smoothly while preserving a rounded chin.
   if(yy<-.1)x*=1-.2*Math.min(1,(-yy-.1)/.22);
   if(z>0){
    const front=Math.pow(Math.max(0,Math.cos(phi)),3);
    const sockets=.018*(gauss(x-.105,.049)+gauss(x+.105,.049))*gauss(y-1.085,.035);
    const cheeks=p.cheek*(gauss(x-.142,.08)+gauss(x+.142,.08))*gauss(y-.995,.065);
    const brow=p.brow*(gauss(x-.104,.06)+gauss(x+.104,.06))*gauss(y-1.125,.027);
    z+=front*(cheeks+brow-sockets);
   }
   pos.push(x,y,z);
   if(i&&j){const b=j*(nlon+1)+i;ind.push(b,b-nlon-2,b-1,b,b-nlon-1,b-nlon-2);}
  }
 }
 const headGeo=new THREE.BufferGeometry();headGeo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));headGeo.setIndex(ind);headGeo.computeVertexNormals();mesh('Cabeça com relevo facial',headGeo);
 for(const sign of [-1,1]){
  oval('Orelha '+sign,[sign*(p.headWidth-.002),1.034,-.005],[.052,.095,.045]);
  oval('Relevo interno da orelha '+sign,[sign*(p.headWidth+.025),1.036,.023],[.016,.057,.014],hair);
  oval('Olho esculpido '+sign,[sign*.103,1.085,.222],[.043,.018,.012],recess);
  oval('Globo ocular '+sign,[sign*.103,1.084,.231],[.028,.011,.006],bronze);
  curve('Pálpebra superior '+sign,[[sign*.055,1.085,.223],[sign*.103,1.105,.232],[sign*.15,1.084,.217]],.007,highlight);
  curve('Pálpebra inferior '+sign,[[sign*.057,1.078,.222],[sign*.103,1.067,.228],[sign*.147,1.077,.217]],.0045);
  curve('Sobrancelha '+sign,[[sign*.05,1.127,.224],[sign*.104,1.14,.228],[sign*.158,1.121,.207]],.012,hair);
 }
 oval('Ponte do nariz',[0,1.024,.242],[.04,.09,.039]);oval('Ponta do nariz',[0,.982,.29],[.052,.032,.045]);
 for(const sign of [-1,1])oval('Asa do nariz '+sign,[sign*.04,.971,.264],[.026,.02,.024]);
 curve('Linha da boca',[[-.083,.901,.216],[0,.895,.242],[.083,.901,.216]],.006,recess);
 curve('Lábio inferior',[[-.063,.888,.217],[0,.881,.236],[.063,.888,.217]],.008,highlight);
 oval('Queixo',[0,.804,.115],[.112,.057,.064]);
 if(p.hair==='swept'){
  const pts=[],ix=[],rows=18,cols=60;
  for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
   const phi=i/cols*Math.PI*2;const front=(Math.cos(phi)+1)/2;
   const maxAngle=1.83-front*(1.83-p.hairline)+.06*Math.sin(phi);
   const a=j/rows*maxAngle;pts.push(Math.sin(phi)*Math.sin(a)*(p.headWidth+.009),1.025+Math.cos(a)*(p.headHeight+.018),Math.cos(phi)*Math.sin(a)*(p.headDepth+.012));
   if(j&&i){const b=j*(cols+1)+i;ix.push(b,b-cols-2,b-1,b,b-cols-1,b-cols-2);}
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));geo.setIndex(ix);geo.computeVertexNormals();mesh('Cabelo com linha recuada',geo,hair);
  for(let k=0;k<5;k++){const x=-.19+k*.068;curve('Mecha de cabelo '+k,[[x,1.23,.183],[x+.015,1.31,.137],[x+.04,1.365,.015]],.005,highlight);}
 }else{
  for(const sign of [-1,1]){oval('Cabelo lateral '+sign,[sign*.227,1.14,-.045],[.065,.125,.18],hair);}
 }
 if(p.feminine){for(const sign of [-1,1])oval('Cabelo longo '+sign,[sign*.23,1.08,-.06],[.075,.21,.15],hair);}
 if(p.glasses){for(const sign of [-1,1])mesh('Óculos '+sign,new THREE.TorusGeometry(.068,.005,6,24),hair,[sign*.105,1.075,.238]);curve('Ponte dos óculos',[[-.035,1.08,.24],[0,1.09,.25],[.035,1.08,.24]],.004,hair);}
 if(p.moustache){
  for(const sign of [-1,1]){
   curve('Bigode '+sign,[[sign*.008,.944,.26],[sign*.06,.942,.267],[sign*.112,.92,.22]],p.beard?.023:.018,hair);
  }
 }
 if(p.goatee){oval('Cavanhaque estilizado',[0,.797,.19],[.096,.11,.085],hair);}
 if(p.beard){
  oval('Barba central',[0,.799,.185],[.16,.166,.132],hair);
  for(const sign of [-1,1]){
   oval('Barba lateral '+sign,[sign*.173,.879,.101],[.085,.16,.106],hair);
   for(let k=0;k<5;k++){const x=sign*(.018+k*.028);curve('Sulco da barba '+sign+' '+k,[[x,.86,.29],[x*.94,.76,.29],[x*.72,.655,.2]],.0045,highlight);}
  }
 }
 if(p.military){
  for(const sign of [-1,1]){
   oval('Ombreira '+sign,[sign*.49,.368,.02],[.16,.035,.17],highlight);
   for(let k=0;k<4;k++)curve('Galão '+sign+' '+k,[[sign*(.39+k*.035),.397,-.08],[sign*(.39+k*.035),.407,.08]],.008,hair);
  }
  for(let k=0;k<3;k++)oval('Medalha '+k,[-.29+k*.09,.25,.247],[.027,.04,.012],highlight);
 }
 root.userData={kind:'stylized-bust',presidentId:id,historicallyExact:false,author:'Galeria Presidencial — protótipo acadêmico',units:'metres'};
 root.updateMatrixWorld(true);return root;
}

export function registerBustComponent(AFRAME){
 if(AFRAME.components['gp-bust'])return;
 AFRAME.registerComponent('gp-bust',{
  schema:{president:{type:'string'},external:{type:'string',default:''}},
  init(){this.onModelError=()=>{if(!this.data.external)return;this.el.removeAttribute('gltf-model');const group=createBust(AFRAME.THREE,this.data.president);this.el.setObject3D('mesh',group);this.el.emit('bust-fallback',{president:this.data.president});};this.el.addEventListener('model-error',this.onModelError);this.attach();},
  update(old){if(old.president!==undefined&&(old.president!==this.data.president||old.external!==this.data.external))this.attach();},
  attach(){
   this.disposeModel();if(this.data.external){this.el.setAttribute('gltf-model',this.data.external);return;}
   const group=createBust(AFRAME.THREE,this.data.president);this.el.setObject3D('mesh',group);this.el.emit('bust-ready',{president:this.data.president});
  },
  disposeModel(){const g=this.el.getObject3D('mesh');if(!g)return;const mats=new Set();g.traverse(o=>{if(o.isMesh){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>mats.add(m));}});mats.forEach(m=>m.dispose());this.el.removeObject3D('mesh');},
  remove(){this.el.removeEventListener('model-error',this.onModelError);this.disposeModel();}
 });
}
