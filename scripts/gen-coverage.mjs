import fs from 'node:fs';
import {CATALOG} from '../dist/catalog.js';
const manifest=JSON.parse(fs.readFileSync('dist/assets/audio/manifest.json','utf8'));
const recordings=manifest.recordings||{};
let md='# Cobertura dos 36 presidentes\n\n';
md+='| ID | Nome | Sala | Retrato | GLB | Áudio | Fonte |\n|---|---|---|---|---|---|---|\n';
for(const p of CATALOG){
  const glb=fs.existsSync('dist/assets/busts/'+p.id+'.glb')?'sim':'não';
  const audio=recordings[p.id]?'ElevenLabs':'síntese navegador';
  const portrait=p.image?'histórico':'estudo';
  md+=`| ${p.id} | ${p.name} | ${p.room} | ${portrait} | ${glb} | ${audio} | ${p.sourceName} |\n`;
}
fs.writeFileSync('docs/coverage-36.md',md);
console.log('done');
