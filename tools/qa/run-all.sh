#!/bin/sh
# Every quality check, one after another (about an hour), against the site served by `npx astro preview`.
# Run before publishing the preview or pushing a round of work (CLAUDE.md, the quality gate).
cd "$(dirname "$0")/../.." || exit 1
Q=tools/qa
echo "== content rules";  node $Q/rules.cjs
echo "== pages";          node $Q/audit.cjs
echo "== interactions";   node $Q/interactions.cjs; W=390 H=844 node $Q/interactions.cjs
echo "== pillars 4-6";    node $Q/pillars.cjs
echo "== regressions";    node $Q/regressions.cjs
echo "== keyboard";       node $Q/keyboard.cjs
echo "== motion";         node $Q/motion.cjs
echo "== robustness";     node $Q/robust.cjs
echo "== accessibility";  node $Q/a11y.cjs
echo "== layout";         node $Q/layout.cjs
echo "== memory";         node $Q/mem.cjs
echo "== slow phone";     node $Q/vitals.cjs
