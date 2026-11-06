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
const ADMIN_EMAILS = new Set((process.env.GP_ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean));

function ensureData() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ users: [], sessions: [], progress: {}, presidents: [] }, null, 2));
  }
}

function readData() {
  ensureData();
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch (e) { return { users: [], sessions: [], progress: {}, presidents: [] }; }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
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

function send(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
  });
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
  if (req.method === 'OPTIONS') { send(res, 204, {}); return; }
  const url = new URL(req.url, 'http://' + req.headers.host);
  const path = url.pathname;
  const data = readData();

  try {
    // Health
    if (path === '/health' && req.method === 'GET') {
      send(res, 200, { ok: true, provider: 'galeria-local', configured: true });
      return;
    }

    // Signup
    if (path === '/auth/signup' && req.method === 'POST') {
      const body = await parseBody(req);
      const name = String(body.name || '').trim();
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      if (!name || !email || password.length < 6) {
        send(res, 400, { ok: false, message: 'Nome, e-mail e senha (mín. 6 caracteres) são obrigatórios.' });
        return;
      }
      if (data.users.some(u => u.email === email)) {
        send(res, 409, { ok: false, message: 'E-mail já cadastrado.' });
        return;
      }
      const user = { id: crypto.randomUUID(), name, email, passwordHash: hashPassword(password), createdAt: new Date().toISOString(), role: isAdmin({ email }) ? 'admin' : 'visitor' };
      data.users.push(user);
      const token = crypto.randomBytes(32).toString('hex');
      data.sessions.push({ token, userId: user.id, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 7*24*3600*1000).toISOString() });
      writeData(data);
      send(res, 200, { ok: true, session: { access_token: token, user: { id: user.id, email: user.email, user_metadata: { display_name: user.name, role: user.role } } } });
      return;
    }

    // Signin
    if (path === '/auth/signin' && req.method === 'POST') {
      const body = await parseBody(req);
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      const user = data.users.find(u => u.email === email);
      if (!user || !verifyPassword(password, user.passwordHash)) {
        send(res, 401, { ok: false, message: 'E-mail ou senha inválidos.' });
        return;
      }
      const token = crypto.randomBytes(32).toString('hex');
      data.sessions.push({ token, userId: user.id, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 7*24*3600*1000).toISOString() });
      writeData(data);
      send(res, 200, { ok: true, session: { access_token: token, user: { id: user.id, email: user.email, user_metadata: { display_name: user.name, role: user.role } } } });
      return;
    }

    // Logout
    if (path === '/auth/logout' && req.method === 'POST') {
      const token = tokenFromReq(req);
      const s = getSession(data, token);
      if (s) { s.revoked = true; writeData(data); }
      send(res, 200, { ok: true });
      return;
    }

    // Password reset request
    if (path === '/auth/recover' && req.method === 'POST') {
      const body = await parseBody(req);
      const email = String(body.email || '').trim().toLowerCase();
      const user = data.users.find(u => u.email === email);
      if (user) {
        const resetToken = crypto.randomBytes(24).toString('hex');
        user.resetToken = resetToken;
        user.resetExpires = new Date(Date.now() + 3600*1000).toISOString();
        writeData(data);
        // Em protótipo, o token é retornado para facilitar testes locais.
        send(res, 200, { ok: true, message: 'Se o e-mail existir, as instruções foram enviadas.', resetToken });
      } else {
        send(res, 200, { ok: true, message: 'Se o e-mail existir, as instruções foram enviadas.' });
      }
      return;
    }

    // Me
    if (path === '/me' && req.method === 'GET') {
      const s = getSession(data, tokenFromReq(req));
      if (!s) { send(res, 401, { ok: false, message: 'Não autenticado.' }); return; }
      const user = data.users.find(u => u.id === s.userId);
      if (!user) { send(res, 401, { ok: false, message: 'Usuário não encontrado.' }); return; }
      send(res, 200, { ok: true, user: { id: user.id, email: user.email, user_metadata: { display_name: user.name, role: user.role } } });
      return;
    }

    // Progress
    if (path === '/progress' && req.method === 'GET') {
      const s = getSession(data, tokenFromReq(req));
      if (!s) { send(res, 401, { ok: false, message: 'Não autenticado.' }); return; }
      const p = data.progress[s.userId] || { visited: [], favorites: [], quizResults: {} };
      send(res, 200, { ok: true, progress: p });
      return;
    }
    if (path === '/progress' && req.method === 'PUT') {
      const s = getSession(data, tokenFromReq(req));
      if (!s) { send(res, 401, { ok: false, message: 'Não autenticado.' }); return; }
      const body = await parseBody(req);
      data.progress[s.userId] = body.progress || body;
      writeData(data);
      send(res, 200, { ok: true });
      return;
    }

    // Presidents (public)
    if (path === '/presidents' && req.method === 'GET') {
      const published = (data.presidents || []).filter(p => (p.status || 'published') === 'published');
      send(res, 200, { ok: true, items: published });
      return;
    }

    // Admin presidents
    if (path === '/admin/presidents' && req.method === 'GET') {
      const s = getSession(data, tokenFromReq(req));
      const user = s ? data.users.find(u => u.id === s.userId) : null;
      if (!user || !isAdmin(user)) { send(res, 403, { ok: false, message: 'Acesso administrativo negado.' }); return; }
      send(res, 200, { ok: true, items: data.presidents || [] });
      return;
    }
    if (path === '/admin/presidents' && req.method === 'POST') {
      const s = getSession(data, tokenFromReq(req));
      const user = s ? data.users.find(u => u.id === s.userId) : null;
      if (!user || !isAdmin(user)) { send(res, 403, { ok: false, message: 'Acesso administrativo negado.' }); return; }
      const body = await parseBody(req);
      const record = body.record || body;
      if (!record.id) { send(res, 400, { ok: false, message: 'ID obrigatório.' }); return; }
      const idx = (data.presidents || []).findIndex(p => p.id === record.id);
      if (idx >= 0) data.presidents[idx] = record; else (data.presidents ||= []).push(record);
      writeData(data);
      send(res, 200, { ok: true, record });
      return;
    }
    if (path.startsWith('/admin/presidents/') && req.method === 'DELETE') {
      const s = getSession(data, tokenFromReq(req));
      const user = s ? data.users.find(u => u.id === s.userId) : null;
      if (!user || !isAdmin(user)) { send(res, 403, { ok: false, message: 'Acesso administrativo negado.' }); return; }
      const id = decodeURIComponent(path.slice('/admin/presidents/'.length));
      data.presidents = (data.presidents || []).filter(p => p.id !== id);
      writeData(data);
      send(res, 200, { ok: true });
      return;
    }

    send(res, 404, { ok: false, message: 'Rota não encontrada.' });
  } catch (e) {
    send(res, 500, { ok: false, message: 'Erro interno: ' + e.message });
  }
});

server.listen(PORT, () => {
  console.log('Galeria Presidencial backend em http://localhost:' + PORT);
  console.log('Dados: ' + DATA_FILE);
  if (ADMIN_EMAILS.size) console.log('Admins: ' + [...ADMIN_EMAILS].join(', '));
});