/**
 * A chapter of a pillar page (Pillars 4 to 6), gathered from one or more of the catalogue's subcategories.
 * `room` is the kind of page it is, where a pillar has more than one (Divination: table or mirror;
 * Learning: library, leaf or sky).
 */
export type DirChapter = { key: string; title: string; line: string; subs: string[]; care?: string; note?: string; room?: string };
