# Sarvakali

Website for Sarvakali. This is the **Phase 0 working prototype**: the engine is real, while colours, type, copy and the intro artwork are placeholders until each pillar's art direction is designed.

## Run it

```bash
npm install
npm run dev          # local development at http://localhost:4321
npm run build        # static site in dist/ (any static host)
npm run preview:artifact   # dist/ + a copy with relative links in preview-artifact/site
```

Add `?tier=full|lighter|still|calm` to any URL to force a quality level, and `?intro=1` to replay the intro.

## How it fits together

| Piece | Where | What it does |
|---|---|---|
| Living world | `src/scripts/world/World.ts` | One Three.js canvas behind every page: domain-warped smoke, drifting motes, pointer light. Blends between atmospheres and eases towards them, so scroll and page changes morph instead of cutting. Writes the current colours to CSS variables so text follows. |
| Atmospheres | `src/scripts/world/presets.ts` | One preset per chapter (placeholder palettes). |
| Orchestration | `src/scripts/app.ts` | Lenis smooth scroll on GSAP's ticker, chapter tracking, SplitText reveals, quality levels, prototype panel, page-change cleanup. |
| Quality levels | `src/scripts/tiers.ts` | Full / Lighter / Still / Calm. Measures frame rate on first visit and steps down if needed. Calm is used when "reduce motion" is on. |
| Intro | `src/components/Loader.astro`, `src/scripts/loader.ts` | Stand-in eyes: open, two blinks, third eye opens as light gathers, fly-in, eye-shaped reveal of the hero. Once per visit, skippable. |
| Pages | `src/pages/` | Homepage chapters, six pillar pages generated from `src/data/categories.json` (all 1,123 services), Connect page stub. |
| Page changes | `src/layouts/Base.astro` | Astro's ClientRouter with `transition:persist` keeps the world canvas alive across pages. |

## Next

Art direction per pillar, the commissioned Kali painting (layers + depth map), the hero, Cal.com booking on the Connect page, the content editor (Keystatic) and the invoice maker.
