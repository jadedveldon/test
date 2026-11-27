import gsap from 'gsap';
import { buzz, PATTERNS } from './haptics';
import { ring } from './audio';
import { say } from './words';

/**
 * Pillar 4, Identity, Intimacy & the Body (Soft prism): the signature moment.
 *   Your comfort, first: a private note for a first conversation. Nothing typed here is kept or sent.
 */

/* ------------------------------------------------ your comfort, first */

function initComfort(form: HTMLFormElement) {
  const box = form.querySelector<HTMLElement>('[data-comfort-note]')!;
  const pre = form.querySelector<HTMLElement>('[data-comfort-text]')!;
  const copy = form.querySelector<HTMLButtonElement>('[data-comfort-copy]')!;
  const make = (e: Event) => {
    e.preventDefault();
    const fd = new FormData(form);
    const name = String(fd.get('cf-name') || '').trim(), pro = String(fd.get('cf-pronouns') || '').trim();
    const avoid = String(fd.get('cf-avoid') || '').trim();
    const explore = fd.getAll('cf-explore').map(String), ways = fd.getAll('cf-way').map(String);
    const lines = ['A note for my first conversation with Sarvakali', ''];
    if (name) lines.push(pro ? say('identity.callMePronouns', { name, pronouns: pro }) : say('identity.callMe', { name }));
    else if (pro) lines.push(say('identity.pronouns', { pronouns: pro }));
    lines.push(`Pace: ${String(fd.get('cf-pace') || 'Steadily')}.`);
    if (explore.length) lines.push(`I would like to explore: ${explore.join('; ')}.`);
    if (ways.length) lines.push(`I like to work through: ${ways.join('; ')}.`);
    if (avoid) lines.push(say('identity.avoid', { avoid }));
    pre.textContent = lines.join('\n');
    box.hidden = false;
    copy.textContent = say('identity.copy', {}, 'Copy the note');
    gsap.fromTo(box, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5 });
    ring('choice'); buzz(PATTERNS.choice);
  };
  const doCopy = async () => {
    try { await navigator.clipboard.writeText(pre.textContent || ''); copy.textContent = say('identity.copied', {}, 'Copied'); } catch { copy.textContent = say('identity.selectToCopy'); }
  };
  form.addEventListener('submit', make);
  copy.addEventListener('click', doCopy);
  return () => { form.removeEventListener('submit', make); copy.removeEventListener('click', doCopy); };
}

/* ---------------------------------------------------------- page */

let cleanups: (() => void)[] = [];

export function stopIdentity() {
  cleanups.forEach((c) => c());
  cleanups = [];
}

export function startIdentity() {
  stopIdentity();
  const el = document.querySelector<HTMLFormElement>('[data-identity] [data-comfort]');
  if (el) cleanups.push(initComfort(el));
}
