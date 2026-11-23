/** a design direction being compared live on a pillar page */
export type Direction = {
  key: 'a' | 'b' | 'c'; name: string; essence: string; feeling: string[];
  palette: { name: string; hex: string }[];
  type: { display: string; note: string; fontHref: string; family: string };
  worlds: string; layout: string; signature: { name: string; how: string }; sound: string; imagery: string; voice: string;
};

/** a chapter of a pillar page, gathered from one or more of the catalogue's subcategories */
export type DirChapter = { key: string; title: string; line: string; subs: string[]; care?: string; note?: string };
