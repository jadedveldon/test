/**
 * The words the site's scripts show (hints, button states, messages), read from src/content/pages/ui.json ("Words in
 * interactive moments" in the content editor), which Base.astro writes into every page. `say('healing.begin')` gives
 * the words; `{name}` in them is filled from the second argument. A missing entry gives the fallback, so an edit can
 * never leave a button blank.
 */
let cache: Record<string, unknown> | null = null;
function all(): Record<string, unknown> {
  if (cache) return cache;
  // on the host while a page is built there is no document: the fallback is used (the words are read in the browser)
  if (typeof document === 'undefined') return {};
  try { cache = JSON.parse(document.getElementById('sk-words')?.textContent || '{}'); } catch { cache = {}; }
  return cache!;
}
export function say(path: string, vars: Record<string, string | number> = {}, fallback = ''): string {
  let v: unknown = all();
  for (const k of path.split('.')) v = v && typeof v === 'object' ? (v as Record<string, unknown>)[k] : undefined;
  const s = typeof v === 'string' && v.trim() ? v : fallback;
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}
