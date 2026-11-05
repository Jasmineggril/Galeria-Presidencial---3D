import test from 'node:test';
import assert from 'node:assert/strict';
import {AVATAR_OPTIONS,normalizeAvatar,avatarSummary} from '../dist/avatar.js';

test('avatar possui opções completas e normaliza valores inválidos', () => {
  for (const group of Object.values(AVATAR_OPTIONS)) {
    assert.ok(Array.isArray(group) && group.length >= 3);
    assert.equal(new Set(group.map(item => item.id)).size, group.length);
  }
  const avatar = normalizeAvatar({skinTone:'invalid', hairStyle:'long', displayName:'  '});
  assert.equal(avatar.skinTone,'medium');
  assert.equal(avatar.hairStyle,'long');
  assert.equal(avatar.displayName,'Visitante');
  assert.ok(avatarSummary(avatar).includes('Visitante'));
});

test('avatar não limita opções por gênero', () => {
  assert.ok(!Object.keys(AVATAR_OPTIONS).some(key => /gender|genero/i.test(key)));
});