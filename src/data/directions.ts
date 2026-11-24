/**
 * A chapter of a pillar page (Pillars 4 to 6). Its words come from the pillar's content file; which services
 * it shows comes from the catalogue, where each subcategory names its chapter. `room` is the kind of page it
 * is, where a pillar has more than one (Divination: table or mirror; Learning: library, leaf or sky).
 */
export type DirChapter = { key: string; title: string; line: string; care?: string; note?: string; room?: string };
