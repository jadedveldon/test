// Turns the normal build (dist/) into a self-contained preview that works from
// any folder. Every page is placed at the same level (pillars/magic.html
// becomes pillars-magic.html) and every root-relative link becomes relative,
// so links resolve the same way on every page, including during the animated
// page changes. Real hosting uses dist/ as is.
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const SRC = 'dist';
const OUT = process.argv[2] || 'preview-artifact/site';

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : [p];
});

const flat = (p) => p.split('/').filter(Boolean).join('-');

let changed = 0;
for (const file of walk(SRC)) {
  const rel = relative(SRC, file).split(sep).join('/');
  if (!rel.endsWith('.html')) {
    mkdirSync(join(OUT, rel, '..'), { recursive: true });
    cpSync(file, join(OUT, rel));
    continue;
  }
  const html = readFileSync(file, 'utf8').replace(/(href|src)="\/(?!\/)([^"]*)"/g, (_, attr, rest) => {
    const [pathAndQuery, hash] = rest.split('#');
    const [path, query] = pathAndQuery.split('?');
    let p;
    if (path === '') p = 'index.html';
    else if (!/\.[a-z0-9]+$/i.test(path)) p = `${flat(path)}.html`; // a page
    else if (path.endsWith('.html')) p = flat(path);
    else p = path; // an asset, e.g. _astro/x.js
    changed++;
    return `${attr}="${p}${query ? `?${query}` : ''}${hash !== undefined ? `#${hash}` : ''}"`;
  });
  writeFileSync(join(OUT, flat(rel)), html);
}
console.log(`preview written to ${OUT} (${changed} links made relative)`);
