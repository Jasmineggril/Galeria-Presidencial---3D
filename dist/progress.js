/** Progresso do visitante: favoritos, peças visitadas e resultados de quiz.
 *
 * Convidados mantêm progresso local neste dispositivo. Contas autenticadas
 * sincronizam com o backend configurado. Sem backend, apenas o modo convidado.
 */
import {backendConfig, loadSession} from './account.js';

export const PROGRESS_STORAGE_KEY = 'gp.visitor.progress.v1';

export function defaultProgress() {
  return { visited: [], favorites: [], quizResults: {}, updatedAt: null };
}

export function loadProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return defaultProgress();
    const parsed = JSON.parse(raw);
    return { ...defaultProgress(), ...parsed };
  } catch (error) {
    return defaultProgress();
  }
}

export function saveProgress(progress) {
  const normalized = { ...defaultProgress(), ...(progress || {}) };
  normalized.updatedAt = new Date().toISOString();
  try {
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(normalized));
  } catch (error) {
    // Storage unavailable; keep in memory only.
  }
  syncProgressRemote(normalized);
  return normalized;
}

export function markVisited(id) {
  const p = loadProgress();
  if (!p.visited.includes(id)) p.visited.push(id);
  return saveProgress(p);
}

export function toggleFavorite(id) {
  const p = loadProgress();
  const idx = p.favorites.indexOf(id);
  if (idx >= 0) p.favorites.splice(idx, 1);
  else p.favorites.push(id);
  return saveProgress(p);
}

export function saveQuizResult(scope, score, total) {
  const p = loadProgress();
  p.quizResults[scope] = { score, total, at: new Date().toISOString() };
  return saveProgress(p);
}

export function clearProgress() {
  try { localStorage.removeItem(PROGRESS_STORAGE_KEY); } catch (error) {}
  return defaultProgress();
}

export async function syncProgressRemote(progress) {
  const cfg = backendConfig();
  const session = loadSession();
  if (!cfg.configured || !session?.accessToken) return {ok:false, reason:'guest'};
  try {
    await fetch(cfg.url + '/progress', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session.accessToken },
      body: JSON.stringify({ progress })
    });
    return {ok:true};
  } catch (error) {
    return {ok:false, reason:'network'};
  }
}

export async function loadRemoteProgress() {
  const cfg = backendConfig();
  const session = loadSession();
  if (!cfg.configured || !session?.accessToken) return null;
  try {
    const res = await fetch(cfg.url + '/progress', {
      headers: { 'Authorization': 'Bearer ' + session.accessToken }
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.progress) {
      saveProgress(data.progress);
      return data.progress;
    }
    return null;
  } catch (error) {
    return null;
  }
}
