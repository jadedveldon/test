#!/bin/sh
# Every quality check, one after another (about an hour), against the site served by `npx astro preview`.
# Run before publishing the preview or pushing a round of work (CLAUDE.md, the quality gate).
cd "$(dirname "$0")/../.." || exit 1
Q=tools/qa
# a check that stops with an error must never look like a pass
run() { node "$@" || echo "FAIL $1 stopped with an error (exit $?)"; }
echo "== content rules";  run $Q/rules.cjs
echo "== content files";  node --experimental-strip-types --no-warnings $Q/content.mjs || echo "FAIL content.mjs stopped with an error (exit $?)"
echo "== studio rules";   node $Q/studio-core.mjs || echo "FAIL studio-core.mjs stopped with an error (exit $?)"
echo "== pages";          run $Q/audit.cjs
echo "== interactions";   run $Q/interactions.cjs; W=390 H=844 run $Q/interactions.cjs
echo "== pillars 4-6";    run $Q/pillars.cjs
echo "== regressions";    run $Q/regressions.cjs
echo "== keyboard";       run $Q/keyboard.cjs
echo "== motion";         run $Q/motion.cjs
echo "== robustness";     run $Q/robust.cjs
echo "== accessibility";  run $Q/a11y.cjs
echo "== layout";         run $Q/layout.cjs
echo "== memory";         run $Q/mem.cjs
echo "== slow phone";     run $Q/vitals.cjs
# the whole Studio loop, on the preview bundle served on port 8099 (as for preview-check.cjs)
echo "== studio loop";    QA_STUDIO=demo node $Q/studio.cjs || echo "FAIL studio.cjs stopped with an error (exit $?)"
