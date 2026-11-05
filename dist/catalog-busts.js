import {BUST_PROFILES} from './busts.js';
/** Coarse manual review of public portrait references: hair, facial hair and glasses.
 * Proportions remain procedural studies, not measured reconstructions of real faces.
 */
export function registerCatalogBusts(catalog){
 const moustaches=new Set(['floriano','prudente','campos','rodrigues','afonso','nilo','hermes','venceslau','delfim','epitacio','bernardes','washington','janio']);
 const beards=new Set(['prudente','afonso','lula']);
 const goatees=new Set(['rodrigues','nilo','washington']);
 const receding=new Set(['afonso','linhares','dutra','nereu','medici','geisel','figueiredo','temer']);
 const glasses=new Set(['bernardes','cafe','janio','geisel','itamar','fhc']);
 catalog.forEach((p,i)=>{
  if(BUST_PROFILES[p.id])return;
  BUST_PROFILES[p.id]={headWidth:.248+(i%7)*.007,headDepth:.225+(i%5)*.006,headHeight:.329+(i%6)*.008,hair:receding.has(p.id)?'receding':'swept',hairline:1.05+(i%4)*.025,beard:beards.has(p.id),goatee:goatees.has(p.id),moustache:moustaches.has(p.id),military:p.isMilitary===true&&p.id!=='bolsonaro',brow:.011+(i%4)*.003,cheek:.006+(i%5)*.003,feminine:p.id==='dilma',glasses:glasses.has(p.id),color:'#a88956'};
 });
}
