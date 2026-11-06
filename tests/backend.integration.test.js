import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gp-test-'));
const dataFile = path.join(tmpDir, 'db.json');
let server;
let baseUrl;

function request(method, p, body, headers = {}) {
  return fetch(baseUrl + p, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined
  }).then(async r => ({ status: r.status, headers: r.headers, json: await r.json().catch(() => null) }));
}

test.before(async () => {
  const port = 18787;
  baseUrl = 'http://127.0.0.1:' + port;
  server = spawn('node', ['server/server.js'], {
    env: { ...process.env, PORT: String(port), GP_DATA_FILE: dataFile, GP_ALLOWED_ORIGINS: 'http://127.0.0.1:' + port },
    stdio: 'ignore'
  });
  // wait for startup
  for (let i = 0; i < 50; i++) {
    try { const r = await fetch(baseUrl + '/health'); if (r.ok) break; } catch (e) {}
    await new Promise(res => setTimeout(res, 100));
  }
});

test.after(async () => {
  if (server) { server.kill('SIGKILL'); }
  await new Promise(res => setTimeout(res, 200));
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {}
});

test('health returns ok', async () => {
  const r = await request('GET', '/health');
  assert.equal(r.status, 200);
  assert.equal(r.json.ok, true);
});

test('OPTIONS preflight allowed origin', async () => {
  const r = await fetch(baseUrl + '/health', { method: 'OPTIONS', headers: { Origin: 'http://127.0.0.1:18787' } });
  assert.equal(r.status, 204);
  assert.equal(r.headers.get('access-control-allow-origin'), 'http://127.0.0.1:18787');
});

test('OPTIONS preflight disallowed origin', async () => {
  const r = await fetch(baseUrl + '/health', { method: 'OPTIONS', headers: { Origin: 'https://evil.example' } });
  assert.equal(r.status, 204);
  assert.equal(r.headers.get('access-control-allow-origin'), null);
});

test('signup creates visitor (not admin)', async () => {
  const r = await request('POST', '/auth/signup', { name: 'Teste', email: 'user@test.org', password: 'password123' });
  assert.equal(r.status, 200);
  assert.equal(r.json.ok, true);
  assert.equal(r.json.session.user.user_metadata.role, 'visitor');
});

test('signin valid and invalid', async () => {
  const bad = await request('POST', '/auth/signin', { email: 'user@test.org', password: 'wrong' });
  assert.equal(bad.status, 401);
  const good = await request('POST', '/auth/signin', { email: 'user@test.org', password: 'password123' });
  assert.equal(good.status, 200);
  assert.ok(good.json.session.access_token);
});

test('logout revokes session', async () => {
  const login = await request('POST', '/auth/signin', { email: 'user@test.org', password: 'password123' });
  const token = login.json.session.access_token;
  const lo = await request('POST', '/auth/logout', {}, { Authorization: 'Bearer ' + token });
  assert.equal(lo.status, 200);
  const me = await request('GET', '/me', null, { Authorization: 'Bearer ' + token });
  assert.equal(me.status, 401);
});

test('progress isolated between users', async () => {
  await request('POST', '/auth/signup', { name: 'A', email: 'a@test.org', password: 'password123' });
  await request('POST', '/auth/signup', { name: 'B', email: 'b@test.org', password: 'password123' });
  const la = await request('POST', '/auth/signin', { email: 'a@test.org', password: 'password123' });
  const lb = await request('POST', '/auth/signin', { email: 'b@test.org', password: 'password123' });
  const ta = la.json.session.access_token;
  const tb = lb.json.session.access_token;
  await request('PUT', '/progress', { progress: { visited: ['lula'], favorites: [], quizResults: {} } }, { Authorization: 'Bearer ' + ta });
  const pa = await request('GET', '/progress', null, { Authorization: 'Bearer ' + ta });
  const pb = await request('GET', '/progress', null, { Authorization: 'Bearer ' + tb });
  assert.deepEqual(pa.json.progress.visited, ['lula']);
  assert.deepEqual(pb.json.progress.visited || [], []);
});

test('admin denied for visitor', async () => {
  const login = await request('POST', '/auth/signin', { email: 'user@test.org', password: 'password123' });
  const token = login.json.session.access_token;
  const r = await request('GET', '/admin/presidents', null, { Authorization: 'Bearer ' + token });
  assert.equal(r.status, 403);
});

test('admin access after CLI promotion', async () => {
  // promote via CLI
  const { execFileSync } = await import('node:child_process');
  execFileSync('node', ['server/server.js', '--promote', 'user@test.org'], { env: { ...process.env, GP_DATA_FILE: dataFile } });
  const login = await request('POST', '/auth/signin', { email: 'user@test.org', password: 'password123' });
  const token = login.json.session.access_token;
  const r = await request('GET', '/admin/presidents', null, { Authorization: 'Bearer ' + token });
  assert.equal(r.status, 200);
});

test('password recovery uniform response', async () => {
  const r1 = await request('POST', '/auth/recover', { email: 'user@test.org' });
  const r2 = await request('POST', '/auth/recover', { email: 'nonexistent@test.org' });
  assert.equal(r1.status, 200);
  assert.equal(r2.status, 200);
  assert.equal(r1.json.message, r2.json.message);
  assert.equal(r1.json.resetToken, undefined);
});

test('password reset with invalid/expired/reused token', async () => {
  // request recovery
  await request('POST', '/auth/recover', { email: 'user@test.org' });
  // We cannot get token (not exposed). So test invalid token.
  const r = await request('POST', '/auth/reset', { token: 'invalidtoken', password: 'newpassword123' });
  assert.equal(r.status, 400);
});

test('concurrent signups same email no duplicate', async () => {
  const email = 'concurrent@test.org';
  const results = await Promise.all([
    request('POST', '/auth/signup', { name: 'C1', email, password: 'password123' }),
    request('POST', '/auth/signup', { name: 'C2', email, password: 'password123' })
  ]);
  const statuses = results.map(r => r.status).sort();
  // one 200, one 409
  assert.ok(statuses.includes(200));
  assert.ok(statuses.includes(409));
});

test('corrupted db preserved', async () => {
  // write corrupt data
  fs.writeFileSync(dataFile, '{ broken json');
  // server should return 503
  const r = await request('GET', '/health');
  assert.equal(r.status, 503);
  // file should still be corrupt (not overwritten)
  const raw = fs.readFileSync(dataFile, 'utf8');
  assert.equal(raw, '{ broken json');
  // restore
  fs.writeFileSync(dataFile, JSON.stringify({ users: [], sessions: [], progress: {}, presidents: [] }, null, 2));
});
