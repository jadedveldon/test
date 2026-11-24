/**
 * The content editor (Keystatic), at /keystatic. Every word and list on the settled pages lives in a plain
 * file under src/content, and this file says what the editor shows for each one. What the design depends on
 * (chapter keys and their order, colours, drawings, timings, positions on a map) stays in code, so an edit
 * here can change the words but cannot break a page.
 *
 * Where edits are saved, set by PUBLIC_KEYSTATIC_STORAGE (see docs/editor.md):
 *   local   (the default) the files on this computer, for `npm run dev`
 *   cloud   Keystatic Cloud: editors sign in with their own Keystatic account; PUBLIC_KEYSTATIC_PROJECT
 *           names the project (team/project)
 *   github  editors sign in with GitHub and need write access to the repository named in
 *           PUBLIC_KEYSTATIC_REPO (owner/name)
 * Each saved edit becomes a commit, and the host rebuilds the site from it.
 */
import { collection, config, fields, singleton } from '@keystatic/core';
import { ICON_NAMES } from './src/data/icons.ts';

/* ---------------------------------------------------------------- where edits go */

const env = (import.meta.env ?? {}) as Record<string, string | undefined>;
const mode = env.PUBLIC_KEYSTATIC_STORAGE ?? 'local';
const repo = env.PUBLIC_KEYSTATIC_REPO ?? '';
const project = env.PUBLIC_KEYSTATIC_PROJECT ?? '';
const [owner, name] = repo.split('/');
const storage =
  mode === 'cloud' && project ? ({ kind: 'cloud' } as const)
  : mode === 'github' && owner && name ? ({ kind: 'github', repo: { owner, name } } as const)
  : ({ kind: 'local' } as const);

/* ---------------------------------------------------------------- small helpers */

/** one line of text */
const line = (label: string, description?: string) => fields.text({ label, description });
/** a paragraph */
const para = (label: string, description?: string) => fields.text({ label, description, multiline: true });
/** a line that must not be left empty */
const must = (label: string, description?: string) => fields.text({ label, description, validation: { isRequired: true } });
/** a list of lines; `count` fixes how many there are, where the design depends on it */
const lines = (label: string, item: string, opts: { description?: string; count?: number; min?: number } = {}) =>
  fields.array(fields.text({ label: item }), {
    label, description: opts.description, itemLabel: (p) => p.value || '(empty)',
    validation: opts.count ? { length: { min: opts.count, max: opts.count } } : opts.min ? { length: { min: opts.min } } : undefined,
  });
const LINKS = 'To make a link, write [the words](/address) or [the words](https://…).';
const SERVICE = 'The exact name of a service in the catalogue (so that Keep adds the right one).';
/** the closing invitation at the foot of a page */
const close = () => fields.object({ kicker: line('Small heading'), title: must('Heading'), lede: para('Text'), button: line('Main button') }, { label: 'The close' });

/* ---------------------------------------------------------------- the catalogue */

type Ch = [string, string][];
/** one pillar's catalogue: its categories, their subcategories and services, and where each sits on the page */
function catalogue(slug: string, label: string, chapters: Ch, icons = true) {
  const sub = {
    name: must('Subcategory'),
    chapter: fields.select({
      label: 'Shown in the chapter', description: 'Which chapter of the pillar page this subcategory appears in.',
      options: chapters.map(([value, l]) => ({ value, label: l })), defaultValue: chapters[0][0],
    }),
    ...(icons ? { icon: fields.select({ label: 'Icon', description: 'The small drawing beside the subcategory.', options: ICON_NAMES.map((v) => ({ value: v, label: v })), defaultValue: 'circle' }) } : {}),
    items: lines('Services', 'Service', { description: 'One service per line. Each can be kept in a visitor’s list and asked about.' }),
  };
  return singleton({
    label, path: `src/content/catalogue/${slug}`, format: { data: 'json' },
    schema: {
      name: must('Pillar name'),
      line: para('One line about the pillar', 'Shown under the name on the homepage and the pillar page.'),
      categories: fields.array(
        fields.object({
          name: must('Category'),
          subs: fields.array(fields.object(sub), { label: 'Subcategories', itemLabel: (p) => `${p.fields.name.value} (${p.fields.items.elements.length})` }),
        }),
        { label: 'Categories', description: 'Search and Find your path list services by category.', itemLabel: (p) => p.fields.name.value },
      ),
    },
  });
}

const CH = {
  devotion: [['vidyas', 'I · Kali and the Mahavidyas'], ['devi', 'II · The Devi and the Hindu deities'], ['greek', 'III · The Greek gods'], ['lands', 'IV · Many traditions'], ['altar', 'V · Altars and devotion'], ['spirits', 'VI · Spirits and ancestors'], ['shaman', 'VII · Shamanic work']] as Ch,
  magic: [['love', 'I · Love'], ['abundance', 'II · Abundance'], ['protection', 'III · Protection'], ['baneful', 'IV · Baneful'], ['spellcraft', 'V · Spellcraft'], ['rituals', 'VI · Rituals'], ['nature', 'VII · Nature']] as Ch,
  healing: [['energy', 'I · Energy'], ['mind', 'II · Mind'], ['shadow', 'III · Shadow'], ['journal', 'IV · Journaling']] as Ch,
  identity: [['queer', 'I · Queer-affirming work'], ['intimacy', 'II · Intimacy, trust and consent'], ['body', 'III · Coming home to the body'], ['womb', 'IV · Womb and the sacred feminine'], ['lilith', 'V · Lilith and the wild self']] as Ch,
  divination: [['readings', 'I · Readings'], ['seeing', 'II · Other ways of seeing'], ['dreams', 'III · Dreams'], ['eye', 'IV · The inner eye'], ['astral', 'V · Between worlds']] as Ch,
  learning: [['foundations', 'I · Foundations'], ['craft', 'II · Witchcraft and spellcraft'], ['tantra', 'III · Tantra, mantra and yantra'], ['deity', 'IV · Deities and devotion'], ['mentoring', 'V · Mentoring']] as Ch,
};

/** a fixed set of chapters, each with its own words (the chapters themselves cannot be added or removed here) */
const chapters = (ch: Ch, each: Record<string, ReturnType<typeof line>> | ((key: string) => Record<string, ReturnType<typeof line> | ReturnType<typeof fields.checkbox>>)) =>
  fields.object(Object.fromEntries(ch.map(([k, l]) => [k, fields.object(typeof each === 'function' ? each(k) : each, { label: l })])), { label: 'Chapters' });

/* ---------------------------------------------------------------- the pillar pages */

const devotion = singleton({
  label: 'Pillar 1 · Devotion & the Unseen', path: 'src/content/pillars/devotion', format: { data: 'json' },
  schema: {
    yantraHint: line('Hint under the yantra'),
    chapters: chapters(CH.devotion, () => ({ menu: line('Name in the list at the top'), title: must('Heading'), lede: para('Text', LINKS) })),
    mahavidyas: fields.array(
      fields.object({ name: must('Name'), deva: line('Name in Devanagari'), line: line('Line'), service: line('Service', SERVICE) }),
      { label: 'The ten Mahavidyas', description: 'Ten, set around the yantra.', itemLabel: (p) => p.fields.name.value, validation: { length: { min: 10, max: 10 } } },
    ),
    allTen: fields.object({ service: line('Service', SERVICE), label: line('Words on the button') }, { label: 'All ten together' }),
    hindu: fields.array(
      fields.object({ name: must('Name'), deva: line('Name in Devanagari'), line: line('Line'), service: line('Service', SERVICE) }),
      { label: 'The Devi and the Hindu deities', itemLabel: (p) => p.fields.name.value },
    ),
    deviAlso: fields.object({ kicker: line('Small heading'), services: lines('Services', 'Service', { description: SERVICE }) }, { label: 'Also for the Devi' }),
    tantra: fields.object({ kicker: line('Small heading'), services: lines('Services', 'Service', { description: SERVICE }) }, { label: 'Mantra, yantra and tantric devotion' }),
    greek: fields.object({
      rootsCaption: line('Caption under the four elements'),
      allLabel: line('The “all” button'),
      families: fields.object({ olympians: line('The Olympians'), chthonic: line('The underworld'), first: line('Primordials and Titans'), others: line('Others') }, { label: 'Families (the buttons)' }),
      gods: fields.array(
        fields.object({
          name: must('Name', 'Services that name this god are shown on their card.'),
          greek: line('Name in Greek'),
          family: fields.select({ label: 'Family', options: [{ value: 'olympians', label: 'The Olympians' }, { value: 'chthonic', label: 'The underworld' }, { value: 'first', label: 'Primordials and Titans' }, { value: 'others', label: 'Others' }], defaultValue: 'olympians' }),
          line: line('Line'),
          presiding: fields.checkbox({ label: 'Presiding goddess of Sarvakali’s craft', description: 'Marks the card and links it to her page in Witchcraft & Magic.' }),
        }),
        { label: 'The gods', itemLabel: (p) => p.fields.name.value },
      ),
      presidingTag: line('Tag on the presiding goddess'),
      presidingLink: line('Link to her page'),
      pantheonKicker: line('Heading over the services for the whole pantheon'),
    }, { label: 'The Greek gods' }),
    lands: fields.array(
      fields.object({ land: must('Tradition'), names: lines('Services', 'Service', { description: SERVICE }) }),
      { label: 'Goddesses and gods of many lands', itemLabel: (p) => p.fields.land.value },
    ),
    more: line('Heading over services added to a chapter that has no place of their own yet'),
    close: close(),
  },
});

const magic = singleton({
  label: 'Pillar 2 · Witchcraft & Magic', path: 'src/content/pillars/magic', format: { data: 'json' },
  schema: {
    presides: fields.object({ small: line('Small words'), name: line('Name') }, { label: 'Under the keeping of' }),
    index: fields.object({ hecate: line('Hecate'), sigil: line('Make a sigil') }, { label: 'The list of chapters' }),
    hecate: fields.object({
      kicker: line('Small heading'), name: must('Name'), greek: line('Name in Greek'),
      words: lines('Sarvakali’s words', 'Line', { description: 'A placeholder until Sarvakali writes these lines.' }),
      wordsLine: para('Under the words'),
      wordsNote: line('Note under the words'),
      supper: fields.object({
        title: line('Heading'), text: para('Text'), note: para('Note', LINKS), href: line('Source (a https:// address)'),
        linkText: line('Words on the source link'), when: line('Before the next dark moon’s date'),
        calendar: line('Calendar button'), ask: line('Ask button'),
      }, { label: 'The dark-moon supper' }),
      workKicker: line('Heading over her workings'),
      also: para('Where else she appears', LINKS),
    }, { label: 'Hecate' }),
    sigil: fields.object({
      kicker: line('Small heading'), title: must('Heading'), lede: para('Text'),
      methods: fields.object(Object.fromEntries([['wheel', 'Letter wheel'], ['monogram', 'Monogram'], ['square', 'Magic square'], ['bindrune', 'Bindrune'], ['draw', 'Draw your own']].map(([k, l]) => [k, fields.object({ name: must('Name'), how: para('How it works'), origin: para('Where it comes from') }, { label: l })])), { label: 'The five ways' }),
      note: para('Note'), placeholder: line('Hint in the box'), make: line('Make button'),
      arrange: line('“Arrange”'), line: line('On a line'), ring: line('Around a ring'), stack: line('Stacked'),
      picked: line('“Picked letter”'), turn: line('Turn'), flip: line('Flip'),
      pen: line('Add strokes by hand'), clear: line('Clear'), save: line('Save it as a picture'), hint: line('Before a sigil is made'),
    }, { label: 'Make a sigil' }),
    chapters: chapters(CH.magic, { title: must('Heading'), line: para('Text') }),
    protectionKeeper: para('Protection: Hecate’s watch', LINKS),
    banefulCare: para('Baneful: the care note', LINKS),
    wheel: fields.object({
      sabbatsLabel: line('Button: the wheel of the year'), ritusLabel: line('Button: the Indian seasons'), hint: line('Hint under the wheel'),
      sabbats: fields.object(Object.fromEntries(['samhain', 'yule', 'imbolc', 'ostara', 'beltane', 'litha', 'lughnasadh', 'mabon'].map((k) => [k, fields.object({ name: must('Name'), line: line('Line') }, { label: k[0].toUpperCase() + k.slice(1) })])), { label: 'The eight sabbats (their dates stay fixed)' }),
      ritus: fields.object(Object.fromEntries(['vasanta', 'grishma', 'varsha', 'sharad', 'hemanta', 'shishira'].map((k) => [k, fields.object({ name: must('Name'), deva: line('In Devanagari'), english: line('In English'), months: line('The two months'), line: line('Line') }, { label: k[0].toUpperCase() + k.slice(1) })])), { label: 'The six ritus (their dates stay fixed)' }),
    }, { label: 'The wheel (Rituals chapter)' }),
    close: close(),
  },
});

const healing = singleton({
  label: 'Pillar 3 · Healing & Inner Work', path: 'src/content/pillars/healing', format: { data: 'json' },
  schema: {
    chapters: chapters(CH.healing, () => ({ title: must('Heading'), line: para('Text'), care: fields.checkbox({ label: 'Show the care note in this chapter' }) })),
    care: para('The care note', 'Keep the helpline in it: 14416 becomes a tap-to-call link by itself.'),
    breath: fields.object({
      idle: line('Before a pattern starts'), begin: line('Begin button'), care: para('Care note under the breathing'),
      patterns: fields.object(Object.fromEntries(([['soft', 'Long out-breath', 2], ['box', 'Box breathing', 4], ['relax', '4-7-8', 3], ['sigh', 'Cyclic sighing', 3], ['coherent', 'Coherent breathing', 2], ['bhramari', 'Bhramari', 2], ['nadi', 'Nadi shodhana', 4]] as [string, string, number][]).map(([k, l, n]) => [k, fields.object({
        name: must('Name'), short: line('The count, in short'), about: para('About it'),
        say: lines('What the guide says at each step', 'Step', { count: n, description: `${n} steps; their timings stay fixed.` }),
      }, { label: l })])), { label: 'The breathing patterns' }),
      grounding: fields.object({ name: line('Button'), senses: lines('The five senses', 'Sense', { count: 5, description: 'From five things down to one.' }) }, { label: 'Grounding 5-4-3-2-1' }),
    }, { label: 'Breathing (the opening)' }),
    body: fields.object({
      kicker: line('Small heading'), hint: para('Hint and source note'),
      chakras: fields.object(Object.fromEntries([['sahasrara', 'Crown'], ['ajna', 'Brow'], ['vishuddha', 'Throat'], ['anahata', 'Heart'], ['manipura', 'Solar plexus'], ['svadhishthana', 'Sacral'], ['muladhara', 'Root']].map(([k, l]) => [k, fields.object({ name: must('Name'), deva: line('In Devanagari'), english: line('In English'), place: line('Where it sits'), working: line('Service', SERVICE) }, { label: l })])), { label: 'The seven chakras (their colours and places on the figure stay fixed)' }),
    }, { label: 'The body of light (Energy chapter)' }),
    mend: fields.object({ kicker: line('Small heading'), start: line('Before it is mended'), all: line('Button'), note: para('Note once it is whole') }, { label: 'Golden repair (Shadow chapter)' }),
    prompt: fields.object({ kicker: line('Small heading'), next: line('Button'), hint: line('Hint'), prompts: lines('Prompts', 'Prompt', { min: 1 }) }, { label: 'A prompt for today (Journaling chapter)' }),
    close: close(),
  },
});

const identity = singleton({
  label: 'Pillar 4 · Identity, Intimacy & the Body', path: 'src/content/pillars/identity', format: { data: 'json' },
  schema: {
    welcome: para('The welcome at the top', 'Assumes nothing about who the visitor is.'),
    support: para('Support note (first chapter)', 'Keep the helpline in it: 14416 becomes a tap-to-call link by itself.'),
    supportHref: line('Address of the directory (https://…)'),
    supportLink: line('Words on the directory link'),
    chapters: chapters(CH.identity, () => ({ title: must('Heading'), line: para('Text'), care: para('Care note (leave empty for none)'), note: para('Note (leave empty for none)', LINKS) })),
    comfort: fields.object({
      kicker: line('Small heading'),
      paceLegend: line('Question: pace'), pace: lines('Choices: pace', 'Choice', { min: 1 }),
      exploreLegend: line('Question: what to explore'), explore: lines('Choices: what to explore', 'Choice', { min: 1 }),
      waysLegend: line('Question: how to work'), ways: lines('Choices: how to work', 'Choice', { min: 1 }),
      nameLabel: line('Name field'), pronounsLabel: line('Pronouns field'), pronounsExample: line('Pronouns example'),
      avoidLabel: line('“Rather not touch” field'), make: line('Make button'), copy: line('Copy button'), hint: line('Hint'),
    }, { label: 'Your comfort, first (the opening)' }),
    close: close(),
  },
});

const divination = singleton({
  label: 'Pillar 5 · Divination & Insight', path: 'src/content/pillars/divination', format: { data: 'json' },
  schema: {
    care: para('The care note at the top'),
    rooms: fields.object({ table: line('Table pages'), mirror: line('Mirror pages') }, { label: 'The two kinds of page (in each chapter’s small heading)' }),
    chapters: chapters(CH.divination, { title: must('Heading'), line: para('Text'), note: para('Note (leave empty for none)', LINKS) }),
    mirror: fields.object({
      kicker: line('Small heading'), label: line('What a screen reader says for the mirror'), idle: line('Before it is held'), hint: para('Hint'),
      prompts: fields.array(fields.object({ symbol: must('Symbol (e.g. “a door”)'), prompt: must('Prompt (a question)') }), { label: 'Prompts to ponder', description: 'Something to ponder, never a prediction.', itemLabel: (p) => `${p.fields.symbol.value}: ${p.fields.prompt.value}`, validation: { length: { min: 2 } } }),
    }, { label: 'Prompts to ponder (the opening)' }),
    close: fields.object({ kicker: line('Small heading'), title: must('Heading'), lede: para('Text'), button: line('Main button'), card: line('Card button') }, { label: 'The close' }),
  },
});

const learning = singleton({
  label: 'Pillar 6 · Learning', path: 'src/content/pillars/learning', format: { data: 'json' },
  schema: {
    formats: fields.object({ kicker: line('Small heading'), services: lines('Ways to learn', 'Service', { description: SERVICE }) }, { label: 'Ways to learn' }),
    rooms: fields.object({ library: line('The library'), leaf: line('The palm leaf'), sky: line('The stars') }, { label: 'The three rooms (in each chapter’s small heading)' }),
    chapters: chapters(CH.learning, { title: must('Heading'), line: para('Text'), note: para('Note (leave empty for none)', LINKS) }),
    finder: fields.object({
      kicker: line('Small heading'),
      questions: fields.array(fields.object({
        question: must('Question'),
        answers: fields.array(fields.object({ label: must('Answer'), services: lines('Classes it suggests', 'Service', { description: SERVICE }) }), { label: 'Answers', itemLabel: (p) => p.fields.label.value }),
      }), { label: 'Questions', itemLabel: (p) => p.fields.question.value, validation: { length: { min: 1, max: 4 } } }),
      result: line('Heading over the classes that fit'), ask: line('Button'), more: line('Line under it', LINKS),
    }, { label: 'Find your class (the opening)' }),
    path: fields.object({
      title: must('Heading'), lede: para('Text'), note: line('Note'), begin: line('Start of the road'), end: line('End of the road'), keep: line('Keep button'),
      stations: fields.array(fields.object({
        service: must('Class', SERVICE),
        chapter: fields.select({ label: 'Chapter', options: CH.learning.map(([value, label]) => ({ value, label })), defaultValue: 'foundations' }),
        line: line('Line'),
      }), { label: 'The twelve stars', description: 'Nine along the road, then three side paths. Their places on the map stay fixed.', itemLabel: (p) => p.fields.service.value, validation: { length: { min: 12, max: 12 } } }),
    }, { label: 'Your path of study' }),
    close: close(),
  },
});

/* ---------------------------------------------------------------- the rest of the site */

const settings = singleton({
  label: 'Site settings', path: 'src/content/settings', format: { data: 'json' },
  schema: {
    url: line('The site’s address', 'For link previews, e.g. https://sarvakali.in, once there is one.'),
    analytics: fields.object({
      provider: fields.select({ label: 'Visitor counts', options: [{ value: 'none', label: 'Off' }, { value: 'cloudflare', label: 'Cloudflare Web Analytics' }, { value: 'umami', label: 'Umami' }, { value: 'plausible', label: 'Plausible' }], defaultValue: 'none' }),
      id: line('The token, website ID or domain the service gives you'),
      src: line('Umami only: the script address (https://…)'),
    }, { label: 'Visitor counts (no cookies)' }),
    words: fields.object({
      allPillars: line('Back link'), ask: line('“Ask about this”'), previous: line('Previous pillar'), next: line('Next pillar'),
      care: line('Boundaries and care'), path: line('Find your path'),
    }, { label: 'Words on every pillar page' }),
  },
});

const step = (l: string) => fields.object({ title: must('Title'), text: para('Text') }, { label: l });
const home = singleton({
  label: 'Homepage', path: 'src/content/home', format: { data: 'json' },
  schema: {
    hero: fields.object({ kicker: line('Small heading'), title: must('Name'), lede: para('Line'), primary: line('Main button'), secondary: line('Second button'), scroll: line('“Scroll”') }, { label: 'The opening' }),
    connect: fields.object({
      kicker: line('Small heading'), title: must('Heading'), lede: para('Text'), primary: line('Main button'), secondary: line('Second button'),
      steps: fields.object({ request: step('1 · Request'), confirm: step('2 · Confirm'), meet: step('3 · Meet'), pay: step('4 · Pay') }, { label: 'How it works' }),
    }, { label: 'Connect' }),
    pillars: fields.object({ explore: line('Explore button'), ask: line('Ask button'), card: line('Card button (Divination)') }, { label: 'The six pillars (their names and lines are in the Catalogue)' }),
    kind: fields.object({ kicker: line('Small heading'), title: must('Heading'), note: para('Note under the words (leave empty once the words are real)') }, { label: 'Kind words (the words themselves have their own page)' }),
    close: fields.object({ diya: line('Diya button'), kicker: line('Small heading'), title: must('Heading'), primary: line('Main button'), secondary: line('Second button'), practice: line('Link to Daily practice') }, { label: 'The close' }),
    footer: fields.object({ line: para('Line at the foot of the page') }, { label: 'Footer' }),
  },
});

const kind = singleton({
  label: 'Kind words', path: 'src/content/kind-words', format: { data: 'json' },
  schema: {
    words: fields.array(
      fields.object({ who: must('Who', 'Initials or a first name, with their permission.'), where: line('Where'), text: para('Their words') }),
      { label: 'Kind words', description: 'Share real words only with each person’s permission, with initials or a first name.', itemLabel: (p) => `${p.fields.who.value} · ${p.fields.where.value}` },
    ),
  },
});

const festivals = singleton({
  label: 'Festival days', path: 'src/content/festivals', format: { data: 'json' },
  schema: {
    festivals: fields.array(
      fields.object({
        name: must('Name'),
        kind: fields.select({ label: 'How the site dresses for it', options: [{ value: 'kalipuja', label: 'Kali Puja (the night of Kali)' }, { value: 'diwali', label: 'Diwali (lamps)' }, { value: 'navratri', label: 'Navratri (nine nights)' }, { value: 'eclipse', label: 'Eclipse' }], defaultValue: 'kalipuja' }),
        start: fields.date({ label: 'First day', validation: { isRequired: true } }),
        end: fields.date({ label: 'Last day', description: 'The same as the first day for a one-day festival.', validation: { isRequired: true } }),
        note: para('Note', 'Shown on the day. Confirm the date with Sarvakali’s own panchang.'),
      }),
      { label: 'Festival days', description: 'New and full moons are worked out from the moon itself and need no entry.', itemLabel: (p) => `${p.fields.name.value} · ${p.fields.start.value ?? ''}` },
    ),
  },
});

const cards = singleton({
  label: 'Today’s card', path: 'src/content/cards', format: { data: 'json' },
  schema: {
    cards: fields.object(
      Object.fromEntries([['lamp', 'Lamp'], ['lotus', 'Lotus'], ['sword', 'Sword'], ['garland', 'Garland'], ['eye', 'Third eye'], ['crescent', 'Crescent'], ['bell', 'Bell'], ['river', 'River'], ['serpent', 'Serpent'], ['night', 'Night'], ['dawn', 'Dawn'], ['fire', 'Fire']].map(([k, l]) => [k, fields.object({ name: must('Name'), line: para('Message') }, { label: `The ${l} card` })])),
      { label: 'The twelve cards', description: 'One a day for each visitor. The drawings stay fixed.' },
    ),
  },
});

const writings = collection({
  label: 'Writings', slugField: 'title', path: 'src/content/writings/*', entryLayout: 'content', columns: ['title', 'date'],
  format: { contentField: 'body' },
  schema: {
    title: fields.slug({ name: { label: 'Title', validation: { isRequired: true } }, slug: { label: 'Address', description: 'The end of the page’s address, e.g. who-is-kali.' } }),
    summary: para('Summary', 'One or two sentences, shown in the list of writings.'),
    date: fields.date({ label: 'Date', validation: { isRequired: true } }),
    pillar: fields.select({ label: 'Pillar', options: [['devotion', 'Devotion & the Unseen'], ['magic', 'Witchcraft & Magic'], ['healing', 'Healing & Inner Work'], ['identity', 'Identity, Intimacy & the Body'], ['divination', 'Divination & Insight'], ['learning', 'Learning']].map(([value, label]) => ({ value, label })), defaultValue: 'devotion' }),
    minutes: fields.integer({ label: 'Minutes to read', defaultValue: 4, validation: { isRequired: true, min: 1 } }),
    draft: fields.checkbox({ label: 'Draft', description: 'Still a draft for Sarvakali.', defaultValue: true }),
    body: fields.markdoc({ label: 'Text', extension: 'md' }),
  },
});

export default config({
  storage,
  ...(storage.kind === 'cloud' ? { cloud: { project } } : {}),
  ui: {
    brand: { name: 'Sarvakali' },
    navigation: {
      'The site': ['home', 'kind', 'festivals', 'cards', 'writings', 'settings'],
      'Pillar pages': ['devotion', 'magic', 'healing', 'identity', 'divination', 'learning'],
      Catalogue: ['catDevotion', 'catMagic', 'catHealing', 'catIdentity', 'catDivination', 'catLearning'],
    },
  },
  collections: { writings },
  singletons: {
    home, kind, festivals, cards, settings,
    devotion, magic, healing, identity, divination, learning,
    catDevotion: catalogue('devotion', 'Catalogue · Devotion & the Unseen', CH.devotion, false),
    catMagic: catalogue('magic', 'Catalogue · Witchcraft & Magic', CH.magic),
    catHealing: catalogue('healing', 'Catalogue · Healing & Inner Work', CH.healing),
    catIdentity: catalogue('identity', 'Catalogue · Identity, Intimacy & the Body', CH.identity),
    catDivination: catalogue('divination', 'Catalogue · Divination & Insight', CH.divination),
    catLearning: catalogue('learning', 'Catalogue · Learning', CH.learning),
  },
});
