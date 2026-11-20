import { defineConfig } from 'astro/config';

// Pages are written as plain files (connect.html, pillars/devotion.html) so the
// site works on any static host and inside the prototype preview.
export default defineConfig({
  build: { format: 'file' },
  devToolbar: { enabled: false },
  prefetch: false,
});
