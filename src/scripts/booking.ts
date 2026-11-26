/**
 * The client's own booking page (/booking?t=…, the link in every email about it). It shows where things stand,
 * in their own time zone, and lets them act: choose one of the times Sarvakali offered (confirmed at once),
 * suggest others, add the conversation to their calendar, ask for another time, cancel, or withdraw a request.
 * The words are in src/content/pages/booking.json ("Bookings and emails" in the content editor).
 */
import words from '../content/pages/booking.json';
import { publicCall, pageHref } from '../studio/client';
import { googleCalendarLink, sessionIcs } from '../studio/core/ics';
import type { PublicBooking } from '../studio/core/ops';
import { whenZ, zoneLabel, zonedToUtc } from '../studio/core/time';
import { buzz, PATTERNS } from './haptics';

const W = words.booking;
const esc = (s: string) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const myTz = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata'; } catch { return 'Asia/Kolkata'; } };
const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (m, k) => v[k] ?? m);

export function initBooking() {
  const root = document.querySelector<HTMLElement>('[data-booking]');
  const body = root?.querySelector<HTMLElement>('[data-booking-body]');
  if (!root || !body) return;
  const token = new URLSearchParams(location.search).get('t') || '';
  const tz = myTz();
  let b: PublicBooking | null = null;
  let mode: 'view' | 'suggest' | 'cancel' = 'view';
  let note = '';

  const fail = (msg: string) => `<p class="bk-error" role="alert">${esc(msg)}</p>`;
  const asked = (x: PublicBooking) => (x.services.length || x.topic ? `<div class="bk-asked"><p class="kicker">${esc(W.asked)}</p>${x.services.length ? `<ul class="kept-chips bk-chips">${x.services.map((s) => `<li><span>${esc(s)}</span></li>`).join('')}</ul>` : ''}${x.topic ? `<p class="bk-quote">“${esc(x.topic)}”</p>` : ''}</div>` : '');

  const timesForm = (title: string, text: string, send: string) => `
    <form class="bk-suggest" data-suggest>
      <h2 class="display-m">${esc(title)}</h2>
      <p>${esc(text)}</p>
      <div class="times">
        ${[1, 2, 3].map((i) => `<label class="time"><span>${i === 1 ? 'First choice' : i === 2 ? 'Second choice <span class="optional">(optional)</span>' : 'Third choice <span class="optional">(optional)</span>'}</span><input type="datetime-local" name="t${i}" ${i === 1 ? 'required' : ''} /></label>`).join('')}
      </div>
      <p class="hint">${esc(fill(W.zone, { zone: zoneLabel(tz) }))}</p>
      <label class="field"><span>${esc(W.note)} <span class="optional">(optional)</span></span><textarea name="note" rows="2"></textarea></label>
      <div class="cta-row"><button type="submit" class="btn btn-solid">${esc(send)}</button><button type="button" class="btn btn-ghost" data-back>Back</button></div>
    </form>`;

  function render() {
    if (!b) return;
    const x = b;
    const zone = `<p class="hint">${esc(fill(W.zone, { zone: zoneLabel(tz, x.start || x.options[0]) }))}</p>`;
    let html = '';
    if (mode === 'suggest') {
      html = timesForm(W.suggestTitle, x.status === 'confirmed' ? W.suggestText : W.suggestText, W.suggestSend);
    } else if (mode === 'cancel') {
      html = `<form class="bk-suggest" data-cancel-form><h2 class="display-m">${esc(x.status === 'requested' && !x.previousStart ? W.withdraw : W.cancel)}</h2><p>${esc(W.cancelConfirm)}</p>
        <label class="field"><span>${esc(W.reason)}</span><textarea name="reason" rows="2"></textarea></label>
        <div class="cta-row"><button type="submit" class="btn btn-solid">${esc(x.status === 'requested' && !x.previousStart ? W.withdraw : W.cancel)}</button><button type="button" class="btn btn-ghost" data-back>Back</button></div></form>`;
    } else if (x.status === 'requested') {
      html = `<h1 class="display-l">${esc(W.requestedTitle)}</h1><p class="lede">${esc(W.requestedText)}</p>
        ${x.options.length ? `<p class="kicker">${esc(W.yourTimes)}</p><ul class="bk-times">${x.options.map((o) => `<li>${esc(whenZ(o, tz))}</li>`).join('')}</ul>${zone}` : ''}
        ${asked(x)}
        <div class="cta-row"><button type="button" class="btn btn-ghost" data-act="suggest">${esc(W.suggestTitle)}</button><button type="button" class="btn btn-ghost" data-act="cancel">${esc(x.previousStart ? W.cancel : W.withdraw)}</button></div>`;
    } else if (x.status === 'proposed') {
      html = `<h1 class="display-l">${esc(W.proposedTitle)}</h1><p class="lede">${esc(W.proposedText)}</p>
        ${x.message ? `<p class="bk-quote">“${esc(x.message)}”</p>` : ''}
        <ul class="bk-choices">${x.options.map((o) => `<li><span>${esc(whenZ(o, tz))}</span><button type="button" class="btn btn-solid btn-sm" data-accept="${esc(o)}">${esc(W.choose)}</button></li>`).join('')}</ul>
        ${zone}
        <div class="cta-row"><button type="button" class="btn btn-ghost" data-act="suggest">${esc(W.noneSuit)}</button><button type="button" class="btn btn-ghost" data-act="cancel">${esc(W.withdraw)}</button></div>
        ${asked(x)}`;
    } else if (x.status === 'confirmed' && x.start) {
      const title = `Conversation with ${x.practiceName}`;
      const pseudo = { id: x.id, start: x.start, durationMin: x.durationMin, meetUrl: x.meetUrl, history: [] } as never;
      html = `<h1 class="display-l">${esc(W.confirmedTitle)}</h1><p class="lede">${esc(W.confirmedText)}</p>
        <div class="bk-when"><p class="bk-time">${esc(whenZ(x.start, tz, { year: true }))}</p><p class="hint">${x.durationMin} minutes · Google Meet</p></div>
        ${x.meetUrl ? '' : `<p class="hint">${esc(W.linkSoon)}</p>`}
        <div class="cta-row">${x.meetUrl ? `<a class="btn btn-solid" href="${esc(x.meetUrl)}" target="_blank" rel="noopener">${esc(W.join)}</a>` : ''}
          <button type="button" class="btn btn-ghost" data-ics>${esc(W.addCalendar)}</button>
          <a class="btn btn-ghost" href="${esc(googleCalendarLink(pseudo, title, x.meetingNote))}" target="_blank" rel="noopener">${esc(W.googleCalendar)}</a></div>
        ${x.meetingNote ? `<p>${esc(x.meetingNote)}</p>` : ''}
        ${asked(x)}
        <div class="cta-row bk-change"><button type="button" class="btn btn-ghost btn-sm" data-act="suggest">${esc(W.change)}</button><button type="button" class="btn btn-ghost btn-sm" data-act="cancel">${esc(W.cancel)}</button></div>`;
    } else {
      const t = x.status === 'completed' || x.status === 'no_show' ? [W.completedTitle, W.completedText] : x.status === 'declined' ? [W.declinedTitle, W.declinedText] : [W.cancelledTitle, W.cancelledText];
      html = `<h1 class="display-l">${esc(t[0])}</h1><p class="lede">${esc(t[1])}</p>${x.reason ? `<p class="bk-quote">“${esc(x.reason)}”</p>` : ''}
        <div class="cta-row"><a class="btn btn-solid" href="${pageHref('connect')}">${esc(W.newRequest)}</a></div>`;
    }
    body!.innerHTML = (note ? `<p class="bk-done" role="status">${esc(note)}</p>` : '') + html;
    note = '';
  }

  async function act(fn: () => Promise<PublicBooking>, after: string) {
    const btns = body!.querySelectorAll<HTMLButtonElement>('button');
    btns.forEach((x) => (x.disabled = true));
    try {
      b = await fn();
      mode = 'view';
      note = after;
      buzz(PATTERNS.choice);
      render();
      body!.querySelector<HTMLElement>('h1, h2')?.focus?.();
      root!.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {
      btns.forEach((x) => (x.disabled = false));
      body!.insertAdjacentHTML('afterbegin', fail(e instanceof Error ? e.message : String(e)));
    }
  }

  body.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const a = t.closest<HTMLElement>('[data-accept]');
    if (a) { act(() => publicCall('booking.accept', { token, start: a.dataset.accept }), W.done); return; }
    const m = t.closest<HTMLElement>('[data-act]');
    if (m) { mode = m.dataset.act as typeof mode; render(); body.querySelector<HTMLElement>('input, textarea')?.focus(); return; }
    if (t.closest('[data-back]')) { mode = 'view'; render(); return; }
    if (t.closest('[data-ics]') && b?.start) {
      const text = sessionIcs({ id: b.id, start: b.start, durationMin: b.durationMin, meetUrl: b.meetUrl, history: [] } as never, { title: `Conversation with ${b.practiceName}`, description: `${b.meetingNote}\n\n${location.href}`, organiser: b.practiceName });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([text], { type: 'text/calendar' }));
      link.download = 'sarvakali.ics';
      document.body.appendChild(link); link.click();
      setTimeout(() => { URL.revokeObjectURL(link.href); link.remove(); }, 500);
    }
  });
  body.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target as HTMLFormElement;
    if (!f.reportValidity()) return;
    const data = new FormData(f);
    if (f.matches('[data-suggest]')) {
      const times = ['t1', 't2', 't3'].map((k) => String(data.get(k) || '')).filter(Boolean).map((v) => zonedToUtc(v, tz)).filter(Boolean);
      act(() => publicCall('booking.suggest', { token, times, note: String(data.get('note') || ''), tz }), W.done);
    } else if (f.matches('[data-cancel-form]')) {
      act(() => publicCall('booking.cancel', { token, reason: String(data.get('reason') || '') }), W.done);
    }
  });

  if (!token) { body.innerHTML = `<h1 class="display-l">${esc(W.kicker)}</h1><p class="lede">${esc(W.notFound)}</p><div class="cta-row"><a class="btn btn-solid" href="${pageHref('connect')}">${esc(W.newRequest)}</a></div>`; return; }
  publicCall<PublicBooking>('booking.get', { token }).then((x) => { b = x; render(); }, (e) => {
    body.innerHTML = `<h1 class="display-l">${esc(W.kicker)}</h1><p class="lede">${esc(e?.status === 404 ? W.notFound : e?.message || W.notFound)}</p><div class="cta-row"><a class="btn btn-solid" href="${pageHref('connect')}">${esc(W.newRequest)}</a></div>`;
  });
}
