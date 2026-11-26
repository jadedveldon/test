/**
 * The journal's lock, in the visitor's own browser. A key is made from their journal passphrase (PBKDF2, SHA-256,
 * 310,000 rounds, with a salt kept on their account) and each journal line is sealed with it (AES-GCM) before it
 * leaves the device. The host keeps only sealed lines and a sealed check word; nobody but the visitor can open them.
 * Forgetting the passphrase means the synced journal cannot be opened again, by anyone.
 */
const ROUNDS = 310_000;
const CHECK = 'sarvakali-journal';
const enc = new TextEncoder();
const dec = new TextDecoder();
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export const newSalt = () => b64(crypto.getRandomValues(new Uint8Array(16)));

export async function keyFrom(passphrase: string, salt: string) {
  const base = await crypto.subtle.importKey('raw', enc.encode(passphrase.normalize('NFKC')), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: unb64(salt), iterations: ROUNDS, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

export async function seal(key: CryptoKey, text: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(text)));
  return { iv: b64(iv), ct: b64(ct) };
}

export async function open(key: CryptoKey, box: { iv: string; ct: string }) {
  try { return dec.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(box.iv) }, key, unb64(box.ct))); } catch { return null; }
}

/** a sealed check word: whether a passphrase is the right one is known without sending it anywhere */
export const makeCheck = (key: CryptoKey) => seal(key, CHECK);
export const passes = async (key: CryptoKey, check: { iv: string; ct: string }) => (await open(key, check)) === CHECK;

/** the key, kept on this device so the passphrase is asked once per device */
export async function exportKey(key: CryptoKey) { return b64(new Uint8Array(await crypto.subtle.exportKey('raw', key))); }
export async function importKey(raw: string) { return crypto.subtle.importKey('raw', unb64(raw), { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']); }
