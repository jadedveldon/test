# The Studio

The Studio is Sarvakali's private place for the work behind the site: requests, conversations, clients, invoices
and articles. It lives at `/studio` on the live site, behind the same secret door and one sign-in as the content
editor.

## How a request travels (the whole loop)

1. **A visitor keeps services** on the pillar pages (or on Find your path); "Your list" follows them round the site.
2. **They ask about them** ("Ask about these" in the list, or any "Request a conversation"): on Connect their kept
   services sit on the form as chips; they add their name, email, a few words if they like, and up to three times
   that suit them, in their own time zone. They send it.
3. **They see it went**: a confirmation with the times they offered and what they asked about; their list empties
   (it went with the request); they get an email, "Your request to Sarvakali", with a link to their own booking page.
4. **Sarvakali is told** by email, and the request waits in the Studio as a card: who they are (new, or met before),
   what they asked about, and their times, each shown in India's time and theirs.
5. **Sarvakali replies** from the card:
   - **Confirm one of their times** (one tap). With Google connected, the conversation goes into Sarvakali's
     Google Calendar with a **Google Meet link**, the client as a guest. The client gets "Confirmed" with the link,
     a calendar file and their booking link.
   - **Offer other times** (up to three, with a note). The client gets an email and chooses one on their booking
     page; it is confirmed at once, with its Meet link, and Sarvakali is told. Or the client **suggests other
     times**, and the card comes back to Sarvakali.
   - **Decline** with a kind message, or **close** a spam request silently.
6. **Before the conversation** the client gets a reminder (a day before, by default). Either side can **move** it
   (Sarvakali offers a new time; the client chooses) or **cancel** it; the calendar follows.
7. **Afterwards** the card asks "Did it take place?": held, or missed. Notes can be kept on the client and on each
   conversation.
8. **The invoice**: from the client (or the conversation), "New invoice" starts a draft with the services they asked
   about. Add amounts (discount and GST if needed), then **Send**: the client gets an email with a link to their
   **invoice page**, where they can pay by UPI (QR code, or straight into their UPI app on a phone) and tell
   Sarvakali "I have paid", with their UPI reference.
9. **Paid**: Sarvakali checks the UPI app and marks it paid (or records part payments, cash, bank transfers);
   the client gets a receipt. Overdue invoices are flagged; a reminder is one tap; an invoice can be cancelled
   (its number stays used) or reopened.

Everything is recorded: the client's profile shows how many times you have met, what is coming, everything they
have asked about and said, your notes, their invoices (paid and owed), every email they were sent, and a timeline.

## The Studio's pages

| Page | What is there |
| --- | --- |
| Today | Greeting; what needs a reply; conversations coming up (with Join); payments to check; what is owed; anything that went wrong |
| Requests | Needs your reply · Waiting for the client · Confirmed · To wrap up · Past and closed; each card acts in one tap |
| Sessions | A week at a glance: confirmed conversations, and times still being agreed shown faintly |
| Clients | Everyone, with how many times you have met, what is next, what is owed; each profile holds everything above, a new conversation or invoice, a copy of their data, archive, erase |
| Invoices | Open, paid-to-check, drafts, paid, cancelled; what is owed, overdue, received this month; each invoice with its live preview, payments and history |
| Articles | Every article (draft or published) with View and Edit; Write a new article opens the content editor (Delete is in the editor's ⋯ menu) |
| Outbox | Every email sent (or kept, before email is set up): read it, send it again, or copy it to send by hand |
| Settings | Your details, invoice details (UPI ID, GSTIN, numbers, days to pay), conversation length, reminders, notifications, Google, email, signing out |

## Setting it up on the host (once, about thirty minutes)

All of this is in Netlify: **Site configuration → Environment variables**, then **Deploys → Trigger deploy**. None
of these values belongs in the repository. The content editor's own setup (docs/editor.md) is done first.

1. **The password.** On your computer, in the project: `npm run studio:password`. It asks for a password (ten
   characters or more; a few words together is good) and prints `STUDIO_PASSWORD_HASH=…`. Add that variable.
   Only the hash is stored; nobody can read the password back from it.
2. **The Studio's secret.** Add `STUDIO_SECRET` = a long random string (40 or more characters). It signs the
   sign-in and locks the Google key. Changing it signs everyone out.
3. **The door.** `EDITOR_DOOR` (already set for the content editor) also opens the Studio. Open
   `https://<the site>/door/<the door word>` once on each device; it takes you to the Studio's sign-in.
4. **Email (Resend).** Create a free account at resend.com, add your domain (Resend shows the DNS records to add
   where the domain is managed), and make an API key. Add `RESEND_API_KEY` and `MAIL_FROM`, e.g.
   `Sarvakali <hello@your-domain>`. Until then nothing is sent: every email waits in the Outbox, where you can copy
   it into your own email.
5. **Google Meet links.** In Google Cloud Console (console.cloud.google.com), with the Google account whose
   calendar you use: create a project; enable the **Google Calendar API**; under "OAuth consent screen" choose
   External, add your own address as a test user (or publish the app); under "Credentials" create an **OAuth
   client ID**, type **Web application**, with the authorised redirect address
   `https://<the site>/api/studio/google/callback`. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, deploy, then
   in the Studio: **Settings → Connect Google Calendar**, and allow it. Until then you can paste a meeting link into
   each conversation by hand.
6. **Your details** in the Studio's Settings: your email (where new requests are announced), your UPI ID and the
   name on it (on every invoice), address and GSTIN if you use them.
7. Optional: `SITE_URL` if the links in emails should use a different address from Netlify's own.

Data is kept in Netlify Blobs, a store that comes with every Netlify site (nothing to set up). Reminders go out from
a small scheduled job every hour (`netlify/functions/studio-reminders.mts`), and also whenever the Studio is opened.

## Safety and privacy

- The Studio and the editor answer "not found" until the door has been opened on that device; then they ask for the
  password; wrong passwords are slowed and limited. Signing in lasts 30 days on a device ("Sign out" in Settings).
- The sign-in cookie cannot be read by scripts and is only sent to this site; changes must come from the Studio's
  own pages.
- A client's booking and invoice pages open only with the long link in their emails, and show only their own
  booking or invoice. These pages, and the Studio, are never indexed, cached offline or remembered by the browser's
  offline copy.
- Connect is limited per address (six requests an hour) and has a hidden field that robots fill in, to keep spam out.
- Clients may ask for a copy of what is kept about them (Client → Download a copy) or for it to be erased
  (Client → Erase): their conversations, notes and emails go; sent invoices stay, without contact details, because
  tax records must be kept.

## The preview's demo

The preview (and any static build of the site) carries a demo of the Studio at `/studio`, with no password, that
keeps everything in the visitor's own browser: Connect sends requests there (and says so), and the client's booking
and invoice pages work from it. It starts with a few made-up people. Nothing is ever sent from the demo. "Start the
demo again" is in its Settings. `STUDIO_DEMO=0` leaves it out of a static build.

## For developers

- `src/studio/core`: the rules (requests, bookings, clients, notes, invoices, payments, settings, reminders), the
  emails, calendar files, time zones and money, shared by the host and the demo. `api.ts` names every request the
  Studio and the public pages may make.
- `src/studio/server`: the host's side: sign-in (scrypt, signed cookie), storage (Netlify Blobs; a file in
  `.studio-data/` during `npm run dev`), Resend, Google Calendar, the routes. `src/studio/integration.mjs` adds them
  to the build.
- `src/studio/app`: the Studio's screens (React). `src/studio/demo`: the demo.
- `src/scripts/booking.ts`, `src/scripts/invoice-view.ts`: the client's pages; Connect sends from `src/scripts/app.ts`.
- The words clients read (pages and emails) are in `src/content/pages/booking.json` ("Bookings and emails" in the
  content editor).
- `npm run dev` runs it all locally (password `studio` until one is set). Checks: `tools/qa/studio-core.mjs` (the
  rules, in memory) and `tools/qa/studio.cjs` (the whole loop in a browser).
