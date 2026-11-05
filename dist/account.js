/** Conta e persistência do visitante.
 *
 * O modo convidado funciona sem backend. A sincronização entre dispositivos
 * exige um provedor configurado por variáveis de ambiente/infraestrutura.
 * Este módulo nunca armazena senhas e nunca simula autenticação com
 * localStorage: sem backend, apenas o modo convidado é anunciado.
 */
export const ACCOUNT_STORAGE_KEY = 'gp.account.session';

export function backendConfig() {
  const cfg = (typeof window !== 'undefined' && window.GP_BACKEND) || {};
  return {
    provider: cfg.provider || 'none',
    url: cfg.url || '',
    anonKey: cfg.anonKey || '',
    configured: Boolean(cfg.url && cfg.anonKey)
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

export async function signUp({name, email, password}) {
  const cfg = backendConfig();
  if (!cfg.configured) {
    return {ok:false, reason:'backend-unconfigured', message:'Cadastro real requer backend configurado. O modo convidado continua disponível.'};
  }
  // Supabase-style REST endpoint. Validation and password hashing happen on the server.
  const response = await fetch(`${cfg.url}/auth/v1/signup`, {
    method:'POST',
    headers:{'Content-Type':'application/json','apikey':cfg.anonKey},
    body: JSON.stringify({email, password, data:{display_name:name}})
  });
  const data = await response.json().catch(()=>({}));
  if (!response.ok) return {ok:false, reason:'signup-failed', message:data?.msg || 'Não foi possível criar a conta.'};
  return {ok:true, session:data};
}

export async function signIn({email, password}) {
  const cfg = backendConfig();
  if (!cfg.configured) {
    return {ok:false, reason:'backend-unconfigured', message:'Login real requer backend configurado.'};
  }
  const response = await fetch(`${cfg.url}/auth/v1/token?grant_type=password`, {
    method:'POST',
    headers:{'Content-Type':'application/json','apikey':cfg.anonKey},
    body: JSON.stringify({email, password})
  });
  const data = await response.json().catch(()=>({}));
  if (!response.ok) return {ok:false, reason:'signin-failed', message:data?.error_description || 'E-mail ou senha inválidos.'};
  saveSession({accessToken:data.access_token, refreshToken:data.refresh_token, user:data.user});
  return {ok:true, session:data};
}

export async function signOut() {
  const session = loadSession();
  const cfg = backendConfig();
  clearSession();
  if (cfg.configured && session?.accessToken) {
    try { await fetch(`${cfg.url}/auth/v1/logout`, {method:'POST', headers:{'Authorization':'Bearer '+session.accessToken,'apikey':cfg.anonKey}}); } catch (error) {}
  }
  return {ok:true};
}

export async function requestPasswordReset(email) {
  const cfg = backendConfig();
  if (!cfg.configured) {
    return {ok:false, reason:'backend-unconfigured', message:'Recuperação de senha requer backend configurado.'};
  }
  const response = await fetch(`${cfg.url}/auth/v1/recover`, {
    method:'POST',
    headers:{'Content-Type':'application/json','apikey':cfg.anonKey},
    body: JSON.stringify({email})
  });
  if (!response.ok) return {ok:false, reason:'reset-failed', message:'Não foi possível solicitar a recuperação.'};
  return {ok:true, message:'Se o e-mail existir, as instruções foram enviadas.'};
}

export function currentAccountLabel() {
  const session = loadSession();
  if (session?.user) return session.user.email || 'Conta conectada';
  return 'Modo convidado';
}
