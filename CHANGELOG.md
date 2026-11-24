# Change log

Every change to the site, newest first: what changed, why, and how it was checked.
The rules for checking are in `CLAUDE.md`; the checks themselves are in `tools/qa/`.

## 2026-11-24 · Pillars 4, 5 and 6 settled; the quality gate made permanent

- **Added: the rules.** `CLAUDE.md` sets the quality gate for every change (reproduce a bug in a check first;
  the quick suite after every change; the full suite and the preview check before publishing; new features
  bring their own checks; never weaken a check; log every change here; look at it on a phone and a desktop).
- **Added: checks.** `rules.cjs` (the content rules, in seconds), `pillars.cjs` (Pillars 4 to 6: every chapter's
  world, every signature moment by mouse, touch and keyboard), `preview-check.cjs` (the shareable bundle),
  `run-quick.sh`. `review-verify.cjs` became `regressions.cjs`, the home of every bug's check.
- **Fixed (a check, not the site):** the first run of `rules.cjs` flagged About's sentence "Fees are discussed
  directly, and paid by UPI against an invoice". It shows no price, so it follows the rule; the check now looks
  for amounts and price-list wording rather than the words "fee" or "price" alone.
- **Changed: Pillar 4, Identity, settled on B (Soft prism)**, as chosen. A (Two halves, one whole) and C (Night
  rose), with their signature moments (the line of Ardhanarishvara, the body scan), are in the history.
- **Changed: Pillar 5, Divination, A and B merged: candlelight and the black mirror.** One book with two kinds of
  page: table pages (Readings, The inner eye, the close) in A's wine, gold leaf and card frames; mirror pages
  (Other ways of seeing, Dreams, Between worlds) in B's obsidian, silver and arched mirrors. The opening is where
  they meet: the black mirror in a gilt frame, renamed **Prompts to ponder** ("something to ponder, never a
  prediction"), with 24 prompts (12 new, draft wording) and never the same one twice in a row. Type: Cormorant
  Unicase with Tenor Sans. The three-card draw and the pendulum (C) are in the history; the tarot note moved
  to the Readings chapter.
- **Changed: Pillar 6, Learning, A, B and C combined: the library, the leaf and the stars.** The page walks
  through three rooms: the library by lamplight (opening with Find your class, Foundations, Witchcraft and
  spellcraft), the palm-leaf manuscripts (Tantra, mantra and yantra; Deities and devotion) and the night road of
  study (Your path of study, Mentoring, the close). Each room keeps its own type (Libre Baskerville, Gotu,
  Josefin Slab) and colours; light and dark pages blend at the edges. The yantra drawing is removed, as asked.
- **Changed: under the hood.** The A/B/C direction system (switch, briefs, per-direction worlds and fonts) is
  retired; each settled pillar loads only its own code, like Pillars 1 to 3. The closing worlds of all three
  pillars are quieter so the closing words lead.
- **Fixed (checks, not the site):** the high-contrast check counted the invisible radio buttons and checkboxes
  of the comfort note and the class finder as controls without an edge (16 and 12); their visible chips carry
  the edge, so it now counts them through their chip, and it prints FAIL instead of only a count. The
  accessibility scan could not open "your list" on the homepage (nothing there to keep); it now starts with one
  service kept, so that overlay is really scanned. Both suites now print FAIL when a check stops with an error:
  the first full run silently did nothing after a path mix-up, and was caught only by reading its output.
- **Verified:** the quick suite (97 checks) and the full suite (154 checks): no failures, no errors. Highlights:
  `pillars.cjs` 54 checks on desktop and phone; accessibility with no violations on any page or overlay; every
  control keeps an edge in high contrast; layout clean at seven sizes, 200% text and wide spacing; memory flat
  over 32 page changes; on a slow phone, layout shift 0.000 to 0.002 and the settled pillars' largest paint about
  1.5 s. The preview bundle checked with `preview-check.cjs`. Screenshots of every section, phone and desktop,
  looked at.

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
