#!/bin/sh
# The checks to run after every change (about 20 minutes), against the site served by `npx astro preview`.
# Every line must read "ok" and every ERRORS line "none" (CLAUDE.md, the quality gate).
cd "$(dirname "$0")/../.." || exit 1
Q=tools/qa
# a check that stops with an error must never look like a pass
run() { node "$@" || echo "FAIL $1 stopped with an error (exit $?)"; }
echo "== content rules";  run $Q/rules.cjs
echo "== content files";  node --experimental-strip-types --no-warnings $Q/content.mjs || echo "FAIL content.mjs stopped with an error (exit $?)"
echo "== pages";          run $Q/audit.cjs
echo "== regressions";    run $Q/regressions.cjs
echo "== pillars 4-6";    run $Q/pillars.cjs
echo "== interactions";   run $Q/interactions.cjs
