import type { WorldHandle as World } from './world/handle';
import { applyDir, getDir, loadHomeDirFonts, pagePillar, type DirPillar } from './dirs';
import { DIR_FONTS } from '../data/dirfonts';

type Starter = (world: World, dir: 'a' | 'b' | 'c') => (() => void)[];

/** each pillar's signature moments are their own download, fetched only on that pillar's page */
const STARTERS: Record<DirPillar, () => Promise<Starter>> = {
  identity: () => import('./identity').then((m) => m.startIdentity),
  divination: () => import('./divination').then((m) => m.startDivination),
  learning: () => import('./learning').then((m) => m.startLearning),
};

let cleanups: (() => void)[] = [];
let token = 0;

export function stopDirPage() {
  token++; // a start still downloading is dropped
  cleanups.forEach((c) => c());
  cleanups = [];
}

/** starts the signature moments of the pillar page in view, in its chosen direction */
export function startDirPage(world: World) {
  stopDirPage();
  applyDir();
  loadHomeDirFonts((p, d) => DIR_FONTS[p][d]);
  const p = pagePillar();
  if (!p) return;
  const t = token;
  STARTERS[p]().then((start) => {
    if (t !== token) return;
    cleanups = start(world, getDir(p));
  }).catch(() => { /* the signature could not be downloaded; the page itself still works */ });
}
