import type { DirChapter } from './directions';
import copy from '../content/pillars/learning.json';

/**
 * Pillar 6, Learning: the library, the leaf and the stars. All three directions were loved, so the page walks
 * through all three rooms: the library by lamplight (A), the palm-leaf manuscripts (C) and the night road of
 * study (B). The signatures kept are Find your class (A) and Your path (B); the yantra drawing (C) is in the
 * project history. Lines are DRAFT copy for Sarvakali. Facts and sources are in the fact check on the
 * preview cover.
 *
 * The words live in src/content/pillars/learning.json (the content editor writes there); the chapter keys,
 * their rooms and the map of the road stay here.
 */
export const COPY = copy;

const ROOMS: [keyof typeof copy.chapters, 'library' | 'leaf' | 'sky'][] = [['foundations', 'library'], ['craft', 'library'], ['tantra', 'leaf'], ['deity', 'leaf'], ['mentoring', 'sky']];
export const CHAPTER_KEYS = ROOMS.map(([k]) => k);
export const CHAPTERS: DirChapter[] = ROOMS.map(([key, room]) => ({ key, room, ...copy.chapters[key] }));

/** ways to learn, shown under the opening */
export const FORMATS = copy.formats.services.map((s) => s.trim()).filter(Boolean);

/** Find your class (from the library): three questions, each answer pointing to classes in the catalogue */
export const FINDER = copy.finder.questions.map((q) => ({ q: q.question, a: q.answers.map((a) => ({ label: a.label, items: a.services.map((s) => s.trim()).filter(Boolean) })) }));

/** Your path (under the stars): a suggested path of study: stations along one road, with three side paths; begin anywhere */
const title = (k: string) => (copy.chapters as Record<string, { title: string }>)[k]?.title ?? '';
export const STATIONS = copy.path.stations.slice(0, 12).map((s) => ({ name: s.service, ch: title(s.chapter), line: s.line }));
/** where each station sits on the map (main road 0–8, then side paths 9–11 and the station each leaves from) */
export const STATION_XY: [number, number][] = [[-130, 92], [-98, 62], [-62, 66], [-34, 34], [2, 24], [28, -8], [62, -18], [92, -50], [128, -88], [-58, 108], [12, -46], [100, 4]];
export const SIDE_FROM = [2, 5, 6];
