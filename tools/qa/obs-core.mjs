// Observability, run in memory (no browser, no server): private things kept out (tokens in links, emails, phone
// numbers, private fields), robots left out, the same error grouped as one, a day worked out into visitors, visits,
// bounces, journeys, goals, speed and errors, days added together, logs found again by their reference, old data
// let go, and alerts only for new problems. Run: node tools/qa/obs-core.mjs   (every line must read "ok")
import { build } from 'esbuild';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = mkdtempSync(join(tmpdir(), 'obs-core-'));
const entry = join(dir, 'entry.ts');
const root = process.cwd();
writeFileSync(entry, `
export * as c from '${root}/src/obs/core/clean.ts';
export * as e from '${root}/src/obs/core/events.ts';
export * as i from '${root}/src/obs/core/insights.ts';
`);
await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: join(dir, 'core.mjs'), logLevel: 'error', loader: { '.json': 'json' } });
const { c, e, i } = await import(pathToFileURL(join(dir, 'core.mjs')).href);
rmSync(dir, { recursive: true, force: true });

let fails = 0;
const ok = (n, v, extra = '') => { if (!v) fails++; console.log(`${v ? 'ok  ' : 'FAIL'} ${n}${extra ? ' — ' + extra : ''}`); };

/* ---------------------------------------------------------------- private things */
ok('a private link keeps only its path', c.cleanPath('https://sarvakali.in/invoice?t=AbCdEfGhIjKlMnOpQrStUvWx#pay') === '/invoice' && c.cleanPath('/me?t=secret-token-here-12345') === '/me');
ok('the preview’s flat files count as their page', c.cleanPath('http://127.0.0.1:8099/site/practice-with-kali.html') === '/practice-with-kali' && c.cleanPath('/practice/with/kali.html') === '/practice/with/kali' && c.cleanPath('/index.html') === '/');
ok('campaign tags are kept, nothing else of the query', JSON.stringify(c.campaign('/?utm_source=Instagram&utm_campaign=Navratri&email=a@b.co')) === JSON.stringify({ s: 'instagram', c: 'navratri' }));
ok('where someone came from keeps only the site’s name', c.refHost('https://www.google.com/search?q=kali+puja+near+me', 'sarvakali.in') === 'google.com' && c.refHost('https://sarvakali.in/practice', 'sarvakali.in') === undefined);
const s = c.scrub('Mail me at asha.rao@example.com or +91 98450 01234, pay sarvakali@okhdfc, link t=AbCdEfGhIjKlMnOpQrStUvWxYz012345');
ok('emails, phone numbers, UPI IDs and tokens are scrubbed from text', !/asha|98450|okhdfc|AbCdEf/.test(s) && /\[email\]/.test(s) && /\[phone\]/.test(s) && /\[upi\]/.test(s) && /\[token\]/.test(s), s);
ok('…but ordinary numbers stay', c.scrub('Chant 108 times on day 3') === 'Chant 108 times on day 3');
const o = c.scrubObject({ email: 'a@b.co', password: 'x', journal: 'my words', count: 3, nested: { token: 'abc', path: '/connect' } });
ok('private fields are replaced whole', o.email === '[private]' && o.password === '[private]' && o.journal === '[private]' && o.count === 3 && o.nested.token === '[private]' && o.nested.path === '/connect');

/* ---------------------------------------------------------------- devices and robots */
const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const win = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
ok('phones and computers are told apart', JSON.stringify(c.device(iphone)) === JSON.stringify({ kind: 'phone', browser: 'Safari', os: 'iOS' }) && c.device(win).kind === 'desktop' && c.device(win).browser === 'Chrome');
ok('robots and link previews are not visitors', c.isBot('Googlebot/2.1') && c.isBot('WhatsApp/2.23') && c.isBot('Mozilla/5.0 HeadlessChrome/120') && c.isBot('') && !c.isBot(iphone));

/* ---------------------------------------------------------------- events */
ok('a bad event is refused', e.cleanEvent({ k: 'hack' }) === null && e.cleanEvent(null) === null && e.cleanEvent({ k: 'goal', n: 'DROP TABLE' }) === null);
const err = e.cleanEvent({ k: 'error', p: '/connect?t=zzzzzzzzzzzzzzzzzzzzzzzzzzzz', m: 'Failed for asha.rao@example.com at 12:30', s: 'at send (https://x/_astro/app.Ab12Cd34.js:10:20)', src: 'onerror', crumbs: [{ t: 1, c: 'click', m: 'button “Send” to a@b.co' }] });
ok('an error is made safe before it is kept', err.p === '/connect' && !/asha/.test(err.m) && !/a@b/.test(err.crumbs[0].m) && typeof err.f === 'string');
const err2 = e.cleanEvent({ k: 'error', p: '/connect', m: 'Failed for other@example.com at 18:05', s: 'at send (https://x/_astro/app.Zz99Yy88.js:11:4)', src: 'onerror' });
ok('the same error, with other numbers and another build, groups as one', err.f === err2.f);
ok('a different error is a different group', e.cleanEvent({ k: 'error', p: '/', m: 'Cannot read properties of null', src: 'onerror' }).f !== err.f);

/* ---------------------------------------------------------------- a day */
const T = Date.parse('2026-11-26T04:00:00Z'); // 9:30 in India
const ev = (min, vh, x) => ({ ts: T + min * 60_000, vh, pv: `${vh}-${min}`, co: 'IN', dev: 'phone', br: 'Chrome', os: 'Android', ...x });
const day = [
  ev(0, 'A', { k: 'view', p: '/', r: 'google.com' }), ev(1, 'A', { k: 'leave', p: '/', ms: 30000, sd: 80, v: { lcp: 1800, cls: 0.02 } }),
  ev(1, 'A', { k: 'view', p: '/practice' }), ev(5, 'A', { k: 'goal', p: '/practice', n: 'practice-finish', d: 'kali' }), ev(6, 'A', { k: 'view', p: '/connect' }), ev(8, 'A', { k: 'goal', p: '/connect', n: 'request' }),
  ev(200, 'A', { k: 'view', p: '/practice', u: { s: 'instagram', c: 'navratri' } }), // a second visit, hours later
  ev(10, 'B', { k: 'view', p: '/practice', co: 'GB', dev: 'desktop', br: 'Safari', os: 'macOS' }), ev(11, 'B', { k: 'leave', p: '/practice', ms: 90000, sd: 40, v: { lcp: 3200 } }),
  ev(12, 'O', { k: 'view', p: '/', own: true }),
  ev(20, 'B', { k: 'error', p: '/practice', m: 'x is undefined', src: 'onerror', f: 'f1', crumbs: [{ t: 0, c: 'nav', m: '/practice' }] }),
  ev(21, 'C', { k: 'error', p: '/practice', m: 'x is undefined', src: 'onerror', f: 'f1' }),
];
const d = e.rollup('2026-11-26', day);
ok('visitors are counted once a day, the owner’s own visits left out', d.visitors === 2 && d.views === 5, `${d.visitors} visitors, ${d.views} views`);
ok('a gap of half an hour starts a new visit; one-page visits are bounces', d.visits === 3 && d.bounces === 2, `${d.visits} visits, ${d.bounces} bounces`);
ok('where visits started, ended and came from', d.entries['/'] === 1 && d.entries['/practice'] === 2 && d.sources['google.com'] === 1 && d.sources.Direct === 2 && d.campaigns['instagram / navratri'] === 1);
ok('journeys: each step from one page to the next', d.steps['/ → /practice'] === 1 && d.steps['/practice → /connect'] === 1);
ok('goals and their details', d.goals.request === 1 && d.goals['practice-finish'] === 1 && d.goalDetails['practice-finish'].kali === 1);
ok('pages: views, visitors, time in view, how far read', d.pages['/practice'].views === 3 && d.pages['/practice'].visitors === 2 && d.pages['/'].ms === 30000 && d.pages['/practice'].sd === 40);
ok('countries, devices and browsers', d.countries.IN === 4 && d.countries.GB === 1 && d.devices.desktop === 1 && d.browsers.Safari === 1);
ok('hours are Sarvakali’s own (India time)', d.hours[9] === 4 && d.hours[12] === 1, d.hours.join(','));
ok('speed: the 75th percentile, and judged as the web does', e.p75(d.vitals.lcp) === 3200 && e.rate('lcp', 1800) === 'good' && e.rate('lcp', 3200) === 'needs work' && e.rate('cls', 0.3) === 'poor');
const g = e.toStored(d).errors.f1;
ok('errors grouped, with how many visitors met them and the trail before', g.n === 2 && g.visitors === 2 && g.samples.length === 2 && g.samples[0].crumbs?.[0].m === '/practice' && !('_v' in g));
const both = e.combine([e.toStored(d), e.toStored(e.rollup('2026-11-27', [ev(1500, 'Z', { k: 'view', p: '/' }), ev(1501, 'Z', { k: 'error', p: '/', m: 'x is undefined', src: 'onerror', f: 'f1' })]))]);
ok('days add together', both.views === 6 && both.visitors === 3 && both.errors.f1.n === 3 && both.pages['/'].views === 2);

/* ---------------------------------------------------------------- keeping, reading, letting go */
const store = new Map();
let NOW = Date.parse('2026-11-26T10:00:00Z');
const kv = { async get(k) { return store.has(k) ? structuredClone(store.get(k)) : null; }, async put(k, v) { store.set(k, structuredClone(v)); }, async del(k) { store.delete(k); }, async list(p) { return [...store.keys()].filter((k) => k.startsWith(p)); } };
const env = { kv, now: () => NOW };
await i.recordEvents(env, day.slice(0, 6));
await i.recordEvents(env, day.slice(6));
const ins = await i.insights(env, { days: 7 });
ok('the Studio reads today worked out from what was kept', ins.series.length === 7 && ins.series[6].views === 5 && ins.total.visitors === 2 && ins.errors[0].f === 'f1' && ins.errors[0].status === 'open');
const ref = c.newRef(NOW);
await i.recordLog(env, ref, [{ ts: NOW, lvl: 'error', msg: 'request failed', ref, route: '/api/public', status: 500 }]);
const found = await i.logByRef(env, ref);
ok('a reference leads back to that request’s log lines', found?.[0]?.route === '/api/public' && c.refTime(ref) === NOW);
ok('recent logs, warnings and errors only', (await i.recentLogs(env, { level: 'error' })).logs.length === 1 && (await i.recentLogs(env, { day: '2026-11-25' })).logs.length === 0);
await i.setErrorStatus(env, 'f1', 'fixed');
ok('an error marked fixed is shown as fixed', (await i.insights(env, { days: 1 })).errors[0].status === 'fixed');
const problems = await i.newProblems(env, e.toStored(d));
ok('alerts: a browser error seen fewer than three times waits (and a fixed one stays quiet)', problems.length === 0);
const serverDay = e.toStored(e.rollup('2026-11-26', [ev(30, 'S', { k: 'error', p: '/api/public', m: 'Store unavailable', src: 'server', f: 's1' })]));
const p1 = await i.newProblems(env, serverDay);
ok('alerts: a new error on the host is told at once', p1.length === 1 && (await i.mayAlert(env)));
await i.alerted(env, p1);
ok('… once, and not again within three hours', (await i.newProblems(env, serverDay)).length === 0 && !(await i.mayAlert(env)));
NOW = Date.parse('2027-01-10T10:00:00Z');
const r = await i.hourly(env);
ok('raw events and logs older than 30 days are let go; the day’s numbers stay', ![...store.keys()].some((k) => k.startsWith('ev/2026') || k.startsWith('log/2026')) && store.has('sum/2026-11-26') && r.pruned >= 2);

/* ---------------------------------------------------------------- kinds of source */
ok('AI assistants, search engines, social apps and other sites are told apart', e.sourceKind('chatgpt.com') === 'AI assistants' && e.sourceKind('perplexity.ai') === 'AI assistants' && e.sourceKind('google.co.in') === 'Search engines' && e.sourceKind('instagram.com') === 'Social' && e.sourceKind('example.org') === 'Other sites' && e.sourceKind('Direct') === 'Direct');
ok('… and added up by kind', JSON.stringify(e.sourceKinds({ 'chatgpt.com': 2, 'claude.ai': 1, 'google.com': 5, Direct: 3 })) === JSON.stringify({ 'AI assistants': 3, 'Search engines': 5, Direct: 3 }));

console.log(fails ? `\n${fails} failed` : '\nall ok');
process.exit(fails ? 1 : 0);
