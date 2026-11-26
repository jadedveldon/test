// Makes the app icons. (The link-preview pictures are made by tools/make-og.cjs.)
// Run with the site served locally (npm run build && npx astro preview):
//   node tools/make-previews.cjs [http://127.0.0.1:4321]
// Needs Playwright with Chromium installed.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const base = process.argv[2] || 'http://127.0.0.1:4321';
const pub = path.join(__dirname, '..', 'public');

const ICON = (pad) => `<!doctype html><html><body style="margin:0;background:#060304">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="bg" cx="50%" cy="42%" r="70%"><stop offset="0" stop-color="#3a0d10"/><stop offset="1" stop-color="#060304"/></radialGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffcf7a" stop-opacity="0.55"/><stop offset="1" stop-color="#f0903a" stop-opacity="0"/></radialGradient>
    <radialGradient id="iris" cx="50%" cy="45%" r="55%"><stop offset="0" stop-color="#ffd98e"/><stop offset="0.45" stop-color="#e2622f"/><stop offset="1" stop-color="#3b0907"/></radialGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <g transform="translate(256 256) scale(${pad})">
    <circle r="190" fill="url(#glow)"/>
    <path d="M0 -170 Q118 0 0 170 Q-118 0 0 -170Z" fill="#1c0807" stroke="#f0b34a" stroke-width="9"/>
    <circle r="46" fill="url(#iris)"/><circle r="16" fill="#080203"/><circle cx="-14" cy="-16" r="7" fill="#fff" opacity="0.8"/>
  </g>
</svg></body></html>`;

(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  // icons
  const ip = await b.newPage({ viewport: { width: 512, height: 512 } });
  for (const [name, size, pad] of [['icon-512', 512, 1], ['icon-192', 192, 1], ['icon-maskable-512', 512, 0.72]]) {
    await ip.setContent(ICON(pad));
    const buf = await ip.locator('svg').screenshot();
    if (size === 512) fs.writeFileSync(path.join(pub, 'icons', `${name}.png`), buf);
    else {
      await ip.setViewportSize({ width: 192, height: 192 });
      await ip.setContent(ICON(pad).replace('width="512" height="512"', 'width="192" height="192"'));
      fs.writeFileSync(path.join(pub, 'icons', `${name}.png`), await ip.locator('svg').screenshot());
      await ip.setViewportSize({ width: 512, height: 512 });
    }
  }
  await b.close();
})();
