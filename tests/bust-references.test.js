import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CATALOG} from '../dist/catalog.js';

const referenceDirectory=new URL('../dist/bustos-referencias/',import.meta.url);
const manifest=JSON.parse(fs.readFileSync(new URL('bustos.json',referenceDirectory),'utf8'));

test('36 referências 2D correspondem aos presidentes pelo id e usam recortes válidos',()=>{
 assert.equal(manifest.presidents.length,36);
 assert.equal(new Set(manifest.presidents.map(p=>p.id)).size,36);
 assert.equal(CATALOG.length,36);
 const catalog=new Map(CATALOG.map(p=>[p.id,p]));
 const atlases=new Map(manifest.atlases.map(atlas=>[atlas.id,atlas]));
 assert.equal(atlases.size,6);

 for(const president of manifest.presidents){
  const record=catalog.get(president.id);
  assert.ok(record,`ID sem presidente no catálogo: ${president.id}`);
  assert.equal(record.name,president.name);
  assert.equal(president.assetType,'generated-concept-image');
  assert.equal(president.is3D,false);
  assert.equal(president.facialLikenessValidated,false);
  assert.equal(president.modelUrl,null);
  assert.equal(president.audioUrl,null);

  const atlas=atlases.get(president.atlas);
  assert.ok(atlas,`Prancha não encontrada para ${president.id}`);
  const imagePath=new URL(atlas.src,new URL('bustos.json',referenceDirectory));
  assert.ok(fs.existsSync(imagePath),`Imagem ausente para ${president.id}: ${imagePath.pathname}`);
  const image=fs.readFileSync(imagePath);
  assert.ok(image.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])));
  assert.equal(image.readUInt32BE(16),atlas.width);
  assert.equal(image.readUInt32BE(20),atlas.height);

  const [x,y,width,height]=president.rect;
  assert.equal(president.rect.length,4);
  assert.ok([x,y,width,height].every(Number.isInteger));
  assert.ok(x>=0&&y>=0&&width>0&&height>0);
  assert.ok(x+width<=atlas.width,`Recorte excede a largura da prancha: ${president.id}`);
  assert.ok(y+height<=atlas.height,`Recorte excede a altura da prancha: ${president.id}`);
 }
 assert.deepEqual([...catalog.keys()].sort(),manifest.presidents.map(p=>p.id).sort());
});
