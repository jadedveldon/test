# Working on Sarvakali

Standing rules for anyone (person or AI) changing this site. They come from decisions made with the
site's owner; follow them every time.

## The quality gate (no change goes out untested)

1. **Reproduce first.** A bug gets a check in `tools/qa/regressions.cjs` that fails before the fix and
   passes after it. The check stays, so the bug can never quietly return.
2. **After every change:** `npm run build`, `npx astro preview` (in the background), then
   `sh tools/qa/run-quick.sh`. Every line must read `ok`, and every `ERRORS:` line must read `none`.
3. **Before publishing the preview or pushing a round of work:** the full suite, `sh tools/qa/run-all.sh`,
   and `node tools/qa/preview-check.cjs` against the static preview bundle (`npm run preview:artifact`,
   then serve `preview-artifact/` on port 8099). All must pass.
4. **New features bring their own checks:** a signature moment goes into `tools/qa/pillars.cjs` (it must
   respond to mouse, touch and keyboard); a new page goes into the page lists of `audit.cjs`, `a11y.cjs`,
   `layout.cjs` and `keyboard.cjs`; a new content file or field must open in the editor (`content.mjs`), and
   anything that names a catalogue service by hand goes into rule 10 of `rules.cjs`.
5. **Never weaken or skip a check to make it pass.** If a check is wrong, fix the check and say why in
   the change log. Known false alarms are listed in `tools/qa/README.md`; add to that list only with a reason.
6. **Log every change** in `CHANGELOG.md`: what changed, why, and which checks verified it.
7. **Look at it.** Automated checks miss things a person sees: after a visual change, take phone and
   desktop screenshots and look at them before calling it done.

## Content rules

- No prices and no catalogue numbers anywhere on the site (the invoice maker is Sarvakali's own tool).
- English only. Deity names in Devanagari or Greek are welcome as labels next to the English. The library holds
  every tradition (the owner's decision, 2026-11-27): a text is given in its own language and script (Devanagari for
  Sanskrit), always with its transliteration, a readable pronunciation, its meaning in English and its source. Nothing
  is invented; where a figure's prayers belong to their community, the library honours the figure without a text.
  The sacred syllable is written AUM.
- Payment is by UPI only. Booking is the site's own (the Studio, `docs/studio.md`); the WhatsApp button comes later.
- Every factual claim is checked against a source. The sources live in the fact-check table on the preview
  cover, not as lists of facts on the pages. Interpretive copy is a draft for Sarvakali and is marked so in code.
- Care first: where work touches the mind, the body or identity, a care note comes first, assumes nothing
  about who the visitor is, and links help (Tele-MANAS 14416 as a tap-to-call link).
- No personal details of the owner or of any person in code, commits, or requests to outside services.
  No AI model names or identifiers in anything committed to the repository.

## How the site fits together

- Pages are Astro (`src/pages`), one stylesheet (`src/styles/global.css`), one main script (`src/scripts/app.ts`).
- Each pillar's own code is a separate download, started by `pageModule()` in `app.ts`. A start function
  returns a stop function that puts everything back as it found it (timers, tweens, listeners, the UI).
- Each chapter has a world (colours and a form of light) in `src/scripts/world/presets.ts`, keyed by the
  chapter's `data-chapter`. Forms that sit beside the words on wide screens have a `shift`; they sit below
  the words on phones.
- Full-screen layers (menu, search) make the page behind inert (`src/scripts/inert.ts`).
- A visitor's practice is a log of events kept in their browser first (`src/scripts/practice-log.ts`); pages show what is
  worked out from it, and an optional account only shares the same events between devices, the journal sealed with the
  visitor's own passphrase. Never store a count directly or send a journal line in the open. See `docs/accounts.md`.
- The site counts its own visits and catches its own errors (`src/obs`, `docs/observability.md`): mark a step that
  matters with `track()` and report a caught error with `reportError()` (`src/scripts/track.ts`); log on the host with
  `log` (`src/obs/server/log.ts`), never `console`. Nothing a visitor typed, and no private link, goes into either.
- **Words live in the content files, not in pages.** Every word and list a visitor reads on a settled page is
  in `src/content/` (JSON, and Markdown for writings), with a field for it in `keystatic.config.ts`, so
  Sarvakali can change it in the content editor. What the design depends on (chapter keys and order, colours,
  drawings, timings, map positions) stays in code. Pages must survive any edit the editor allows: an empty
  optional line, a renamed or added service, a list of a different length. See `docs/editor.md`.
- The content editor is on only in `npm run dev` and on the host (`EDITOR_HOST`); a plain build is static
  files with no editor. On the host it sits behind a secret door (`src/editor/`) and its own sign-in.

## Git

- Work on the branch you were given; never push to another branch; no pull request unless asked.
- Commit messages say what changed and why, in plain words.
