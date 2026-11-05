import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';
import {CATALOG} from '../dist/catalog.js';import {PUBLIC_PORTRAITS} from '../dist/public-data.js';
test('36 fotografias identificadas com licença de reutilização e integridade dos arquivos',()=>{
 assert.equal(Object.keys(PUBLIC_PORTRAITS).length,36);const hashes=new Set();
 for(const p of CATALOG){const c=PUBLIC_PORTRAITS[p.id];assert.ok(c);assert.equal(p.image,c.localPath);assert.equal(c.width,480);assert.equal(c.height,600);assert.match(c.page,/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);assert.ok(c.artist);assert.match(c.license,/^(Public domain|CC BY |CC BY-SA |CC0)/);if(c.license!=='Public domain')assert.match(c.licenseUrl,/^https?:\/\//);assert.ok(c.changes.includes('4:5'));const bytes=fs.readFileSync(new URL('../dist/'+c.localPath,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),c.sha256);hashes.add(c.sha256);}
 assert.equal(hashes.size,36);assert.match(PUBLIC_PORTRAITS.castello.file,/Humberto|Castelo.*presidente/i);
});
