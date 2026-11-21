# Sarvakali

Website for Sarvakali. This is the **Phase 0 working prototype**: the engine is real, while colours, type, copy and the intro artwork are placeholders until each pillar's art direction is designed.

## Run it

```bash
npm install
npm run dev          # local development at http://localhost:4321
npm run build        # static site in dist/ (any static host)
npm run preview:artifact   # dist/ + a copy with relative links in preview-artifact/site
```

Add `?tier=ultra|full|lighter|still|calm` to any URL to force a quality level, and `?intro=1` to replay the intro.
Experiments can be set by URL too: `?hero=dawneye|eye|name|dawn`, `?page=eye|smoke|ink|morph|fade`, `?cursor=flame|incense|off`,
`?sky=now|amavasya|purnima|night|day|off`, `?forms=on|off`, `?bend=on|off`, `?touch=on|off`, `?dust=on|off`, `?haptics=on|off`, `?saver=on|off`.

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
| AI depth demo | `src/pages/depth.astro`, `src/scripts/depth.ts`, `public/depth/` | Kalighat paintings (Cleveland Museum of Art, CC0) with depth maps made ahead of time by Depth Anything V2 Small (Apache-2.0). |

## Next

Art direction per pillar, the commissioned Kali painting (layers + depth map), the hero, Cal.com booking on the Connect page, the content editor (Keystatic) and the invoice maker.
