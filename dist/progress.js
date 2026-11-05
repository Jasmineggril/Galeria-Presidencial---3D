/** Progresso do visitante: favoritos, peças visitadas e resultados de quiz.
 *
 * Convidados mantêm progresso local neste dispositivo. Contas autenticadas
 * sincronizam com o backend configurado. Sem backend, apenas o modo convidado.
 */
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
