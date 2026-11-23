# Sarvakali

Website for Sarvakali. This is the **Phase 0 working prototype**: the engine is real, while colours, type, copy and the intro artwork are placeholders until each pillar's art direction is designed.

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

## Editing content now

| What | Where |
|---|---|
| Writings | `src/content/writings/*.md` (Markdown; ready for the Keystatic editor later) |
| Kind words | `src/data/kind-words.json` (samples until real ones are given with permission) |
| Festival dates | `FESTIVALS` in `src/scripts/festivals.ts` (confirm with Sarvakali's panchang) |
| Today's cards | `CARDS` in `src/scripts/card.ts` |
| About, Boundaries and care | `src/pages/about.astro`, `src/pages/care.astro` (bracketed gaps are for Sarvakali) |
| Real web address, visitor counts | `src/config.ts` |

## How it fits together

| Piece | Where | What it does |
|---|---|---|
| Living world | `src/scripts/world/World.ts` | One Three.js canvas behind every page: domain-warped smoke, drifting motes, pointer light. Blends between atmospheres and eases towards them, so scroll and page changes morph instead of cutting. Writes the current colours to CSS variables so text follows. |
| Atmospheres | `src/scripts/world/presets.ts` | One preset per chapter (placeholder palettes). |
| Orchestration | `src/scripts/app.ts` | Lenis smooth scroll on GSAP's ticker, chapter tracking, SplitText reveals, quality levels, prototype panel, page-change cleanup. |
| Quality levels | `src/scripts/tiers.ts` | Ultra / Full / Lighter / Still / Calm. Measures frame rate on first visit, steps up to Ultra on strong desktops and down when a device struggles. Calm is used when "reduce motion" is on; Still when the phone asks to save data. |
| Intro | `src/components/Loader.astro`, `src/scripts/loader.ts` | Stand-in eyes: open, two blinks, third eye opens as light gathers, fly-in, eye-shaped reveal of the hero. Once per visit, skippable. |
| Pages | `src/pages/` | Homepage chapters, six pillar pages generated from `src/data/categories.json` (all 1,123 services), Connect page stub. |
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
| AI depth demo | `src/pages/depth.astro`, `src/scripts/depth.ts`, `public/depth/` | Kalighat paintings (Cleveland Museum of Art, CC0) with depth maps made ahead of time by Depth Anything V2 Small (Apache-2.0). |

## Designing the pillars

Each pillar is designed one at a time, by comparing complete directions live.

| Pillar | Status | Where |
|---|---|---|
| 1 · Devotion & the Unseen | Direction chosen: C, Cosmic mother. Seven movements, each with its own world: the Kali yantra (Mahavidyas, the Devi and Hindu deities), a Greek temple and the five elements (Greek gods), constellations (many traditions), lamps (altars), a nebula (spirits and ancestors), the world tree (shamanic work). Directions A and B are in the history (commit 7050a47). | `src/pages/pillars/devotion.astro`, `src/data/devotion.ts`, `src/scripts/devotion.ts`, presets `devC_*`, forms `yantra`, `temple`, `tree` |
| 2 · Witchcraft & Magic | In progress: the gilded grimoire, a mix of A (The grimoire) and C (Alchemical sky). One book with parchment day pages and black-emerald-gold night pages (`PAGES` in `src/data/magic.ts`); between them the shader spreads the night in like ink, and the page uses edge blending (`data-blend="edge"`) so colours only turn near each chapter's edge. Hecate presides: the crossroads opening, her own section (Sarvakali's words, the next dark moon, her workings; the sourced facts live in the cover's fact check) and a featured card in Devotion. The sigil maker is kept, gilded, and now offers five ways to compare (`SIGIL_METHODS`: letter wheel, monogram, magic square, bindrune, draw your own), each with a sourced note on where it comes from; any can be saved as a picture. The wheel of the year (with the Indian ritus) sits in Rituals. Directions A, B and C are in the history (commits 43c2c84, 7e4011a). | `src/pages/pillars/magic.astro`, `src/data/magic.ts`, `src/scripts/magic.ts`, `src/components/SubCards.astro`, presets `magG_*`, forms `crossroads`, `rose`, `pentacle`, `moons`; ink transition in `src/scripts/world/World.ts` (`uInk`) |
| 3–6 | Next, one at a time | generic template `src/pages/pillars/[slug].astro` |

## Facts on the site

Every factual line is checked against sources before it goes on the site; anything interpretive is marked as a draft for Sarvakali. The current fact-check table (claims, status, sources, changes) is on the prototype's cover page. Festival dates live in `src/scripts/festivals.ts` and must be confirmed with Sarvakali's panchang.

## Next

Art direction per pillar, the commissioned Kali painting (layers + depth map), Cal.com booking on the Connect page, the content editor (Keystatic), real-phone testing, and the accounts for email reminders and visitor counts. The WhatsApp button is waiting for a decision.
