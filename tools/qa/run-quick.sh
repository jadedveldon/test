#!/bin/sh
# The checks to run after every change (about 20 minutes), against the site served by `npx astro preview`.
# Every line must read "ok" and every ERRORS line "none" (CLAUDE.md, the quality gate).
cd "$(dirname "$0")/../.." || exit 1
Q=tools/qa
echo "== content rules";  node $Q/rules.cjs
echo "== pages";          node $Q/audit.cjs
echo "== regressions";    node $Q/regressions.cjs
echo "== pillars 4-6";    node $Q/pillars.cjs
echo "== interactions";   node $Q/interactions.cjs
