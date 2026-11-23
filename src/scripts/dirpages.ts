import type { WorldHandle as World } from './world/handle';
import { applyDir, getDir, loadHomeDirFonts, pagePillar, type DirPillar } from './dirs';
import { DIRECTIONS as ID_DIRS } from '../data/identity';
import { DIRECTIONS as DIV_DIRS } from '../data/divination';
import { DIRECTIONS as LRN_DIRS } from '../data/learning';
import { startIdentity } from './identity';
import { startDivination } from './divination';
import { startLearning } from './learning';

/** starts the signature moments of the pillar page in view, in its chosen direction */
const STARTERS: Record<DirPillar, (world: World, dir: 'a' | 'b' | 'c') => (() => void)[]> = {
  identity: startIdentity,
  divination: startDivination,
  learning: startLearning,
};
const ALL = { identity: ID_DIRS, divination: DIV_DIRS, learning: LRN_DIRS };

let cleanups: (() => void)[] = [];
export function stopDirPage() {
  cleanups.forEach((c) => c());
  cleanups = [];
}

export function startDirPage(world: World) {
  stopDirPage();
  applyDir();
  loadHomeDirFonts((p, d) => ALL[p].find((x) => x.key === d)?.type.fontHref);
  const p = pagePillar();
  if (!p) return;
  cleanups = STARTERS[p](world, getDir(p));
}
