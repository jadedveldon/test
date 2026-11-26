// Makes the Studio's password hash, for the host's STUDIO_PASSWORD_HASH setting (the password itself is never stored).
// Run: npm run studio:password            (asks for the password, without showing it)
//  or: node tools/studio-password.mjs 'the password'
import { randomBytes, scryptSync } from 'node:crypto';
import { createInterface } from 'node:readline';

const b64url = (b) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const hash = (pw) => {
  const salt = randomBytes(16), N = 16384, r = 8, p = 1;
  return `scrypt$${N}$${r}$${p}$${b64url(salt)}$${b64url(scryptSync(pw.normalize('NFKC'), salt, 32, { N, r, p }))}`;
};
const done = (pw) => {
  if (!pw || pw.length < 10) { console.error('Please choose a password of at least 10 characters (a few words together is good).'); process.exit(1); }
  console.log(`\nSTUDIO_PASSWORD_HASH=${hash(pw)}\n\nAdd this in Netlify: Site configuration → Environment variables, then deploy again.`);
};
if (process.argv[2]) done(process.argv[2]);
else {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  process.stdout.write('Studio password (not shown): ');
  rl._writeToOutput = () => {};
  rl.question('', (pw) => { rl.close(); done(pw); });
}
