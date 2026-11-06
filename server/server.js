// Backend opcional da Galeria Presidencial.
// Execução: node server/server.js
// Variáveis de ambiente:
//   PORT=8787
//   GP_DATA_FILE=./data/db.json
//   GP_ALLOWED_ORIGINS=http://localhost:8000,https://example.org
//   GP_SESSION_SECRET=... (opcional)
//
// Provisionamento administrativo:
//   node server/server.js --promote admin@exemplo.org

import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 8787);
const DATA_FILE = path.resolve(process.env.GP_DATA_FILE || path.join(__dirname, '..', 'data', 'db.json'));
const ALLOWED_ORIGINS = new Set((process.env.GP_ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean));

let writeLock = Promise.resolve();

function withWriteLock(fn) {
  const next = writeLock.then(() => fn());
  writeLock = next.catch(() => {});
  return next;
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
    const err = new Error('Banco de dados corrompido ou ilegível.');
    err.code = 'DB_CORRUPT';
    throw err;
  }
}

function atomicWriteData(data) {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, DATA_FILE);
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

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function allowedOrigin(req) {
  const origin = req.headers.origin || '';
  if (!origin) return null;
  if (ALLOWED_ORIGINS.size === 0) {
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
    return null;
  }
  return ALLOWED_ORIGINS.has(origin) ? origin : null;
}

function sendJson(req, res, status, body) {
  const origin = allowedOrigin(req);
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
  };
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    if (origin !== '*') headers['Vary'] = 'Origin';
  }
  res.writeHead(status, headers);
  if (status !== 204) res.end(JSON.stringify(body));
  else res.end();
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
  return !!user && user.role === 'admin';
}

function rateLimitMap() { return (rateLimitMap._m ||= new Map()); }
function checkRateLimit(key, max = 10, windowMs = 60000) {
  const map = rateLimitMap();
  const now = Date.now();
  const entry = map.get(key) || { count: 0, reset: now + windowMs };
  if (now > entry.reset) { entry.count = 0; entry.reset = now + windowMs; }
  entry.count++;
  map.set(key, entry);
  return entry.count <= max;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
  const pathName = url.pathname;

  if (req.method === 'OPTIONS') {
    sendJson(req, res, 204, {});
    return;
  }

  let data;
  try {
    data = readData();
  } catch (e) {
    sendJson(req, res, 503, { ok: false, message: 'Serviço temporariamente indisponível.' });
    return;
  }

  try {
    // Health
    if (pathName === '/health' && req.method === 'GET') {
      sendJson(req, res, 200, { ok: true, provider: 'galeria-local', configured: true });
      return;
    }

    // Signup
    if (pathName === '/auth/signup' && req.method === 'POST') {
      const ip = req.socket?.remoteAddress || 'unknown';
      if (!checkRateLimit('signup:' + ip, 5, 60000)) {
        sendJson(req, res, 429, { ok: false, message: 'Muitas tentativas. Tente novamente mais tarde.' });
        return;
      }
      const body = await parseBody(req);
      const name = String(body.name || '').trim();
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      if (!name || !email || password.length < 6) {
        sendJson(req, res, 400, { ok: false, message: 'Nome, e-mail e senha (mín. 6 caracteres) são obrigatórios.' });
        return;
      }
      await withWriteLock(async () => {
        const fresh = readData();
        if (fresh.users.some(u => u.email === email)) {
          sendJson(req, res, 409, { ok: false, message: 'E-mail já cadastrado.' });
          return;
        }
        const user = { id: crypto.randomUUID(), name, email, passwordHash: hashPassword(password), createdAt: new Date().toISOString(), role: 'visitor' };
        fresh.users.push(user);
        const token = crypto.randomBytes(32).toString('hex');
        fresh.sessions.push({ token, userId: user.id, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString() });
        writeData(fresh);
        sendJson(req, res, 200, { ok: true, session: { access_token: token, user: { id: user.id, email: user.email, user_metadata: { display_name: user.name, role: user.role } } } });
      });
      return;
    }

    // Signin
    if (pathName === '/auth/signin' && req.method === 'POST') {
      const ip = req.socket?.remoteAddress || 'unknown';
      if (!checkRateLimit('signin:' + ip, 10, 60000)) {
        sendJson(req, res, 429, { ok: false, message: 'Muitas tentativas. Tente novamente mais tarde.' });
        return;
      }
      const body = await parseBody(req);
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      const user = data.users.find(u => u.email === email);
      if (!user || !verifyPassword(password, user.passwordHash)) {
        sendJson(req, res, 401, { ok: false, message: 'E-mail ou senha inválidos.' });
        return;
      }
      await withWriteLock(async () => {
        const fresh = readData();
        const token = crypto.randomBytes(32).toString('hex');
        fresh.sessions.push({ token, userId: user.id, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString() });
        writeData(fresh);
        sendJson(req, res, 200, { ok: true, session: { access_token: token, user: { id: user.id, email: user.email, user_metadata: { display_name: user.name, role: user.role } } } });
      });
      return;
    }

    // Logout
    if (pathName === '/auth/logout' && req.method === 'POST') {
      const token = tokenFromReq(req);
      await withWriteLock(async () => {
        const fresh = readData();
        const s = (fresh.sessions || []).find(x => x.token === token);
        if (s) { s.revoked = true; writeData(fresh); }
      });
      sendJson(req, res, 200, { ok: true });
      return;
    }

    // Password reset request
    if (pathName === '/auth/recover' && req.method === 'POST') {
      const body = await parseBody(req);
      const email = String(body.email || '').trim().toLowerCase();
      const user = data.users.find(u => u.email === email);
      if (user) {
        const resetToken = crypto.randomBytes(24).toString('hex');
        await withWriteLock(async () => {
          const fresh = readData();
          const u = fresh.users.find(x => x.id === user.id);
          if (u) {
            u.resetTokenHash = hashToken(resetToken);
            u.resetExpires = new Date(Date.now() + 3600 * 1000).toISOString();
            u.resetUsed = false;
            writeData(fresh);
          }
        });
        // TODO: enviar resetToken por e-mail via provedor configurado.
      }
      sendJson(req, res, 200, { ok: true, message: 'Se o e-mail existir, as instruções foram enviadas.' });
      return;
    }

    // Reset password
    if (pathName === '/auth/reset' && req.method === 'POST') {
      const body = await parseBody(req);
      const token = String(body.token || '');
      const password = String(body.password || '');
      if (!token || password.length < 6) {
        sendJson(req, res, 400, { ok: false, message: 'Token e senha (mín. 6 caracteres) são obrigatórios.' });
        return;
      }
      let resetUser = null;
      await withWriteLock(async () => {
        const fresh = readData();
        const user = fresh.users.find(u => u.resetTokenHash === hashToken(token) && !u.resetUsed);
        if (!user || !user.resetExpires || new Date(user.resetExpires) < new Date()) {
          sendJson(req, res, 400, { ok: false, message: 'Token inválido ou expirado.' });
          return;
        }
        user.passwordHash = hashPassword(password);
        user.resetTokenHash = null;
        user.resetExpires = null;
        user.resetUsed = true;
        fresh.sessions = (fresh.sessions || []).filter(s => s.userId !== user.id);
        writeData(fresh);
        resetUser = user;
      });
      if (resetUser) {
        sendJson(req, res, 200, { ok: true, message: 'Senha atualizada. Faça login novamente.' });
      }
      return;
    }

    // Me
    if (pathName === '/me' && req.method === 'GET') {
      const s = getSession(data, tokenFromReq(req));
      if (!s) { sendJson(req, res, 401, { ok: false, message: 'Não autenticado.' }); return; }
      const user = data.users.find(u => u.id === s.userId);
      if (!user) { sendJson(req, res, 401, { ok: false, message: 'Usuário não encontrado.' }); return; }
      sendJson(req, res, 200, { ok: true, user: { id: user.id, email: user.email, user_metadata: { display_name: user.name, role: user.role } } });
      return;
    }

    // Progress
    if (pathName === '/progress' && req.method === 'GET') {
      const s = getSession(data, tokenFromReq(req));
      if (!s) { sendJson(req, res, 401, { ok: false, message: 'Não autenticado.' }); return; }
      const p = data.progress[s.userId] || { visited: [], favorites: [], quizResults: {} };
      sendJson(req, res, 200, { ok: true, progress: p });
      return;
    }
    if (pathName === '/progress' && req.method === 'PUT') {
      const s = getSession(data, tokenFromReq(req));
      if (!s) { sendJson(req, res, 401, { ok: false, message: 'Não autenticado.' }); return; }
      const body = await parseBody(req);
      await withWriteLock(async () => {
        const fresh = readData();
        fresh.progress = fresh.progress || {};
        fresh.progress[s.userId] = body.progress || body;
        writeData(fresh);
      });
      sendJson(req, res, 200, { ok: true });
      return;
    }

    // Presidents (public)
    if (pathName === '/presidents' && req.method === 'GET') {
      const published = (data.presidents || []).filter(p => (p.status || 'published') === 'published');
      sendJson(req, res, 200, { ok: true, items: published });
      return;
    }

    // Admin presidents
    if (pathName === '/admin/presidents' && req.method === 'GET') {
      const s = getSession(data, tokenFromReq(req));
      const user = s ? data.users.find(u => u.id === s.userId) : null;
      if (!user || !isAdmin(user)) { sendJson(req, res, 403, { ok: false, message: 'Acesso administrativo negado.' }); return; }
      sendJson(req, res, 200, { ok: true, items: data.presidents || [] });
      return;
    }
    if (pathName === '/admin/presidents' && req.method === 'POST') {
      const s = getSession(data, tokenFromReq(req));
      const user = s ? data.users.find(u => u.id === s.userId) : null;
      if (!user || !isAdmin(user)) { sendJson(req, res, 403, { ok: false, message: 'Acesso administrativo negado.' }); return; }
      const body = await parseBody(req);
      const record = body.record || body;
      if (!record.id) { sendJson(req, res, 400, { ok: false, message: 'ID obrigatório.' }); return; }
      await withWriteLock(async () => {
        const fresh = readData();
        const idx = (fresh.presidents || []).findIndex(p => p.id === record.id);
        if (idx >= 0) fresh.presidents[idx] = record; else (fresh.presidents ||= []).push(record);
        writeData(fresh);
      });
      sendJson(req, res, 200, { ok: true, record });
      return;
    }
    if (pathName.startsWith('/admin/presidents/') && req.method === 'DELETE') {
      const s = getSession(data, tokenFromReq(req));
      const user = s ? data.users.find(u => u.id === s.userId) : null;
      if (!user || !isAdmin(user)) { sendJson(req, res, 403, { ok: false, message: 'Acesso administrativo negado.' }); return; }
      const id = decodeURIComponent(pathName.slice('/admin/presidents/'.length));
      await withWriteLock(async () => {
        const fresh = readData();
        fresh.presidents = (fresh.presidents || []).filter(p => p.id !== id);
        writeData(fresh);
      });
      sendJson(req, res, 200, { ok: true });
      return;
    }

    sendJson(req, res, 404, { ok: false, message: 'Rota não encontrada.' });
  } catch (e) {
    console.error('Erro interno:', e?.message || e);
    sendJson(req, res, 500, { ok: false, message: 'Erro interno do servidor.' });
  }
});

// Provisionamento administrativo via CLI (executado localmente pelo responsável).
const promoteIdx = process.argv.indexOf('--promote');
if (promoteIdx >= 0 && process.argv[promoteIdx + 1]) {
  const email = String(process.argv[promoteIdx + 1]).trim().toLowerCase();
  ensureData();
  const data = readData();
  const user = data.users.find(u => u.email === email);
  if (!user) {
    console.error('Usuário não encontrado: ' + email);
    process.exit(1);
  }
  user.role = 'admin';
  writeData(data);
  console.log('Usuário promovido a administrador: ' + email);
  process.exit(0);
}

server.listen(PORT, () => {
  console.log('Galeria Presidencial backend em http://localhost:' + PORT);
  console.log('Dados: ' + DATA_FILE);
});
