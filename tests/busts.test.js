import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {BUST_PROFILES} from '../dist/busts.js';import {PRESIDENTS} from '../dist/content.js';
test('cada presidente tem um perfil de busto e um GLB válido com geometria finita',()=>{
 for(const p of PRESIDENTS){
  assert.ok(BUST_PROFILES[p.id]);const b=fs.readFileSync(new URL('../dist/assets/busts/'+p.id+'.glb',import.meta.url));
  assert.equal(b.readUInt32LE(0),0x46546c67);assert.equal(b.readUInt32LE(4),2);assert.equal(b.readUInt32LE(8),b.length);
  const len=b.readUInt32LE(12);assert.equal(b.readUInt32LE(16),0x4e4f534a);const doc=JSON.parse(b.toString('utf8',20,20+len));
  assert.equal(doc.extras.presidentId,p.id);assert.equal(doc.extras.historicallyExact,false);
  const binStart=28+len;assert.equal(b.readUInt32LE(24+len),0x004e4942);
  for(const primitive of doc.meshes[0].primitives){
   const pa=doc.accessors[primitive.attributes.POSITION],pv=doc.bufferViews[pa.bufferView],ia=doc.accessors[primitive.indices],iv=doc.bufferViews[ia.bufferView];
   assert.equal(ia.count%3,0);assert.ok(binStart+pv.byteOffset+pv.byteLength<=b.length);assert.ok(binStart+iv.byteOffset+iv.byteLength<=b.length);
   for(let i=0;i<pa.count*3;i++)assert.ok(Number.isFinite(b.readFloatLE(binStart+pv.byteOffset+i*4)));
   for(let i=0;i<ia.count;i++)assert.ok(b.readUInt32LE(binStart+iv.byteOffset+i*4)<pa.count);
  }
 }
});
test('os perfis distinguem barba, bigode, cabelo e proporções',()=>{assert.equal(BUST_PROFILES.deodoro.beard,true);assert.equal(BUST_PROFILES.sarney.moustache,true);assert.equal(BUST_PROFILES.castello.hair,'receding');assert.notEqual(BUST_PROFILES.jk.headWidth,BUST_PROFILES.vargas.headWidth);});
