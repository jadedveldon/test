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
import uiWords from './src/content/pages/ui.json' with { type: 'json' };

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
      ask: line('“Ask about this”'), previous: line('Previous pillar'), next: line('Next pillar'),
      care: line('Boundaries and care'), path: line('Find your path'),
      keep: line('“Keep” (a button)'), keepLabel: line('For screen readers: “Keep {name} in your list”'), request: line('“Request a conversation”'),
      otherPillars: line('For screen readers: “Other pillars”'), chapters: line('For screen readers: “The chapters”'), inThisPillar: line('For screen readers: “In this pillar”'),
      skipIntro: line('“Skip intro” (the opening)'), opening: line('For screen readers: the opening animation'), howItWorks: line('For screen readers: “How it works”'),
      loading: line('Shown until a date is worked out'), turnYantra: line('For screen readers: “Turn the yantra”'), familyOfGods: line('For screen readers: the families of gods'),
      bookChapters: line('For screen readers: Witchcraft & Magic’s chapters'), sigilWays: line('For screen readers: ways of making a sigil'), yourSigil: line('For screen readers: “Your sigil”'),
      yourIntention: line('For screen readers: “Your intention”'), arrangeMonogram: line('For screen readers: “Arrange the monogram”'), whichWheel: line('For screen readers: “Which wheel”'),
      turnWheel: line('For screen readers: “Turn the wheel”'), fourChapters: line('For screen readers: Healing’s chapters'), breathPatterns: line('For screen readers: “Breathing patterns”'),
      honeypot: line('Hidden trap field for robots (people never see it)'), prototypeNote: para('Note on Connect while the site has no Studio behind it'),
      aboutPlaceholder: para('Note on About while it has placeholder lines (empty it when About is final)'), searchLinkTitle: line('Name of the search index (not shown)'),
    }, { label: 'Words used across the site (buttons, notes, and names read by screen readers)' }),
    pages: fields.object({ home: fields.object({ title: line('Title (browser tab and search results)'), description: para('Line for search results and link previews') }, { label: 'The homepage' }), about: fields.object({ title: line('Title (browser tab and search results)'), description: para('Line for search results and link previews') }, { label: 'About' }), connect: fields.object({ title: line('Title (browser tab and search results)'), description: para('Line for search results and link previews') }, { label: 'Connect' }), path: fields.object({ title: line('Title (browser tab and search results)'), description: para('Line for search results and link previews') }, { label: 'Find your path' }), practice: fields.object({ title: line('Title (browser tab and search results)'), description: para('Line for search results and link previews') }, { label: 'Daily practice' }), terms: fields.object({ title: line('Title (browser tab and search results)'), description: para('Line for search results and link previews') }, { label: 'Terms (empty: its opening line)' }), invoice: fields.object({ title: line('Title (browser tab and search results)'), description: para('Line for search results and link previews') }, { label: 'An invoice' }), booking: fields.object({ title: line('Title (browser tab and search results)'), description: para('Line for search results and link previews') }, { label: 'A booking' }), notFound: fields.object({ title: line('Title (browser tab and search results)'), description: para('Line for search results and link previews') }, { label: 'Page not found' }) }, { label: 'Pages for search engines: titles and lines' }),
    crumbs: fields.object({
      label: line('For screen readers: what the trail is'), home: line('Home'), practice: line('Daily practice'), library: line('Mantra library'), week: line('The seven days'), articles: line('Articles'), pillars: line('The six pillars'),
    }, { label: 'The trail at the top of inner pages (breadcrumbs)' }),
    footer: fields.object({
      line: para('The line under the name'), count: line('“{services} services across {pillars} pillars”'),
      groups: fields.array(fields.object({
        title: line('Heading'),
        links: fields.array(fields.object({ label: line('Words'), href: line('Address (e.g. /practice)') }), { label: 'Links', itemLabel: (p) => p.fields.label.value || 'A link' }),
      }), { label: 'Groups of links', itemLabel: (p) => p.fields.title.value || 'A group' }),
      pillars: line('Heading over the six pillars'), help: para('Help line (Tele-MANAS, tap to call)'), top: line('“Back to the top”'), rights: line('“© {year} Sarvakali”'), label: line('For screen readers: what the footer is'),
    }, { label: 'The foot of every page' }),
  },
});

const step = (l: string) => fields.object({ title: must('Title'), text: para('Text') }, { label: l });
const home = singleton({
  label: 'Homepage', path: 'src/content/home', format: { data: 'json' },
  schema: {
    hero: fields.object({ kicker: line('Small heading'), title: must('Name'), lede: para('Line'), primary: line('Main button'), secondary: line('Second button'), scroll: line('“Scroll”') }, { label: 'The opening' }),
    connect: fields.object({
      kicker: line('Small heading'), title: must('Heading'), lede: para('Text'), primary: line('Main button'), secondary: line('Second button'),
      steps: fields.object({ request: step('1 · Request'), confirm: step('2 · Confirm'), meet: step('3 · Meet'), pay: step('4 · Pay') }, { label: 'How it works (also shown on Connect)' }),
    }, { label: 'Connect' }),
    pillars: fields.object({ explore: line('Explore button'), ask: line('Ask button') }, { label: 'The six pillars (their names and lines are in the Catalogue)' }),
    line: fields.object({
      kicker: line('Small heading'), title: must('Heading'), lede: para('Text'), bead: line('The bead button'), progress: line('“{n} of 9”'),
      done: para('When the nine are said'), more: line('“More for {day}”'), library: line('Link to the library'), again: line('“Once more”'), meaningLabel: line('“What it means”'),
    }, { label: 'Today’s line (the lines come from the library: short, open to all, kept on today or any day)' }),
    kind: fields.object({ kicker: line('Small heading'), title: must('Heading'), note: para('Note under the words (leave empty once the words are real)') }, { label: 'Kind words (the words themselves have their own page)' }),
    close: fields.object({ diya: line('Diya button'), kicker: line('Small heading'), title: must('Heading'), primary: line('Main button'), secondary: line('Second button'), practice: line('Link to Daily practice') }, { label: 'The close' }),
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

/* ---------------------------------------------------------------- the pages around the pillars */

const connect = singleton({
  label: 'Connect', path: 'src/content/pages/connect', format: { data: 'json' },
  schema: {
    kicker: line('Small heading'), title: must('Heading'), lede: para('Text'),
    next: line('Heading over “what happens next”', 'The four steps themselves are the homepage’s How it works.'),
    assurance: para('Reassurance under the steps', LINKS),
    form: fields.object({
      name: line('Name field'), email: line('Email field'), emailHint: line('Under the email field'), phone: line('Phone field'), optional: line('“(optional)”'),
      kept: line('Heading over the kept services'), keptHint: line('Under the kept services'),
      topic: line('Topic box'), topicExample: line('Example in the topic box'),
      times: line('Heading over the times'), first: line('First choice'), second: line('Second choice'), third: line('Third choice'),
      timesHint: line('Under the times heading', 'Keep {zone}: the visitor’s time zone goes there.'),
      privacy: para('Privacy note'), send: line('Send button'),
    }, { label: 'The form' }),
    preview: para('Note in the preview only'),
    done: fields.object({ title: must('Heading'), text: para('Text'), back: line('Back button') }, { label: 'After sending' }),
  },
});

/** the six pillars, each with one line (the design depends on there being these six) */
const perPillar = (label: string, field: (l: string) => ReturnType<typeof line> = line) => fields.object({
  devotion: field('Devotion & the Unseen'), magic: field('Witchcraft & Magic'), healing: field('Healing & Inner Work'),
  identity: field('Identity, Intimacy & the Body'), divination: field('Divination & Insight'), learning: field('Learning'),
}, { label });

const path = singleton({
  label: 'Find your path', path: 'src/content/pages/path', format: { data: 'json' },
  schema: {
    kicker: line('Small heading'), title: must('Heading'), lede: para('Text'),
    steps: lines('The three steps’ names (by the crossroads)', 'Step', { count: 3 }),
    q1: must('First question'), q1Hint: line('Under the first question'),
    wants: perPillar('The answers to the first question, one per pillar'),
    q2: must('Second question'), q2Hint: line('Under the second question'),
    q3: must('Third question'),
    begin: fields.object({
      talk: fields.object({ title: line('Answer'), sub: line('Under it') }, { label: 'A first conversation' }),
      session: fields.object({ title: line('Answer'), sub: line('Under it') }, { label: 'A session or reading' }),
      self: fields.object({ title: line('Answer'), sub: line('Under it') }, { label: 'Something on my own first' }),
      learn: fields.object({ title: line('Answer'), sub: line('Under it') }, { label: 'A class or mentoring' }),
    }, { label: 'The answers to the third question' }),
    resultKicker: line('Over the result'), partOf: line('“Part of {pillar}”', 'Keep {pillar} where the pillar’s name goes.'),
    resultText: fields.object({ talk: para('A first conversation'), session: para('A session or reading'), self: para('On my own first'), learn: para('A class or mentoring') }, { label: 'The result’s words, for each way to begin' }),
    suggest: line('Heading over the kinds of work'), keepHint: line('Under it'), keepAll: line('“Keep all”'),
    tryNow: line('“Try it now”'), practice: line('Link to daily practice'), read: line('Over the article to read'),
    ask: line('Ask button'), explore: line('“See everything in {pillar}”'), restart: line('Start again'), back: line('Back'), share: line('Copy the link'), copied: line('After copying'),
    care: para('The care note (Healing; Identity)', 'Shown first. 14416 becomes a tap-to-call link by itself.'),
    moments: fields.object({
      devotion: fields.object({ title: line('Title'), text: line('Line') }, { label: 'Devotion: the Mahavidyas' }),
      magic: fields.object({ title: line('Title'), text: line('Line') }, { label: 'Magic: the sigil maker' }),
      healing: fields.object({ title: line('Title'), text: line('Line') }, { label: 'Healing: the breathing guide' }),
      identity: fields.object({ title: line('Title'), text: line('Line') }, { label: 'Identity: the comfort note' }),
      divination: fields.object({ title: line('Title'), text: line('Line') }, { label: 'Divination: the black mirror' }),
      learning: fields.object({ title: line('Title'), text: line('Line') }, { label: 'Learning: the class finder' }),
    }, { label: 'Each pillar’s moment to try' }),
  },
});

const practice = singleton({
  label: 'Daily practice: the page', path: 'src/content/pages/practice', format: { data: 'json' },
  schema: {
    kicker: line('Small heading'), title: must('Heading'), lede: para('Text'), card: line('Card button'),
    doors: fields.array(fields.object({ key: fields.select({ label: 'Leads to', options: [{ value: 'today', label: 'Today’s practice' }, { value: 'deities', label: 'The deities' }, { value: 'feelings', label: 'The feelings' }, { value: 'open', label: 'Without a deity' }], defaultValue: 'today' }), title: line('Title'), text: para('Text') }), { label: 'The four ways in', itemLabel: (p) => p.fields.title.value, validation: { length: { min: 4, max: 4 } } }),
    hub: fields.object({
      todayKicker: line('Today: small heading'), otherDay: line('“Or another day”'),
      deitiesKicker: line('Deities: small heading'), deitiesTitle: line('Deities: heading'), deitiesLede: para('Deities: text'),
      openKicker: line('Without a deity: small heading'), openTitle: line('Without a deity: heading'), openLede: para('Without a deity: text'),
      feelingsKicker: line('Feelings: small heading'), feelingsTitle: line('Feelings: heading'), feelingsLede: para('Feelings: text'),
      yoursKicker: line('Yours: small heading'), yoursTitle: line('Yours: heading'), doneTitle: line('Practices done'), doneNone: para('None yet'), doneTimes: line('“{n}×”'),
      deeperKicker: line('Going deeper: small heading'), deeperTitle: line('Going deeper: heading'),
      deeper: fields.array(fields.object({ title: line('Title'), text: para('Text'), href: line('Address') }), { label: 'Going deeper', itemLabel: (p) => p.fields.title.value }),
      minutes: line('“About {n} minutes”'), done: line('“Done {n}×”'),
    }, { label: 'The page’s sections' }),
    session: fields.object({
      metaTitle: line('A practice’s title in the browser tab', '{title}'), metaDescription: line('A practice’s line for search results', '{line}, {n} minutes'), withDeity: line('“With a deity”'), forFeeling: line('“For how you feel”'), open: line('“Open to all” (no deity)'), plan: line('“What you will do · about {n} minutes”'), offering: line('Offering'), begin: line('Begin'), ask: line('Ask Sarvakali'), drafted: line('Drafted note'),
      steps: line('Steps'), breatheIn: line('Breathe in'), breatheOut: line('Breathe out'), light: line('Light the lamp'), lit: line('The lamp is lit'), lineByLine: line('Line by line'),
      howMany: line('How many times'), once: line('Once'), bead: line('Next repetition'), reflectHint: line('Reflection hint'), keepJournal: line('Keep in journal'),
      offerLabel: line('Offering field'), offer: line('Offer button'), next: line('Next'), back: line('Back'), finish: line('Finish'),
      doneTitle: line('Done: heading'), nextTime: line('Next time'), minutes: line('“About {n} minutes”'), home: line('Back'), again: line('Again'), streak: line('“{n} days in a row”'), first: para('First day'),
    }, { label: 'A guided practice: its words' }),
    tools: fields.object({
      meta: fields.object({ title: line('Title in the browser tab and search results'), description: para('Line for search results and link previews') }, { label: 'For search engines' }),
      kicker: line('Small heading'), title: line('Heading'), lede: para('Text'),
      jump: lines('Links to the parts, in order: mala, fire, diya, moons, reminders', 'Link'),
      mala: fields.object({ kicker: line('Small heading'), title: line('Heading'), lede: para('Text'), mantra: line('Mantra (Devanagari)'), mantraNote: line('Mantra (Roman letters)'), next: line('“Next bead”'), reset: line('“Start the round again”'), label: line('For screen readers: the mala'), of: line('“of 108”') }, { label: 'The mala' }),
      fire: fields.object({ kicker: line('Small heading'), title: line('Heading'), lede: para('Text'), label: line('What to write (shown in the box)'), button: line('Button'), done: line('After the offering'), again: line('“Offer something else”') }, { label: 'The fire' }),
      diya: fields.object({ title: line('Heading'), button: line('Button') }, { label: 'The diya' }),
      moonReminder: fields.object({ title: line('Heading'), text: para('Text'), button: line('Button') }, { label: 'Moon reminders' }),
      install: fields.object({ title: line('Heading'), text: para('Text'), button: line('Button') }, { label: 'On your phone' }),
    }, { label: 'Tools for practice' }),
    today: fields.object({ day: line('Today'), question: line('Over the day’s question'), dayMantras: line('“{day}’s mantras”'), library: line('Library button'), moon: line('Moon'), next: line('Next sacred night'), you: line('Your practice'), none: line('Not yet today'), done: line('Practised today'), streak: line('“{n} days in a row”'), first: line('First day') }, { label: 'The today strip' }),
    mine: fields.object({ kicker: line('Small heading'), title: line('Heading'), lede: para('Text'), empty: para('When empty'), chanted: line('“chanted {n} times”'), remove: line('Remove') }, { label: 'My mantras' }),
    malaChoose: line('The mala: “The mantra”'), malaOpen: line('The mala: link to its page'),
    log: fields.object({ kicker: line('Small heading'), title: line('Heading'), lede: para('Text'), days: line('Days practised'), streak: line('Days in a row'), longest: line('Longest run'), japa: line('Mantras counted'), journal: line('Journal'), empty: para('When empty'), export: line('Download'), clear: line('Clear'), clearConfirm: para('Clear: are you sure?'), delete: line('Delete'), locked: line('A journal line still locked') }, { label: 'Your practice' }),
    month: fields.object({ kicker: line('Small heading'), title: line('Heading'), lede: para('Text'), prev: line('Month before'), nextMonth: line('Month after'), amavasya: line('Amavasya'), purnima: line('Purnima'), ekadashi: line('Ekadashi'), ashtami: line('Ashtami') }, { label: 'The month’s moons' }),
    days: fields.object({ kicker: line('Small heading'), title: line('Heading'), lede: para('Text'), amavasyaNote: line('Amavasya'), amavasyaDo: para('Amavasya: a suggestion'), purnimaNote: line('Purnima'), purnimaDo: para('Purnima: a suggestion'), addCalendar: line('Add to calendar'), ask: line('Ask about a ritual') }, { label: 'Sacred days ahead' }),
    reminder: fields.object({ title: line('Heading'), text: para('Text'), time: line('“At”'), add: line('Button'), addedNote: line('After adding') }, { label: 'The daily reminder' }),
  },
});

const booking = singleton({
  label: 'Bookings and emails', path: 'src/content/pages/booking', format: { data: 'json' },
  schema: {
    connectDone: fields.object({ title: line('Heading'), text: para('Text'), times: line('Over the times'), asked: line('Over what they asked'), cleared: line('Their list was cleared'), track: line('Link to follow it'), back: line('Back'), error: para('If it could not be sent'), sending: line('While sending') }, { label: 'Connect: after sending' }),
    booking: fields.object({
      kicker: line('Small heading'), zone: line('“Times in your zone: {zone}”'), asked: line('Over what they asked'),
      requestedTitle: line('Waiting: heading'), requestedText: para('Waiting: text'), yourTimes: line('Their times'), withdraw: line('Withdraw'),
      proposedTitle: line('Choose: heading'), proposedText: para('Choose: text'), choose: line('“This time suits me”'), noneSuit: line('“None suit me”'),
      suggestTitle: line('Suggest: heading'), suggestText: para('Suggest: text'), suggestSend: line('Suggest: send'), note: line('A note'),
      confirmedTitle: line('Confirmed: heading'), confirmedText: para('Confirmed: text'), join: line('Join'), linkSoon: line('Link to follow'), addCalendar: line('Add to calendar'), googleCalendar: line('Add to Google Calendar'),
      change: line('Another time'), cancel: line('Cancel'), cancelConfirm: para('Cancel: are you sure?'), reason: line('Reason'),
      completedTitle: line('Held: heading'), completedText: para('Held: text'), cancelledTitle: line('Cancelled: heading'), cancelledText: para('Cancelled: text'),
      declinedTitle: line('Declined: heading'), declinedText: para('Declined: text'), newRequest: line('New request'), notFound: para('A link that opens nothing'), done: line('After an action'),
    }, { label: 'The client’s booking page' }),
    invoice: fields.object({
      kicker: line('Small heading'), from: line('From'), to: line('To'), number: line('Invoice'), issued: line('Issued'), due: line('Due'), total: line('Total'), paidSoFar: line('Paid'), due2: line('Still to pay'),
      payTitle: line('Pay: heading'), payText: para('Pay: text'), payButton: line('Open UPI app'), copy: line('Copy UPI ID'),
      claim: line('“I have paid”'), claimText: para('I have paid: text'), reference: line('Reference field'), claimSend: line('Send'), claimed: para('After saying so'),
      paid: line('Paid'), void: para('Cancelled'), print: line('Print'), notFound: para('A link that opens nothing'),
    }, { label: 'The client’s invoice page' }),
    emails: fields.object({
      greeting: line('Greeting, with {name}'), footer: para('Footer of every email'),
      receivedSubject: line('Received: subject'), receivedText: para('Received: text'),
      proposedSubject: line('Times offered: subject'), proposedText: para('Times offered: text'), proposedButton: line('Times offered: button'),
      confirmedSubject: line('Confirmed: subject'), confirmedText: para('Confirmed: text'), confirmedButton: line('Confirmed: button'), manage: line('Change or cancel'), manageButton: line('My booking'),
      declinedSubject: line('Declined: subject'), declinedText: para('Declined: text'), cancelledSubject: line('Cancelled: subject'), cancelledText: para('Cancelled: text'),
      reminderSubject: line('Reminder: subject'), reminderText: para('Reminder: text'),
      invoiceSubject: line('Invoice: subject, with {number}'), invoiceText: para('Invoice: text'), invoiceButton: line('Invoice: button'),
      invoiceReminderSubject: line('Invoice reminder: subject'), invoiceReminderText: para('Invoice reminder: text'), receiptSubject: line('Receipt: subject'), receiptText: para('Receipt: text'),
    }, { label: 'Emails to clients' }),
  },
});

const me = singleton({
  label: 'My space', path: 'src/content/pages/me', format: { data: 'json' },
  schema: {
    kicker: line('Small heading'), title: must('Heading'), lede: para('Text'),
    header: fields.object({ signIn: line('Header: “Sign in”'), mine: line('Header: “My space”') }, { label: 'In the header' }),
    signIn: fields.object({
      title: line('Heading'), lede: para('Text'), points: lines('What an account does', 'Point'), email: line('Email field'), consent: para('The yes (consent)'),
      button: line('Button'), sending: line('While sending'), sent: para('After sending, with {email}'), sentDemo: para('In the preview: over the link'), openLink: line('In the preview: open the link'),
      again: line('Use another address'), noPassword: para('No passwords'), signingIn: line('While signing in'), privacy: para('Privacy line (with a link)'),
    }, { label: 'Signing in' }),
    email: fields.object({ subject: line('Subject'), hello: para('Text'), button: line('Button'), expires: para('“Works within {minutes} minutes”'), notYou: para('If it was not them'), sign: line('Signature'), footer: para('Footer') }, { label: 'The sign-in email' }),
    space: fields.object({
      hello: line('“Signed in as {email}”'), practice: line('Practice: heading'), practiceLede: para('Practice: text'), days: line('Days practised'), streak: line('Days in a row'), longest: line('Longest run'), japa: line('Mantras counted'),
      sessions: line('Practices finished'), kept: line('Mantras you keep'), none: para('When empty'), begin: line('Choose a practice'), synced: line('Up to date'), syncing: line('Syncing'), offline: para('Offline'),
      waiting: para('Journal lines waiting, with {n}'), times: line('“{n}×”'),
    }, { label: 'Your practice' }),
    journal: fields.object({
      title: line('Heading'), lede: para('Text'), setTitle: line('Choose a passphrase: heading'), setText: para('Choose a passphrase: text'), warning: para('If forgotten'),
      passphrase: line('Passphrase field'), confirm: line('“The same again”'), set: line('Set: button'), mismatch: line('They do not match'), short: line('Too short'),
      unlockTitle: line('Open: heading'), unlockText: para('Open: text'), unlock: line('Open: button'), working: line('While opening'), wrong: para('Wrong passphrase'),
      open: para('Open on this device'), forget: line('“I have forgotten”'), forgetConfirm: para('Forget: are you sure?'), count: line('Journal lines kept, with {n}'), empty: para('When empty'),
    }, { label: 'The journal' }),
    client: fields.object({
      title: line('Heading'), hello: line('“Welcome, {name}”'), sessions: line('Conversations'), invoices: line('Invoices'), noSessions: line('No conversations'), noInvoices: line('No invoices'), open: line('Open'), request: line('Ask for a conversation'),
      statuses: fields.object({ requested: line('Asked for'), proposed: line('Times to choose'), confirmed: line('Confirmed'), completed: line('Done'), no_show: line('Missed'), declined: line('Declined'), cancelled: line('Cancelled') }, { label: 'Conversation states' }),
      invoiceStatuses: fields.object({ sent: line('To pay'), paid: line('Paid'), void: line('Cancelled'), overdue: line('Past its date'), part: line('Part paid'), claimed: line('They said they paid') }, { label: 'Invoice states' }),
      notClient: para('For someone who is not a client'),
    }, { label: 'With Sarvakali (clients)' }),
    account: fields.object({
      title: line('Heading'), export: line('Download'), exportNote: para('Note in the download'), signOut: line('Sign out here'), signOutNote: para('Under the buttons'),
      signOutAll: line('Sign out everywhere'), signOutAllConfirm: para('Everywhere: are you sure?'), delete: line('Delete'), deleteConfirm: para('Delete: are you sure?'), deleted: para('After deleting'), signedOut: para('After signing out'),
    }, { label: 'The account' }),
    care: para('Care line (Tele-MANAS, with a link)'),
    errors: fields.object({ email: line('A wrong address'), consent: line('No yes'), send: para('Could not send'), noEmail: para('Email not set up'), link: para('A used link'), signedOut: para('Signed out'), full: para('Too large'), tooMany: para('Too many tries'), generic: para('Something went wrong'), offline: para('Offline'), noScript: para('Without JavaScript') }, { label: 'Messages' }),
  },
});

const articlesPage = singleton({
  label: 'Articles (the words around them)', path: 'src/content/pages/articles', format: { data: 'json' },
  schema: {
    meta: fields.object({ title: line('Title in the browser tab and search results'), description: para('Line for search results and link previews') }, { label: 'For search engines' }),
    kicker: line('Small heading'), title: must('Heading'), lede: para('Text'), draftNote: para('Note while articles are drafts (empty it when they are final)'),
    empty: line('When there are no articles'), filterLabel: line('For screen readers: the pillar filter'), all: line('“All”'), none: line('When a pillar has no articles'),
    minRead: line('“{n} min read”'), min: line('“{n} min”'), draft: line('“draft”'),
    article: fields.object({
      titleSuffix: line('After an article’s title in the browser tab', 'e.g. “ · Sarvakali”'), by: line('Byline'), aDraft: line('“a draft”'), share: line('“Share”'), shared: line('“Link copied”'),
      contents: line('“In this article”'), askTitle: line('Heading at the end'), askText: line('Text at the end'), ask: line('“Ask about this”'), explore: line('“Explore {pillar}”'), next: line('“Read next”'), back: line('“All articles”'),
    }, { label: 'On an article' }),
  },
});

/* ---------------------------------------------------------------- words in interactive moments (src/scripts/words.ts) */

// the fields follow the file itself: every group and every line it holds is editable, with its current words as the hint
const UI_GROUPS: Record<string, string> = {
  common: 'Shared', healing: 'Healing (breath, grounding, chakras, the mended bowl)', magic: 'Witchcraft & Magic (sigils, the wheel, the dark moon)',
  identity: 'Identity (the note for a practitioner)', devotion: 'Devotion (turn the yantra)', divination: 'Divination (the mirror)', diya: 'The diya',
  card: 'Today’s card', festivals: 'Festival days', pwa: 'Adding the site to a phone', search: 'Search', keep: 'Your list', practice: 'Daily practice',
  booking: 'A client’s booking page', sky: 'The moon',
};
const uiGroup = (o: Record<string, string>) => fields.object(Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v.length > 70 ? para(k, `Now: ${v}`) : line(k, `Now: ${v}`)])));
const ui = singleton({
  label: 'Words in interactive moments', path: 'src/content/pages/ui', format: { data: 'json' },
  schema: Object.fromEntries(Object.entries(uiWords as Record<string, Record<string, string>>).map(([g, o]) => [g, fields.object(uiGroup(o).fields, { label: UI_GROUPS[g] ?? g, description: 'Words in {braces} are filled in by the site: keep them as they are.' })])),
});

const care = singleton({
  label: 'Boundaries and care', path: 'src/content/pages/care', format: { data: 'json' },
  schema: {
    meta: fields.object({ title: line('Title in the browser tab and in search results'), description: para('One or two lines for search results and link previews') }, { label: 'For search engines' }),
    kicker: line('Small heading'), title: must('Heading'), lede: para('Text'),
    draftNote: para('Draft note (empty it once Sarvakali and a lawyer have approved the page)'),
    crisis: fields.object({ title: line('Heading'), text: para('Text', LINKS) }, { label: 'If you are in crisis (shown first, in a box)' }),
    sections: fields.array(fields.object({
      id: line('Address of this part (letters and dashes; “privacy” is where the footer’s privacy link leads)'), title: line('Heading'),
      paras: lines('Paragraphs', 'Paragraph', { description: LINKS }), points: lines('Points (a list under the paragraphs)', 'Point', { description: LINKS }),
    }), { label: 'The parts, in order', itemLabel: (p) => p.fields.title.value || 'A part' }),
  },
});

const terms = singleton({
  label: 'Terms and refunds', path: 'src/content/pages/terms', format: { data: 'json' },
  schema: {
    kicker: line('Small heading'), title: must('Heading'), lede: para('Text'), updated: line('“Last updated”, with the date'),
    draftNote: para('Draft note (empty it once a lawyer has reviewed the terms)'), care: para('Care line (Tele-MANAS, first on the page)'), contents: line('“On this page”'),
    sections: fields.array(fields.object({
      id: line('Address of this part (letters and dashes; leave as it is)'), title: must('Heading'),
      paras: lines('Paragraphs', 'Paragraph', { description: LINKS }), points: lines('Points (a list under the paragraphs)', 'Point', { description: LINKS }),
    }), { label: 'The parts, in order', itemLabel: (p) => p.fields.title.value || 'A part' }),
  },
});

const notfound = singleton({
  label: 'Not found', path: 'src/content/pages/notfound', format: { data: 'json' },
  schema: { kicker: line('Small heading'), title: must('Heading'), lede: para('Text'), search: line('Search button'), path: line('Find your path'), home: line('Homepage'), pillars: line('Over the pillars'), more: line('Last line') },
});

const about = singleton({
  label: 'About', path: 'src/content/pages/about', format: { data: 'json' },
  schema: {
    hero: fields.object({ kicker: line('Small heading'), title: must('Heading'), lede: para('Text') }, { label: 'The opening' }),
    portrait: fields.object({ caption: para('Caption under the portrait', LINKS), hint: line('Hint for looking into it') }, { label: 'The portrait (the photograph itself is placed in code)' }),
    quote: para('One line in Sarvakali’s own words', 'Set large, on its own. Leave empty to leave it out.'),
    promises: fields.object({
      title: line('Heading'),
      items: fields.array(fields.object({
        icon: fields.select({ label: 'Drawing', options: ICON_NAMES.map((v) => ({ value: v, label: v })), defaultValue: 'circle' }),
        title: must('Title'), text: para('Text', LINKS),
      }), { label: 'Promises', itemLabel: (p) => p.fields.title.value, validation: { length: { min: 1, max: 8 } } }),
    }, { label: 'How Sarvakali works' }),
    forWhom: fields.object({ title: line('Heading'), text: para('Text', LINKS) }, { label: 'Who it is for' }),
    close: fields.object({ primary: line('Main button'), secondary: line('Second button') }, { label: 'Buttons at the end' }),
  },
});

const writings = collection({
  label: 'Articles', slugField: 'title', path: 'src/content/writings/*', entryLayout: 'content', columns: ['title', 'date'],
  format: { contentField: 'body' },
  schema: {
    title: fields.slug({ name: { label: 'Title', validation: { isRequired: true } }, slug: { label: 'Address', description: 'The end of the page’s address, e.g. who-is-kali.' } }),
    summary: para('Summary', 'One or two sentences, shown on the Articles page and under the title.'),
    date: fields.date({ label: 'Date', validation: { isRequired: true } }),
    pillar: fields.select({ label: 'Pillar', options: [['devotion', 'Devotion & the Unseen'], ['magic', 'Witchcraft & Magic'], ['healing', 'Healing & Inner Work'], ['identity', 'Identity, Intimacy & the Body'], ['divination', 'Divination & Insight'], ['learning', 'Learning']].map(([value, label]) => ({ value, label })), defaultValue: 'devotion' }),
    minutes: fields.integer({ label: 'Minutes to read', defaultValue: 4, validation: { isRequired: true, min: 1 } }),
    draft: fields.checkbox({ label: 'Draft', description: 'Still a draft for Sarvakali.', defaultValue: true }),
    theme: fields.select({
      label: 'Theme', description: 'How the article looks: the quiet reading page, its own pillar’s world, or the world of any page of the site (colours, light and lettering).',
      options: [['reading', 'Reading (the Articles page)'], ['pillar', 'Its pillar’s world'], ['devotion', 'Devotion & the Unseen: cosmic mother'], ['magic', 'Witchcraft & Magic: the gilded grimoire'], ['healing', 'Healing & Inner Work: still water'], ['identity', 'Identity, Intimacy & the Body: soft prism'], ['divination', 'Divination & Insight: candlelight'], ['learning', 'Learning: the library'], ['practice', 'Daily practice'], ['care', 'Boundaries and care']].map(([value, label]) => ({ value, label })),
      defaultValue: 'reading',
    }),
    featured: fields.checkbox({ label: 'Show it large at the top of Articles', description: 'Otherwise the newest is shown large.', defaultValue: false }),
    image: fields.image({ label: 'Picture (optional)', description: 'Without one, the card is drawn in the pillar’s colours.', directory: 'public/media/articles', publicPath: '/media/articles/' }),
    imageAlt: line('What the picture shows (for people who cannot see it)'),
    body: fields.markdoc({ label: 'Text', extension: 'md' }),
  },
});

/* ---------------------------------------------------------------- the mantra library (src/pages/practice) */

const DAY_OPTIONS = [['monday', 'Monday'], ['tuesday', 'Tuesday'], ['wednesday', 'Wednesday'], ['thursday', 'Thursday'], ['friday', 'Friday'], ['saturday', 'Saturday'], ['sunday', 'Sunday']].map(([value, label]) => ({ value, label }));
const THEME_OPTIONS = ['balance', 'beginnings', 'clarity', 'compassion', 'courage', 'creativity', 'devotion', 'forgiveness', 'gratitude', 'grief', 'guidance', 'healing', 'learning', 'letting-go', 'peace', 'prosperity', 'protection', 'purpose', 'self-worth', 'steadiness', 'strength', 'surrender', 'transformation'].map((v) => ({ value: v, label: v }));

const mantras = collection({
  label: 'Mantras', slugField: 'name', path: 'src/content/mantras/*', format: { data: 'json' }, columns: ['name', 'deity'],
  schema: {
    name: fields.slug({ name: { label: 'Name', validation: { isRequired: true } }, slug: { label: 'Address', description: 'The end of its page’s address, e.g. karpura-gauram.' } }),
    days: fields.multiselect({ label: 'Days', description: 'The first one ticked is its own day; on the others it is listed under “Also kept on”. Leave all empty for a prayer kept on any day.', options: DAY_OPTIONS, defaultValue: [] }),
    tradition: line('Tradition', 'e.g. Hindu, Buddhist, Shinto, Ancient Greek, Norse, Jewish, Christian, Sufi, Sikh, Jain, Taoist, Celtic, Open to all. The library can be browsed by it.'),
    kind: fields.select({ label: 'Kind', options: [['mantra', 'Mantra'], ['prayer', 'Prayer'], ['hymn', 'Hymn'], ['chant', 'Chant'], ['verse', 'Verse'], ['sutra', 'Sutra'], ['blessing', 'Blessing'], ['figure', 'A figure honoured (no text)']].map(([value, label]) => ({ value, label })), defaultValue: 'mantra' }),
    language: line('Language', 'e.g. Sanskrit, Pali, Japanese, Ancient Greek, Old Norse, Hebrew, Arabic, Gurmukhi (Punjabi), Prakrit, English.'),
    lang: line('Language code', 'For screen readers and the right letters: sa, pi, ja, zh, grc, non, he, ar, pa, pra, en, enm.'),
    group: line('Group on its day', 'A heading on the day’s page, e.g. “Shiva and inner stillness”. Mantras with the same group sit together.'),
    deity: line('Deity or form', 'e.g. Shiva, Hanuman, Devi, Universal. Used to filter the library.'),
    themes: fields.multiselect({ label: 'Intentions', description: 'For the library’s filters.', options: THEME_OPTIONS }),
    intention: line('Intention line', 'Shown on its card, e.g. “Courage · strength · devotion”.'),
    status: fields.select({
      label: 'Label', description: 'Open: anyone may recite. Guidance: seed syllables or lineage-held; learn with a teacher. Variant: wording not yet traced. Being checked: the wording is held back and only the meaning shows.',
      options: [{ value: 'open', label: 'Open to all' }, { value: 'guidance', label: 'Learn with guidance' }, { value: 'variant', label: 'Wording not yet traced' }, { value: 'verify', label: 'Being checked (text held back)' }, { value: 'honoured', label: 'Honoured here (no text given)' }], defaultValue: 'open',
    }),
    text: para('Text in its own script', 'Devanagari, Greek, Japanese, Hebrew…; one line per line. For Devanagari the transliteration and pronunciation are made from this.'),
    iast: para('Transliteration', 'For Devanagari, leave empty to have it made; fill it only to correct it. For any other script, write it here.'),
    pronunciation: para('Readable pronunciation', 'For Devanagari, leave empty to have it made, e.g. “AUM na-mah shi-vaa-ya”. For any other script, write it here.'),
    meaning: para('Meaning in simple English'),
    parts: fields.array(fields.object({ line: line('Line'), meaning: para('Its meaning') }), { label: 'Line by line (optional)', itemLabel: (p) => p.fields.line.value || '(line)' }),
    purpose: para('Purpose'), supports: para('What it can support in reflection'), when: para('When to use it'),
    note: para('Text and tradition note'), source: line('Source', 'e.g. Rigveda 7.59.12. Every source is checked before it is published.'),
    supplied: para('As supplied in the source list', 'The original romanised wording, kept when the text is being checked or is a variant.'),
    drafted: fields.checkbox({ label: 'Notes drafted for Sarvakali', description: 'Tick while the purpose and use are drafts; untick once approved.', defaultValue: false }),
    audio: fields.file({ label: 'Recording (optional)', description: 'An mp3 or m4a of Sarvakali reciting it.', directory: 'public/media/mantras', publicPath: '/media/mantras/' }),
    order: fields.integer({ label: 'Order', description: 'Lower numbers come first within a day.', defaultValue: 500 }),
  },
});

const WORLD_OPTIONS = [['practice', 'Night sky'], ['care', 'Still water (gentle)'], ['lampsNight', 'Lamps at night'], ['agni', 'Fire'], ['mala', 'The mala'], ['library', 'Garland of letters'], ['dayMonday', 'Monday · the Moon'], ['dayTuesday', 'Tuesday · Mars'], ['dayWednesday', 'Wednesday · Mercury'], ['dayThursday', 'Thursday · Jupiter'], ['dayFriday', 'Friday · Venus'], ['daySaturday', 'Saturday · Saturn'], ['daySunday', 'Sunday · the Sun']].map(([value, label]) => ({ value, label }));

const practices = collection({
  label: 'Guided practices', slugField: 'title', path: 'src/content/practices/*', format: { data: 'json' }, columns: ['title', 'kind'],
  schema: {
    title: fields.slug({ name: { label: 'Title', validation: { isRequired: true } }, slug: { label: 'Address', description: 'The end of its address, e.g. grief or kali.' } }),
    kind: fields.select({ label: 'Kind', description: 'Where it is offered: with a deity or figure, for a feeling, as a day’s practice, or with no deity at all.', options: [{ value: 'deity', label: 'A deity or figure' }, { value: 'feeling', label: 'A feeling' }, { value: 'day', label: 'A day of the week' }, { value: 'open', label: 'No deity (open to all)' }], defaultValue: 'deity' }),
    tradition: line('Tradition', 'e.g. Hindu, Buddhist, Ancient Greek. Shown on its card.'),
    key: line('Deity, feeling or day', 'e.g. Shiva, Grief and loss, monday (a day in lower case).'),
    sanskrit: line('Name in its own script (optional)', 'e.g. शिव'),
    lang: line('Its language code', 'e.g. sa for Sanskrit, ta for Tamil, grc for Greek, bo for Tibetan.'),
    line: line('One line: who it is for'),
    intro: para('Introduction'),
    minutes: fields.integer({ label: 'About how many minutes', defaultValue: 10 }),
    world: fields.select({ label: 'Its world (colours and light)', options: WORLD_OPTIONS, defaultValue: 'practice' }),
    care: fields.checkbox({ label: 'Show the care note first', description: 'For practices that touch the mind, the body or loss.', defaultValue: false }),
    offering: line('What one might offer (optional)'),
    steps: fields.array(fields.object({
      type: fields.select({ label: 'Step', options: [['breathe', 'Breathe'], ['light', 'Light the lamp'], ['read', 'Read a mantra (with its meaning)'], ['chant', 'Chant a mantra (counted)'], ['reflect', 'Reflect on a question'], ['offer', 'Offer to the fire'], ['close', 'Close with a prayer']].map(([value, label]) => ({ value, label })), defaultValue: 'breathe' }),
      title: line('Heading'), text: para('Guidance'),
      mantra: fields.relationship({ label: 'Mantra (for read, chant and close)', collection: 'mantras' }),
      count: fields.integer({ label: 'Breaths, or repetitions offered first', defaultValue: 11 }),
      prompt: para('Question (for reflect)'),
      pattern: fields.select({ label: 'Breath (for breathe)', options: [{ value: 'even', label: 'Even' }, { value: 'long', label: 'A longer out-breath' }], defaultValue: 'even' }),
    }), { label: 'Steps', itemLabel: (p) => `${p.fields.type.value}: ${p.fields.title.value}`, validation: { length: { min: 1, max: 10 } } }),
    after: para('Closing words', '14416 becomes a tap-to-call link by itself.'),
    next: fields.array(fields.relationship({ label: 'Practice', collection: 'practices' }), { label: 'Suggested next', validation: { length: { max: 3 } } }),
    ask: line('Ask Sarvakali about (optional)', 'A topic for Connect, e.g. “Going deeper with Kali”.'),
    drafted: fields.checkbox({ label: 'Draft for Sarvakali', defaultValue: true }),
    order: fields.integer({ label: 'Order', defaultValue: 500 }),
  },
});

const week = singleton({
  label: 'The seven days', path: 'src/content/pages/week', format: { data: 'json' },
  schema: {
    days: fields.array(fields.object({
      key: fields.select({ label: 'Day', options: DAY_OPTIONS, defaultValue: 'monday' }),
      name: must('Name'), sanskrit: line('Sanskrit name', 'e.g. Somavara'), planet: line('Planet'), planetSanskrit: line('Planet in Sanskrit', 'e.g. Chandra / Soma'),
      character: lines('The planetary character of the day', 'Paragraph'),
      intention: para('The day’s spiritual intention'), question: para('A question for the day'),
      themes: lines('Themes and areas for reflection', 'Theme'),
      groupNotes: fields.array(fields.object({ group: line('Group'), text: para('A note under its heading') }), { label: 'Notes under groups', itemLabel: (p) => p.fields.group.value }),
      others: fields.object({ title: line('Heading'), text: para('Text'), items: lines('Connections', 'Connection') }, { label: 'Other pantheons' }),
      practice: para('A gentle practice for the day'),
      opening: fields.relationship({ label: 'Opening prayer in the daily rite', collection: 'mantras' }),
      closing: fields.relationship({ label: 'Closing prayer in the daily rite', collection: 'mantras' }),
    }), { label: 'The days', itemLabel: (p) => p.fields.name.value, validation: { length: { min: 7, max: 7 } } }),
  },
});

const library = singleton({
  label: 'Mantra library', path: 'src/content/pages/library', format: { data: 'json' },
  schema: {
    kicker: line('Small heading'), title: must('Heading'), lede: para('Text'),
    how: fields.object({ title: line('Heading'), paras: lines('How to use this library', 'Paragraph') }, { label: 'How to use it' }),
    rhythm: fields.object({ title: line('Heading'), text: para('Text') }, { label: 'A simple rhythm' }),
    labels: fields.object({ title: line('Heading'), open: line('Open'), openText: para('Open: meaning'), guidance: line('Guidance'), guidanceText: para('Guidance: meaning'), variant: line('Variant'), variantText: para('Variant: meaning'), verify: line('Being checked'), verifyText: para('Being checked: meaning'), honoured: line('Honoured'), honouredText: para('Honoured: meaning'), drafted: line('Drafted'), draftedText: para('Drafted: meaning') }, { label: 'The labels' }),
    search: line('Search'), searchHint: line('Search hint'), allDays: line('Every day'), deity: line('Deity'), anyDeity: line('Any deity'), intention: line('Intention'), include: line('Include guidance'), count: line('“{n} of {total}”'), none: para('Nothing found'), clear: line('Clear filters'), tradition: line('Tradition'), anyTradition: line('Every tradition'), kind: line('Kind'), every: line('Heading over everything'), anyDayChip: line('“Any day”'), narrow: line('“More ways to narrow” (folds the lists and switches away on phones)'),
    kinds: fields.object({ mantra: line('Mantra'), prayer: line('Prayer'), hymn: line('Hymn'), chant: line('Chant'), verse: line('Verse'), sutra: line('Sutra'), blessing: line('Blessing'), figure: line('Figures honoured') }, { label: 'Kinds of text' }),
    meta: fields.object({ title: line('Title in the browser tab and search results'), description: para('Line for search results and link previews') }, { label: 'For search engines (the library page)' }),
    mantraMeta: line('A mantra’s title in the browser tab', '{name} is the mantra’s name.'),
    start: para('“Looking for where to begin?”', LINKS), dayLegend: line('For screen readers: “Day”'),
    controls: fields.object({ show: line('“Show:”'), script: line('Original script'), iast: line('Transliteration'), read: line('Pronunciation') }, { label: 'Which scripts to show' }),
    dayWords: fields.object({
      acrossKicker: line('Small heading over other traditions on a day'), acrossLink: line('Link to every tradition'),
      metaTitle: line('A day’s title in the browser tab', '{day}, {sanskrit}'), metaDescription: line('A day’s line for search results', '{day}, {planet}, {question}'),
      weekLabel: line('For screen readers: the seven days'), today: line('“Today”'), question: line('“A question for the day”'), begin: line('“Begin {day}’s practice”'),
      about: line('“About {day}”'), aboutHint: line('Under it'), character: line('“The planetary character of the day”'), intention: line('“The day’s spiritual intention”'),
      themes: line('“Themes and areas for reflection”'), gentle: line('“A gentle practice for {day}”'), all: line('“All {n} of {day}’s mantras”'), allHint: line('Under it'),
      before: line('“The day before”'), after: line('“The day after”'), libraryHint: line('Over the library link'), library: line('The library link'), libraryBy: line('Under it'),
      planMinutes: line('“{title} · about {n} minutes”'),
    }, { label: 'On a day’s page' }),
    ways: fields.object({ title: line('Heading'), byTradition: line('By tradition'), byNeed: line('By what you need'), byDay: line('By day') }, { label: 'Ways in' }),
    themes: fields.object(Object.fromEntries(THEME_OPTIONS.map((t) => [t.value, line(t.value)])), { label: 'Intention names' }),
    mantra: fields.object({
      text: line('Sanskrit'), iast: line('Transliteration'), pronunciation: line('Pronunciation'), meaning: line('Meaning'), parts: line('Line by line'), purpose: line('Purpose'), supports: line('Supports'), when: line('When'), note: line('Note'), source: line('Source'), supplied: line('As supplied'),
      listen: line('Listen'), noAudio: line('No recording yet'), show: line('Show'), bigger: line('Larger text'), copy: line('Copy'), copied: line('Copied'), keep: line('Keep'), kept: line('Kept'),
      chant: line('Chant: heading'), chantLede: para('Chant: text'), counts: fields.array(fields.integer({ label: 'Count' }), { label: 'Counts offered' }), once: line('Once'), times: line('“{n} times”'), next: line('Next repetition'), doneChant: line('Complete'), again: line('Again'),
      days: line('Kept on'), more: line('“More for {deity}”'), open: line('Open'), dayLink: line('“All of {day}’s mantras”'), anyDay: line('Kept on any day'), tradLink: line('“More from {tradition}”'), script: line('Original script'), yourPractice: line('Link to your practice'), usedIn: line('“Guided practices that use it”'), before: line('“Before it”'), beforeOn: line('“Before it on {day}”'), after: line('“After it”'), howMany: line('For screen readers: “How many times”'), moreDayLabel: line('For screen readers: more on this day'), moreTradLabel: line('For screen readers: more from this tradition'), moreFold: line('“More” (on a card)'),
    }, { label: 'A mantra’s page' }),
    care: para('Care note', 'Tele-MANAS 14416 becomes a tap-to-call link by itself.'),
  },
});


export default config({
  storage,
  ...(storage.kind === 'cloud' ? { cloud: { project } } : {}),
  ui: {
    brand: { name: 'Sarvakali' },
    navigation: {
      'The site': ['home', 'kind', 'festivals', 'cards', 'writings', 'articlesPage', 'settings', 'ui'],
      Pages: ['about', 'care', 'connect', 'booking', 'me', 'terms', 'path', 'notfound'],
      'Daily practice': ['practice', 'practices', 'mantras', 'week', 'library'],
      'Pillar pages': ['devotion', 'magic', 'healing', 'identity', 'divination', 'learning'],
      Catalogue: ['catDevotion', 'catMagic', 'catHealing', 'catIdentity', 'catDivination', 'catLearning'],
    },
  },
  collections: { writings, mantras, practices },
  singletons: {
    home, kind, festivals, cards, settings, articlesPage, ui, about, care, connect, booking, me, terms, path, practice, notfound, week, library,
    devotion, magic, healing, identity, divination, learning,
    catDevotion: catalogue('devotion', 'Catalogue · Devotion & the Unseen', CH.devotion, false),
    catMagic: catalogue('magic', 'Catalogue · Witchcraft & Magic', CH.magic),
    catHealing: catalogue('healing', 'Catalogue · Healing & Inner Work', CH.healing),
    catIdentity: catalogue('identity', 'Catalogue · Identity, Intimacy & the Body', CH.identity),
    catDivination: catalogue('divination', 'Catalogue · Divination & Insight', CH.divination),
    catLearning: catalogue('learning', 'Catalogue · Learning', CH.learning),
  },
});
