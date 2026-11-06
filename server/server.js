// Backend opcional da Galeria Presidencial.
// Execução: node server/server.js
// Variáveis de ambiente:
//   PORT=8787
//   GP_DATA_FILE=./data/db.json
//   GP_ADMIN_EMAILS=admin@exemplo.org
//   GP_SESSION_SECRET=... (opcional, usado apenas para assinar tokens se desejado)

import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 8787);
const DATA_FILE = path.resolve(process.env.GP_DATA_FILE || path.join(__dirname, '..', 'data', 'db.json'));
const ADMIN_EMAILS = new Set();
const ALLOWED_ORIGINS = new Set((process.env.GP_ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean));
let writeLock = Promise.resolve();

function withWriteLock(fn) {
  const next = writeLock.then(() => fn());
  writeLock = next.catch(() => {});
  return next;
}

function atomicWriteData(data) {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function ensureData() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ users: [], sessions: [], progress: {}, presidents: [] }, null, 2));
  }
}

function readData() {
  ensureData();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') throw new Error('invalid');
    return { users: [], sessions: [], progress: {}, presidents: [], ...parsed };
  } catch (e) {
    // Do not overwrite corrupted data with an empty database.
    console.error('Falha ao ler banco de dados; mantendo arquivo original.');
    return { users: [], sessions: [], progress: {}, presidents: [] };
  }
}

function writeData(data) {
  atomicWriteData(data);
}

function hashPassword(password, salt) {
  salt = salt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return salt + ':' + derived;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  try { return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(derived, 'hex')); }
  catch (e) { return false; }
}

function allowedOrigin(req) {
  const origin = req.headers.origin || '';
  if (!origin) return '*';
  if (ALLOWED_ORIGINS.size === 0) {
    // Default: same-origin only (no CORS). Allow localhost for dev.
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
    return null;
  }
  return ALLOWED_ORIGINS.has(origin) ? origin : null;
}

function sendReq( status, body, req) {
  const json = JSON.stringify(body);
  const origin = req ? allowedOrigin(req) : null;
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
  };
  if (origin) headers['Access-Control-Allow-Origin'] = origin;
  if (origin && origin !== '*') headers['Vary'] = 'Origin';
  res.writeHead(status, headers);
  res.end(json);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', c => { raw += c; if (raw.length > 1e6) req.destroy(); });
    req.on('end', () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function tokenFromReq(req) {
  const h = req.headers.authorization || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

function getSession(data, token) {
  if (!token) return null;
  const s = (data.sessions || []).find(x => x.token === token && !x.revoked);
  if (!s) return null;
  if (s.expiresAt && new Date(s.expiresAt) < new Date()) return null;
  return s;
}

function isAdmin(user) {
  return !!user && ADMIN_EMAILS.has(String(user.email).toLowerCase());
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') { sendReq( 204, {}, req); return; }
  const url = new URL(req.url, 'http://' + req.headers.host);
    const sendReq = (status, body) => send(res, status, body, req);
  const path = url.pathname;
  const data = readData();

  try {
    // Health
    if (path === '/health' && req.method === 'GET') {
      sendReq( 200, { ok: true, provider: 'galeria-local', configured: true });
      return;
    }

    // Signup
    if (path === '/auth/signup' && req.method === 'POST') {
      const body = await parseBody(req);
      const name = String(body.name || '').trim();
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      if (!name || !email || password.length < 6) {
        sendReq( 400, { ok: false, message: 'Nome, e-mail e senha (mín. 6 caracteres) são obrigatórios.' });
        return;
      }
      if (data.users.some(u => u.email === email)) {
        sendReq( 409, { ok: false, message: 'E-mail já cadastrado.' });
        return;
      }
      const user = { id: crypto.randomUUID(), name, email, passwordHash: hashPassword(password), createdAt: new Date().toISOString(), role: 'visitor' };
      data.users.push(user);
      const token = crypto.randomBytes(32).toString('hex');
      data.sessions.push({ token, userId: user.id, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 7*24*3600*1000).toISOString() });
      writeData(data);
      sendReq( 200, { ok: true, session: { access_token: token, user: { id: user.id, email: user.email, user_metadata: { display_name: user.name, role: user.role } } } });
      return;
    }

    // Signin
    if (path === '/auth/signin' && req.method === 'POST') {
      const body = await parseBody(req);
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      const user = data.users.find(u => u.email === email);
      if (!user || !verifyPassword(password, user.passwordHash)) {
        sendReq( 401, { ok: false, message: 'E-mail ou senha inválidos.' });
        return;
      }
      const token = crypto.randomBytes(32).toString('hex');
      data.sessions.push({ token, userId: user.id, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 7*24*3600*1000).toISOString() });
      writeData(data);
      sendReq( 200, { ok: true, session: { access_token: token, user: { id: user.id, email: user.email, user_metadata: { display_name: user.name, role: user.role } } } });
      return;
    }

    // Logout
    if (path === '/auth/logout' && req.method === 'POST') {
      const token = tokenFromReq(req);
      const s = getSession(data, token);
      if (s) { s.revoked = true; writeData(data); }
      sendReq( 200, { ok: true });
      return;
    }

    // Password reset request
    if (path === '/auth/recover' && req.method === 'POST') {
      const body = await parseBody(req);
      const email = String(body.email || '').trim().toLowerCase();
      const user = data.users.find(u => u.email === email);
      if (user) {
        const resetToken = crypto.randomBytes(24).toString('hex');
        user.resetTokenHash = hashToken(resetToken);
        user.resetExpires = new Date(Date.now() + 3600*1000).toISOString();
        user.resetUsed = false;
        writeData(data);
      }
      sendReq(200, { ok: true, message: 'Se o e-mail existir, as instruções foram enviadas.' });
      return;
    }

    // Reset password (requires token sent out-of-band)
    if (path === '/auth/reset' && req.method === 'POST') {
      const body = await parseBody(req);
      const token = String(body.token || '');
      const password = String(body.password || '');
      if (!token || password.length < 6) {
        sendReq(400, { ok: false, message: 'Token e senha (mín. 6 caracteres) são obrigatórios.' });
        return;
      }
      const user = data.users.find(u => u.resetTokenHash === hashToken(token) && !u.resetUsed);
      if (!user || !user.resetExpires || new Date(user.resetExpires) < new Date()) {
        sendReq(400, { ok: false, message: 'Token inválido ou expirado.' });
        return;
      }
      user.passwordHash = hashPassword(password);
      user.resetTokenHash = null;
      user.resetExpires = null;
      user.resetUsed = true;
      // Revoke existing sessions
      data.sessions = (data.sessions || []).filter(s => s.userId !== user.id);
      writeData(data);
      sendReq(200, { ok: true, message: 'Senha atualizada. Faça login novamente.' });
      return;
    }

    // Me
    if (path === '/me' && req.method === 'GET') {
      const s = getSession(data, tokenFromReq(req));
      if (!s) { sendReq( 401, { ok: false, message: 'Não autenticado.' }); return; }
      const user = data.users.find(u => u.id === s.userId);
      if (!user) { sendReq( 401, { ok: false, message: 'Usuário não encontrado.' }); return; }
      sendReq( 200, { ok: true, user: { id: user.id, email: user.email, user_metadata: { display_name: user.name, role: user.role } } });
      return;
    }

    // Progress
    if (path === '/progress' && req.method === 'GET') {
      const s = getSession(data, tokenFromReq(req));
      if (!s) { sendReq( 401, { ok: false, message: 'Não autenticado.' }); return; }
      const p = data.progress[s.userId] || { visited: [], favorites: [], quizResults: {} };
      sendReq( 200, { ok: true, progress: p });
      return;
    }
    if (path === '/progress' && req.method === 'PUT') {
      const s = getSession(data, tokenFromReq(req));
      if (!s) { sendReq( 401, { ok: false, message: 'Não autenticado.' }); return; }
      const body = await parseBody(req);
      data.progress[s.userId] = body.progress || body;
      writeData(data);
      sendReq( 200, { ok: true });
      return;
    }

    // Presidents (public)
    if (path === '/presidents' && req.method === 'GET') {
      const published = (data.presidents || []).filter(p => (p.status || 'published') === 'published');
      sendReq( 200, { ok: true, items: published });
      return;
    }

    // Admin presidents
    if (path === '/admin/presidents' && req.method === 'GET') {
      const s = getSession(data, tokenFromReq(req));
      const user = s ? data.users.find(u => u.id === s.userId) : null;
      if (!user || !isAdmin(user)) { sendReq( 403, { ok: false, message: 'Acesso administrativo negado.' }); return; }
      sendReq( 200, { ok: true, items: data.presidents || [] });
      return;
    }
    if (path === '/admin/presidents' && req.method === 'POST') {
      const s = getSession(data, tokenFromReq(req));
      const user = s ? data.users.find(u => u.id === s.userId) : null;
      if (!user || !isAdmin(user)) { sendReq( 403, { ok: false, message: 'Acesso administrativo negado.' }); return; }
      const body = await parseBody(req);
      const record = body.record || body;
      if (!record.id) { sendReq( 400, { ok: false, message: 'ID obrigatório.' }); return; }
      const idx = (data.presidents || []).findIndex(p => p.id === record.id);
      if (idx >= 0) data.presidents[idx] = record; else (data.presidents ||= []).push(record);
      writeData(data);
      sendReq( 200, { ok: true, record });
      return;
    }
    if (path.startsWith('/admin/presidents/') && req.method === 'DELETE') {
      const s = getSession(data, tokenFromReq(req));
      const user = s ? data.users.find(u => u.id === s.userId) : null;
      if (!user || !isAdmin(user)) { sendReq( 403, { ok: false, message: 'Acesso administrativo negado.' }); return; }
      const id = decodeURIComponent(path.slice('/admin/presidents/'.length));
      data.presidents = (data.presidents || []).filter(p => p.id !== id);
      writeData(data);
      sendReq( 200, { ok: true });
      return;
    }

    sendReq( 404, { ok: false, message: 'Rota não encontrada.' });
  } catch (e) {
    sendReq( 500, { ok: false, message: 'Erro interno: ' + e.message });
  }
});

// Provisionamento administrativo via CLI (executado localmente pelo responsavel).
const promoteIdx = process.argv.indexOf('--promote');
if (promoteIdx >= 0 && process.argv[promoteIdx + 1]) {
  const email = String(process.argv[promoteIdx + 1]).trim().toLowerCase();
  ensureData();
  const data = readData();
  const user = data.users.find(u => u.email === email);
  if (!user) { console.error('Usuario nao encontrado: ' + email); process.exit(1); }
  user.role = 'admin';
  writeData(data);
  console.log('Usuario promovido a administrador: ' + email);
  process.exit(0);
}

server.listen(PORT, () => {
  console.log('Galeria Presidencial backend em http://localhost:' + PORT);
  console.log('Dados: ' + DATA_FILE);
  if (ADMIN_EMAILS.size) console.log('Admins: ' + [...ADMIN_EMAILS].join(', '));
});