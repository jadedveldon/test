/**
 * The door in front of the content editor. On the live site the editor's address answers "not found" to
 * anyone who has not first opened the secret door address, /door/<EDITOR_DOOR>, once on that device; behind
 * the door the editor still asks its own sign-in (Keystatic Cloud or GitHub). So a stranger finds nothing to
 * try a password on, and someone who learns the door still cannot sign in. On the live site, with no
 * EDITOR_DOOR set, the editor stays shut; in `npm run dev` on your own computer, with none set, it is open.
 * Nothing here is part of a plain static build.
 */
export default function door() {
  return {
    name: 'sarvakali-door',
    hooks: {
      'astro:config:setup': ({ addMiddleware, injectRoute }) => {
        addMiddleware({ entrypoint: new URL('./middleware.ts', import.meta.url), order: 'pre' });
        injectRoute({ pattern: '/door/[key]', entrypoint: new URL('./door.ts', import.meta.url), prerender: false });
      },
    },
  };
}
