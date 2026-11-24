# Change log

Every change to the site, newest first: what changed, why, and how it was checked.
The rules for checking are in `CLAUDE.md`; the checks themselves are in `tools/qa/`.

## 2026-11-24 · Connect and About, designed

- **Changed: Connect.** The services a visitor kept now show as chips they can remove (the list goes with the
  request), and the box below is for their own words or the "Ask about this" topic only. Beside the form, "What
  happens next": the homepage's four steps, drawn as a thread (one component, `Steps.astro`, so both pages always
  say the same thing). The form is a solid surface, so the world never runs behind the fields; each time box has
  its own visible label. On a phone the form comes straight after the opening and the steps follow it.
- **Changed: About.** The portrait opens into depth (the depth demo's technique, in an arch like a shrine's
  doorway); a public-domain Kalighat painting stands in until Sarvakali's own photograph. Then one line in
  Sarvakali's own words, set large; the path as a thread of moments; lineage and training; "How Sarvakali works"
  as four promises with drawings; who it is for. Its own quiet world (`about`: Devotion's night with drifting dust).
- **Added: both pages' words to the content editor** ("Pages": About, Connect). About's bracketed lines are for
  Sarvakali to write there. Each promise picks its drawing from a list.
- **Changed: the depth view takes the keyboard** (arrow keys, Home to centre) once it is running, on About and on
  the depth demo, and its buttons are optional so other pages can use it.
- **Fixed (a check, not the site): `regressions.cjs` 13** read the kept list from the topic box; the list now
  shows as chips, so the check reads the chips. It still asserts the same thing: the old topic does not come back
  and the kept list is there. **Removed from the known false alarms:** About's small caption link (the caption
  no longer has one).
- **Added: checks.** `pillars.cjs`: About's portrait opens into depth and looks around by mouse, by finger and by
  keyboard (desktop and phone). `interactions.cjs`: kept services show as chips on Connect; removing one by
  keyboard keeps focus in the list and updates the request. `keyboard.cjs` now also walks About.
- **Verified:** screenshots before and after, desktop and phone, looked at (two fixes came from looking: the
  quote was one word per line, and on a phone the steps stood between the visitor and the form). Accessibility
  on About, Connect and the depth demo: no violations. The homepage and the six pillar pages say exactly what
  the published build said. Full suite: 293 checks, no failures (only the known false alarms); memory flat; the
  preview bundle checked.

## 2026-11-24 · Design pass, first look: the pages around the pillars

- **Reviewed:** About, Boundaries and care, Connect, Find your path, Daily practice, Writings (list and article),
  the invoice maker and the depth demo, on a wide screen and a phone. The cover's walk-through shows each with
  what works and a proposal; nothing there is redesigned yet, pending the owner's choice.
- **Fixed: on phones the living form ran through form fields and long text** on Connect, Find your path,
  Writings, the articles, the invoice maker, About and Care. A world can now say how strongly its form shows on
  portrait screens (`narrow` in `presets.ts`); on those pages it is 0, and the pillars keep their forms. Check:
  `regressions.cjs` 17 (measures the form's strength on each page; failed before the fix).
- **Fixed: Daily practice opened in Divination's world** (its mirror and Cormorant Unicase) since Divination was
  settled, because its opening shared the chapter name `divination` with the homepage. It now has its own world,
  `practice`: the night sky it used to have, with the constellations drawn smaller and beside the words (none on
  a phone). Check: `regressions.cjs` 17.
- **Changed:** Boundaries and care has its own world, `care`: Healing's still water, quieter behind the words.
- **Fixed: list bullets on light pages took the world's glow, near white** (1.26:1 against the parchment); they now
  take the soft ink (6.15:1). **Fixed: on the invoice maker "(optional)" fell onto a line of its own** under each
  label. Check: `regressions.cjs` 18 (both failed before the fix).
- **Fixed: at 200% text on a phone, Devotion scrolled sideways.** The Mahavidya and deity cards (long names such as
  Bhuvaneshvari and Chhinnamasta) and the names set round the turning yantra ran past the screen. Card columns are
  now sized in text units (two to a row at normal size, one when the text is made large), long names can wrap, and
  the opening clips its drawings at the screen's edge. The full suite's layout check had been printing this line
  among the known Greek-card alarms; it was in the previous build too, so last round's "layout clean" was wrong
  for this one case. Check: `regressions.cjs` 19 (failed before the fix). The Greek-card "clipped" lines that remain
  were checked again: once the Greek font has loaded nothing in the card is clipped (a known false alarm).
- **Verified:** screenshots of every reviewed page, desktop and phone, before and after, looked at. The full suite:
  no failures; the accessibility scan first stopped because axe-core was missing from the module path (the suite's
  FAIL guard caught it), and run on its own it found no violations on any page or overlay (59 checks). Memory flat
  (heap about 6 MB over 32 page changes, as last round); slow phone layout shift 0.000 to 0.002.

## 2026-11-24 · The content editor

- **Added: the content editor** (Keystatic, at `/keystatic`). Every word and list on the homepage and the six
  pillar pages, the whole catalogue (1,123 services), the writings, festival days, today's cards, kind words and
  the site settings now live in plain files in `src/content/`, and the editor offers a field for each
  (`keystatic.config.ts`). Each save is a commit; the host rebuilds the site from it. What the design depends on
  stays in code: chapter keys and order, colours, drawings, timings, the wheel's dates, map positions. Where the
  design needs a fixed number (ten Mahavidyas, seven chakras, twelve stars) the editor keeps it.
- **Changed: the catalogue says where each subcategory sits.** Each subcategory now names its chapter on the
  pillar page and its icon, chosen from lists in the editor, instead of pages finding them by name. A renamed
  subcategory stays where it was; a new one appears in the chapter chosen for it; a new service in a chapter drawn
  by hand (the Mahavidyas, the Devi, many lands) shows under "More in this chapter". Category addresses used by
  search and Find your path keep working whatever the names become.
- **Added: the door.** On the live site the editor answers "Not found" until the secret door address
  (`/door/<word>`, the word set only in the host's settings) has been opened once on that device; behind it the
  editor asks for its own sign-in (Keystatic Cloud or GitHub). With no door word set, the live editor stays shut.
  Editor pages are never indexed or cached. `docs/editor.md` explains using it and the one-time setup, which needs
  the owner's own accounts.
- **Added: hosting with the editor.** `netlify.toml` and the Netlify adapter, used only when `EDITOR_HOST=netlify`;
  a plain `npm run build` and the preview bundle are still static files with no editor in them. TypeScript set to
  5.9 (from 7, which nothing ran): Netlify's packaging tools load TypeScript 5's interface and stopped with an error
  under 7. `npm audit` reports moderate advisories inside Netlify's build-time packaging tools only (nothing that
  reaches visitors); Netlify's fix is a downgrade of the adapter, so they are left as they are.
- **Changed, small:** on Witchcraft & Magic and Healing, "Ask about this" fills the Connect form with the chapter's
  title (as Pillars 4 to 6 already did), not the catalogue category's name. The 4-7-8 breath's internal key is now
  `relax`. The unused generic pillar page (`pillars/[slug].astro`, which built no pages) is removed.
- **Fixed: the offline helper saved every page visited, the editor and the door address (with its secret word)
  included.** It now leaves them alone (`sw.js`, cache renamed so old copies are cleared). Check: `regressions.cjs`
  15, which failed before the fix.
- **Fixed before it shipped: moving the words dropped the shared words (back link, ask, previous and next pillar)
  from Devotion,** where a local name hid the shared one. Found by comparing every page's text with the last
  build; check: `regressions.cjs` 16, shown to fail with the mistake put back.
- **Added: checks.** `content.mjs`: every content file opens as the editor reads it (shown to fail on a missing
  Mahavidya, an unknown festival kind and an empty title). `rules.cjs` 10: every service a signature moment names
  by hand is in its pillar's catalogue (shown to fail after renaming a service in the editor). `rules.cjs` 11:
  every catalogue service can be kept on its pillar page and every category address exists (shown to fail with a
  service removed from a page). Rule 9 (drafts marked) now covers all six pillars. Both suites run `content.mjs`.
- **Verified:** the visible text and every address of the homepage and the six pillar pages compared with the
  previous build: identical apart from the Ask topic above; the search index identical. A proof edit through the
  editor (the homepage's opening line; a service renamed inside the Learning catalogue) saved as a one-line change
  and reached the built pages. The door tested: "Not found" without it, with a wrong word, and for the editor's
  API; the right word opens it; the cookie holds a fingerprint, never the word. The hosted build (Netlify) builds,
  with the door inside the server function. Script downloads grew by about 4 KB in all (each pillar's words now
  travel with its own code).

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
