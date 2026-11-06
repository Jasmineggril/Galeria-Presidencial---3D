/** Conta e persistência do visitante.
 *
 * O modo convidado funciona sem backend. A sincronização entre dispositivos
 * exige um provedor configurado por variáveis de ambiente/infraestrutura.
 * Este módulo nunca armazena senhas e nunca simula autenticação com
 * localStorage: sem backend, apenas o modo convidado é anunciado.
 */
export const ACCOUNT_STORAGE_KEY = 'gp.account.session';

export function isAllowedBackendUrl(url) {
  if (!url) return false;
  try {
    const u = new URL(url, window.location.origin);
    if (u.origin === window.location.origin) return true;
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(u.origin);
    }
    const allow = (window.GP_ALLOWED_BACKENDS || []);
    if (Array.isArray(allow) && allow.includes(u.origin)) return /^https:/.test(u.protocol);
    return false;
  } catch (error) {
    return false;
  }
}

export function backendConfig() {
  const cfg = (typeof window !== 'undefined' && window.GP_BACKEND) || {};
  const url = (cfg.url || '').replace(/\/$/, '');
  const allowed = isAllowedBackendUrl(url);
  return {
    provider: cfg.provider || 'none',
    url: allowed ? url : '',
    anonKey: cfg.anonKey || '',
    configured: Boolean(allowed && url && cfg.anonKey)
  };
}

export function isGuestMode() {
  return !backendConfig().configured;
}

export function loadSession() {
  try {
    const raw = localStorage.getItem(ACCOUNT_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session || !session.accessToken || !session.user) return null;
    return session;
  } catch (error) {
    return null;
  }
}

export function saveSession(session) {
  if (!session) {
    localStorage.removeItem(ACCOUNT_STORAGE_KEY);
    return null;
  }
  localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(session));
  return session;
}

export function clearSession() {
  localStorage.removeItem(ACCOUNT_STORAGE_KEY);
}

async function post(path, body, token) {
  const cfg = backendConfig();
  const headers = { 'Content-Type': 'application/json' };
  if (cfg.anonKey) headers['apikey'] = cfg.anonKey;
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const response = await fetch(cfg.url + path, { method: 'POST', headers, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

export async function signUp({name, email, password}) {
  const cfg = backendConfig();
  if (!cfg.configured) {
    return {ok:false, reason:'backend-unconfigured', message:'Cadastro real requer backend configurado. O modo convidado continua disponível.'};
  }
  const {response, data} = await post('/auth/signup', {name, email, password});
  if (!response.ok) return {ok:false, reason:'signup-failed', message:data?.message || 'Não foi possível criar a conta.'};
  const session = data.session || data;
  if (session?.access_token) saveSession({accessToken: session.access_token, user: session.user});
  return {ok:true, session};
}

export async function signIn({email, password}) {
  const cfg = backendConfig();
  if (!cfg.configured) {
    return {ok:false, reason:'backend-unconfigured', message:'Login real requer backend configurado.'};
  }
  const {response, data} = await post('/auth/signin', {email, password});
  if (!response.ok) return {ok:false, reason:'signin-failed', message:data?.message || 'E-mail ou senha inválidos.'};
  const session = data.session || data;
  if (session?.access_token) saveSession({accessToken: session.access_token, refreshToken: session.refresh_token, user: session.user});
  return {ok:true, session};
}

export async function signOut() {
  const session = loadSession();
  const cfg = backendConfig();
  clearSession();
  if (cfg.configured && session?.accessToken) {
    try { await post('/auth/logout', {}, session.accessToken); } catch (error) {}
  }
  return {ok:true};
}

export async function requestPasswordReset(email) {
  const cfg = backendConfig();
  if (!cfg.configured) {
    return {ok:false, reason:'backend-unconfigured', message:'Recuperação de senha requer backend configurado.'};
  }
  const {response, data} = await post('/auth/recover', {email});
  if (!response.ok) return {ok:false, reason:'reset-failed', message:data?.message || 'Não foi possível solicitar a recuperação.'};
  return {ok:true, message:data?.message || 'Se o e-mail existir, as instruções foram enviadas.'};
}

export function currentAccountLabel() {
  const session = loadSession();
  if (session?.user) return session.user.email || 'Conta conectada';
  return 'Modo convidado';
}