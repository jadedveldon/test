// Makes the mark's picture files from its one drawing (src/data/brand.ts): the favicon, the app icons, the picture
// at the top of every email, and a sheet of the four logo directions for the preview's cover.
// Run: node tools/make-brand.mjs   (needs Playwright's Chromium, as the checks do)
import { build } from 'esbuild';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const dir = mkdtempSync(join(tmpdir(), 'brand-'));
await build({ entryPoints: ['src/data/brand.ts'], bundle: true, format: 'esm', platform: 'node', outfile: join(dir, 'brand.mjs'), logLevel: 'error' });
const { markSvg, BRAND, MARK } = await import(pathToFileURL(join(dir, 'brand.mjs')).href);
rmSync(dir, { recursive: true, force: true });

mkdirSync('public/brand', { recursive: true });
mkdirSync('public/icons', { recursive: true });
// the favicon: the mark on the night, with the ember flame
writeFileSync('public/favicon.svg', markSvg({ bg: BRAND.deep, rounded: 14, pad: 5, flame: BRAND.ember }));
writeFileSync('public/brand/mark.svg', markSvg({ flame: BRAND.ember }));

const b = await chromium.launch();
const shot = async (svg, size, file, transparent = false) => {
  const p = await b.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await p.setContent(`<html><body style="margin:0;background:${transparent ? 'transparent' : BRAND.deep}">${svg.replace(/width="\d+" height="\d+"/, `width="${size}" height="${size}"`)}</body></html>`);
  await p.screenshot({ path: file, omitBackground: transparent });
  await p.close();
};
await shot(markSvg({ bg: BRAND.deep, rounded: 14, pad: 7, flame: BRAND.ember }), 192, 'public/icons/icon-192.png');
await shot(markSvg({ bg: BRAND.deep, rounded: 14, pad: 7, flame: BRAND.ember }), 512, 'public/icons/icon-512.png');
// maskable: the mark kept inside the safe circle, the background to the edges
await shot(markSvg({ bg: BRAND.deep, rounded: 0, pad: 14, flame: BRAND.ember }), 512, 'public/icons/icon-maskable-512.png');
// emails (shown at 44 px; drawn at twice that for sharp screens), on the email's cream, so no transparency is needed
await shot(markSvg({ bg: '#fffdf9', pad: 2, fg: BRAND.red, flame: BRAND.ember }), 88, 'public/brand/email-mark.png');

// the four directions, for the cover
const others = {
  'Yantra seal': `<svg viewBox="0 0 64 64" width="180" height="180"><g fill="none" stroke="${BRAND.gold}" stroke-width="1.4"><circle cx="32" cy="32" r="28"/><circle cx="32" cy="32" r="24.5" stroke-width="0.8"/>${[0, 1, 2, 3, 4].map((i) => { const r = 20 - i * 3.6; return `<path d="M${32 - r * 0.866} ${32 - r / 2} L${32 + r * 0.866} ${32 - r / 2} L32 ${32 + r} Z"/>`; }).join('')}${Array.from({ length: 8 }, (_, i) => `<path transform="rotate(${i * 45} 32 32)" d="M32 4 Q36 8 32 11.5 Q28 8 32 4Z"/>`).join('')}</g><circle cx="32" cy="32" r="1.8" fill="${BRAND.ember}"/></svg>`,
  'S of flame and moon': `<svg viewBox="0 0 64 64" width="180" height="180"><path d="M43 13 C36 6 21 8 21 19 C21 30 43 30 43 42 C43 53 28 57 19 50" fill="none" stroke="${BRAND.gold}" stroke-width="4.2" stroke-linecap="round"/><path d="M43 13 C45 9 44 5 41 3 C42 7 39 9 39 12 Z" fill="${BRAND.ember}"/><path d="M14 52 A10 10 0 0 0 26 58 A8 8 0 0 1 14 52Z" fill="${BRAND.gold}"/></svg>`,
  'Three eyes': `<svg viewBox="0 0 64 64" width="180" height="180"><g fill="none" stroke="${BRAND.gold}" stroke-width="2.4"><path d="M10 40 Q20 31 30 40 Q20 49 10 40Z"/><path d="M34 40 Q44 31 54 40 Q44 49 34 40Z"/><path d="M32 10 Q39 19 32 28 Q25 19 32 10Z" stroke="${BRAND.ember}"/></g><circle cx="20" cy="40" r="2.6" fill="${BRAND.gold}"/><circle cx="44" cy="40" r="2.6" fill="${BRAND.gold}"/><circle cx="32" cy="19" r="2.4" fill="${BRAND.ember}"/></svg>`,
};
const chosen = markSvg({ size: 180, flame: BRAND.ember, lid: true });
const cell = (name, svg, note) => `<figure><div class="m">${svg}</div><figcaption><b>${name}</b><span>${note}</span></figcaption></figure>`;
const p = await b.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
await p.setContent(`<html><head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Inter:wght@400;600&display=swap"></head><body style="margin:0;padding:40px;background:#0e0807;color:#f4ebe1;font-family:Inter,sans-serif">
<style>.g{display:grid;grid-template-columns:repeat(4,1fr);gap:24px}figure{margin:0;padding:28px;border-radius:18px;background:#1b1210;box-shadow:inset 0 0 0 1px #3a2a25;display:grid;gap:18px;justify-items:center;text-align:center}figure.c{box-shadow:inset 0 0 0 2px ${BRAND.gold}}.m{height:190px;display:grid;place-items:center}figcaption{display:grid;gap:6px}b{font:400 1.7rem/1 'Instrument Serif',serif}span{font-size:.9rem;color:#c0ad9e;line-height:1.45}
.lock{margin-top:28px;display:flex;gap:40px;align-items:center;justify-content:center;padding:30px;border-radius:18px;background:#1b1210}.w{display:flex;align-items:center;gap:14px;font:400 3.2rem/1 'Instrument Serif',serif}.w.light{background:#f6ecdf;color:#2b1c16;padding:16px 26px;border-radius:14px}</style>
<div class="g">
<figure class="c">${cell('Lamp, moon and eye', chosen, 'Chosen. A crescent that is also a lamp’s bowl holds a flame that is also the third eye, with the bindu at its heart.').replace(/^<figure>|<\/figure>$/g, '')}</figure>
${Object.entries(others).map(([k, v]) => cell(k, v, { 'Yantra seal': 'A bindu inside five downward triangles and eight petals. Rich, but busy at small sizes.', 'S of flame and moon': 'The initial as one stroke, ending in a flame. Elegant, but reads as a letter more than a sign.', 'Three eyes': 'Kali’s three eyes, from the opening. Striking, but at a glance it reads as a face.' }[k])).join('')}
</div>
<div class="lock"><span class="w">${markSvg({ size: 64, flame: BRAND.ember })}Sarvakali</span><span class="w light">${markSvg({ size: 64, fg: BRAND.red, flame: BRAND.ember })}Sarvakali</span>${markSvg({ size: 64, bg: BRAND.deep, rounded: 14, pad: 5, flame: BRAND.ember })}${markSvg({ size: 32, bg: BRAND.deep, rounded: 8, pad: 4, flame: BRAND.ember })}${markSvg({ size: 16, bg: BRAND.deep, rounded: 3, pad: 2, flame: BRAND.ember })}</div>
</body></html>`);
await p.waitForTimeout(1200);
mkdirSync('qa-output/brand', { recursive: true });
await p.screenshot({ path: 'qa-output/brand/logo-directions.png', fullPage: true });
await b.close();
void MARK;
console.log('brand files written: public/favicon.svg, public/brand/*, public/icons/*; qa-output/brand/logo-directions.png');
