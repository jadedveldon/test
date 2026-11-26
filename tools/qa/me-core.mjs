// Visitor accounts, run in memory (no browser, no server): the event log (merging two devices, deletions, clearing,
// records kept before the log), the journal lock, and the account's rules (sign-in links once only and only for
// 15 minutes, sync between devices, journal text never kept in the open, sign out everywhere, delete).
// Bundles src/me/core with esbuild, then checks it. Run: node tools/qa/me-core.mjs   (every line must read "ok")
import { build } from 'esbuild';
import { createHash, randomBytes, webcrypto } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

if (!globalThis.crypto) globalThis.crypto = webcrypto;
const dir = mkdtempSync(join(tmpdir(), 'me-core-'));
const entry = join(dir, 'entry.ts');
const root = process.cwd();
writeFileSync(entry, `
export * as ev from '${root}/src/me/core/events.ts';
export * as acc from '${root}/src/me/core/accounts.ts';
export * as cr from '${root}/src/me/core/crypto.ts';
export * as api from '${root}/src/studio/core/api.ts';
export { emptyDB } from '${root}/src/studio/core/types.ts';
`);
await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: join(dir, 'core.mjs'), logLevel: 'error', loader: { '.json': 'json' } });
const M = await import(pathToFileURL(join(dir, 'core.mjs')).href);
rmSync(dir, { recursive: true, force: true });
const { ev, acc: A, cr } = M;

let fails = 0;
const ok = (n, v, extra = '') => { if (!v) fails++; console.log(`${v ? 'ok  ' : 'FAIL'} ${n}${extra ? ' — ' + extra : ''}`); };
const rejects = async (f, status) => { try { await f(); return false; } catch (e) { return status ? e.status === status : true; } };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* ---------------------------------------------------------------- the log */

let n = 0;
const mk = (t, extra = {}, at = `2026-11-${String(10 + (n % 15)).padStart(2, '0')}T0${n % 9}:00:00.000Z`) => ({ id: `e${++n}`, at, t, ...extra });
const phone = [mk('japa', { n: 108, slug: 'om-namah-shivaya', day: '2026-11-10' }), mk('rite', { n: 1, day: '2026-11-10' }), mk('keep', { slug: 'gayatri' }), mk('journal', { text: 'first', kind: 'reflection' })];
const laptop = [phone[0], mk('fire', { n: 1, day: '2026-11-11' }), mk('session', { slug: 'kali' }), mk('japa', { n: 27, slug: 'om-namah-shivaya', day: '2026-11-11' })];
const ab = ev.merge(phone, laptop), ba = ev.merge(laptop, phone);
ok('merging two devices does not depend on the order', same(ab, ba));
ok('merging twice changes nothing', same(ev.merge(ab, ab), ab) && same(ev.merge(ab, phone), ab));
ok('an event both devices have counts once', ab.length === 7);
const d = ev.derive(ab);
ok('days and counts come from both devices', d.days['2026-11-10'].japa === 108 && d.days['2026-11-11'].fire === 1 && d.mantras['om-namah-shivaya'] === 135);
ok('practices finished and kept mantras are worked out', d.sessions.kali?.n === 1 && same(d.mine, ['gayatri']));
const del = [...ab, mk('journal-del', { ref: phone[3].id }, '2026-11-30T00:00:00.000Z'), mk('unkeep', { slug: 'gayatri' }, '2026-11-30T00:00:01.000Z')];
const d2 = ev.derive(ev.merge(phone, del));
ok('a deleted journal line stays deleted after a merge with a device that still has it', d2.journal.length === 0);
ok('a mantra let go stays let go', d2.mine.length === 0);
const cleared = ev.derive([...del, mk('keep', { slug: 'durga' }, '2026-11-30T00:00:02.000Z'), mk('clear', {}, '2026-11-30T00:00:03.000Z'), mk('diya', { n: 1, day: '2026-12-01' }, '2026-12-01T00:00:00.000Z')]);
ok('"clear my record" clears what came before it, but kept mantras stay', Object.keys(cleared.days).length === 1 && cleared.days['2026-12-01'].diya === 1 && same(cleared.mine, ['durga']) && !Object.keys(cleared.mantras).length);
ok('bad events are refused', ev.clean({ id: 'x', at: 'now', t: 'hack' }) === null && ev.clean(null) === null && ev.clean({ id: 'x'.repeat(200), at: 'a', t: 'rite' }) === null);
ok('a count is kept within bounds', ev.clean({ id: 'x', at: 'a', t: 'japa', n: 1e12 }).n === 100000 && ev.clean({ id: 'y', at: 'a', t: 'japa', n: -5 }).n === 0);

// records kept before the log
const legacy = { log: { days: { '2026-11-01': { rite: 1, japa: 216, minutes: 12 }, '2026-11-02': { fire: 2 } }, journal: [{ at: '2026-11-01T10:00:00Z', text: 'old line', kind: 'intention' }], mantras: { durga: 216 } }, mine: ['durga', 'kali-bija'], done: { kali: { n: 3, last: '2026-11-02T10:00:00Z' } } };
const L = ev.derive(ev.fromLegacy('dev1', legacy));
ok('records kept before the log lose no day or count', L.days['2026-11-01'].rite === 1 && L.days['2026-11-01'].japa === 216 && L.days['2026-11-01'].minutes === 12 && L.days['2026-11-02'].fire === 2 && L.mantras.durga === 216);
ok('… nor the journal, kept mantras (in order) or practices done', L.journal[0]?.text === 'old line' && L.journal[0].kind === 'intention' && same(L.mine, ['durga', 'kali-bija']) && L.sessions.kali.n === 3);
const two = ev.derive(ev.merge(ev.fromLegacy('dev1', legacy), ev.fromLegacy('dev2', legacy)));
ok('two devices with old records both keep theirs', two.days['2026-11-01'].japa === 432);
ok('converting the same device twice adds nothing', same(ev.merge(ev.fromLegacy('dev1', legacy), ev.fromLegacy('dev1', legacy)).length, ev.fromLegacy('dev1', legacy).length));
const st = ev.streaks({ '2026-11-24': { rite: 1 }, '2026-11-25': { japa: 9 }, '2026-11-20': { fire: 1 }, '2026-11-21': { fire: 1 }, '2026-11-22': { fire: 1 } }, '2026-11-26');
ok('streaks: up to yesterday counts, longest run found', st.streak === 2 && st.longest === 3 && st.days === 5 && st.today === false);

/* ---------------------------------------------------------------- the journal lock */

const salt = cr.newSalt();
const key = await cr.keyFrom('a long journal phrase', salt);
const box = await cr.seal(key, 'what I felt today');
ok('a journal line seals and opens with the right passphrase', (await cr.open(key, box)) === 'what I felt today' && !box.ct.includes('felt'));
const wrong = await cr.keyFrom('another phrase', salt);
ok('a wrong passphrase opens nothing', (await cr.open(wrong, box)) === null);
const check = await cr.makeCheck(key);
ok('the check word tells a right passphrase from a wrong one', (await cr.passes(key, check)) && !(await cr.passes(wrong, check)));
const again = await cr.importKey(await cr.exportKey(key));
ok('the key kept on a device still opens lines', (await cr.open(again, box)) === 'what I felt today');

/* ---------------------------------------------------------------- the account */

let NOW = Date.parse('2026-12-01T06:00:00Z');
const kvData = new Map();
const kv = {
  async get(k) { return kvData.has(k) ? structuredClone(kvData.get(k)) : null; },
  async set(k, v) { kvData.set(k, structuredClone(v)); },
  async del(k) { kvData.delete(k); },
  async swap(k, fn) { const next = fn(kvData.has(k) ? structuredClone(kvData.get(k)) : null); if (next === null) return null; kvData.set(k, structuredClone(next)); return next; },
};
const mails = [];
let db = M.emptyDB();
const env = {
  kv, now: () => NOW,
  token: () => randomBytes(24).toString('base64url'),
  sha256: async (s) => createHash('sha256').update(s).digest('hex'),
  send: async (to, m) => { mails.push({ to, ...m }); return 'sent'; },
  linkUrl: (t) => `https://example.org/me?t=${t}`,
  siteUrl: 'https://example.org', page: (p) => `/${p}`,
  studio: async () => db,
};
const tokenOf = (m) => new URL(m.text.match(/https:\/\/example\.org\/me\?t=[\w-]+/)[0]).searchParams.get('t');

ok('a sign-in needs a real address and a clear yes', (await rejects(() => A.startSignIn(env, 'not-an-email', true), 400)) && (await rejects(() => A.startSignIn(env, 'someone@example.com', false), 400)));
const r1 = await A.startSignIn(env, '  Someone@Example.com ', true);
ok('a link is emailed, and not shown on screen on the live site', mails.length === 1 && mails[0].to === 'someone@example.com' && !r1.link && /Sign in/.test(mails[0].html));
const t1 = tokenOf(mails[0]);
ok('only a hash of the link is kept', ![...kvData.keys()].some((k) => k.includes(t1)) && ![...kvData.values()].some((v) => JSON.stringify(v).includes(t1)));
const s1 = await A.redeem(env, t1);
ok('the link signs in and makes the account', s1.created && typeof s1.id === 'string' && s1.gen === 1);
ok('the link works once only', await rejects(() => A.redeem(env, t1), 410));
await A.startSignIn(env, 'someone@example.com', true);
const t2 = tokenOf(mails[1]);
NOW += 16 * 60_000;
ok('a link runs out after 15 minutes', await rejects(() => A.redeem(env, t2), 410));
await A.startSignIn(env, 'someone@example.com', true);
const s2 = await A.redeem(env, tokenOf(mails[2]));
ok('signing in again finds the same account', !s2.created && s2.id === s1.id);
ok('a made-up link is refused', await rejects(() => A.redeem(env, 'x'.repeat(30)), 410) && await rejects(() => A.redeem(env, '../../etc'), 400));

// two devices (the host loads the account afresh for every request)
const fresh = () => A.account(env, s1.id, 1);
let account = await A.account(env, s1.id, 1);
const devA = [mk('japa', { n: 108, slug: 'durga', day: '2026-12-01' }), mk('journal', { text: 'secret words', kind: 'reflection', enc: await cr.seal(key, 'secret words') })];
const noJournalYet = await A.sync(env, account, devA, 0, 0);
ok('a journal line is refused until a journal passphrase is set', same(noJournalYet.accepted, [devA[0].id]));
await A.setJournal(env, account, { salt, check });
account = await A.account(env, s1.id, 1);
const syncA = await A.sync(env, account, devA, noJournalYet.cursor, 0);
ok('once set, the sealed line is accepted', syncA.accepted.includes(devA[1].id) && syncA.cursor === 2);
const stored = JSON.stringify(kvData.get(`me-${s1.id}`));
ok('the host never keeps a journal line in the open', !stored.includes('secret words') && stored.includes(devA[1].enc.ct));
const devB = [mk('fire', { n: 1, day: '2026-12-01' })];
const syncB = await A.sync(env, await fresh(), devB, 0, 0);
ok('a second device gets the first device\'s events, not its own back', syncB.events.length === 2 && !syncB.events.some((e) => e.id === devB[0].id));
ok('… and the journal line arrives sealed, and opens with the passphrase', !syncB.events[1].text && (await cr.open(key, syncB.events[1].enc)) === 'secret words');
const syncA2 = await A.sync(env, await fresh(), [], syncA.cursor, 0);
ok('the first device then gets only what is new', syncA2.events.length === 1 && syncA2.events[0].id === devB[0].id);
const rA = ev.derive(ev.merge([...devA], syncA2.events)), rB = ev.derive(ev.merge(devB, syncB.events.map((e) => (e.t === 'journal' ? { ...e, text: 'secret words' } : e))));
ok('both devices now show the same record', same(rA.days, rB.days) && same(rA.journal.map((j) => j.text), rB.journal.map((j) => j.text)));
const resend = await A.sync(env, await fresh(), devA, syncA2.cursor, 0);
ok('sending the same events again adds nothing', resend.cursor === 3 && resend.events.length === 0);
ok('a passphrase already set elsewhere is kept', (await A.setJournal(env, account, { salt: 'other', check })).journal.salt === salt);
await A.forgetJournal(env, account);
account = await A.account(env, s1.id, 1);
const afterForget = await A.sync(env, account, [], 3, 0);
ok('letting the journal go removes the sealed lines and tells devices to read again', !account.journal && afterForget.epoch === 1 && afterForget.events.length === 2 && !afterForget.events.some((e) => e.t === 'journal'));

// a client's own space
db = M.emptyDB();
const c = { store: { async load() { return { db: structuredClone(db), tag: 'x' }; }, async save(next) { db = next; return true; } }, mailer: { name: 't', async send() { return { status: 'sent' }; } }, calendar: { name: 't', async available() { return false; }, async upsert() { return {}; }, async remove() {} }, siteUrl: 'https://example.org', now: () => NOW };
await M.api.publicCall(c, 'request', { name: 'Some One', email: 'someone@example.com', services: [], topic: 'A question', times: [new Date(NOW + 3 * 864e5).toISOString()], tz: 'Asia/Kolkata' });
await M.api.publicCall(c, 'request', { name: 'Other Person', email: 'other@example.com', services: [], topic: 'Not theirs', times: [new Date(NOW + 4 * 864e5).toISOString()], tz: 'Asia/Kolkata' });
const view = (await A.state(env, account)).client;
ok('a client sees their own conversation, with its link', view?.bookings.length === 1 && view.bookings[0].topic === 'A question' && view.bookings[0].link.startsWith('/booking?t='));
ok('… and nobody else\'s', !JSON.stringify(view).includes('Not theirs') && !JSON.stringify(view).includes('other@example.com'));
await A.startSignIn(env, 'nobody@example.com', true);
const s3 = await A.redeem(env, tokenOf(mails[mails.length - 1]));
ok('an address that is not a client sees no sessions', (await A.state(env, await A.account(env, s3.id, 1))).client === null);

// signing out and deleting
const out = await A.signOutEverywhere(env, account);
ok('"sign out everywhere" ends every earlier sign-in', out.gen === 2 && (await rejects(() => A.account(env, s1.id, 1), 401)));
const exp = A.exportData(await A.account(env, s1.id, 2));
ok('the download holds the account\'s events', exp.email === 'someone@example.com' && exp.events.length === 2);
await A.deleteAccount(env, await A.account(env, s1.id, 2));
ok('deleting the account leaves nothing of it', !kvData.has(`me-${s1.id}`) && ![...kvData.values()].some((v) => JSON.stringify(v).includes('someone@example.com')) && (await rejects(() => A.account(env, s1.id, 2), 401)));
ok('… and a Studio client record stays with Sarvakali', db.clients.some((x) => x.email === 'someone@example.com'));
const failing = { ...env, send: async () => 'saved' };
ok('with email not set up, signing in says so rather than showing a link', await rejects(() => A.startSignIn(failing, 'a@example.com', true), 503));

console.log(fails ? `\n${fails} failed` : '\nall ok');
process.exit(fails ? 1 : 0);
