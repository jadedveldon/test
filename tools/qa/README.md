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
| `studio-core.mjs` | The Studio's rules in memory (no browser): every path a request, a booking and an invoice can take, time zones (London, India, New York in summer), saving twice at once, erasing a client, invoice dates in India, calendar files, UPI links (`node tools/qa/studio-core.mjs`) |
| `studio.cjs` | The whole loop in a browser, as a visitor and as Sarvakali: keep services, ask about them, send (the list empties), follow it; confirm, offer a new time, accepted; an invoice made, sent, paid by the client's word and marked paid; every email in the outbox; every Studio page on a phone. Against the dev server (`npm run dev`, the real API, port 4400 by default with `QA_BASE`) or, with `QA_STUDIO=demo`, the preview bundle on port 8099 |
| `me-core.mjs` | Visitor accounts in memory: merging two devices, deletions, clearing, old records, the journal lock, sign-in links once only and for 15 minutes, no journal text kept in the open, a client's own space only, the Studio seeing only whether there is an account, signing out everywhere, deleting (`node tools/qa/me-core.mjs`) |
| `me.cjs` | Accounts in a browser: old records converted, sign-in by link, a second device, the journal lock, convergence, a client's sessions, download, sign out everywhere, delete. Dev server, or `QA_ME=demo` against the preview |
| `obs-core.mjs` | Observability in memory: private things scrubbed (tokens in links, emails, phones, UPI IDs, private fields), robots, error grouping, a day worked out (visitors, visits, bounces, journeys, goals, speed, errors), days combined, logs by reference, letting old data go, alerts (`node tools/qa/obs-core.mjs`) |
| `diya.cjs` | The diya's shared count of the day: two visitors, one count, each their own share, kept after a reload, refused from another site. Dev server (`npm run dev`); it lights real lamps, so not against the live site |
| `obs.cjs` | Observability in a browser: visits, campaign tags and goals counted; an error caught with its trail; nothing private kept; robots left out; references on every host answer leading to log lines; health; breadcrumbs; every Insights tab. Dev server, or `QA_OBS=demo` against the preview |

## Known false alarms

Each one has been looked at and is not a problem; add to this list only with a reason.

- `audit.cjs`, phone, `/pillars/learning` and `/pillars/identity`: "SMALL 13x13" (several). The radio buttons
  and checkboxes of Find your class and of the comfort note are hidden on purpose; the visible chip is the
  target, and it is 36px tall on touch screens (keyboard focus shows a ring on the chip).
- `layout.cjs`, `/pillars/devotion`: "CLIPPED li.greek-card". Measured while the Greek display font is still
  loading; once it has loaded nothing is clipped (checked in the browser at every size).
- `studio.cjs` and any check that opens an email in the Studio's outbox: "Failed to read the 'serviceWorker'
  property from 'Navigator' … sandboxed". The checks block service workers, which injects a script into every
  frame; an email is shown in a sandboxed frame (no scripts of its own), where that injected script may not
  look. The page itself is fine. `studio.cjs` skips this one message.
- `studio.cjs` against the dev server: a 403 for `/brand/email-mark.png`. The dev server refuses pictures asked for
  from another site, and the sandboxed email frame counts as one; the live site and the preview serve it.
  `studio.cjs` skips 403s only when run against the dev server.

Software 3D drawing in a test machine is much slower than a phone's graphics chip, so 3D frame rates and long
tasks here are pessimistic. Only Chromium is covered; Safari and Firefox need a check on real devices.

- `obs.cjs` and any walk that counts visits: a test browser's own name says "HeadlessChrome", so the site rightly
  treats it as a robot and counts nothing; the checks give it an ordinary browser's name. And a page left because
  the harness sent the browser to a new address (`page.goto`) drops the beacon it sends while closing (real
  browsers deliver it), so the checks move between pages by the site's own links, as visitors do.
