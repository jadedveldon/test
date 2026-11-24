# Quality checks

The scripts used to audit the site. They drive a real browser (Chromium, through Playwright)
against the built site and print `ok` or `FAIL` for each check. Screenshots go to `qa-output/`.

## Run them

```sh
npm run build
npx astro preview            # serves the built site on http://127.0.0.1:4321
npm i --no-save playwright axe-core && npx playwright install chromium   # once
sh tools/qa/run-all.sh       # everything, about an hour; or run one script:
node tools/qa/keyboard.cjs
```

`QA_BASE` points the scripts at another address, `QA_OUT` at another folder for screenshots.

## What each one checks

| Script | Checks |
| --- | --- |
| `audit.cjs` | Every page, desktop and phone: script errors, failed files, sideways scrolling, text left hidden after scrolling, broken links, unlabelled controls, small tap targets, images without descriptions, one main heading |
| `interactions.cjs` | Menu, search, keeping a service, today's card, mala, fire, diya, Find your path, the Connect form, the invoice QR, sound, the panel, a festival day, the page transition (`W=390 H=844` for a phone) |
| `pd-test.cjs` | Pillars 4 to 6 in each direction: the signature moment, the worlds behind each chapter, nothing hidden or sideways (`PILLAR=identity`, `divination` or `learning`) |
| `review-verify.cjs` | Each bug found in the code review, re-created to prove it stays fixed |
| `a11y.cjs` | axe (WCAG 2.2 AA and best practice) on every page and direction and with each overlay open; heading order; landmarks; WCAG 2.2 target size |
| `keyboard.cjs` | Keyboard only: tab order, visible focus, nothing invisible takes focus, the menu, search and card keep and return focus, every signature moment works without a mouse |
| `motion.cjs` | Reduced motion (Calm, no 3D, nothing animating) and Windows high contrast (every control keeps a visible edge) |
| `robust.cjs` | Storage blocked, no WebGL, JavaScript off, nonsense in the address, markup and odd text in every form, rapid clicks, back and forward, resizing, printing |
| `layout.cjs` | Seven screen sizes, 200% text and WCAG text spacing: sideways scrolling, clipped text, the heading under the header |
| `mem.cjs` | Memory over 32 page changes: heap, elements, listeners, animation loops, timers |
| `vitals.cjs` | Load on a slow phone (4x slower processor, slow 4G): first paint, largest paint, layout shift, long tasks, bytes |

Software 3D drawing in a test machine is much slower than a phone's graphics chip, so 3D frame rates and long
tasks here are pessimistic. Only Chromium is covered; Safari and Firefox need a check on real devices.
