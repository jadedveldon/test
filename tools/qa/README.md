# Quality checks

The scripts used to audit the site. They drive a real browser (Chromium, through Playwright)
against the built site and print `ok` or `FAIL` for each check. Screenshots go to `qa-output/`.

## The rules

`CLAUDE.md` at the top of the project sets the quality gate: after every change run `run-quick.sh`; before
publishing or pushing a round of work run `run-all.sh` and `preview-check.cjs`; a new bug gets a check in
`regressions.cjs` first; every change is logged in `CHANGELOG.md`.

## Run them

```sh
npm run build
npx astro preview            # serves the built site on http://127.0.0.1:4321
npm i --no-save playwright axe-core && npx playwright install chromium   # once
# if Playwright or axe-core live elsewhere, add their folders to NODE_PATH (keep what is already there:
# NODE_PATH="$NODE_PATH:/path/to/node_modules"), or a script will stop with "Cannot find module"
sh tools/qa/run-quick.sh     # after every change, about 20 minutes
sh tools/qa/run-all.sh       # before publishing, about an hour
npm run preview:artifact && python3 -m http.server 8099 --bind 127.0.0.1 -d preview-artifact &
node tools/qa/preview-check.cjs
```

`QA_BASE` points the scripts at another address, `QA_OUT` at another folder for screenshots.

## What each one checks

| Script | Checks |
| --- | --- |
| `rules.cjs` | The content rules on the built site and the source, in seconds: no prices, no catalogue numbers, language, titles, descriptions and preview pictures, safe new-tab links, 14416 always tap-to-call, care notes in place, no placeholder words, no personal email addresses, no AI model identifiers, drafts marked, every service a signature moment names is in the catalogue, every catalogue service and category reaches its pillar page |
| `content.mjs` | The content files in `src/content/` read the way the content editor reads them: each opens, required lines are filled, fixed-length lists keep their length, every choice is one the editor offers (`node --experimental-strip-types tools/qa/content.mjs`, no build needed) |
| `audit.cjs` | Every page, desktop and phone: script errors, failed files, sideways scrolling, text left hidden after scrolling, broken links, unlabelled controls, small tap targets, images without descriptions, one main heading |
| `regressions.cjs` | Every bug found so far, re-created so it cannot quietly return (including: the offline helper never saves the content editor or its door) |
| `pillars.cjs` | Pillars 4 to 6: each chapter's world, nothing hidden or sideways, every signature moment by mouse, touch and keyboard, the homepage chapters |
| `interactions.cjs` | Menu, search, keeping a service, today's card, mala, fire, diya, Find your path, the Connect form, the invoice QR, sound, the panel, a festival day, the page transition (`W=390 H=844` for a phone) |
| `keyboard.cjs` | Keyboard only: tab order, visible focus, nothing invisible takes focus, the menu, search and card keep and return focus, every signature moment without a mouse |
| `a11y.cjs` | axe (WCAG 2.2 AA and best practice) on every page and with each overlay open; heading order; landmarks; WCAG 2.2 target size |
| `motion.cjs` | Reduced motion (Calm, no 3D, nothing animating) and Windows high contrast (every control keeps a visible edge) |
| `robust.cjs` | Storage blocked, no WebGL, JavaScript off, nonsense in the address, markup and odd text in every form, rapid clicks, back and forward, resizing, printing |
| `layout.cjs` | Seven screen sizes, 200% text and WCAG text spacing: sideways scrolling, clipped text, the heading under the header |
| `mem.cjs` | Memory over 32 page changes: heap, elements, listeners, animation loops, timers |
| `vitals.cjs` | Load on a slow phone (4x slower processor, slow 4G): first paint, largest paint, layout shift, long tasks, bytes |
| `preview-check.cjs` | The shareable preview bundle served statically: the cover, its pictures and links, and each pillar's own code loading and responding |

## Known false alarms

Each one has been looked at and is not a problem; add to this list only with a reason.

- `audit.cjs`, phone, `/pillars/learning` and `/pillars/identity`: "SMALL 13x13" (several). The radio buttons
  and checkboxes of Find your class and of the comfort note are hidden on purpose; the visible chip is the
  target, and it is 36px tall on touch screens (keyboard focus shows a ring on the chip).
- `layout.cjs`, `/pillars/devotion`: "CLIPPED li.greek-card". Measured while the Greek display font is still
  loading; once it has loaded nothing is clipped (checked in the browser at every size).

Software 3D drawing in a test machine is much slower than a phone's graphics chip, so 3D frame rates and long
tasks here are pessimistic. Only Chromium is covered; Safari and Firefox need a check on real devices.
