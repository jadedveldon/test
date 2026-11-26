/**
 * Devanagari to the two ways the mantra library shows a text in Latin letters:
 *   iast()          the scholarly transliteration (IAST): "AUM Namaḥ Śivāya"
 *   pronunciation() a readable guide in plain letters, syllables hyphenated: "AUM na-mah shi-vaa-ya"
 * Both are worked out from the Devanagari, so a verse corrected in the content editor stays consistent; a mantra
 * file may still give its own version of either (the editor's "override" fields). ॐ is always written AUM.
 * Lines are separated by a new line in the source; dandas (। ॥) end lines and are dropped here.
 */

const VOWELS: Record<string, string> = {
  'अ': 'a', 'आ': 'ā', 'इ': 'i', 'ई': 'ī', 'उ': 'u', 'ऊ': 'ū', 'ऋ': 'ṛ', 'ॠ': 'ṝ', 'ऌ': 'ḷ', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au',
};
const SIGNS: Record<string, string> = {
  'ा': 'ā', 'ि': 'i', 'ी': 'ī', 'ु': 'u', 'ू': 'ū', 'ृ': 'ṛ', 'ॄ': 'ṝ', 'ॢ': 'ḷ', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au',
};
const CONS: Record<string, string> = {
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ṅ', 'च': 'c', 'छ': 'ch', 'ज': 'j', 'झ': 'jh', 'ञ': 'ñ',
  'ट': 'ṭ', 'ठ': 'ṭh', 'ड': 'ḍ', 'ढ': 'ḍh', 'ण': 'ṇ', 'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm', 'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'ś', 'ष': 'ṣ', 'स': 's', 'ह': 'h', 'ळ': 'ḷ',
};
const VIRAMA = '्';

type Tok = { k: 'c' | 'v' | 'm' | 'h' | 'om' | 'sep'; s: string };

/** one word of Devanagari as consonants, vowels, anusvara (m) and visarga (h) */
function tokens(word: string): Tok[] {
  const out: Tok[] = [];
  const ch = [...word.normalize('NFC')];
  for (let i = 0; i < ch.length; i++) {
    const c = ch[i];
    if (c === 'ॐ') { out.push({ k: 'om', s: 'AUM' }); continue; }
    if (VOWELS[c]) { out.push({ k: 'v', s: VOWELS[c] }); continue; }
    if (CONS[c]) {
      out.push({ k: 'c', s: CONS[c] });
      let n = ch[i + 1];
      if (n === '़') { i++; n = ch[i + 1]; }
      if (n === VIRAMA) { i++; continue; }
      if (n && SIGNS[n]) { out.push({ k: 'v', s: SIGNS[n] }); i++; continue; }
      out.push({ k: 'v', s: 'a' });
      continue;
    }
    if (c === 'ं') { out.push({ k: 'm', s: 'ṃ' }); continue; }
    if (c === 'ँ') { out.push({ k: 'm', s: 'm̐' }); continue; }
    if (c === 'ः') { out.push({ k: 'h', s: 'ḥ' }); continue; }
    if (c === 'ऽ') { out.push({ k: 'sep', s: "'" }); continue; }
    if (/[।॥|0-9०-९]/.test(c)) continue;
    // anything else (Latin letters in a mixed line, punctuation) passes through
    out.push({ k: 'sep', s: c });
  }
  return out;
}

const lines = (text: string) => text.split(/\n+/).map((l) => l.replace(/[।॥]+/g, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean);
const cap = (w: string) => (w.startsWith('AUM') ? w : w.charAt(0).toUpperCase() + w.slice(1));

/** IAST, one line per line of the text; short formulas are written in title case, verses with a capital per line */
export function iast(text: string): string {
  const ls = lines(text).map((l) => l.split(' ').map((w) => tokens(w).map((t) => t.s).join('')).filter(Boolean));
  const short = ls.length === 1 && ls[0].length <= 6;
  return ls.map((ws) => (short ? ws.map(cap) : ws.map((w, i) => (i === 0 ? cap(w) : w))).join(' ')).join('\n');
}

/* ---------------------------------------------------------------- readable pronunciation */

const READ_V: Record<string, string> = { a: 'a', 'ā': 'aa', i: 'i', 'ī': 'ee', u: 'u', 'ū': 'oo', 'ṛ': 'ri', 'ṝ': 'ree', 'ḷ': 'li', e: 'e', ai: 'ai', o: 'o', au: 'au' };
const READ_C: Record<string, string> = {
  k: 'k', kh: 'kh', g: 'g', gh: 'gh', 'ṅ': 'n', c: 'ch', ch: 'chh', j: 'j', jh: 'jh', 'ñ': 'n', 'ṭ': 't', 'ṭh': 'th', 'ḍ': 'd', 'ḍh': 'dh', 'ṇ': 'n',
  t: 't', th: 'th', d: 'd', dh: 'dh', n: 'n', p: 'p', ph: 'ph', b: 'b', bh: 'bh', m: 'm', y: 'y', r: 'r', l: 'l', v: 'v', 'ś': 'sh', 'ṣ': 'sh', s: 's', h: 'h', 'ḷ': 'l',
};

/** a word as readable syllables: "shi-vaa-ya" */
function readWord(word: string): string {
  const ts = tokens(word);
  if (ts.length === 1 && ts[0].k === 'om') return 'AUM';
  // jñ is said "gy" in most of India
  for (let i = 0; i < ts.length - 1; i++) if (ts[i].k === 'c' && ts[i].s === 'j' && ts[i + 1].k === 'c' && ts[i + 1].s === 'ñ') { ts[i] = { k: 'c', s: 'g' }; ts[i + 1] = { k: 'c', s: 'y' }; }
  const sylls: string[] = [];
  let onset: string[] = [];
  let lead = '';
  const flush = (v: string) => { sylls.push(onset.join('') + v); onset = []; };
  for (let i = 0; i < ts.length; i++) {
    const t = ts[i];
    if (t.k === 'om') { lead = 'AUM '; continue; }
    if (t.k === 'sep') continue;
    if (t.k === 'c') { onset.push(t.s === 'g' || t.s === 'y' ? t.s : READ_C[t.s] ?? t.s); continue; }
    if (t.k === 'v') {
      // of the consonants gathered before this vowel, all but the last close the syllable before (tat-pu-ru-sha)
      if (sylls.length && onset.length > 1) { sylls[sylls.length - 1] += onset.slice(0, -1).join(''); onset = onset.slice(-1); }
      flush(READ_V[t.s] ?? t.s);
      continue;
    }
    if (t.k === 'm') {
      // anusvara: "m" before p, b, m and at the end; "n" before other consonants
      const next = ts.slice(i + 1).find((x) => x.k === 'c');
      const nasal = !next || /^(p|ph|b|bh|m|y|r|l|v|ś|ṣ|s|h)$/.test(next.s) ? 'm' : 'n';
      if (sylls.length) sylls[sylls.length - 1] += nasal;
      continue;
    }
    if (t.k === 'h') { if (sylls.length) sylls[sylls.length - 1] += 'h'; continue; }
  }
  if (onset.length && sylls.length) sylls[sylls.length - 1] += onset.join('');
  else if (onset.length) sylls.push(onset.join(''));
  return lead + sylls.join('-');
}

export function pronunciation(text: string): string {
  return lines(text).map((l) => l.split(' ').map(readWord).filter(Boolean).join(' ')).join('; ');
}
