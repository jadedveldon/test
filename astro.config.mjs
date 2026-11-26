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
// The Studio (src/studio, docs/studio.md) runs where the editor does (the live site). Any other build (the preview
// bundle, the checks) gets a demo of it that keeps everything in the visitor's own browser, with Connect saying so;
// STUDIO_DEMO=0 leaves the Studio out altogether.
const studioMode = editor ? 'server' : process.env.STUDIO_DEMO === '0' ? 'off' : 'demo';
process.env.PUBLIC_STUDIO = studioMode;

const { default: studio } = await import('./src/studio/integration.mjs');
const integrations = [studio({ mode: studioMode })];
let adapter;
if (editor) {
  const [{ default: react }, { default: keystatic }, { default: door }] = await Promise.all([
    import('@astrojs/react'), import('@keystatic/astro'), import('./src/editor/integration.mjs'),
  ]);
  integrations.push(react(), keystatic(), door());
  if (host === 'netlify') adapter = (await import('@astrojs/netlify')).default();
} else if (studioMode === 'demo') {
  integrations.push((await import('@astrojs/react')).default());
}

export default defineConfig({
  build: { format: 'file' },
  // Writings became Articles; the AI depth demo now lives in About's portrait
  redirects: { '/writings': '/articles', '/writings/[slug]': '/articles/[slug]', '/depth': '/about' },
  devToolbar: { enabled: false },
  prefetch: false,
  integrations,
  ...(adapter ? { adapter } : {}),
});
