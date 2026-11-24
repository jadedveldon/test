import type { DirChapter } from './directions';

/**
 * Pillar 4, Identity, Intimacy & the Body, in the Soft prism design (direction B, chosen).
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

/** your comfort, first: a note to bring to a first conversation; nothing is stored or sent */
export const COMFORT = {
  pace: ['Slowly, one small step at a time', 'Steadily, with room to pause', 'Ready to go deep'],
  explore: ['Who I am and how I name myself', 'Coming out, family and belonging', 'Relationships and intimacy', 'Trust, safety and consent', 'Feeling at home in my body', 'Womb and cycle work', 'Desire, anger and freedom (Lilith)', 'Spirituality and devotion'],
  ways: ['Talking it through', 'Ritual or spellwork', 'Journaling', 'Meditation and the body', 'I am not sure yet'],
};
