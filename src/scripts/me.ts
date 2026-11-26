/**
 * My space (/me). Signed out: the sign-in form (an email and a clear yes), and, from the link in the email
 * (/me?t=…), signing this device in. Signed in: the practice record from every device, the journal lock (set a
 * passphrase, open it on a new device, or let it go), a client's own sessions and invoices, and the account
 * (download, sign out here or everywhere, delete). Words: src/content/pages/me.json.
 */
import { meCall, MeCallError } from '../me/client';
import { exportKey, keyFrom, makeCheck, newSalt, passes } from '../me/core/crypto';
import { sitePath } from '../studio/client';
import { readLog, readStore, record, resetJournalSync, stats, unmarkAll } from './practice-log';
import { meLocal, setMeLocal, soon, status, syncNow, type MeLocal } from './me-sync';
import { track } from './track';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Words = Record<string, any>;
type ClientView = {
  name: string;
  bookings: { status: string; start?: string; options: string[]; topic: string; services: string[]; link: string; clientTz: string; createdAt: string }[];
  invoices: { number: string; issueDate: string; status: string; standing: string; total: number; due: number; claimed: boolean; link: string }[];
} | null;
type State = { email: string; createdAt: string; events: number; journal: MeLocal['journal']; client: ClientView };

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const fill = (s: string, v: Record<string, string | number>) => String(s ?? '').replace(/\{(\w+)\}/g, (m, k) => (k in v ? String(v[k]) : m));
const $ = <T extends HTMLElement>(root: ParentNode, sel: string) => root.querySelector<T>(sel);

let W: Words = {};
let names: { practices: Record<string, string>; mantras: Record<string, string> } = { practices: {}, mantras: {} };
let last: State | null = null;
let offs: (() => void)[] = [];

function showError(root: HTMLElement, msg?: string) {
  const el = $(root, '[data-me-error]')!;
  el.hidden = !msg;
  el.textContent = msg ?? '';
}

function view(root: HTMLElement, which: 'out' | 'in' | 'linking') {
  ($(root, '[data-me-out]') ?? { hidden: true }).hidden = which !== 'out';
  ($(root, '[data-me-in]') ?? { hidden: true }).hidden = which !== 'in';
  $(root, '[data-me-linking]')!.hidden = which !== 'linking';
}

/* ---------------------------------------------------------------- signed out */

function initForm(root: HTMLElement) {
  const form = $<HTMLFormElement>(root, '[data-me-form]');
  const sent = $(root, '[data-me-sent]');
  if (!form || !sent) return;
  const btn = form.querySelector<HTMLButtonElement>('button[type=submit]')!;
  const label = btn.textContent ?? '';
  const onSubmit = async (e: Event) => {
    e.preventDefault();
    showError(root);
    const email = (form.elements.namedItem('email') as HTMLInputElement).value.trim();
    const consent = (form.elements.namedItem('consent') as HTMLInputElement).checked;
    btn.disabled = true;
    btn.textContent = btn.dataset.sending || label;
    try {
      const r = await meCall<{ status: string; link?: string }>('start', { email, consent });
      track('signin-link');
      form.hidden = true;
      sent.hidden = false;
      sent.innerHTML = `<p>${esc(fill(W.signIn.sent, { email }))}</p>${r.link ? `<p class="hint">${esc(W.signIn.sentDemo)}</p><p><a class="btn btn-solid btn-sm" href="${esc(r.link)}" data-me-demo-link>${esc(W.signIn.openLink)}</a></p>` : ''}<p><button type="button" class="path-back" data-me-again>${esc(W.signIn.again)}</button></p>`;
      sent.querySelector<HTMLElement>('a, button')?.focus();
    } catch (err) {
      showError(root, (err as Error).message);
    } finally {
      btn.disabled = false;
      btn.textContent = label;
    }
  };
  const onAgain = (e: Event) => {
    if (!(e.target as HTMLElement).closest('[data-me-again]')) return;
    sent.hidden = true;
    form.hidden = false;
    form.querySelector<HTMLInputElement>('input[type=email]')?.focus();
  };
  // the demo's link opens this same page: sign in without a reload
  const onDemoLink = (e: Event) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('[data-me-demo-link]');
    if (!a) return;
    e.preventDefault();
    const t = new URL(a.href, location.href).searchParams.get('t');
    if (t) void signInWith(root, t);
  };
  form.addEventListener('submit', onSubmit);
  sent.addEventListener('click', onAgain);
  sent.addEventListener('click', onDemoLink);
  offs.push(() => { form.removeEventListener('submit', onSubmit); sent.removeEventListener('click', onAgain); sent.removeEventListener('click', onDemoLink); });
}

async function signInWith(root: HTMLElement, token: string) {
  view(root, 'linking');
  showError(root);
  // the token leaves the address bar at once, so it is not kept in the history or shared by mistake
  try { history.replaceState(history.state, '', location.pathname); } catch { /* fine */ }
  try {
    const r = await meCall<{ state: State; created?: boolean }>('redeem', { t: token });
    track(r.created ? 'account-created' : 'signin');
    unmarkAll();
    setMeLocal({ email: r.state.email, cursor: 0, epoch: 0, journal: r.state.journal });
    last = r.state;
    view(root, 'in');
    renderIn(root);
    await syncNow();
    renderIn(root);
  } catch (err) {
    view(root, 'out');
    showError(root, (err as Error).message);
  }
}

/* ---------------------------------------------------------------- signed in */

const date = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const when = (iso: string, tz?: string) => {
  try { return new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: tz || undefined }); } catch { return date(iso); }
};

function renderStatus(root: HTMLElement) {
  const el = $(root, '[data-me-status]');
  if (!el) return;
  const S = W.space;
  const wait = status.waiting && !meLocal()?.key ? fill(S.waiting, { n: status.waiting }) : '';
  el.textContent = [status.now === 'syncing' ? S.syncing : status.now === 'offline' ? S.offline : status.now === 'synced' ? S.synced : '', wait].filter(Boolean).join(' · ');
  el.dataset.state = status.now;
}

function renderPractice(root: HTMLElement) {
  const el = $(root, '[data-me-practice]');
  if (!el) return;
  const S = W.space;
  const s = stats();
  const d = record();
  const sessions = Object.entries(d.sessions).sort((a, b) => b[1].last.localeCompare(a[1].last));
  const kept = d.mine;
  if (!s.days && !sessions.length && !kept.length) {
    el.innerHTML = `<p>${esc(S.none)}</p><p><a class="btn btn-ghost btn-sm" href="${esc(sitePath('/practice'))}">${esc(S.begin)}</a></p>`;
    return;
  }
  el.innerHTML = `
    <dl class="pl-stats"><div><dt>${esc(S.days)}</dt><dd>${s.days}</dd></div><div><dt>${esc(S.streak)}</dt><dd>${s.streak}</dd></div><div><dt>${esc(S.longest)}</dt><dd>${s.longest}</dd></div><div><dt>${esc(S.japa)}</dt><dd>${s.japa}</dd></div></dl>
    ${sessions.length ? `<h3 class="kicker">${esc(S.sessions)}</h3><ul class="tm-list">${sessions.slice(0, 12).map(([slug, r]) => `<li><a href="${esc(sitePath(`/practice/with/${slug}`))}"><b>${esc(names.practices[slug] ?? slug)}</b><span>${esc(date(r.last))}</span></a><span class="hint">${esc(fill(S.times, { n: r.n }))}</span></li>`).join('')}</ul>` : ''}
    ${kept.length ? `<h3 class="kicker">${esc(S.kept)}</h3><ul class="tm-list">${kept.slice(0, 24).map((slug) => `<li><a href="${esc(sitePath(`/practice/mantras/${slug}`))}"><b>${esc(names.mantras[slug] ?? slug)}</b>${d.mantras[slug] ? `<span>${esc(fill(S.times, { n: d.mantras[slug] }))}</span>` : ''}</a></li>`).join('')}</ul>` : ''}`;
}

function renderJournal(root: HTMLElement) {
  const el = $(root, '[data-me-journal]');
  if (!el) return;
  const J = W.journal;
  const me = meLocal();
  const lines = readLog().journal;
  const passField = (id: string, label: string, auto: string) => `<div class="field"><label for="${id}">${esc(label)}</label><input id="${id}" type="password" autocomplete="${auto}" minlength="8" required /></div>`;
  let body = '';
  if (!me?.journal) {
    body = `<form class="me-form" data-me-jset novalidate><h3 class="display-s">${esc(J.setTitle)}</h3><p>${esc(J.setText)}</p><p class="me-warn">${esc(J.warning)}</p>
      ${passField('me-pass', J.passphrase, 'new-password')}${passField('me-pass2', J.confirm, 'new-password')}
      <button type="submit" class="btn btn-solid btn-sm">${esc(J.set)}</button></form>`;
  } else if (!me.key) {
    body = `<form class="me-form" data-me-junlock novalidate><h3 class="display-s">${esc(J.unlockTitle)}</h3><p>${esc(J.unlockText)}</p>
      ${passField('me-pass', J.passphrase, 'current-password')}
      <button type="submit" class="btn btn-solid btn-sm" data-working="${esc(J.working)}">${esc(J.unlock)}</button>
      <p><button type="button" class="path-back" data-me-jforget>${esc(J.forget)}</button></p></form>`;
  } else {
    body = `<p class="me-ok">${esc(J.open)}</p>`;
  }
  const count = lines.length ? `<p class="hint">${esc(fill(J.count, { n: lines.length }))}</p>` : `<p class="hint">${esc(J.empty)}</p>`;
  const list = lines.filter((l) => !l.locked).slice(0, 6).map((l) => `<li><p>${esc(l.text)}</p><small>${esc(date(l.at))}</small></li>`).join('');
  el.innerHTML = `${body}${count}${list ? `<ul class="me-journal">${list}</ul>` : ''}${me?.key ? `<p><button type="button" class="path-back" data-me-jforget>${esc(J.forget)}</button></p>` : ''}`;
}

function renderClient(root: HTMLElement) {
  const box = $(root, '[data-me-client-box]');
  const el = $(root, '[data-me-client]');
  if (!box || !el) return;
  const C = W.client;
  const c = last?.client;
  if (!c) {
    el.innerHTML = `<p class="hint">${esc(C.notClient)}</p><p><a class="btn btn-ghost btn-sm" href="${esc(sitePath('/connect'))}">${esc(C.request)}</a></p>`;
    return;
  }
  const upcoming = (b: NonNullable<ClientView>['bookings'][number]) => ['requested', 'proposed', 'confirmed'].includes(b.status);
  const bk = (b: NonNullable<ClientView>['bookings'][number]) => {
    const t = b.start ?? b.options[0];
    const what = [...b.services, ...(b.topic ? [`“${b.topic}”`] : [])].join(', ');
    return `<li><a href="${esc(b.link)}"><b>${esc(t ? when(t, b.clientTz) : date(b.createdAt))}</b><span>${esc(what)}</span></a><span class="me-tag me-tag-${esc(b.status)}">${esc(C.statuses[b.status] ?? b.status)}</span></li>`;
  };
  const invStatus = (i: NonNullable<ClientView>['invoices'][number]) => {
    if (i.status === 'paid' || i.status === 'void') return C.invoiceStatuses[i.status];
    if (i.claimed) return C.invoiceStatuses.claimed;
    if (i.standing === 'overdue') return C.invoiceStatuses.overdue;
    if (i.standing === 'part') return C.invoiceStatuses.part;
    return C.invoiceStatuses.sent;
  };
  const up = c.bookings.filter(upcoming);
  const past = c.bookings.filter((b) => !upcoming(b));
  el.innerHTML = `<p>${esc(fill(C.hello, { name: c.name }))}</p>
    <h3 class="kicker">${esc(C.sessions)}</h3>
    ${c.bookings.length ? `<ul class="tm-list">${[...up, ...past].slice(0, 20).map(bk).join('')}</ul>` : `<p class="hint">${esc(C.noSessions)}</p>`}
    <h3 class="kicker">${esc(C.invoices)}</h3>
    ${c.invoices.length ? `<ul class="tm-list">${c.invoices.slice(0, 20).map((i) => `<li><a href="${esc(i.link)}"><b>${esc(i.number)}</b><span>${esc(date(`${i.issueDate}T12:00:00Z`))}</span></a><span class="me-tag">${esc(invStatus(i))}</span></li>`).join('')}</ul>` : `<p class="hint">${esc(C.noInvoices)}</p>`}
    <p><a class="btn btn-ghost btn-sm" href="${esc(sitePath('/connect'))}">${esc(C.request)}</a></p>`;
}

function renderIn(root: HTMLElement) {
  const me = meLocal();
  if (!me) return;
  $(root, '[data-me-hello]')!.textContent = fill(W.space.hello, { email: me.email });
  renderStatus(root);
  renderPractice(root);
  renderJournal(root);
  renderClient(root);
}

/* ---------------------------------------------------------------- the journal lock */

async function setPassphrase(root: HTMLElement, form: HTMLFormElement) {
  const J = W.journal;
  const a = form.querySelector<HTMLInputElement>('#me-pass')!.value;
  const b = form.querySelector<HTMLInputElement>('#me-pass2')!.value;
  if (a.length < 8) return showError(root, J.short);
  if (a !== b) return showError(root, J.mismatch);
  const salt = newSalt();
  const key = await keyFrom(a, salt);
  const r = await meCall<{ journal: NonNullable<MeLocal['journal']> }>('journal.set', { journal: { salt, check: await makeCheck(key) } });
  // another device set one first: this passphrase must be that one
  const mine = r.journal.salt === salt ? key : await keyFrom(a, r.journal.salt);
  if (r.journal.salt !== salt && !(await passes(mine, r.journal.check))) { setMeLocal({ ...meLocal()!, journal: r.journal }); renderJournal(root); return showError(root, J.wrong); }
  setMeLocal({ ...meLocal()!, journal: r.journal, key: await exportKey(mine) });
  await syncNow();
}

async function unlock(root: HTMLElement, form: HTMLFormElement) {
  const me = meLocal();
  if (!me?.journal) return;
  const btn = form.querySelector<HTMLButtonElement>('button[type=submit]')!;
  const label = btn.textContent;
  btn.disabled = true;
  btn.textContent = btn.dataset.working || label;
  try {
    const key = await keyFrom(form.querySelector<HTMLInputElement>('#me-pass')!.value, me.journal.salt);
    if (!(await passes(key, me.journal.check))) return showError(root, W.journal.wrong);
    setMeLocal({ ...me, key: await exportKey(key) });
    await syncNow();
  } finally { btn.disabled = false; btn.textContent = label; }
}

async function forget(root: HTMLElement) {
  if (!confirm(W.journal.forgetConfirm)) return;
  await meCall('journal.forget');
  resetJournalSync();
  const me = meLocal();
  if (me) { const { key: _k, ...rest } = me; setMeLocal({ ...rest, journal: null, cursor: 0 }); }
  await syncNow();
}

/* ---------------------------------------------------------------- the account */

function download(name: string, text: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

async function signedOut(root: HTMLElement, message: string) {
  setMeLocal(null);
  last = null;
  view(root, 'out');
  showError(root);
  const sent = $(root, '[data-me-sent]');
  const form = $(root, '[data-me-form]');
  if (sent && form) { form.hidden = true; sent.hidden = false; sent.innerHTML = `<p class="me-ok">${esc(message)}</p><p><button type="button" class="path-back" data-me-again>${esc(W.signIn.again)}</button></p>`; }
  $(root, '[data-me-out] h2')?.focus();
}

function initIn(root: HTMLElement) {
  const box = $(root, '[data-me-in]');
  if (!box) return;
  const A = W.account;
  const onClick = async (e: Event) => {
    const t = e.target as HTMLElement;
    showError(root);
    try {
      if (t.closest('[data-me-jforget]')) await forget(root);
      if (t.closest('[data-me-export]')) {
        const data = await meCall('export');
        download('my-sarvakali-account.json', JSON.stringify({ ...data, thisDevice: readStore().events.length }, null, 2));
      }
      if (t.closest('[data-me-signout]')) { await meCall('signout'); await signedOut(root, A.signedOut); }
      if (t.closest('[data-me-signout-all]') && confirm(A.signOutAllConfirm)) { await meCall('signoutAll'); await meCall('signout').catch(() => {}); await signedOut(root, A.signedOut); }
      if (t.closest('[data-me-delete]') && confirm(A.deleteConfirm)) { await meCall('delete'); track('account-deleted'); await meCall('signout').catch(() => {}); unmarkAll(); await signedOut(root, A.deleted); }
    } catch (err) {
      if (err instanceof MeCallError && err.signedOut) return signedOut(root, err.message);
      showError(root, (err as Error).message);
    }
  };
  const onSubmit = async (e: Event) => {
    const f = e.target as HTMLFormElement;
    if (!f.matches('[data-me-jset], [data-me-junlock]')) return;
    e.preventDefault();
    showError(root);
    try {
      if (f.matches('[data-me-jset]')) await setPassphrase(root, f);
      else await unlock(root, f);
    } catch (err) { showError(root, (err as Error).message); }
    renderJournal(root);
  };
  box.addEventListener('click', onClick);
  box.addEventListener('submit', onSubmit);
  offs.push(() => { box.removeEventListener('click', onClick); box.removeEventListener('submit', onSubmit); });
}

/* ---------------------------------------------------------------- the page */

export function initMe() {
  const root = document.querySelector<HTMLElement>('[data-me]');
  if (!root) return () => {};
  try { ({ w: W, names } = JSON.parse(root.querySelector('[data-me-words]')?.textContent || '{}')); } catch { /* the words are in the page */ }
  if (!$(root, '[data-me-out]')) return () => {};
  offs = [];
  initForm(root);
  initIn(root);
  const redraw = () => { if (meLocal() && !$(root, '[data-me-in]')!.hidden) renderIn(root); };
  const onStatus = () => {
    renderStatus(root);
    if (!meLocal() && !$(root, '[data-me-in]')!.hidden) void signedOut(root, status.error || W.errors.signedOut);
  };
  document.addEventListener('sk:practice-log', redraw);
  document.addEventListener('sk:me-status', onStatus);
  offs.push(() => { document.removeEventListener('sk:practice-log', redraw); document.removeEventListener('sk:me-status', onStatus); });

  const token = new URLSearchParams(location.search).get('t');
  if (token) void signInWith(root, token);
  else if (meLocal()) {
    view(root, 'in');
    renderIn(root);
    meCall<State>('state').then((s) => { last = s; const me = meLocal(); if (me) setMeLocal({ ...me, journal: s.journal }); renderIn(root); soon(100); })
      .catch((err) => { if (err instanceof MeCallError && err.signedOut) void signedOut(root, err.message); else { status.now = 'offline'; renderStatus(root); } });
  } else view(root, 'out');
  return () => { offs.forEach((f) => f()); offs = []; };
}
