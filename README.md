# Sarvakali

Website for Sarvakali. This is the **Phase 0 working prototype**: the engine is real, while colours, type, copy and the intro artwork are placeholders until each pillar's art direction is designed.

Before changing anything, read `CLAUDE.md` (the standing rules, including the quality gate every change must pass). Every change is logged in `CHANGELOG.md`.

## Run it

```bash
npm install
npm run dev          # local development at http://localhost:4321
npm run build        # static site in dist/ (any static host)
npm run preview:artifact   # dist/ + a copy with relative links in preview-artifact/site
node tools/make-previews.cjs     # app icons + link-preview pictures (needs the site served and Playwright)
```

Add `?tier=ultra|full|lighter|still|calm` to any URL to force a quality level, and `?intro=1` to replay the intro.
Experiments can be set by URL too: `?hero=dawneye|eye|name|dawn`, `?page=eye|smoke|ink|morph|fade`, `?cursor=flame|incense|off`,
`?sky=now|amavasya|purnima|night|day|off`, `?festival=auto|kalipuja|diwali|navratri|eclipse|none`, `?forms=on|off`, `?bend=on|off`, `?touch=on|off`, `?dust=on|off`, `?haptics=on|off`, `?saver=on|off`.

## Editing content

Every word and list on the settled pages, the whole catalogue, the writings, festival days, today's cards and
the site settings are edited in the **content editor** (Keystatic): run `npm run dev` and open
http://localhost:4321/keystatic. The files it writes are in `src/content/`. On the live site the editor sits
behind a secret door and its own sign-in; `docs/editor.md` explains using it and the one-time setup.

About, Boundaries and care, Connect, Find your path, Daily practice, the invoice maker and the depth demo are
still edited in their pages (`src/pages/*.astro`) until their design pass is done.

## How it fits together

| Piece | Where | What it does |
|---|---|---|
| Living world | `src/scripts/world/World.ts` | One Three.js canvas behind every page: domain-warped smoke, drifting motes, pointer light. Blends between atmospheres and eases towards them, so scroll and page changes morph instead of cutting. Writes the current colours to CSS variables so text follows. |
| Atmospheres | `src/scripts/world/presets.ts` | One preset per chapter (placeholder palettes). |
| Orchestration | `src/scripts/app.ts` | Lenis smooth scroll on GSAP's ticker, chapter tracking, SplitText reveals, quality levels, prototype panel, page-change cleanup. |
| Quality levels | `src/scripts/tiers.ts` | Ultra / Full / Lighter / Still / Calm. Measures frame rate on first visit, steps up to Ultra on strong desktops and down when a device struggles. Calm is used when "reduce motion" is on; Still when the phone asks to save data. |
| Intro | `src/components/Loader.astro`, `src/scripts/loader.ts` | Stand-in eyes: open, two blinks, third eye opens as light gathers, fly-in, eye-shaped reveal of the hero. Once per visit, skippable. |
| Pages | `src/pages/` | Homepage chapters, six pillar pages, each designed on its own, with services drawn from the catalogue in `src/content/catalogue/` (all 1,123), Connect page stub. |
| Page changes | `src/layouts/Base.astro`, `src/scripts/transitions.ts`, `src/components/Veil.astro` | Astro's ClientRouter with `transition:persist` keeps the world canvas alive across pages. Custom covers (eye, smoke, ink) wrap the router's loader. |
| Living forms | `src/scripts/world/forms.ts` | One cloud of points (60,000 on Full, 12,000 on Lighter, 240,000 on Ultra, built in the background) that reshapes per chapter: halo, name, spiral, 108-flame ring, sigils, sea, silk, constellations, the 51-letter garland, the third eye, dawn. Parts around a finger or cursor. |
| Smoke cost | `src/scripts/world/World.ts` | The smoke is drawn at half resolution into a texture and scaled up; grain and the moon are added at full resolution. |
| Headings to dust | `src/scripts/dust.ts` + `World.ts` | As a heading scrolls away it is traced into points (by drawing its words on a hidden canvas) that drift into the world. |
| Living sky | `src/scripts/sky.ts` | Tonight's moon phase (suncalc) drawn in the world, the lunar day (tithi) in the header, darker at night, Amavasya deeper and red, Purnima silver. |
| Experiments | `src/scripts/experiments.ts` | Hero options (eye at dawn, living eye, name of light, dawn), flame and incense cursors, magnetic buttons, phone tilt, and the switches in the prototype panel. |
| Incense cursor | `src/scripts/fluid.ts` | A small WebGL2 fluid simulation: smoke rises from the stick, curls, and thins away. Sleeps when idle. |
| Sound | `src/scripts/audio.ts` | Off by default. A tanpura drone plucked live in the browser (no audio files), with one layer per pillar that cross-fades as you scroll. |
| Card, diya, path | `src/scripts/card.ts`, `diya.ts`, `path.ts`, `src/pages/path.astro` | Today's card (placeholder deck), a diya to light (count is local in the prototype), and three questions that point to a pillar and category. |
| Vibration, data saver | `src/scripts/haptics.ts`, `app.ts` | Gentle vibration at key moments on Android; Still mode plus a notice when the phone asks to save data. |
| Faster first load | `src/scripts/world/handle.ts` | The 3D world is its own download, fetched after the page has painted; a stand-in keeps the page colours blending meanwhile. Still, Calm and data saver never download it. |
| Search, list, menu | `src/scripts/search.ts`, `keep.ts`, `menu.ts`, `src/pages/search-index.json.ts` | Search every service ("/" or Ctrl+K), keep services in a list that fills the Connect form, full-screen menu. |
| Festival days, moon | `src/scripts/festivals.ts` | Festival looks (Kali Puja, Diwali, Navratri, eclipse) by date, next new/full moons, calendar (.ics) files. |
| Daily practice | `src/pages/practice.astro`, `src/scripts/practice.ts` | 108-bead mala, offer to the fire, diya, sacred days, moon reminders, install on phone. |
| Invoice maker | `src/pages/invoice.astro`, `src/scripts/invoice.ts` | Branded invoice with a UPI QR code for the exact amount; print or save as PDF. Not linked publicly, not indexed. |
| Install, offline | `public/manifest.webmanifest`, `public/sw.js`, `src/scripts/pwa.ts` | Add to home screen, shortcuts, visited pages work offline. |
| Device test | `src/scripts/devicetest.ts` | "Test this device" in the panel: smoothness per quality level and a copyable report. |
| Link previews | `tools/make-previews.cjs`, `public/og/` | A preview picture per page, taken from the real page. |
| Content editor | `keystatic.config.ts`, `src/content/`, `src/editor/` | Keystatic at `/keystatic`: every settled page's words, the catalogue, writings, festivals, cards, settings. Behind a secret door (`/door/<word>`) and its own sign-in on the host. |
| AI depth demo | `src/pages/depth.astro`, `src/scripts/depth.ts`, `public/depth/` | Kalighat paintings (Cleveland Museum of Art, CC0) with depth maps made ahead of time by Depth Anything V2 Small (Apache-2.0). |

## Designing the pillars

Each pillar is designed one at a time, by comparing complete directions live.

| Pillar | Status | Where |
|---|---|---|
| 1 · Devotion & the Unseen | Direction chosen: C, Cosmic mother. Seven movements, each with its own world: the Kali yantra (Mahavidyas, the Devi and Hindu deities), a Greek temple and the five elements (Greek gods), constellations (many traditions), lamps (altars), a nebula (spirits and ancestors), the world tree (shamanic work). Directions A and B are in the history (commit 7050a47). | `src/pages/pillars/devotion.astro`, `src/data/devotion.ts`, `src/scripts/devotion.ts`, presets `devC_*`, forms `yantra`, `temple`, `tree` |
| 2 · Witchcraft & Magic | Designed: the gilded grimoire, a mix of A (The grimoire) and C (Alchemical sky). One book with parchment day pages and black-emerald-gold night pages (`PAGES` in `src/data/magic.ts`); between them the shader spreads the night in like ink, and the page uses edge blending (`data-blend="edge"`) so colours only turn near each chapter's edge. Hecate presides: the crossroads opening, her own section (Sarvakali's words, the next dark moon, her workings; the sourced facts live in the cover's fact check) and a featured card in Devotion. The sigil maker is kept, gilded, and now offers five ways to compare (`SIGIL_METHODS`: letter wheel, monogram, magic square, bindrune, draw your own), each with a sourced note on where it comes from. The monogram is arranged on a central line, around a ring or stacked (`arrange()` in `src/scripts/magic.ts`), and its letters can be moved, turned and flipped; a pen finishes any way by hand; any can be saved as a picture. No wax seal. The wheel of the year (with the Indian ritus) sits in Rituals. Directions A, B and C are in the history (commits 43c2c84, 7e4011a). | `src/pages/pillars/magic.astro`, `src/data/magic.ts`, `src/scripts/magic.ts`, `src/components/SubCards.astro`, presets `magG_*`, forms `crossroads`, `rose`, `pentacle`, `moons`; ink transition in `src/scripts/world/World.ts` (`uInk`) |
| 3 · Healing & Inner Work | Designed: still water (A) with C's gold accents, in four chapters (energy, mind, shadow, journal) with care notes on the mind and shadow chapters. A breathing guide with seven patterns (soft count, box, 4-7-8, physiological sigh, coherent, bhramari, alternate nostril) and a 5-4-3-2-1 grounding list; the seven chakras mid-page; a kintsugi puzzle of twelve straight-cut pieces to set back together; a journal prompt. Directions A, B and C are in the history (commit 90cea8c and before). | `src/pages/pillars/healing.astro`, `src/data/healing.ts`, `src/scripts/healing.ts`, presets `heal_*`, forms `lotus`, `chakras`, `bowl`, `halves`, `book` |
| 4 · Identity, Intimacy & the Body | Designed: Soft prism (direction B), a bright, gentle page where light breaks into every colour (DM Serif Display). Five chapters, a welcome note that assumes nothing, support links (Mariwala Health Initiative's queer-affirmative directory, Tele-MANAS) and care notes on the intimacy and body chapters. Signature: your comfort, first, a private note for the first conversation (pace, what to explore, pronouns if wished; never saved or sent). Directions A and C are in the history (commit 6b25b2a). | `src/pages/pillars/identity.astro`, `src/data/identity.ts`, `src/scripts/identity.ts`, presets `id_*`, forms `prism`, `rose`, `figure`, `moons` |
| 5 · Divination & Insight | Designed: candlelight and the black mirror, A and B as one book with two kinds of page. Table pages (wine, gold leaf, card frames: Readings, The inner eye, the close) and mirror pages (obsidian, silver, arched mirrors: Other ways of seeing, Dreams, Between worlds); Cormorant Unicase with Tenor Sans. Signature: prompts to ponder, the black mirror in a gilt frame; hold it still and a symbol rises with a prompt to sit with (24 prompts, `PROMPTS`). A note that readings are for reflection and do not replace medical, legal or financial advice. The three-card draw and C are in the history. | `src/pages/pillars/divination.astro`, `src/data/divination.ts`, `src/scripts/divination.ts`, presets `div_*`, forms `mirror`, `cards`, `moons`, `eye`, `stars` |
| 6 · Learning | Designed: the library, the leaf and the stars, all three directions as three rooms of one page: the library by lamplight (A, Libre Baskerville), the palm-leaf manuscripts (C, Gotu) and the night road of study (B, Josefin Slab); light and dark pages blend at the edges (`data-blend="edge"`). Signatures: find your class (three questions, in the library) and your path of study (a road of stars). Four ways to learn. The yantra drawing is in the history. | `src/pages/pillars/learning.astro`, `src/data/learning.ts`, `src/scripts/learning.ts`, presets `lrn_*`, forms `lamps`, `sigils`, `yantra`, `lotus`, `path` |

All six pillars are now settled. Each has its own page, its own script (loaded only there by `pageModule` in `src/scripts/app.ts`) and its own worlds, keyed by each chapter's `data-chapter`. The live A/B/C direction system used to compare designs for Pillars 4 to 6 is in the history (commit 97b1c21) if a pillar is ever reopened.

## Facts on the site

Every factual line is checked against sources before it goes on the site; anything interpretive is marked as a draft for Sarvakali. The current fact-check table (claims, status, sources, changes) is on the prototype's cover page. Festival dates live in `src/content/festivals.json` (Festival days in the editor) and must be confirmed with Sarvakali's panchang.

## Quality checks

The site has been through a code review and a deep test pass (see the preview cover for the findings). The
checks are kept in `tools/qa/` and can be re-run against the built site: every page on desktop and phone,
every interaction, each direction of Pillars 4 to 6, accessibility (WCAG 2.2 AA, keyboard only, reduced motion,
high contrast, 200% text), robustness (storage blocked, no WebGL, JavaScript off, odd input, rapid clicks),
seven screen sizes, memory over many page changes, and load on a slow phone. `tools/qa/README.md` says how.

Things the checks rely on: each pillar's own script loads only on its own page (`pageModule` in
`src/scripts/app.ts`, `STARTERS` in `src/scripts/dirpages.ts`); a page's start function returns a stop function
that puts its moment back as it found it; the prototype panel starts closed before the first paint; full-screen
layers make the page behind inert (`src/scripts/inert.ts`).

## Next

The real web address (link previews use the placeholder `sarvakali.example`), testing on real phones (Safari on iPhone especially), art direction per pillar, the commissioned Kali painting (layers + depth map), Cal.com booking on the Connect page, the content editor (Keystatic), and the accounts for email reminders and visitor counts. The WhatsApp button is waiting for a decision.
