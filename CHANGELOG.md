# Change log

Every change to the site, newest first: what changed, why, and how it was checked.
The rules for checking are in `CLAUDE.md`; the checks themselves are in `tools/qa/`.

## 2026-11-24 · Pillars 4, 5 and 6 settled

_In progress; each entry is filled in as the work is done._

## 2026-11-24 · Deep audit, code review and peer testing

- **Fixed (code review, 15):** depth demo on a direct load and without WebGL; signature moments reset when
  the direction changed; kintsugi pieces layering; invoice date in local time; Find your path and search
  anchors for Pillars 4 to 6; incense GPU memory on resize; the fire offering (second offering, leaving
  mid-burn); the panel's Auto/Calm with `?tier=`; falling back to Still when the 3D world cannot download;
  one device test at a time; search opening a hidden copy; a stale Connect topic; the crackle's reverb.
- **Fixed (testing as visitors, 27):** a memory leak (each visit to Daily practice kept the page alive);
  the offline helper serving the search index stale; layout shift 0.58 from the prototype panel; the search
  index loading on every page; the homepage link preview; the phone Menu button's name; menu and search
  now modal; focus rings on drawings and date fields; contrast, heading level, landmark and target sizes;
  reduced motion and high contrast; direction and kept list with storage blocked; the fire's pause without
  3D; the A/B/C switch under the Prototype pill; light forms over the words on phones; the transparent
  header; the header at 320px and with large text; 14416 as a tap-to-call link; the list over the Connect
  form; sideways scrolling at 1024px and with 200% text; a care note on Identity's body chapter.
- **Changed:** each pillar's code loads only on its own page (main script 123 KB → 94 KB compressed).
- **Verified:** the full suite in `tools/qa` (pages, interactions, Pillars 4 to 6, the fixes, accessibility,
  keyboard, motion, robustness, layout, memory, slow phone) and the static preview bundle.

## Earlier rounds

| Date | Round |
| --- | --- |
| 2026-11-24 | Audit fixes: sigil seal and lamps redrawn, phone layout and touch targets |
| 2026-11-23 | Pillars 4, 5 and 6 in three live directions each, on a shared direction system |
| 2026-11-23 | Pillar 3 settled (still water, with gold); light forms straightened; Pillar 1 fixes |
| 2026-11-23 | Pillar 2 closed (the gilded grimoire, Hecate, five ways to make a sigil); Pillar 3 in three directions |
| 2026-11-23 | Fact check of the whole site; the planet scheme removed |
| 2026-11-23 | Pillar 1 settled (Cosmic mother) |
| 2026-11-22 | Round 4: search, list, menu, festivals, daily practice, new pages, invoice maker, install |
| 2026-11-21 | Rounds 2 and 3: living forms, heroes, page changes, eye at dawn, sky, dust, incense, card, diya, sound, AI depth |
| 2026-11-20 | Phase 0 working prototype |
