/**
 * The looks an article can take, chosen per article in the content editor ("Theme"). Each is one of the site's own
 * page worlds: its colours and form of light (a world preset, src/scripts/world/presets.ts), its accent and its
 * lettering for headings. "pillar" follows the article's pillar; "reading" is the quiet parchment of the Articles page.
 * What the design depends on stays here in code; the names shown in the editor are in keystatic.config.ts.
 */
import { ACCENT } from './site';

export const ARTICLE_THEMES = ['reading', 'pillar', 'devotion', 'magic', 'healing', 'identity', 'divination', 'learning', 'practice', 'care'] as const;
export type ArticleTheme = (typeof ARTICLE_THEMES)[number];

const MAGIC_FONT = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600&family=IM+Fell+English:ital@0;1&display=swap';
const HEALING_FONT = 'https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,300;1,300&display=swap';
const IDENTITY_FONT = 'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap';
const DIVINATION_FONT = 'https://fonts.googleapis.com/css2?family=Cormorant+Unicase:wght@400;500&family=Tenor+Sans&display=swap';
const LEARNING_FONT = 'https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital@0;1&family=Gotu&family=Josefin+Slab:ital,wght@0,400;0,600;1,300&display=swap';

type Look = { world: string; accent: string; font?: string; fontCss?: string };
const PILLAR_LOOK: Record<string, Look> = {
  devotion: { world: 'devC_home', accent: ACCENT.devotion, font: '"Cormorant Garamond", Georgia, serif' },
  magic: { world: 'magG_home', accent: ACCENT.magic, font: '"IM Fell English", Georgia, serif', fontCss: MAGIC_FONT },
  healing: { world: 'heal_home', accent: ACCENT.healing, font: '"Spectral", Georgia, serif', fontCss: HEALING_FONT },
  identity: { world: 'id_home', accent: ACCENT.identity, font: '"DM Serif Display", Georgia, serif', fontCss: IDENTITY_FONT },
  divination: { world: 'div_home', accent: ACCENT.divination, font: '"Cormorant Unicase", Georgia, serif', fontCss: DIVINATION_FONT },
  learning: { world: 'lrn_home', accent: ACCENT.learning, font: '"Libre Baskerville", Georgia, serif', fontCss: LEARNING_FONT },
};

/** the look of one article: an unknown theme (a later rename in the editor) falls back to the reading look */
export function articleLook(theme: string | undefined, pillar: string): Look {
  const accent = ACCENT[pillar] ?? ACCENT.devotion;
  if (theme === 'pillar') return PILLAR_LOOK[pillar] ?? { world: 'reading', accent };
  if (theme && PILLAR_LOOK[theme]) return PILLAR_LOOK[theme];
  if (theme === 'practice') return { world: 'practice', accent };
  if (theme === 'care') return { world: 'care', accent };
  return { world: 'reading', accent };
}
