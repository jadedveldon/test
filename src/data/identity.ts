import type { DirChapter, Direction } from './directions';
import { DIR_FONTS } from './dirfonts';

/**
 * Pillar 4, Identity, Intimacy & the Body: three directions to compare live.
 * Written to be affirming and trauma-aware: nothing is assumed about who anyone
 * is or whom they love, people choose what to share and can stop at any time,
 * and nothing here is explicit. Lines are DRAFT copy for Sarvakali. Facts and
 * sources are in the fact check on the preview cover.
 */

/** said once at the top of the page, and again where the work turns to the body */
export const WELCOME = 'Nothing is assumed here about who you are, how you name yourself or whom you love. You choose what to share and when, and you can pause or stop at any time.';
export const SUPPORT = 'If you would like queer-affirmative mental-health support as well, the Mariwala Health Initiative keeps a directory of affirmative counsellors across India, and Tele-MANAS is free on 14416, day and night.';
export const SUPPORT_HREF = 'https://mhi.org.in/qacp/';

export const CHAPTERS: DirChapter[] = [
  {
    key: 'queer', title: 'Queer-affirming work',
    line: 'Exploring who you are and whom you love, coming out and belonging, queer relationships, and queer spirituality and devotion, at your own pace.',
    subs: ['Identity & Self-Acceptance', 'Coming Out, Family & Belonging', 'Queer Relationships & Intimacy', 'Queer Inner Work & Empowerment', 'Queer Spirituality & Devotion'],
  },
  {
    key: 'intimacy', title: 'Intimacy, trust and consent',
    line: 'Understanding what makes closeness hard, and rebuilding safety, trust, consent and the words to ask for what you need.',
    subs: ['Intimacy & Vulnerability', 'Trust, Safety & Consent'],
    care: 'This chapter speaks about intimacy and the body. Take it at your own pace; you never have to share more than feels right.',
  },
  {
    key: 'body', title: 'Coming home to the body',
    line: 'Rituals and gentle work to return to your body, accept it, and know it as yours.',
    care: 'Some of this work touches on harm done to the body. It goes at your pace, and it is spiritual work, not a replacement for trauma therapy. If you are carrying something heavy, Tele-MANAS is free on 14416, day and night.',
    subs: ['Body Reconnection & Self-Acceptance'],
  },
  {
    key: 'womb', title: 'Womb and the sacred feminine',
    line: 'Womb healing, cycle reflection and the sacred feminine, for anyone who feels called to this work.',
    subs: ['Womb & Sacred Feminine'],
  },
  {
    key: 'lilith', title: 'Lilith and the wild self',
    line: 'Reclaiming desire, anger and freedom with Lilith, the one who would not be made smaller.',
    subs: ['Lilith & Sexual Energy'],
    note: 'In medieval Jewish folklore Lilith is Adam’s first wife, who would not submit and left Eden. In the 1970s feminists reclaimed her as a figure of freedom.',
  },
];

export const SUB_ICON: Record<string, string> = {
  'Identity & Self-Acceptance': 'mirror',
  'Coming Out, Family & Belonging': 'house',
  'Queer Relationships & Intimacy': 'rings',
  'Queer Inner Work & Empowerment': 'sparkle',
  'Queer Spirituality & Devotion': 'lotus',
  'Intimacy & Vulnerability': 'heart',
  'Trust, Safety & Consent': 'shield',
  'Body Reconnection & Self-Acceptance': 'aura',
  'Womb & Sacred Feminine': 'crescent',
  'Lilith & Sexual Energy': 'fire',
};

/* ---- signatures ---- */

/** A · Ardhanarishvara, as a line from one half to the other (verified: Wikipedia, Ardhanarishvara) */
export const ARDHANARI = 'Ardhanarishvara, half Shiva and half Parvati in one body, is found in Shiva temples across India.';

/** B · a comfort note to bring to a first conversation; nothing is stored or sent */
export const COMFORT = {
  pace: ['Slowly, one small step at a time', 'Steadily, with room to pause', 'Ready to go deep'],
  explore: ['Who I am and how I name myself', 'Coming out, family and belonging', 'Relationships and intimacy', 'Trust, safety and consent', 'Feeling at home in my body', 'Womb and cycle work', 'Desire, anger and freedom (Lilith)', 'Spirituality and devotion'],
  ways: ['Talking it through', 'Ritual or spellwork', 'Journaling', 'Meditation and the body', 'I am not sure yet'],
};

/** C · return to the body: a gentle scan, top to bottom; every step can be skipped */
export const BODY_SCAN = [
  { at: 'head', say: 'Notice your face and jaw. If they want to soften, let them.' },
  { at: 'shoulders', say: 'Notice your shoulders. They can drop a little, or stay as they are.' },
  { at: 'chest', say: 'Notice your breath moving in your chest. No need to change it.' },
  { at: 'belly', say: 'Notice your belly. Let it be as it is.' },
  { at: 'hips', say: 'Notice where you are sitting or standing. Feel what holds you up.' },
  { at: 'legs', say: 'Notice your legs, from the hips to the knees.' },
  { at: 'feet', say: 'Notice your feet and the ground beneath them. You are here.' },
];

export const DIRECTIONS: Direction[] = [
  {
    key: 'a', name: 'Two halves, one whole',
    essence: 'After Ardhanarishvara: dusk indigo and saffron meeting in a seam of gold. Every point between them, and beyond them, is whole.',
    feeling: ['dignified', 'warm', 'whole', 'Indian'],
    palette: [
      { name: 'Dusk indigo', hex: '#17163f' }, { name: 'Night violet', hex: '#2c1f57' }, { name: 'Saffron', hex: '#e48b3c' },
      { name: 'Vermilion', hex: '#c9472f' }, { name: 'Gold seam', hex: '#e6c06a' }, { name: 'Moon', hex: '#efe9f7' },
    ],
    type: { display: 'Fraunces', note: 'a soft, warm serif', family: '"Fraunces", Georgia, serif', fontHref: DIR_FONTS.identity.a },
    worlds: 'A circle of two halves (a crescent and a sun), a rose, a figure of light, the moon’s faces, a fire.',
    layout: 'Each chapter opens across a split field, indigo to saffron; cards edged in gold.',
    signature: { name: 'Every point on the line', how: 'Drag along the line between the moon and the sun; the circle takes on every blend between them. A line on Ardhanarishvara.' },
    sound: 'A soft drone and a bell.',
    imagery: 'Temple stone and textile in two colours; hands, joined.',
    voice: 'Warm and dignified: you are already whole.',
  },
  {
    key: 'b', name: 'Soft prism',
    essence: 'A bright, gentle page where light breaks into every colour: cream with blush, peach, butter, mint, sky and lilac. Inclusive without shouting.',
    feeling: ['light', 'kind', 'open', 'safe'],
    palette: [
      { name: 'Cream', hex: '#fbf6f0' }, { name: 'Blush', hex: '#f2b8c6' }, { name: 'Peach', hex: '#f6c89f' },
      { name: 'Mint', hex: '#bfe3cf' }, { name: 'Sky', hex: '#b9d3f2' }, { name: 'Lilac', hex: '#cdb8ea' },
    ],
    type: { display: 'DM Serif Display', note: 'friendly, round letters', family: '"DM Serif Display", Georgia, serif', fontHref: DIR_FONTS.identity.b },
    worlds: 'Ink-light on cream: a prism and its fan of colours, a rose, a figure, the moon’s faces.',
    layout: 'Soft rounded cards with a thin band of colour; plenty of white space.',
    signature: { name: 'Your comfort, first', how: 'Choose your pace, what you would like to explore and how you like to work; add a name and pronouns if you wish. It becomes a private note to bring to your first conversation. Nothing is saved or sent.' },
    sound: 'A gentle chime.',
    imagery: 'Soft daylight portraits, chosen with and by the community; never stock clichés.',
    voice: 'Friendly and plain: you set the pace.',
  },
  {
    key: 'c', name: 'Night rose',
    essence: 'Lilith’s garden at night: deep plum, rose and moonlight. Sensual but never explicit; strong and tender at once.',
    feeling: ['intimate', 'strong', 'tender', 'free'],
    palette: [
      { name: 'Night plum', hex: '#14080f' }, { name: 'Plum', hex: '#3a1430' }, { name: 'Rose', hex: '#d77a92' },
      { name: 'Rose gold', hex: '#c99a7a' }, { name: 'Moonlight', hex: '#f2e6ea' }, { name: 'Ember', hex: '#b8452e' },
    ],
    type: { display: 'Playfair Display', note: 'high-contrast italics', family: '"Playfair Display", Georgia, serif', fontHref: DIR_FONTS.identity.c },
    worlds: 'A rose opening, a figure of light, the moon’s faces, a fire, a halo.',
    layout: 'Dark, close and quiet; text set narrow; petals of light between chapters.',
    signature: { name: 'Return to the body', how: 'A slow, gentle scan from head to feet: a soft light moves down an abstract figure with one quiet line at each place. Pause or stop whenever you like.' },
    sound: 'A low hum and slow breath.',
    imagery: 'Night flowers, silk, candlelight on skin (never explicit).',
    voice: 'Low and tender: your body is yours.',
  },
];
