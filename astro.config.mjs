import { defineConfig } from 'astro/config';

// Pages are written as plain files (connect.html, pillars/devotion.html) so the
// site works on any static host and inside the prototype preview.
//
// The content editor (Keystatic, at /keystatic) needs a small server, so it is switched on only where one
// exists: in `npm run dev`, and on the host when EDITOR_HOST names it (netlify). Every other build, the
// preview bundle included, stays plain static files with no editor in it. See docs/editor.md.
const dev = process.argv.includes('dev');
const host = process.env.EDITOR_HOST;
const editor = dev || host === 'netlify';

const integrations = [];
let adapter;
if (editor) {
  const [{ default: react }, { default: keystatic }, { default: door }] = await Promise.all([
    import('@astrojs/react'), import('@keystatic/astro'), import('./src/editor/integration.mjs'),
  ]);
  integrations.push(react(), keystatic(), door());
  if (host === 'netlify') adapter = (await import('@astrojs/netlify')).default();
}

export default defineConfig({
  build: { format: 'file' },
  devToolbar: { enabled: false },
  prefetch: false,
  integrations,
  ...(adapter ? { adapter } : {}),
});
