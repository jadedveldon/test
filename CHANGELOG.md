# Change log

Every change to the site, newest first: what changed, why, and how it was checked.
The rules for checking are in `CLAUDE.md`; the checks themselves are in `tools/qa/`.

## 2026-11-26 · Observability: the site's own visits, problems, logs and health; breadcrumbs

The owner asked for visitor counts, logging, tracking, error handling, observability and traceability "in the highest
capacity", and for breadcrumbs. They chose: everything built in and kept on the site's own host (no analytics or
error-tracking company), counting visits and journeys without cookies or identity. **The full test suites were not
run**, at the owner's request; the new checks below were run, against the dev server and the preview.

- **Added: breadcrumbs** on every inner page (practice, days, the library, mantras, traditions, tools, articles,
  pillars): "Home › Daily practice › Mantra library › Gayatri Mantra".
  - Also given to search engines as schema.org `BreadcrumbList`.
  - On phones only the step back shows, so the trail never wraps into the heading.
  - The words are in Site settings.
- **Added: the site's own counting** (`src/scripts/telemetry.ts`, `src/obs/`):
  - pages opened, time in view, how far read, which site sent the visitor (name only), campaign tags, device,
    browser, country, and page speed (LCP, CLS, INP, FCP, TTFB);
  - steps that matter: 30 kinds, from a practice finished to a request sent or the help line tapped, marked with
    `track()`.
  - **Privacy:** no cookies, nothing kept in the browser for it. A visitor hash that changes daily (its secret is
    deleted after two days); the address is never kept; robots left out; Sarvakali's own visits left out.
  - **Do Not Track and Global Privacy Control** are honoured.
- **Added: error capture with trails:**
  - uncaught errors, failed promises, files that would not load, errors the site reports, and Studio pages that
    break (an error boundary now keeps the rest of the Studio working);
  - each one with the last 40 steps before it (pages, presses, requests with their references, console warnings);
  - grouped, so the same error counts as one.
- **Added: traceability.** Every request the host answers gets a reference (`x-request-id`) and its timing
  (`server-timing`).
  - Error messages visitors and clients see now end with "(Reference: …)".
  - Unexpected failures are caught, logged with their stack and answered plainly (`src/middleware.ts`).
- **Added: structured logging** (`src/obs/server/log.ts`): one JSON line per event, with the reference. API requests'
  lines are kept 30 days and searchable. The Studio's, accounts' and Google's error logging moved onto it.
- **Scrubbing everywhere** (`src/obs/core/clean.ts`): private links lose their token; emails, phone numbers, UPI IDs
  and tokens are scrubbed from any text; private fields are replaced whole.
- **Added: `/api/health`** (for an uptime service) and an **hourly round**
  (`netlify/functions/obs-hourly.mts`):
  - the day's numbers worked out; raw data let go after 30 days, totals after about a year;
  - an **alert email** to Sarvakali when something new breaks, at most every three hours.
- **Added: Insights in the Studio** (`src/studio/app/Insights.tsx`), with seven tabs: overview, journeys (with the
  way to a conversation, from visit to paid), what people do, speed, problems (with trails, Mark fixed / Ignore),
  logs by reference, and health.
  - One hue for every chart, as each shows one series.
  - Hover, focus and arrow keys on the daily chart, and a table view.
  - The preview shows thirty days of clearly made-up history.
- **Changed:**
  - the care page explains how visits are counted and what an error report holds;
  - CLAUDE.md asks new code to use `track()`, `reportError()` and `log`;
  - `CallError` and `MeCallError` carry the reference.
- **Fixed while building:**
  - **The preview demo lost a visit** when the page closed while the made-up month was being built. It now saves
    first.
  - **Arriving again from another site or a campaign link** joined an earlier visit. It now starts a new one.
  - **Insights could show numbers up to ten minutes old** even after refresh. Refresh now always works them out
    again.
- **Checks:**
  - New `tools/qa/obs-core.mjs` (35 lines, all ok).
  - New `tools/qa/obs.cjs`, all ok, ERRORS none, against the dev server (16 lines) and the preview (10 lines).
  - `me-core.mjs` and `me.cjs` re-run, all ok.
  - The static and the host (Netlify) builds both complete; the hourly function bundles.
  - Two harness limits are listed in `tools/qa/README.md` (a test browser is a robot by name; a page left by the
    harness drops its closing beacon).
  - Looked at: Insights on desktop and phone (every tab); the breadcrumbs on desktop and phone.

## 2026-11-26 · About without the path and lineage; the Studio shows who has an account

- **Removed from About**, at the owner's request: "The path" (the thread of moments: where it began, the first
  teacher, how Kali came in) and "Lineage and training". They are gone from the page, its content file, the editor and
  the stylesheet. The opening line no longer mentions where the path began.
- **Added: "Has an account" on a client's page in the Studio** (the gap left by the accounts round). It says only
  whether the client's address has a visitor account, never anything in it (`hasAccount` in `src/me/core/accounts.ts`,
  the `accounts.has` action on the host and in the demo).
- **Checks:** `tools/qa/me-core.mjs` gains two lines (the Studio sees an account, and no longer sees it after deletion);
  all ok. Walked in the preview: a demo client shows "No account", then "Has an account" after signing in; About has no
  trace of the removed sections; no errors. The full suites were not run, at the owner's request.

## 2026-11-26 · Visitor accounts: one practice record on every device, and My space

The owner chose: accounts optional, sign-in by an email link, the journal shared but locked with the visitor's own
passphrase, and a client who signs in sees their sessions and invoices. Nothing changes for anyone who never signs
in. **The test suites were not run**, at the owner's request; the two new checks below were run while building, and
everything was walked through in the preview and on the dev server and looked at on desktop and phone.

- **Changed: how the practice record is kept** (`src/scripts/practice-log.ts`, `src/me/core/events.ts`).
  - Every action is now an event with its own id; what the pages show is worked out from the events.
  - Two devices' records become one by taking every event from both: nothing is counted twice, nothing is lost, and
    a deletion or "clear my record" holds after a merge.
  - Records kept the old way (`sk-practice-log`, `sk-my-mantras`, `sk-practice-done`) become events once, on first
    load, losing nothing.
  - The rite, guided practices, mantra pages, mala, fire and diya call the same functions as before.
  - Deleting a journal line and "Clear everything" now go through events (`deleteJournal`, `clearAll`), so they reach
    a visitor's other devices too.
- **Added: sign-in by email link** (`POST /api/me`, `src/me/`, on the live site and in development only).
  - A link that works once, for 15 minutes; only its hash is kept.
  - A signed cookie for a year, with "sign out everywhere".
  - Limits per address and per email; a clear yes before an account is made.
  - Uses the Studio's own settings (`STUDIO_SECRET`, Resend); nothing new to set up. Until email is set up it says so
    rather than showing a link (the link appears on screen only in development and in the preview's demo).
- **Added: syncing** (`src/scripts/me-sync.ts`): only on a signed-in device; on opening a page, after practising, on
  return to the tab and when back online. Offline, everything waits.
- **Added: the journal lock** (`src/me/core/crypto.ts`).
  - A passphrase makes a key in the browser (PBKDF2, 310,000 rounds); each line is sealed (AES-GCM) before it leaves.
  - The host keeps only sealed lines and a sealed check word. A new device opens it with the passphrase once.
  - Lines wait on the device until a passphrase is set. "I have forgotten my passphrase" lets the shared journal go.
- **Added: My space** (`/me`, `src/scripts/me.ts`, words in `src/content/pages/me.json`, "My space" in the content
  editor). It shows:
  - the record from every device, practices finished and kept mantras;
  - the journal lock;
  - for a client (matched by email), their conversations and invoices, each opening its own booking or invoice page;
  - download, sign out here or everywhere, and delete.
  - The care note with Tele-MANAS comes first.
- **Added:** a quiet account button in the header (a dot when signed in; on phones, where the header is full, My space
  is in the menu), and My space in the menu.
- **Changed:** the care page's privacy section ("If you make an account", and the one cookie it sets); the practice
  record's words now say it can be kept on other devices; a locked journal line reads as locked.
- **Changed:** the offline worker never keeps `/me` or `/api/me`.
- **Changed (Studio internals):**
  - the stores gain a safe read-change-write (`kvSwap`);
  - the email layout and the HMAC are shared with accounts;
  - the account cookie's signature is kept apart from the Studio's (a `me.` prefix), so one can never pass for the other.
- **Not done yet:** the Studio's client page does not yet show whether a client has an account.
- **Checks:**
  - New `tools/qa/me-core.mjs` (45 lines, all ok): merging, deletions, clearing, old records, the journal lock, links
    once only and running out, two devices converging, no journal text kept in the open, a client's own space only,
    signing out everywhere, deleting.
  - New `tools/qa/me.cjs` (all ok, ERRORS none), against the dev server (two real browsers) and the preview demo:
    old records converted, sign-in, a second device, the lock, convergence, a client's sessions, download, sign out
    everywhere, delete, a used link.
  - `/me` added to the page lists of `audit`, `a11y`, `layout` and `keyboard` (not run, at the owner's request).
  - Looked at: phone and desktop screenshots of sign-in, the link, My space, the lock, a client's space and the header.
    Fixed what that showed: the sync line and the waiting journal lines ran together, the lists in My space sat tight
    under their headings, and on phones the new header button pushed "Book" off the edge.

## 2026-11-26 · Daily practice made curated: guided practices for a deity, a feeling, or the day

The owner's review of the library round: it handed visitors everything at once ("today you can do this") instead
of leading them. Daily practice now asks what brings you here, and answers with one short guided practice made for
that need; the library is still there, behind it, for those who want to go deeper. **The test suites were not run**,
at the owner's request; everything below was walked through in the preview and looked at on desktop and phone.

- **Added: 31 guided practices** (`src/content/practices`, "Guided practices" in the content editor, where they can be
  added, edited and removed): **twelve with a deity** (Shiva, Kali, the Goddess, Hanuman, Ganesha, Lakshmi,
  Saraswati, Vishnu and Krishna, Rama, Surya, the Teacher, Karuppaswamy), **twelve for a feeling** (grief, fear and
  anxiety, anger, guilt and forgiveness, feeling stuck, loneliness, self-worth, overwhelm, a decision, courage,
  illness and healing, gratitude), and **one for each day**. Each has a short introduction, who it is for, how long
  it takes, what one might offer, and four to seven steps chosen from: breathe (an even or a longer out-breath),
  light the lamp, read a verse (with its meaning, line by line where there is one), chant a mantra (counted, with a
  number suggested), reflect on one question (a line can go to the journal), offer to the fire, and close with a
  prayer. Practices that touch loss, fear, illness or the mind open with the care note and close with help. Each
  ends with what to carry, two or three practices for next time, and, where it fits, a way to ask Sarvakali (Kali’s
  and Karuppaswamy’s deeper practice are left to her). Every word is a draft for Sarvakali and marked so.
- **Added: the guided practice page** (`/practice/with/<name>`, `src/scripts/session.ts`): what it is and what you
  will do first, then one step at a time, then a finish that marks the day in your own record. Without scripts the
  steps simply follow one another.
- **Changed: Daily practice** (`/practice`) opens with **"What brings you here today?"** and three ways in: today’s
  practice (only today’s is shown, with its question; other days one tap away), the deities, and the feelings (the
  care note first). Then your practice (the record, the practices you have done and how often, your kept mantras),
  and, last, "for when you want more": the library, the seven days, the tools, across traditions.
- **Moved: the tools** (the mala, the fire, the diya and sacred days, the moon calendar, reminders) to their own
  page, `/practice/tools`, unchanged. The six-step rite on the old page is replaced by the day practices.
- **Changed: each day’s page** leads with its one practice and its outline; "About the day" and all its mantras are
  folded away beneath. A mantra’s page lists the practices that use it; the library points beginners to them.
- **Found by looking, fixed:** a list of cards sized itself by its widest possible width and pushed the page (and a
  finished practice) sideways; the reflection box showed the browser’s plain grey field.
- **Checks written, not run:** the practice and tools pages are in the page lists of `audit.cjs`, `a11y.cjs` and
  `layout.cjs`; `keyboard.cjs` 5c begins, follows and finishes a practice by keyboard. Retargeted, with the reason (the tools moved, unchanged):
  `interactions.cjs` (mala, fire, diya), `regressions.cjs` 7 and 14 (the fire) and `robust.cjs` (230 mala taps) now
  open `/practice/tools`.

## 2026-11-26 · Daily practice rebuilt around the seven-day mantra library

From Sarvakali's two documents, combined as the owner asked: the raw weekday list ("Mantras daily") and the
structured, carefully labelled library built from it ("The Seven-Day Mantra Library"). Where they differ, the
library's wording leads and the list fills in what it lacks. **The test suites were not run**, at the owner's
request; everything below was built, walked through in the preview and looked at on desktop and phone.

- **Added: the mantra library, 113 mantras, prayers and verses**, one editable file each (`src/content/mantras`,
  "Mantras" in the content editor, where they can be added, edited and deleted). Each has its days, a group heading,
  its deity or form, intentions, the Devanagari text, its meaning in simple English (line by line where the source
  gives it), purpose, what it can support, when to use it, a text and tradition note, its source, and a place for a
  recording by Sarvakali.
  - **The transliteration (IAST) and a readable pronunciation are worked out from the Devanagari**
    (`src/data/translit.ts`), in the library's own style ("AUM na-mah shi-vaa-ya"), so a verse corrected in the
    editor stays consistent; either can be overridden. AUM throughout.
  - **Labels, as the library asks:** *open to all*; *learn with guidance* (seed syllables and lineage-held texts:
    Dakshina Kali, Kali Gayatri, Manasa Devi, the Karuppaswamy Shivaputra formula); *wording not yet traced*
    (Kundali Mala, kept apart from the list's variant); *being checked*: ten texts whose wording in the list could
    not be matched to a source (Bhuta Natha, Namo Hanumate Tubhyam, Sankat Mochan's formula, Ramaskandam, Gantam
    Papam, Tripuram Shantam, the Dakshina Kalika Dhyanam, Jwalantam Karalam, the Navagraha line) or that Sarvakali
    should decide on (Namo Hanumate Rudravataraya, whose wording includes subduing others). Their text is held back;
    their name, meaning and the wording as supplied show.
  - **Corrected from the list, with a note on each:** Gita 8.7 (the list's transcription was garbled), Shuklambaradharam
    (printed "Shuklam Bharadharam"), Karagre Vasate (Govinda/Gauri), Namaste Sharade (vidyādānam), Vanamali.
  - **Drafted for Sarvakali** (and marked so on the site): the purpose and use of the 50 entries that only the list
    had, written in the library's manner.
- **Added: a page for each planetary day** (`/practice/monday` … `/practice/sunday`), each in its planet's colours
  and light (the Moon's phases, Mars's fire, Mercury's letters, Jupiter's lamps, Venus's lotus, Saturn's astrolabe,
  the Sun's halo): the planetary character (as symbolism, never a forecast), the day's intention and question, its
  themes, a gentle practice, its mantras in groups (and those it shares with other days), the library's note on
  Karuppaswamy and Vettai Karuppar, and the other traditions' connections. Words in "The seven days".
- **Added: the library** (`/practice/library`): how to use it, what the labels mean, a care note, and every mantra
  to search and filter by day, deity, intention and label; the filters live in the address, so a view can be shared.
- **Added: a page for each mantra** (`/practice/mantras/<name>`): the text large, each script can be hidden (the
  choice is remembered), larger text, copy, keep in "my mantras", a recording when there is one, the meaning line
  by line, its facts, and a counter to chant it once, 11, 27, 54 or 108 times (tap, click or space), which adds to
  the visitor's own record. A care note where a mantra touches grief, illness or fierce forms.
- **Added: across traditions** (`/practice/traditions`): the library's wider index (African and Indigenous, Japanese
  and East Asian, queer and gender-diverse sacred figures), the further altar names, and each day's connections.
  No mantra is invented for any tradition.
- **Changed: Daily practice** is now the hub. Today opens on the weekday (its planet and question) with the lunar
  day as a second layer; then the seven days, today's mantras, and **the daily rite in six steps**: arrive, light
  the lamp, **the day's opening prayer**, intention (the day's question, its themes as suggestions), **a main
  mantra** chosen from the day's (or the visitor's own), counted as many times as they choose, and **the day's
  closing prayer** with the offering to the fire. Each day's opening and closing prayers are chosen in the editor.
  The mala can count any of today's mantras or the visitor's own. **My mantras** (kept with ✦ anywhere) sit with the
  record, with how often each was chanted. A day page's "Begin" opens that day's rite.
- **Search** now finds mantras too, above the services; the menu links to the library.
- **Standing rule** (`CLAUDE.md`): in the mantra library a mantra's own text is given in Devanagari, always with its
  transliteration, pronunciation and English meaning.
- **Sources** named on the mantras were checked: the Rigveda (7.59.12, 3.62.10, 2.23.1), the Upanishads (Brihadaranyaka
  1.3.28; the Isha invocation; the Taittiriya/Katha peace invocation; Mahanarayana for the Aghora verse; Skanda 8),
  the Devi Mahatmya (chapters 5 and 11) and the Argala Stotram, the Gita verses, the Guru Gita, the Rama Raksha
  Stotram, the Vishnu Sahasranama, the Mahalakshmi Ashtakam (verse 1) and the Sankatanashana Ganesha Stotram (named
  without the Narada Purana, which it is popularly but unverifiably attributed to). The Karuppaswamy and Manasa Devi
  sources are the library's own citations. **Every Devanagari text should still be read by Sarvakali**, who decides.
- **Found by looking, fixed:** the Today boxes squeezed into one narrow column; the moon's form showed through the
  mantra cards (now more opaque) and crowded long titles (the day forms sit further aside); meaning lines were
  cramped; the "being checked" note drew stray dashed sides on phones; skipping the chant step dropped repetitions
  already counted.
- **Checks written, not run:** the new pages are in the page lists of `audit.cjs`, `a11y.cjs` and `layout.cjs`;
  `keyboard.cjs` 5b filters the library and counts a chant by keyboard.

## 2026-11-26 · The Studio, the closed loop, Find your path, Articles, Daily practice, the logo, a 404

Asked for by the owner in one message, built in one pass. **The test suites were not run** (the owner asked that
they wait until asked); the two new Studio checks were run while building (below).

### The Studio: requests, clients, invoices and articles behind one sign-in (`src/studio/`, `docs/studio.md`)

- **Added: the Studio at `/studio`**, Sarvakali's private workplace, behind the editor's secret door and one password
  (scrypt hash in `STUDIO_PASSWORD_HASH`, made with `npm run studio:password`; a signed, script-proof cookie for
  30 days; changes accepted only from the Studio's own pages; wrong passwords limited to 8 in 15 minutes). The
  same sign-in now opens the content editor; the door leads to the Studio's sign-in.
  - **Today:** what needs a reply, conversations coming up (with Join), payments to check, what is owed, anything
    that went wrong.
  - **Requests as cards:** who they are (new or met before, and how often), what they asked about, their kept
    services, and their up-to-three times, each in India's time and theirs. One tap confirms a time; or offer up to
    three others with a note; or keep it while moving; decline kindly; close spam silently.
  - **Confirmed:** with Google connected, the conversation goes into Sarvakali's Google Calendar with a Google Meet
    link and the client as a guest; without it, a link can be pasted. The client gets the link, a calendar file and
    their booking page. Moving or cancelling updates the calendar and tells the client.
  - **Afterwards:** "Did it take place?" (held, missed); notes on each conversation and each client.
  - **Clients:** everyone, with sessions held and to come, what is owed; each profile holds their details, what
    they asked (every request, in their words), sessions, invoices, every email sent to them, notes and a timeline;
    a new conversation or invoice from there; a copy of their data; archive; erase (sent invoices stay, without
    contact details, because tax records must be kept).
  - **Invoices** (replacing the old invoice maker): a draft starts from the client's latest conversation with the
    services they asked about; lines (with the catalogue's names to pick from), discount, GST, notes, days to pay;
    numbered `SK-<year>-0001` in Sarvakali's own time zone; a live preview of the paper. **Send** emails the client
    a link to their invoice page. Standing is worked out (draft, unpaid, part-paid, overdue, paid, cancelled);
    payments (UPI, cash, bank) can be recorded in parts, with a receipt; a reminder is one tap; an invoice can be
    cancelled (its number stays used), reopened or copied. A client's "I have paid" (with their UPI reference) shows
    as a payment to check.
  - **Sessions:** the week at a glance. **Articles:** every article with View and Edit, and Write a new one (all in
    the content editor). **Outbox:** every email, to read, send again, or copy and send by hand. **Settings:** your
    details, UPI ID, GSTIN, numbering, conversation length, reminders, notifications, Google, email, sign out.
- **Emails** (Resend; until a key is set they wait in the Outbox): to the client (request received, times offered,
  confirmed with a calendar file, declined, cancelled, reminder the day before, invoice, invoice reminder, receipt)
  and to Sarvakali (new request, client chose a time, client suggested times, client cancelled, client says paid).
  Every word a client reads is in `src/content/pages/booking.json` ("Bookings and emails" in the content editor).
- **Reminders** go out hourly (`netlify/functions/studio-reminders.mts`) and whenever the Studio is opened.
- **Storage:** Netlify Blobs on the host (strongly consistent, with optimistic retries so two changes at once never
  overwrite each other); a file in `.studio-data/` (not committed) during `npm run dev`.
- **The demo:** every static build (the preview too) carries the Studio as a demo with no password, keeping
  everything in the visitor's own browser and starting with a few made-up people (`@example.com`). Connect sends
  requests to it and says so; nothing is ever sent. `STUDIO_DEMO=0` leaves it out.
- **One set of rules** (`src/studio/core/`) serves the host and the demo, so the demo behaves exactly as the
  live Studio will.

### The client's side of the loop, closed

- **Your list → Connect → sent:** "Ask about these" in the list tray takes the kept services to Connect as chips;
  the form now really sends (name, email, phone if given, a few words if wished, up to three times in the visitor's
  own zone, which it names). A hidden field catches robots; requests are limited per address.
- **After sending:** a confirmation with the times offered and what was asked about, the list emptied (it went with
  the request), and a link to **their booking page**.
- **Booking page** (`/booking?t=…`, never indexed or cached offline): where it stands; choose one of the times
  offered (confirmed at once, with its Meet link), suggest others, add it to a calendar (file or Google Calendar),
  join, or cancel/withdraw.
- **Invoice page** (`/invoice?t=…`): the invoice, a UPI QR for the exact amount (on a phone, a button that opens
  the UPI app), copy the UPI ID, "I have paid" with the reference, print or save as PDF.
- **Care page:** "Who else handles it" now names the host, Google Calendar and Meet, and the email service (it
  named Cal.com, which is no longer used). `CLAUDE.md`'s content rule says booking is the site's own.

### Find your path, revamped (`src/pages/path.astro`, `src/scripts/path.ts`, `src/content/pages/path.json`)

- Three steps with a progress line; each answer in its pillar's colour; hovering or focusing an answer previews
  its world behind the page; number keys 1 to 9 answer; back at any step.
- **The result:** the pillar and category, a few of its services to keep one by one (or all at once), the pillar's
  signature moment to try now (straight to it: the breath, the mirror, the class finder, the comfort note...), a
  practice to begin with, an article to read first, and **Ask about this** (to Connect, with the topic and the kept
  services filled in). The answers live in the address, so a result can be shared or returned to; Start again.
- All words are in the content editor ("Find your path").

### Articles (`/articles`, replacing Writings)

- **The Articles page:** a lead piece (the one marked Featured, else the newest), a filter by pillar, and a grid;
  an article without a picture gets a drawing in its pillar's colours.
- **Each article:** a reading-progress line, byline with reading time and share, an optional picture, a contents
  list when it has two or more sections, a drop cap, pull quotes, "Ask about this", and read next.
- **Add, edit, delete:** from the Studio's Articles page into the content editor (new fields: Featured, Picture,
  its description). `/writings` and every old article address redirect.

### Daily practice, revamped (`src/pages/practice.astro`, `src/scripts/practice-journey.ts`)

- **Today:** the lunar day (tithi) with its moon, the next sacred night, and the visitor's own streak.
- **The daily rite:** five guided steps (arrive with a breathing circle, light the lamp, set an intention, count
  the mantra, offer to the fire), in about 5, 10 or 20 minutes (more breaths and beads for longer); each step waits
  for you and can be skipped; ends with the day's mark, the streak, and a line to reflect on (kept on the device).
- **The mala and the fire** now count towards the day; **the diya** sits with the sacred days, each of which now
  says what to do on it.
- **The month's moons:** a lunar calendar, month by month: each day's tithi and moon (at sunrise in India), new and
  full moons, Ekadashi and Ashtami, and the festival days; tap a day for its name.
- **Your practice:** days practised, the streak and the longest, beads of japa counted, twelve weeks of marks, and
  a journal of reflections (which can be saved as a file); all on the device only, with a way to clear it.
- **Reminders:** a daily reminder at a chosen time (a repeating calendar event), the moon reminders, and install
  on the phone. The pretend email sign-up is gone.
- The rite's guidance, the sacred nights' suggestions and the mantra are drafts for Sarvakali. All words are in
  the content editor ("Daily practice").

### The logo (`src/data/brand.ts`, `tools/make-brand.mjs`, `public/brand/`)

- **Chosen: "Lamp, moon and eye":** a crescent moon holding a flame that is also the third eye, with a bindu at its
  heart; gold on deep red-black, the flame in ember. It reads at favicon size and as a seal, and joins the three
  things the site keeps returning to: the lamp of devotion, the moon of the lunar days and Hecate, and the eye of
  insight. Three other directions were drawn and compared (a yantra seal, an S of flame and moon, three eyes);
  they are in `qa-output/brand/logo-directions.png` when the brand script is run.
- Used in the header's wordmark, the favicon, the app icons, the emails and the Studio.

### The depth demo: retired into About

- The depth view was already About's portrait; a second page showing the same thing added little, so `/depth` now
  redirects to `/about` and the menu's "Prototype extras" is gone. `src/scripts/depth.ts` and its paintings stay
  for the portrait.

### A page for addresses that do not exist (`src/pages/404.astro`)

- A crossroads form in its own world, a short line, search, and the ways back (Find your path, the homepage, each
  pillar, and the menu for the rest). Words in the content editor ("Page not found").

### Also

- The menu, footer and corner links now say Articles; the corner link opens the Studio.
- The offline copy (`public/sw.js`, now `sarvakali-v4`) never keeps the Studio, the API, the booking or invoice
  pages, or the editor.
- Printing any page now leaves out the world and the site's chrome (the old rule only served the invoice maker).
- `@netlify/blobs` (the Studio's store on the host) is now a direct dependency; it came only through the Netlify
  adapter before. Both builds were run: the static one (with the demo) and the host's (`EDITOR_HOST=netlify`), and
  the hourly reminders job bundles on its own.

### Found by looking at the preview, and fixed

- **The Studio stayed blank in the preview bundle.** The preview tool (`tools/make-relative.mjs`) made page links
  relative but not the addresses an interactive island loads its code from, nor the pieces the bundler preloads for a
  dynamic import, so both were asked for from the server's root. It now rewrites both (and stops with a message if
  the bundler's preload code changes shape). The live site was never affected: it is served from the root.
  In the same tool, the pages that forward old addresses (Writings to Articles, the depth demo to About) now forward
  within the preview too; they sent you to the server's root.
- **Connect's confirmation** scrolled to its middle, so its heading sat under the header; it now scrolls to its top.
  The visitor's own words showed as one more chip; they are now a quote beneath the chips.
- **Chips with two outlines** on the booking page and the confirmation (Connect's chip style plus a second one).
- **The invoice's DRAFT (or PAID, OVERDUE, CANCELLED) stamp** lay over the letterhead in the Studio's narrow preview;
  it now sits beside the totals.
- **Histories read "You Confirmed a time"**; they now read "You confirmed a time". Payments were logged as
  "Received 1500.00"; now "Received ₹1,500".
- **Emails** showed the booking page and Google Calendar links as raw addresses, and the calendar one ran past the
  email's edge; they are now words ("My booking · Add to Google Calendar"), the addresses kept in the plain text.
- **In the Studio**, the Discount box stretched beside the Tax box and its hint; and a new request's page offered
  Decline twice.
- **The demo's made-up requests** now ask about services that fit their words (protection for a new home asked about
  romance workings).

### Checks

- **New:** `tools/qa/studio-core.mjs` (the whole loop in memory: requests, times, confirming, moving, cancelling,
  reminders, invoices, numbering in India's zone, payments, claims, erasure, odd amounts and markup) and
  `tools/qa/studio.cjs` (the loop in a browser: list tray → Connect → booking page → Studio confirm → reschedule →
  invoice made, sent, claimed, paid → the outbox; and the phone layout). Both were run while building, against the
  dev server; both passed, apart from glitches in the checks themselves, fixed (a box picked by the wrong label, a
  previous run's data, reading the previous message). The last full browser run was stopped by the sign-in limit
  (8 tries in 15 minutes) doing its job; the check now signs in once and reuses it.
- **Page lists:** `audit.cjs`, `a11y.cjs`, `layout.cjs` and `keyboard.cjs` now include `/articles` (and an
  article), `/booking`, `/invoice`, `/studio` and `/404`; `/writings…` became `/articles…`; `/depth` is gone.
- **Retargeted, with reasons** (none weakened):
  - `regressions.cjs` 1–2 (the depth view) now load About, where the depth view lives; the painting switch went
    with the demo page.
  - `regressions.cjs` 4 (the invoice's local date) moved to `studio-core.mjs`, because invoices are now dated by
    the Studio in Sarvakali's zone ("invoice: dated in India at 01:15 IST").
  - `regressions.cjs` 18's "(optional)" check moved from the invoice maker's labels to Connect's, which use the same
    pattern; its list-bullet check reads an article at its new address.
  - `robust.cjs`: the markup test now types markup on Connect and looks for it on the booking page and in the
    Studio (the invoice maker's version of it, negative quantities and huge amounts, is in `studio-core.mjs`); the
    print test prints a client's invoice page from the demo; `/depth` → `/about`.
  - `interactions.cjs`: the invoice QR is checked on a client's invoice page from the demo.
- **Known false alarms** added to `tools/qa/README.md`, with reasons: Playwright's own "serviceWorker" message in
  sandboxed email frames, and the dev server's 403 for the email logo inside the sandboxed preview (dev only).
- `run-quick.sh` runs `studio-core.mjs`; `run-all.sh` also runs `studio.cjs` against the preview's demo.
- **Written for what looking found** (not yet run): `regressions.cjs` 23 (the confirmation's heading in view, the
  visitor's words as a quote, history in lower case after its actor, the stamp clear of the letterhead, the Discount
  and Tax boxes in line) and `preview-check.cjs`'s new check that the Studio demo opens from the preview bundle.
- **Looked at:** the Studio's Today, request cards, a client profile, the invoice editor and Settings; the
  booking and invoice pages; Connect on a phone; Find your path's steps and result; Articles and an article; the
  daily rite from start to end and the record it leaves; the 404; the logo at every size; the new editor sections.

## 2026-11-25 · The golden bloom and Hecate's key, locked in; the key made dramatic

- **Chosen by the owner: the golden bloom** where the galaxy was (the homepage's Connect chapter, Connect, Find your
  path, Abundance, Mind), at the sizes it had in the comparison, and **Hecate's key** as her sign.
- **Removed: the forms not chosen** (the galaxy, the kolam, the energy field, the twin torches, the serpent), with
  their shader motion, and the switches that compared them (`?ambient=`, `?hecate=`, and the two prototype-panel
  groups). Every page builds five fewer forms when it loads. The form weights are repacked: the bloom takes the
  galaxy's slot (`uW3.x`), the key moves to `uW9.z`, `uW10` is gone. All of them stay in the project's history.
- **Changed: the key, redrawn to be dramatic** (`src/data/hecate-key.ts`, which replaces `hecate-signs.ts`). It is
  larger and steeper; its bow has three lobes, for her triple form, each with a small light, an engraved double
  edge, and the dark moon's crescent glowing at its heart (the crescent was a degenerate path before, so its glow
  never showed); an aureole of rays stands behind it; the shank has a twisted collar, a beaded ring and a pointed
  tip; the bit is deep and stepped. In the world it turns in its lock every nine seconds (a quarter-turn, a pause,
  and back); as it turns, light runs down the shank and the bow flares, the rays stay still and pulse outward, and
  sparks drift up from the wards. The key's axis for the turn is worked out from the drawing (`KEY_AXIS`), so the
  drawing can move without breaking the turn. The small mark beside her name draws the main lines only. On phones
  the key is quieter (`narrow: 0.6`), as it sits behind the chapter list.
- **Fact check (cover):** the torches and serpent rows now read "Checked; not used"; the key row lists what is
  ornament; an older row that found no ancient source for her keys now points to the one found since (Kleidouchos).
- **Checks updated, not yet run** (at the owner's request): `regressions.cjs` 21 now expects the key (no longer
  each of three signs by `?hecate=`) in the world and the badge; 22 now expects the bloom at Mind's heading (it was
  checked with the kolam by `?ambient=`, which is gone; what it measures, how settled the form is, is unchanged).
- **Looked at:** the drawing at full size and as the small mark; the key on the opening and in Hecate's section,
  desktop and phone, and eight moments of one turn; the bloom in all five places. A type check shows no errors in
  the changed files.
- **Pushed and published to the preview without running the suites**, at the owner's request.

## 2026-11-25 · Options instead of the galaxy

- **Added: three forms to compare in the galaxy's places** (the homepage's Connect chapter, Connect, Find your path,
  Abundance on Witchcraft & Magic, Mind on Healing). Chosen by `?ambient=kolam|bloom|torus|galaxy` or the prototype
  panel's "Instead of the galaxy"; the kolam is shown unless another is chosen.
  - **Kolam** (`kolam`): the threshold drawing of South India, a sikku kolam drawn as it is by hand: one line
    running diagonally between a grid of dots, turning back at each edge in a small curl, set on its point as a
    diamond. A ring of light travels out from the centre along it.
  - **Golden bloom** (`bloom`): seeds set by the golden angle, as in a sunflower's head, inside a ring of petals;
    it breathes slowly.
  - **Energy field** (`torus`): a torus of light seen from the side, its streams flowing up through the centre and
    round over the outside.
  - **Galaxy** (`vortex`): the rebuilt galaxy, kept to compare.
  - An aurora was tried and dropped: as points it read as haze, not curtains.
  Each has its own size there (`AMBIENT_ZOOM` in `presets.ts`), and the kolam is quieter on phones, where it sits
  behind the words (`AMBIENT_NARROW`).
- **Fixed: a chapter's form was still blurred when you arrived at its heading** (from the menu, search or a link).
  The form only finished changing when the chapter's middle reached the middle of the screen, so at its heading it
  was still 5% dissolved out of the chapter before. The galaxy's fuzz hid this; the kolam's fine lines showed it as
  a blur. A form now holds its shape over the first and last 15% of the way between two chapters, so it lands whole
  at the heading and still changes smoothly in between. Found by looking at the kolam on Mind; measured before
  (settled 0.955 at Mind's heading) and after (1.000). Check: `regressions.cjs` 22 (written, not yet run).
- **Changed: Find your path's form** sat across the heading ("…begin?"); it now sits beside it, as on the homepage.
- The world now reports how far its form has settled (`formSettled`) for checks, and `formKey` now names the form of
  the chapter in view (it named the next chapter's form when a page sat exactly on a chapter).
- **Checks written, not yet run** (at the owner's request the suites wait): `regressions.cjs` 22.
- **Looked at:** each option on the homepage, Mind, Abundance and Find your path, desktop and phone.
- **Pushed and published to the preview (version 19) without running the suites or the preview check**, at the
  owner's request. They run next, when the owner says, and anything they find is fixed and logged here.

## 2026-11-25 · The cursor in the menu, Hecate's sign, a real galaxy

- **Fixed: the cursor vanished over the menu.** With the flame cursor on, the arrow is hidden and a drawn cursor
  takes its place; it was drawn beneath the full-screen menu and search (so nothing showed), and today's card and
  the device report open in the browser's top layer, above anything a page can draw. The drawn cursor now sits
  above the menu, search and page changes, and while a dialog is open the arrow comes back. Check:
  `regressions.cjs` 20 (failed before the fix over the menu and the card).
- **Changed: Hecate's sign.** Her mark on Witchcraft & Magic (the opening, her section, the close, the homepage
  chapter and the small "Under the keeping of" badge) was a circle with three roads meeting in it, which reads as a
  peace sign. It is now one of her own attributes, drawn once as engraved line art (`src/data/hecate-signs.ts`) and
  used both as the light form and as the badge: **twin torches** (the default; Phosphoros, the light-bringer: the
  flames lick upward and sparks rise into the night), **her key** (Kleidouchos, keeper of the keys; its bow holds
  the dark moon's crescent and it turns slowly as if in a lock) or **her serpent** (coiled, the neck rising and
  swaying). The three are offered to compare (`?hecate=torches|key|serpent`, or the prototype panel); her sources
  are in the cover's fact check. The dark moon in her supper section lost its three road lines too. The popular
  "Hecate's wheel" was left out: only the strophalos of the Chaldean Oracles is ancient, and the wheel's design
  could not be traced to a source.
- **Changed: the galaxy** (the homepage's Connect chapter, Connect, Find your path, Abundance, Mind) was a thin
  three-armed spiral of evenly scattered dots. It is rebuilt the way a real galaxy is put together: a dense, puffy
  bulge with a short bar; two open grand-design arms (pitch 24°) with a bright spine inside a broader glow, a dark
  dust lane along their inner edge, feathered spurs and soft knots of young stars; a disc between the arms that is
  denser near them; a sparse halo. The arms trail the turning, as real ones do. The shader warms the core to old
  gold and cools the arms towards blue, enlarges and brightens the core a little, lets arm stars twinkle, and turns
  the galaxy in its own tilted plane with the turn growing with its weight, so it spins up and settles instead of
  sliding. On Connect it is large enough to sweep around the form; the homepage chapter (`connectHome`) keeps it
  beside the words; Find your path (`findpath`) keeps the quieter one.
- **Checks written, not yet run** (at the owner's request the suites wait): `regressions.cjs` 21 (Hecate's sign,
  not three roads, in the world and the badge, for each of the three). The world now reports its form
  (`formKey`) for checks.
- **Looked at:** each sign on the opening and in Hecate's section, desktop and phone; the galaxy before and after on
  the homepage, Connect, Find your path, Abundance and Mind.

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
