/**
 * The Studio in the build. `server` (npm run dev, and the host): the Studio page behind the door and the
 * sign-in, its requests (/api/studio), the public pages' requests (/api/public) and Google's way back. `demo`
 * (the preview bundle): the same Studio as static files, keeping everything in the visitor's own browser.
 * `off` (any other build): nothing; Connect then says it is a prototype. The mode reaches the code as
 * import.meta.env.PUBLIC_STUDIO.
 */
export default function studio({ mode }) {
  return {
    name: 'sarvakali-studio',
    hooks: {
      'astro:config:setup': ({ injectRoute, updateConfig }) => {
        updateConfig({ vite: { define: { 'import.meta.env.PUBLIC_STUDIO': JSON.stringify(mode) } } });
        if (mode === 'off') return;
        const at = (p) => new URL(p, import.meta.url);
        injectRoute({ pattern: '/studio', entrypoint: at('./routes/studio.astro'), prerender: mode === 'demo' });
        if (mode !== 'server') return;
        injectRoute({ pattern: '/api/studio', entrypoint: at('./routes/api.ts'), prerender: false });
        injectRoute({ pattern: '/api/studio/[step]', entrypoint: at('./routes/sign-in.ts'), prerender: false });
        injectRoute({ pattern: '/api/studio/google/[step]', entrypoint: at('./routes/google.ts'), prerender: false });
        injectRoute({ pattern: '/api/public', entrypoint: at('./routes/public.ts'), prerender: false });
        // visitor accounts (src/me): sign-in by email link, keeping a visitor's practice the same on their devices
        injectRoute({ pattern: '/api/me', entrypoint: new URL('../me/routes/api.ts', import.meta.url), prerender: false });
      },
    },
  };
}
