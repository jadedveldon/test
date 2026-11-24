# The content editor

Sarvakali's words, lists and catalogue can be changed in a content editor (Keystatic) without touching code.
Every save becomes a commit in the repository, and the host rebuilds the site from it in a minute or two.

## Using it, day to day

1. Open the secret door address once on each device you edit from: `https://<the site>/door/<the door word>`.
   It opens the editor and remembers that device for 30 days. Bookmark it.
2. Sign in (with the account you were invited with).
3. Pick a page on the left, change the words, press **Save**.

Without the door, the editor's address (`/keystatic`) answers "Not found", so a stranger finds nothing to try a
password on. Behind the door the editor still asks for its own sign-in, so knowing the door is not enough.

### What is in the editor

| Section | What you can change |
| --- | --- |
| Homepage | The opening, Connect and How it works, the buttons, the close, the footer line |
| Kind words | The quotes (share real ones only with each person's permission, with initials or a first name) |
| Festival days | Names, dates, notes, and how the site dresses for each (new and full moons need no entry) |
| Today's card | The twelve cards' names and messages |
| Writings | The articles: add, edit, mark as draft |
| Site settings | The site's address, visitor counts, the words shared by every pillar page |
| Pillar pages (six) | Every heading and paragraph, care notes, and the signature moments' words and lists (prompts, breathing steps, chakras, the comfort note, the class finder, the path of study, the Mahavidyas, the Greek gods, the sabbats and ritus, the sigil methods...) |
| Catalogue (six) | Every category, subcategory and service; which chapter of the page each subcategory sits in; its icon |

What stays in code is what the design depends on: the chapters themselves and their order, colours, drawings,
timings and places on a map. Where the design needs a fixed number (ten Mahavidyas, twelve stars on the path,
seven chakras) the editor keeps that number.

Small things to know:

- **Links in a paragraph:** write `[the words](/address)` or `[the words](https://…)`.
- **The helpline:** 14416 always becomes a tap-to-call link by itself.
- **Renaming a service** in the catalogue: if a signature moment names it too (a Mahavidya's Keep button, a
  chakra's working, the class finder, the path of study), change it there as well. The site's checks list any
  that no longer match.
- **A new service** in a subcategory shows on the page by itself, in the chapter its subcategory sits in.

Not yet in the editor: About, Boundaries and care, Connect, Find your path, Daily practice, the invoice maker
and the depth demo (they join after their design pass, so nothing is built twice), the menu and search, and
the short messages that interactive moments show while you use them.

## Setting it up (once, by the site's owner, about fifteen minutes)

This needs your own accounts, so only you can do it. Nothing below is shared with anyone else.

### 1. Put the site on Netlify

1. Sign in to Netlify and choose **Add new site → Import an existing project → GitHub**.
2. Pick this repository and the branch the site is built from. The build settings come from `netlify.toml`.
3. Deploy. The site works as before; the editor stays shut until steps 2 and 3 are done.

### 2. Choose how editors sign in

**Keystatic Cloud (recommended).** Editors sign in to Keystatic, not GitHub, so Sarvakali needs no GitHub
account. Free for up to three people in a team.

1. Create an account at keystatic.cloud, then a team and a project, and connect the project to this
   repository (the dashboard walks you through it).
2. Invite Sarvakali (and anyone else who edits) to the team.
3. In Netlify, **Site configuration → Environment variables**, add:
   - `PUBLIC_KEYSTATIC_STORAGE` = `cloud`
   - `PUBLIC_KEYSTATIC_PROJECT` = `<team>/<project>` (as the project's settings page shows it)

**Or GitHub.** Every editor needs a GitHub account with write access to the repository.

1. On your own computer, run the site with `PUBLIC_KEYSTATIC_STORAGE=github` and
   `PUBLIC_KEYSTATIC_REPO=<owner>/<repository>` in a `.env` file, open `http://localhost:4321/keystatic`, sign in
   with GitHub and choose **Create GitHub App**. Keystatic writes four values into `.env`.
2. Copy all six values (`PUBLIC_KEYSTATIC_STORAGE`, `PUBLIC_KEYSTATIC_REPO`, `KEYSTATIC_GITHUB_CLIENT_ID`,
   `KEYSTATIC_GITHUB_CLIENT_SECRET`, `KEYSTATIC_SECRET`, `PUBLIC_KEYSTATIC_GITHUB_APP_SLUG`) into Netlify's
   environment variables. Never commit `.env`.
3. In the GitHub App's settings, add the callback address `https://<the site>/api/keystatic/github/oauth/callback`.

### 3. Choose the door word

1. Make up a long word nobody could guess (four random words joined by hyphens is good).
2. In Netlify's environment variables add `EDITOR_DOOR` = that word.
3. **Deploys → Trigger deploy**, so the new settings are built in.
4. Check: in a private window `https://<the site>/keystatic` says "Not found";
   `https://<the site>/door/<the word>` opens the editor and asks you to sign in.

To lock everyone out of the door (a lost phone, say), change `EDITOR_DOOR` and deploy again; every device then
needs the new door address.

## For developers

- `npm run dev` runs the site with the editor at `http://localhost:4321/keystatic`, saving to the files on your
  computer. Plain `npm run build` (and the preview bundle) contains no editor at all.
- The editor is set up in `keystatic.config.ts`; the content files are in `src/content/`; the door is in
  `src/editor/`. The editor is switched on in `astro.config.mjs` for `npm run dev` and when `EDITOR_HOST=netlify`.
- New words belong in `src/content/` with a field in `keystatic.config.ts`, not in a page. The checks
  `tools/qa/content.mjs` (every file opens in the editor) and `tools/qa/rules.cjs` (every service a signature
  moment names exists; every catalogue service and category reaches its page) guard what editors change.
