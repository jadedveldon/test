#!/bin/sh
# Every quality check, one after another, against the site served by `npx astro preview`.
cd "$(dirname "$0")/../.." || exit 1
Q=tools/qa
echo "== pages";          node $Q/audit.cjs
echo "== interactions";   node $Q/interactions.cjs; W=390 H=844 node $Q/interactions.cjs
for p in identity divination learning; do
  echo "== $p";           PILLAR=$p node $Q/pd-test.cjs; PILLAR=$p W=390 H=844 node $Q/pd-test.cjs
done
echo "== code review";    node $Q/review-verify.cjs
echo "== keyboard";       node $Q/keyboard.cjs
echo "== motion";         node $Q/motion.cjs
echo "== robustness";     node $Q/robust.cjs
echo "== accessibility";  node $Q/a11y.cjs
echo "== layout";         node $Q/layout.cjs
echo "== memory";         node $Q/mem.cjs
echo "== slow phone";     node $Q/vitals.cjs
