# Putting the site live on Netlify

Everything the site needs to run on Netlify is in the repository: `netlify.toml` (the build), the Netlify adapter
(switched on by `EDITOR_HOST=netlify`), the two scheduled functions in `netlify/functions` (Studio reminders, and the
hourly round of visit counts and alerts), and Netlify Blobs for the Studio's records, accounts and counts. What only
the owner can do is create the accounts and paste the secrets below into Netlify's settings, never into the code.

## 1. Connect the repository (about 5 minutes)

1. Sign in at app.netlify.com and choose **Add new site → Import an existing project → GitHub**.
2. Pick this repository and the branch to publish.
3. Netlify reads `netlify.toml`: build command `npm run build`, publish folder `dist`, Node 22, `EDITOR_HOST=netlify`.
   Nothing to change on that screen. Press **Deploy**.
4. The site appears at `https://<name>.netlify.app`. Until a domain is set, that address is used for link previews,
   the sitemap, canonical addresses and the links in emails.

## 2. Settings to add (Site configuration → Environment variables)

| Name | What | Needed for |
| --- | --- | --- |
| `STUDIO_PASSWORD_HASH` | made by `npm run studio:password` on your computer (the password itself is never stored) | signing in to the Studio |
| `STUDIO_SECRET` | a long random string (e.g. 48 random letters and numbers) | Studio and visitor sign-in cookies, private links |
| `RESEND_API_KEY` | from resend.com, after adding the domain | every email: confirmations, invoices, sign-in links, alerts |
| `MAIL_FROM` | e.g. `Sarvakali <hello@your-domain>` | the sender of those emails |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | a Google Cloud OAuth client (docs/studio.md) | Google Meet links on confirmed bookings |
| `EDITOR_DOOR` | your door word for the content editor (docs/editor.md) | opening the editor on the live site |
| `PUBLIC_KEYSTATIC_STORAGE`, `PUBLIC_KEYSTATIC_PROJECT` | from keystatic.cloud (docs/editor.md) | saving edits from the editor |
| `SITE_URL` | optional: the address for links in emails, if different | — |
| `LOG_LEVEL` | optional: `debug` to see more in the logs | — |

Until a setting is there, its part waits politely: the Studio keeps emails in its Outbox, booking confirmations go out
without a Meet link, and the editor's door stays shut. Nothing breaks.

## 3. The domain (when there is one)

1. **Domain management → Add a domain**, and follow Netlify's steps at the domain's registrar. HTTPS is automatic.
2. Put the domain in the content editor: **Site settings → url** (e.g. `https://sarvakali.in`).
3. Then the search steps in `docs/seo.md`: Google Search Console, Bing Webmaster Tools, the sitemap, IndexNow.

## 4. After the first deploy: a five-minute check

- The homepage, a pillar, a mantra and Connect open, on a phone and a computer.
- `/robots.txt`, `/sitemap.xml` and `/llms.txt` open and name the right address.
- `/api/health` answers `{"status":"ok"}` (give that address to an uptime service, docs/observability.md).
- Send yourself a request from Connect; it appears in the Studio.
- Open the editor through the door, change one word, save; the site rebuilds with it within a few minutes.

## Deploying from a computer (when GitHub is not connected yet)

Use a current Netlify command-line tool: an old one (17.x) made deploys that came up without the site's storage, so
the Studio could not sign in (2026-11-28). Build, try, check, then go live:

1. `npx netlify-cli@27 build --offline` (builds exactly as Netlify does, with the settings in `netlify.toml`).
2. `npx netlify-cli@27 deploy --no-build --skip-functions-cache` makes a trial at its own address.
3. Open `<trial address>/api/health`: it must say `"status":"ok"`. Anything else: stop; the live site is untouched.
4. `npx netlify-cli@27 deploy --no-build --prod --skip-functions-cache`, then check `/api/health` on the live site.

If a live deploy ever misbehaves: Netlify → **Deploys** → the last good one → **Publish deploy** puts it back at once.

## What a deploy does

Every push to the published branch builds and publishes the site. Every save in the content editor is a commit, so
it does the same. Netlify keeps every past deploy: **Deploys → (an earlier one) → Publish deploy** puts it back in
one click.
