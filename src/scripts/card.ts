import gsap from 'gsap';
import { buzz, PATTERNS } from './haptics';
import { ring } from './audio';
import type { WorldHandle as World } from './world/handle';

/**
 * Draw today's card. One card a day for each visitor: the same card all day,
 * a new one tomorrow. Names, symbols and messages are PLACEHOLDERS; the
 * institute would write its own deck.
 */

type Card = { name: string; line: string; glyph: string };

const beads = () => {
  let d = '';
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const x = 50 + Math.cos(a) * 28, y = 50 + Math.sin(a) * 28;
    d += `M${(x - 3.2).toFixed(1)} ${y.toFixed(1)} a3.2 3.2 0 1 0 6.4 0 a3.2 3.2 0 1 0 -6.4 0 `;
  }
  return d + 'M50 78 L50 90';
};

export const CARDS: Card[] = [
  { name: 'The Lamp', line: 'A small light is enough to see the next step. Tend it today.', glyph: 'M18 62 Q50 96 82 62 Z M50 58 C41 47 45 34 50 22 C55 34 59 47 50 58 Z' },
  { name: 'The Lotus', line: 'What grows from the mud is not stained by it. Let something bloom from a hard place.', glyph: 'M50 78 C30 70 25 50 31 33 C42 43 48 57 50 78 Z M50 78 C70 70 75 50 69 33 C58 43 52 57 50 78 Z M50 78 C41 60 41 40 50 20 C59 40 59 60 50 78 Z M22 80 L78 80' },
  { name: 'The Sword', line: 'Cut one thread that no longer serves you. Clean cuts heal fastest.', glyph: 'M36 76 L64 34 Q72 20 82 16 Q78 32 66 40 L40 80 Z M26 70 L44 86 M30 82 L22 90' },
  { name: 'The Garland', line: 'Every ending has taught you something. Count the lessons, not the losses.', glyph: beads() },
  { name: 'The Third Eye', line: 'Look past the first answer. The second one is truer.', glyph: 'M50 16 Q72 50 50 84 Q28 50 50 16 Z M41 50 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0' },
  { name: 'The Crescent', line: 'Something is beginning quietly. Do not rush it into the light.', glyph: 'M62 20 A31 31 0 1 0 62 80 A25 25 0 1 1 62 20 Z' },
  { name: 'The Bell', line: 'Call your attention home. Begin again exactly where you are.', glyph: 'M50 16 L50 25 M29 70 Q31 29 50 25 Q69 29 71 70 Z M22 70 L78 70 M45 77 a5 5 0 1 0 10 0' },
  { name: 'The River', line: 'Let it move. What is meant to stay will not be carried away.', glyph: 'M12 38 Q24 30 36 38 T60 38 T84 38 M12 52 Q24 44 36 52 T60 52 T84 52 M12 66 Q24 58 36 66 T60 66 T84 66' },
  { name: 'The Serpent', line: 'Old skin is falling away. Rest while the new one hardens.', glyph: 'M26 84 C72 84 74 60 50 56 C28 52 28 30 50 28 C64 27 70 22 64 14 M64 14 L70 12' },
  { name: 'The Night', line: 'In the dark nothing needs to be performed. Be still and be held.', glyph: 'M50 28 L53 47 L72 50 L53 53 L50 72 L47 53 L28 50 L47 47 Z M22 22 L24 28 L30 30 L24 32 L22 38 L20 32 L14 30 L20 28 Z M78 66 L80 71 L85 73 L80 75 L78 80 L76 75 L71 73 L76 71 Z' },
  { name: 'The Dawn', line: 'You have already come through the darkest part of the night.', glyph: 'M12 66 L88 66 M28 66 A22 22 0 0 1 72 66 M50 34 L50 24 M31 42 L25 35 M69 42 L75 35 M21 55 L13 52 M79 55 L87 52' },
  { name: 'The Fire', line: 'Offer one thing to the fire today: a fear, a habit, a word left unsaid.', glyph: 'M50 86 C30 82 27 62 37 47 C39 57 45 60 45 60 C41 45 47 30 58 16 C58 33 72 42 70 63 C69 77 60 86 50 86 Z' },
];

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function local(key: string, value?: string): string | null {
  try {
    if (value !== undefined) localStorage.setItem(key, value);
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** today's card for this visitor */
export function todaysCard() {
  let salt = local('sk-card-salt');
  if (!salt) salt = local('sk-card-salt', Math.random().toString(36).slice(2)) ?? 'x';
  return CARDS[hash(today() + salt) % CARDS.length];
}

let world: World | null = null;

function fill(dialog: HTMLElement, card: Card) {
  dialog.querySelectorAll('[data-card-name]').forEach((el) => (el.textContent = card.name));
  dialog.querySelectorAll('[data-card-line]').forEach((el) => (el.textContent = card.line));
  dialog.querySelectorAll<SVGPathElement>('[data-card-glyph]').forEach((el) => el.setAttribute('d', card.glyph));
}

function open() {
  const dialog = document.getElementById('card-dialog') as HTMLDialogElement | null;
  if (!dialog) return;
  const card = todaysCard();
  fill(dialog, card);
  const drawn = local('sk-card-day') === today();
  const inner = dialog.querySelector<HTMLElement>('.card3d-inner')!;
  gsap.set(inner, { rotateY: drawn ? 180 : 0 });
  dialog.dataset.state = drawn ? 'shown' : 'ready';
  const status = dialog.querySelector('[data-card-status]');
  if (status) status.textContent = drawn ? 'Your card for today. A new one waits for you tomorrow.' : 'Take a breath, then turn the card.';
  if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
  gsap.fromTo(dialog.querySelector('.card3d'), { y: 40, opacity: 0, rotateX: 12 }, { y: 0, opacity: 1, rotateX: 0, duration: 0.8, ease: 'expo.out' });
}

function flip(dialog: HTMLElement) {
  if (dialog.dataset.state !== 'ready') return;
  dialog.dataset.state = 'turning';
  const inner = dialog.querySelector<HTMLElement>('.card3d-inner')!;
  buzz(PATTERNS.cardFlip);
  ring('card');
  world?.flash(0.45);
  gsap.timeline({
    onComplete: () => {
      dialog.dataset.state = 'shown';
      local('sk-card-day', today());
      const status = dialog.querySelector('[data-card-status]');
      if (status) status.textContent = 'Your card for today. A new one waits for you tomorrow.';
    },
  })
    .to(inner, { y: -18, scale: 1.04, duration: 0.35, ease: 'power2.out' })
    .to(inner, { rotateY: 180, duration: 1.1, ease: 'expo.inOut' }, 0.1)
    .to(inner, { y: 0, scale: 1, duration: 0.6, ease: 'power3.out' }, 0.75);
}

/** the card as an image, for sharing */
async function cardImage(card: Card): Promise<Blob | null> {
  const c = document.createElement('canvas');
  c.width = 1080; c.height = 1350;
  const x = c.getContext('2d');
  if (!x) return null;
  const g = x.createLinearGradient(0, 0, 0, c.height);
  g.addColorStop(0, '#1a0608'); g.addColorStop(0.55, '#3a0d12'); g.addColorStop(1, '#0b0304');
  x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
  const glow = x.createRadialGradient(540, 520, 20, 540, 520, 520);
  glow.addColorStop(0, 'rgba(240,179,74,0.35)'); glow.addColorStop(1, 'rgba(240,179,74,0)');
  x.fillStyle = glow; x.fillRect(0, 0, c.width, c.height);
  x.strokeStyle = 'rgba(240,179,74,0.6)'; x.lineWidth = 3;
  x.strokeRect(54, 54, c.width - 108, c.height - 108);
  x.save();
  x.translate(540 - 190, 300); x.scale(3.8, 3.8);
  x.strokeStyle = '#f2c66b'; x.lineWidth = 1.7; x.lineJoin = 'round'; x.lineCap = 'round';
  x.stroke(new Path2D(card.glyph));
  x.restore();
  x.textAlign = 'center'; x.fillStyle = '#f6ece2';
  x.font = '400 104px "Instrument Serif", Georgia, serif';
  x.fillText(card.name, 540, 820);
  x.font = '400 40px Inter, system-ui, sans-serif'; x.fillStyle = '#d8c3b4';
  const words = card.line.split(' ');
  let line = '', y = 910;
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (x.measureText(t).width > 820) { x.fillText(line, 540, y); line = w; y += 58; } else line = t;
  }
  x.fillText(line, 540, y);
  x.font = '500 28px Inter, system-ui, sans-serif'; x.fillStyle = '#f0b34a';
  x.fillText('TODAY’S CARD  ·  SARVAKALI', 540, c.height - 110);
  return new Promise((res) => c.toBlob((b) => res(b), 'image/png'));
}

async function share(dialog: HTMLElement) {
  const status = dialog.querySelector('[data-card-status]');
  const card = todaysCard();
  const blob = await cardImage(card);
  if (!blob) return;
  const file = new File([blob], 'sarvakali-card.png', { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  try {
    if (nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], title: `${card.name} · Sarvakali`, text: card.line });
      return;
    }
  } catch {
    /* the visitor closed the share sheet, or sharing is blocked here */
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'sarvakali-card.png';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  if (status) status.textContent = 'Saved as a picture. (If nothing downloaded, this viewer blocks it; the real site allows it.)';
}

let ready = false;
export function initCard(w: World) {
  world = w;
  if (ready) return;
  ready = true;
  document.addEventListener('click', (e) => {
    const t = e.target as Element | null;
    if (t?.closest('[data-card-open]')) { e.preventDefault(); open(); return; }
    const dialog = t?.closest<HTMLDialogElement>('#card-dialog');
    if (!dialog) return;
    if (t?.closest('[data-card-flip]') || t?.closest('.card3d')) flip(dialog);
    if (t?.closest('[data-card-share]')) share(dialog);
    if (t?.closest('[data-card-close]') || t === dialog) dialog.close();
  });
  // the foil catches the light as you move across the card
  document.addEventListener('pointermove', (e) => {
    const card = (e.target as Element | null)?.closest<HTMLElement>('.card3d');
    if (!card) return;
    const r = card.getBoundingClientRect();
    const mx = (e.clientX - r.left) / r.width, my = (e.clientY - r.top) / r.height;
    card.style.setProperty('--mx', `${(mx * 100).toFixed(1)}%`);
    card.style.setProperty('--my', `${(my * 100).toFixed(1)}%`);
    card.style.setProperty('--rx', `${((0.5 - my) * 10).toFixed(2)}deg`);
    card.style.setProperty('--ry', `${((mx - 0.5) * 12).toFixed(2)}deg`);
  }, { passive: true });
}
