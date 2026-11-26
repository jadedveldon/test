# Visitor accounts and My space

Visitors never need an account. Everything they practise (days, chants, the fire, the lamp, finished practices,
kept mantras, the journal) is kept in their own browser either way. An account is for keeping that record the same
on their other devices, with the journal locked so only they can read it, and, for clients, for seeing their
sessions and invoices with Sarvakali in one place: **My space** (`/me`).

## How the record stays consistent

- Every action is one **event** with its own id, never changed once made (`src/me/core/events.ts`).
  Examples: a chant of 108 on a mantra, a finished practice, a kept mantra, a journal line, its deletion, "clear my record".
- What a page shows is **worked out from the events** (`derive`): days practised, streaks, counts, kept mantras,
  practices done, the journal.
- Two copies of the log, from two devices or from a device and the host, become one by **taking every event from
  both** (`merge`, a union by id). Nothing is counted twice, nothing is lost, and the order of syncing does not matter.
  Removals are events too, so they hold after a merge.
- The browser keeps its log in `localStorage` as `sk-events` (`src/scripts/practice-log.ts`). Records kept the old way
  (`sk-practice-log`, `sk-my-mantras`, `sk-practice-done`) become events once, on first load, with ids that name the
  device, so two devices' old histories both survive.

## Signing in

- The visitor enters an email and ticks a clear yes. A link comes by email; it works **once, within 15 minutes**.
  Only a hash of it is kept.
- The link opens `/me?t=…`. The page then signs the device in with a request of its own, so email programs that open
  links to scan them do not use the link up.
- The device gets a cookie (`sk_me`): signed with `STUDIO_SECRET`, unreadable by scripts, valid for a year.
  "Sign out everywhere" raises a number on the account, and every older cookie stops working.
- No passwords. Requests are limited per address and per email.

## Syncing

- Only on a device that has signed in (`src/scripts/me-sync.ts`). Sync runs when a page opens, a few seconds after
  something new, when the tab comes back, and when the connection returns. Offline, everything waits.
- The device sends the events the host does not have yet and asks for "everything after number N". The host's log is
  only ever added to, so each exchange stays small.

## The journal

- The first time a visitor shares their journal, they choose a **journal passphrase**.
  - A key is made from it in their browser (PBKDF2, SHA-256, 310,000 rounds).
  - Each line is sealed (AES-GCM) before it leaves the device (`src/me/core/crypto.ts`).
- The host keeps only sealed lines, the salt and a sealed check word. Nobody else can read the journal, not Sarvakali,
  not the host.
- On a new device, the passphrase opens it once; the key then stays on that device.
- **A forgotten passphrase cannot be recovered**, by anyone. "I have forgotten my passphrase" lets go of the shared
  journal (lines readable on that device stay) so a new one can be chosen.
- Until a passphrase is set, journal lines simply wait on the device; everything else syncs.

## My space for clients

- When the account's email is a client's in the Studio, My space lists their conversations and invoices, each with its
  own private link (the same `/booking?t=…` and `/invoice?t=…` pages the emails link to). Moving, cancelling, paying
  and "I have paid" happen there.
- Sarvakali never sees anyone's practice: the Studio holds no practice data, and accounts hold no Studio data. A
  client's page in the Studio says only whether they have an account.

## Download and delete

- **Download my data** gives the events as kept on the host (journal lines still sealed).
- **Delete my account** removes the account, its events and its email index from the host. The practice stays in the
  visitor's browser. A client's record in the Studio is Sarvakali's working record and stays, under the Studio's own
  erase rules (`docs/studio.md`).

## Where it is kept, and setup

| Key (Netlify Blobs, store `studio`; `.studio-data/` in development) | What |
| --- | --- |
| `kv-me-<id>` | the account: email, when made, sign-out number, epoch, events, journal salt and check word |
| `kv-me-email-<sha256(email)>` | which account an address belongs to |
| `kv-me-link-<sha256(token)>` | a sign-in link not yet used (15 minutes) |

- **Nothing new to set up.** Accounts use the Studio's settings:
  - `STUDIO_SECRET` signs the cookie;
  - `RESEND_API_KEY` and `MAIL_FROM` send the link.
- Until email is set up on the host, signing in says it is not switched on yet; practice still works in the browser.
- On a developer's computer (`npm run dev`) with no email set up, the link is shown on screen instead.
- **The preview** has a demo (`src/me/demo.ts`). The "email" is shown as a link, and the "host" is the browser's own
  storage (`sk-me-demo`).
  - To see a client's space, sign in as one of the Studio demo's made-up clients, e.g. `asha.rao@example.com`.

## Code

- `src/me/core/events.ts`: events, merge, derive, streaks, the old records.
- `src/me/core/crypto.ts`: the journal lock (browser).
- `src/me/core/accounts.ts`: the account rules, shared by the host and the demo.
- `src/me/server/host.ts` and `src/me/routes/api.ts`: `POST /api/me`, added by `src/studio/integration.mjs` in
  server mode only.
- `src/me/demo.ts` and `src/me/client.ts`: the preview's demo, and how the browser reaches either.
- `src/scripts/practice-log.ts`, `src/scripts/me-sync.ts`, `src/scripts/me.ts`: the record, the sync, the page.
- `src/pages/me.astro` and `src/content/pages/me.json`: the page, and its words ("My space" in the content editor).

## Checks

- `node tools/qa/me-core.mjs` runs in memory: merging, deletions, clearing, the old records, the journal lock, links
  used once and running out, two devices converging, journal text never kept in the open, a client's own space only,
  signing out everywhere, deleting.
- `node tools/qa/me.cjs` runs in a browser against the preview demo: signing in, a second device, the journal lock,
  My space, signing out and deleting.
