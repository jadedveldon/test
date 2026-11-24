// The content files, read the way the content editor reads them (src/content, against keystatic.config.ts):
// every file opens in the editor, every required line is filled, every fixed-length list has its length, every
// choice is one the editor offers. A file the editor could not open would leave Sarvakali unable to edit it.
// Run with: node --experimental-strip-types tools/qa/content.mjs   (seconds; no build or server needed)
import { createReader } from '@keystatic/core/reader';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const { default: config } = await import(path.join(ROOT, 'keystatic.config.ts'));
const reader = createReader(ROOT, config);
let failed = 0;
const ok = (name, good, extra = '') => { if (!good) failed++; console.log(`${good ? 'ok  ' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`); };

for (const key of Object.keys(config.singletons)) {
  try {
    const v = await reader.singletons[key].read();
    ok(`editor opens ${config.singletons[key].label}`, v !== null, v === null ? 'file missing' : '');
  } catch (e) { ok(`editor opens ${config.singletons[key].label}`, false, String(e.message || e).split('\n').slice(0, 3).join(' ')); }
}
for (const key of Object.keys(config.collections)) {
  try {
    const all = await reader.collections[key].all();
    ok(`editor opens every entry in ${config.collections[key].label}`, all.length > 0, `${all.length} entries`);
  } catch (e) { ok(`editor opens every entry in ${config.collections[key].label}`, false, String(e.message || e).split('\n').slice(0, 3).join(' ')); }
}
console.log(`ERRORS: ${failed ? `${failed} file(s) the editor cannot open` : 'none'}`);
process.exitCode = failed ? 1 : 0;
