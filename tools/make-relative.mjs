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
  if (/^_astro\/.*\.js$/.test(rel)) {
    // the bundler preloads a dynamic import's pieces from the site's root ("/" + "_astro/x.js"); in a preview that sits
    // in a folder that address is wrong, the preload fails and so does the import (the Studio's demo). Preload them
    // from beside the script instead.
    const js = readFileSync(file, 'utf8');
    const fixed = js.replace(/=function\((\w+)\)\{return`\/`\+\1\}/g, (_, v) => { changed++; return `=function(${v}){return new URL("../"+${v},import.meta.url).href}`; });
    if (js.includes('modulepreload') && js.includes('return`/`+') && fixed === js) throw new Error(`make-relative: the preload helper in ${rel} has changed shape; update the pattern`);
    mkdirSync(join(OUT, rel, '..'), { recursive: true });
    writeFileSync(join(OUT, rel), fixed);
    continue;
  }
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
  })
    // an interactive island (the Studio) names its code in attributes that the page imports as modules; a module
    // address must start with ./ to be relative, or it is read as a package name
    .replace(/(component-url|renderer-url|before-hydration-url)="\/(?!\/)([^"]*)"/g, (_, attr, rest) => { changed++; return `${attr}="./${rest}"`; })
    // a moved page (Writings → Articles) is a page that sends you on; its address must be relative too
    .replace(/content="(\d+);url=\/(?!\/)([^"]*)"/g, (_, t, rest) => { changed++; const [path, query] = rest.split('?'); const to = path === '' ? 'index.html' : /\.html$/.test(path) ? flat(path) : /\.[a-z0-9]+$/i.test(path) ? path : `${flat(path)}.html`; return `content="${t};url=${to}${query ? `?${query}` : ''}"`; });
  writeFileSync(join(OUT, flat(rel)), html);
}
console.log(`preview written to ${OUT} (${changed} links made relative)`);
