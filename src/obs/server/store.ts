/**
 * Where the site's numbers, errors and logs are kept on the host: Netlify Blobs, in a store of their own ("obs"),
 * apart from the Studio's records. On a developer's computer, a folder: .studio-data/obs/ (never committed).
 */
import { isDev } from '../../studio/server/env';
import type { ObsEnv, ObsKv } from '../core/insights';

async function fileKv(): Promise<ObsKv> {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const root = path.resolve(process.cwd(), '.studio-data', 'obs');
  const file = (k: string) => path.join(root, ...k.split('/').map((p) => p.replace(/[^a-zA-Z0-9._-]/g, '_'))) + '.json';
  const walk = async (dir: string): Promise<string[]> => {
    let names: import('node:fs').Dirent[] = [];
    try { names = await fs.readdir(dir, { withFileTypes: true }); } catch { return []; }
    const out: string[] = [];
    for (const n of names) { const p = path.join(dir, n.name); if (n.isDirectory()) out.push(...(await walk(p))); else if (n.name.endsWith('.json')) out.push(p); }
    return out;
  };
  return {
    async get(k) { try { return JSON.parse(await fs.readFile(file(k), 'utf8')); } catch { return null; } },
    async put(k, v) { const f = file(k); await fs.mkdir(path.dirname(f), { recursive: true }); const tmp = `${f}.${process.pid}.tmp`; await fs.writeFile(tmp, JSON.stringify(v)); await fs.rename(tmp, f); },
    async del(k) { await fs.rm(file(k), { force: true }); },
    async list(prefix) {
      // only the folder the prefix points into is walked
      const base = prefix.split('/').slice(0, -1).join('/');
      const files = await walk(path.join(root, ...base.split('/').filter(Boolean)));
      return files.map((f) => path.relative(root, f).split(path.sep).join('/').replace(/\.json$/, '')).filter((k) => k.startsWith(prefix));
    },
  };
}

async function blobKv(): Promise<ObsKv> {
  const { getStore } = await import('@netlify/blobs');
  const store = getStore({ name: 'obs', consistency: 'eventual' });
  return {
    async get(k) { return ((await store.get(k, { type: 'json' })) as never) ?? null; },
    async put(k, v) { await store.setJSON(k, v); },
    async del(k) { await store.delete(k); },
    async list(prefix) { const r = await store.list({ prefix }); return r.blobs.map((b) => b.key); },
  };
}

let cached: Promise<ObsKv> | null = null;
export function obsKv() {
  cached ??= isDev() ? fileKv() : blobKv();
  return cached;
}
export async function obsEnv(): Promise<ObsEnv> {
  return { kv: await obsKv(), now: () => Date.now() };
}
