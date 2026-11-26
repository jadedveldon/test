# Observability: visits, problems, logs and health

The site counts its own visits, catches its own errors and keeps its own logs. Nothing goes to an analytics or
error-tracking company; everything is kept on the site's host and read in the Studio under **Insights**. No cookies,
nothing kept in the visitor's browser for it, nothing that identifies anyone (the care page says so in plain words).

## What is counted, and how

**In the browser** (`src/scripts/telemetry.ts`, started first thing by `app.ts` and by the Studio):

| Event | When | What it carries |
| --- | --- | --- |
| `view` | a page opens (full load or a page change inside the site) | the path only (never the query: private links carry tokens), the other site's name if one sent the visitor, campaign tags (`utm_source`, `utm_medium`, `utm_campaign`), screen width, language |
| `leave` | the page is left, hidden or closed | time in view, how far down it was read, and on the first page of a visit its speed: LCP, CLS, INP, FCP, TTFB |
| `goal` | a step that matters (list below) | its name and a short detail (which practice, which mantra) |
| `error` | anything breaks | the message and stack, where it came from, the trail before it, and the host's reference for a failed request |

- **Goals:** marked with `track(name, detail)` from `src/scripts/track.ts`, from anywhere in the site's code:
  - Practice: `practice-start`, `practice-finish`, `chant`, `rite`, `fire`, `lamp`, `journal` and `keep-mantra` (these
    come from `practice-log.ts`).
  - Finding things and reaching out: `keep`, `request`, `search` (the words only when they found something),
    `path-result`, `not-found` (with how the visitor got there).
  - Accounts: `signin-link`, `signin`, `account-created`, `account-deleted`.
  - Clients: `booking-accept`, `booking-suggest`, `booking-cancel`, `invoice-paid-claim`.
  - The app: `install`.
  - Noticed by themselves: `help-line` (the Tele-MANAS link), `call`, `email`, `outbound`.
  - Any element with `data-track="name"` (and `data-track-detail`) counts when pressed.
  - **Never pass anything a visitor typed.**
- **The trail before an error** is the last 40 steps:
  - pages opened;
  - buttons and links pressed (their label, never a field's value);
  - every request the page made, with status, time and the host's reference;
  - console warnings and errors;
  - goals.
- **Errors caught:** uncaught errors, failed promises, pictures, scripts or styles that would not load, errors the
  site's code reports with `reportError()`, and Studio pages that break (an error boundary keeps the rest of the
  Studio working).
- **Limits:** each kind of error is sent once per page, at most ten per page and 60 events per page.
- **Sending:** in small batches, every 15 seconds, at once for an error, and with `sendBeacon` when the page is
  left. `/api/t` on the host. In the preview the events stay in the browser (`src/obs/demo.ts`).
- **Global Privacy Control or Do Not Track:** nothing is counted for that visitor. Errors are still reported; they
  carry nothing about the person.
- **The Studio's own pages** are never counted (their errors are).

**On the host** (`src/obs/routes/collect.ts`):

- **Robots are left out.** This covers search engines, link previews (WhatsApp, Facebook), monitors and headless
  browsers.
- **Each visitor gets a hash for the day:** SHA-256 of a daily secret, the internet address and the browser.
  - It lets one person's pages be followed through one day (visits, journeys).
  - The address is never kept.
  - The secret is deleted after two days, so old hashes can never be worked back, and days cannot be linked.
- **The host adds:** the country (from Netlify's geolocation), the kind of device, the browser and the system.
- **Sarvakali's own visits** (signed in to the Studio) are marked and left out of the counts.

**Scrubbed everywhere** (`src/obs/core/clean.ts`), in the browser and again on the host, before anything is kept or
written to a log:

- email addresses, phone numbers, UPI IDs and long tokens in any text;
- private fields by name: password, token, email, phone, journal text, notes, names, addresses, references.

## Logs and references

- **A reference for every request:** `src/middleware.ts` wraps every request the host answers itself. Each one gets
  a reference such as `mbx4k2p1-3f9a`, which also encodes the time.
  - It is sent back in the `x-request-id` header, and in the body of any error.
  - The browser keeps it in its trail. Error messages visitors and clients see end with it: "(Reference: …)".
- **Unexpected errors are caught:** logged with their stack, and answered with a plain message and the reference,
  never a stack trace.
- **Logging:** use `log.info / warn / error(message, fields, error)` from `src/obs/server/log.ts` anywhere in host
  code. Each line is one JSON object: time, level, message, reference, route, method, status, duration, fields, error.
  - Every line goes to the host's own log (Netlify → Logs → Functions).
  - For API requests, the request's lines are also kept 30 days and searchable in Insights → Logs by reference, day
    and level.
  - Set `LOG_LEVEL=debug` on the host to see debug lines.
- **Host errors join the error groups** with the browser's, marked "On the site's host".
- **Timing:** every answer carries `server-timing: app;dur=…`.

## What is kept, and for how long

Netlify Blobs, store `obs` (in development, `.studio-data/obs/`, never committed).

| Key | What | Kept |
| --- | --- | --- |
| `ev/<day>/<hour>/<id>` | one batch of events | 30 days |
| `log/<day>/<hour>/<reference>` | one request's log lines | 30 days |
| `sum/<day>` | the day in numbers | 400 days |
| `state/salt-<day>` | the day's secret for visitor hashes | 2 days |
| `state/errors`, `state/known`, `state/meta` | marks on errors, what has been alerted, last round | — |

Days are India time.

**The hourly round** (`netlify/functions/obs-hourly.mts`, `src/obs/server/alerts.ts`):

- works out today and yesterday into `sum/<day>`;
- lets old data go (every six hours);
- sends **an alert email** to the Studio's own email address when something new breaks:
  - a host error at once, a browser error once it has happened three times;
  - an error marked fixed that comes back;
  - at most one email every three hours; what was not told waits.

Insights also works out today afresh whenever it is opened (reusing the numbers if they are under two minutes old; the refresh button always works them out again).

## Insights, in the Studio

- **Overview:** visitors (each day's, added up), visits (a gap of 30 minutes, or arriving again from another site or a campaign link, starts a new one), pages seen, time on a
  page, how far pages are read, visitors each day (hover, focus and arrow keys, or a table), pages, sources, campaign
  links, the hours of the day, countries, devices, browsers.
- **Journeys:** the way to a conversation (visits → Connect → request sent → time confirmed → held → paid; the last
  three from the Studio's records), where visits begin and end, and the steps from page to page.
- **What people do:** every goal, by group, and the practices, mantras, searches, Find your path results, missing
  pages and kept services behind them.
- **Speed:** the 75th percentile of each measure, judged by web.dev's thresholds, and page by page, slowest first.
- **Problems:** each kind of error with how often it happened, to how many visitors, where and on what, the last three
  samples with their trails and stacks, a link to the log lines by reference, and Mark fixed / Ignore / Reopen.
- **Logs:** find a reference; the day's requests (all, warnings, errors), each opening into its lines.
- **Health:** whether the stores answer and how fast, the version, when the numbers were last worked out, the last
  alert, what is set up.

**Uptime:** the site cannot email you if it is down. `GET /api/health` answers `{"status":"ok"}`, or 503 when a store
does not answer (the details only when signed in to the Studio). Give that address to an uptime service (UptimeRobot,
Better Stack and others have free plans) to be told when the site stops answering.

## Breadcrumbs (the trail at the top of pages)

- Inner pages show where they sit: Home › Daily practice › Mantra library › Gayatri Mantra.
- The same trail goes to search engines as schema.org `BreadcrumbList`.
- Pass `crumbs` to `Base.astro`. The words ("Home", "Daily practice", …) are in the content editor under Site
  settings.
- On phones only the step back shows ("‹ Mantra library"), so it never wraps into the heading.

## Outside services, if wanted later

Site settings still offer Plausible, Umami or Cloudflare Web Analytics alongside the site's own counting (off by
default). To send errors to a service such as Sentry as well, connect it in `connectSink` in
`src/scripts/telemetry.ts` and in `log.ts`; nothing else changes.

## Checks

- `node tools/qa/obs-core.mjs` runs in memory: scrubbing, robots, grouping, a day worked out (visitors, visits,
  bounces, journeys, goals, speed, errors), days combined, logs by reference, letting old data go, alerts.
- `node tools/qa/obs.cjs` runs in a browser, against the dev server or (`QA_OBS=demo`) the preview: visits and goals
  counted, an error caught with its trail, the host's reference on errors, private links and emails kept out, robots
  left out, breadcrumbs, Insights' tabs.
