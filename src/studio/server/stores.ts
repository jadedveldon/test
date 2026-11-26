/**
 * Where the Studio's database lives. On the host: Netlify Blobs (a store that comes with every Netlify site,
 * nothing to set up), written only if nobody else wrote in between. On a developer's computer (`npm run dev`): a
 * file in .studio-data/ (never committed). Small side documents (sign-in attempts, the Google key) sit beside it.
 */
import { createHash } from 'node:crypto';
import type { Store } from '../core/runner';
import { emptyDB, type DB } from '../core/types';
import { isDev } from './env';

export interface ServerStore extends Store {
  kvGet<T>(key: string): Promise<T | null>;
  kvSet(key: string, value: unknown): Promise<void>;
  kvDelete(key: string): Promise<void>;
  /** read, change and write back only if nobody else wrote in between (tried again if they did); null leaves it */
  kvSwap<T>(key: string, fn: (v: T | null) => T | null): Promise<T | null>;
}

async function swapLoop<T>(read: () => Promise<{ v: T | null; tag: string | null }>, write: (v: T, tag: string | null) => Promise<boolean>, fn: (v: T | null) => T | null) {
  for (let i = 0; i < 8; i++) {
    const { v, tag } = await read();
    const next = fn(v);
    if (next === null) return null;
    if (await write(next, tag)) return next;
    await new Promise((r) => setTimeout(r, 20 + Math.random() * 60 * (i + 1)));
  }
  throw new Error('Too many writers at once; please try again.');
}

/* ---------------------------------------------------------------- a file, for development */

async function fileStore(): Promise<ServerStore> {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const dir = path.resolve(process.cwd(), '.studio-data');
  await fs.mkdir(dir, { recursive: true });
  const file = (k: string) => path.join(dir, `${k.replace(/[^a-z0-9-]/gi, '')}.json`);
  const readJson = async (k: string) => { try { return await fs.readFile(file(k), 'utf8'); } catch { return null; } };
  const write = async (k: string, text: string) => { const tmp = `${file(k)}.${process.pid}.tmp`; await fs.writeFile(tmp, text); await fs.rename(tmp, file(k)); };
  const tagOf = (text: string | null) => (text ? createHash('sha1').update(text).digest('hex') : null);
  let chain = Promise.resolve();
  return {
    async load() {
      const text = await readJson('db');
      return { db: text ? (JSON.parse(text) as DB) : emptyDB(), tag: tagOf(text) };
    },
    save(db, tag) {
      // one writer at a time inside this process; the tag check catches anyone else
      const run = chain.then(async () => {
        const now = tagOf(await readJson('db'));
        if (now !== tag) return false;
        await write('db', JSON.stringify(db));
        return true;
      });
      chain = run.then(() => undefined, () => undefined);
      return run;
    },
    async kvGet(k) { const t = await readJson(`kv-${k}`); return t ? JSON.parse(t) : null; },
    async kvSet(k, v) { await write(`kv-${k}`, JSON.stringify(v)); },
    async kvDelete(k) { await fs.rm(file(`kv-${k}`), { force: true }); },
    kvSwap(k, fn) {
      const key = `kv-${k}`;
      const run = chain.then(() => swapLoop(
        async () => { const t = await readJson(key); return { v: t ? JSON.parse(t) : null, tag: tagOf(t) }; },
        async (v, tag) => { if (tagOf(await readJson(key)) !== tag) return false; await write(key, JSON.stringify(v)); return true; },
        fn,
      ));
      chain = run.then(() => undefined, () => undefined);
      return run;
    },
  };
}

/* ---------------------------------------------------------------- Netlify Blobs, on the host */

async function blobStore(): Promise<ServerStore> {
  const { getStore } = await import('@netlify/blobs');
  const store = getStore({ name: 'studio', consistency: 'strong' });
  return {
    async load() {
      const r = await store.getWithMetadata('db', { type: 'json' });
      return { db: (r?.data as DB) ?? emptyDB(), tag: r?.etag ?? null };
    },
    async save(db, tag) {
      const res = tag ? await store.setJSON('db', db, { onlyIfMatch: tag }) : await store.setJSON('db', db, { onlyIfNew: true });
      return res.modified !== false;
    },
    async kvGet(k) { return ((await store.get(`kv-${k}`, { type: 'json' })) as never) ?? null; },
    async kvSet(k, v) { await store.setJSON(`kv-${k}`, v); },
    async kvDelete(k) { await store.delete(`kv-${k}`); },
    kvSwap(k, fn) {
      return swapLoop(
        async () => { const r = await store.getWithMetadata(`kv-${k}`, { type: 'json' }); return { v: (r?.data as never) ?? null, tag: r?.etag ?? null }; },
        async (v, tag) => { const res = tag ? await store.setJSON(`kv-${k}`, v, { onlyIfMatch: tag }) : await store.setJSON(`kv-${k}`, v, { onlyIfNew: true }); return res.modified !== false; },
        fn,
      );
    },
  };
}

let cached: Promise<ServerStore> | null = null;
export function serverStore() {
  cached ??= isDev() ? fileStore() : blobStore();
  return cached;
}

/** a simple limit: at most `max` tries per key in `windowMs` (sign-in attempts, requests from one address) */
export async function limited(key: string, max: number, windowMs: number) {
  const s = await serverStore();
  const now = Date.now();
  const guard = ((await s.kvGet<Record<string, { n: number; reset: number }>>('guard')) ?? {});
  for (const [k, v] of Object.entries(guard)) if (v.reset < now) delete guard[k];
  const g = guard[key] ?? { n: 0, reset: now + windowMs };
  g.n += 1;
  guard[key] = g;
  await s.kvSet('guard', guard);
  return g.n > max;
}
