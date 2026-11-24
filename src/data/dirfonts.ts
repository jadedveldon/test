/** each direction's display font for Pillars 4 to 6, kept apart so the homepage can load them without the pillars' data */
export const DIR_FONTS = {
  identity: {
    a: 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;1,9..144,300&display=swap',
    b: 'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap',
    c: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;1,400&display=swap',
  },
  divination: {
    a: 'https://fonts.googleapis.com/css2?family=Cormorant+Unicase:wght@400;500&display=swap',
    b: 'https://fonts.googleapis.com/css2?family=Tenor+Sans&display=swap',
    c: 'https://fonts.googleapis.com/css2?family=Gilda+Display&display=swap',
  },
  learning: {
    a: 'https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital@0;1&display=swap',
    b: 'https://fonts.googleapis.com/css2?family=Josefin+Slab:ital,wght@0,400;1,300&display=swap',
    c: 'https://fonts.googleapis.com/css2?family=Gotu&display=swap',
  },
} as const;
