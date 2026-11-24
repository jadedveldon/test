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
   `layout.cjs` and `keyboard.cjs`.
5. **Never weaken or skip a check to make it pass.** If a check is wrong, fix the check and say why in
   the change log. Known false alarms are listed in `tools/qa/README.md`; add to that list only with a reason.
6. **Log every change** in `CHANGELOG.md`: what changed, why, and which checks verified it.
7. **Look at it.** Automated checks miss things a person sees: after a visual change, take phone and
   desktop screenshots and look at them before calling it done.

## Content rules

- No prices and no catalogue numbers anywhere on the site (the invoice maker is Sarvakali's own tool).
- English only. Deity names in Devanagari or Greek are welcome as labels next to the English.
- Payment is by UPI only. Booking (Cal.com), the content editor (Keystatic) and the WhatsApp button come later.
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

## Git

- Work on the branch you were given; never push to another branch; no pull request unless asked.
- Commit messages say what changed and why, in plain words.
