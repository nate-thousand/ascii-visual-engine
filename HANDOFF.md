# ASCII Visual Engine · Handoff

Written 2026-09-17 when engine development moved out of the portfolio chat into its own session.

## Where things stand

- Branch `release/0.2.0`, four commits ahead of `origin/main`, working tree clean. Nothing pushed, nothing tagged.
- 0.2.0 is the consolidation release: local stabilization work + GitHub main (CI, snapshot and smoke tests, SECURITY, INTEGRATION) + the platform monorepo's vendored additions (`setColor`, `setGlyphSet`, `setBassGlyphScale`, GIF export options, source strength, softened threshold).
- Verified: typecheck clean, 189 tests, `npm run build` and `npm run build:demo` succeed, six hero looks at 60 fps in the demo, no console errors.
- Dev server: `npm run dev -- --port 5192 --strictPort` (the portfolio's `.claude/launch.json` has this as `ascii-engine`).

## Decisions

Settled in a grill on 2026-09-17 and recorded at the top of `ROADMAP.md`. Short form: engine for host apps, hosts own UI, demo is a harness; two tier API (facade + nested presets, nothing removed); laptop to 1080p screen at 60 fps is the bar; `PointerInput` as a plugin; hosts pin git tags; no host drives the feature list; 0.2.0 consolidates, 0.3.0 is the API work, 0.4.0 is live performance features; commit locally, push and tag only after review.

## Next actions, in order

1. Get the ok, then `git push -u origin release/0.2.0`, open the PR or merge to main, `git tag v0.2.0`, push the tag.
2. Deploy `dist-demo/` to visual-engine.xyz (hosting not found in the repo; ask). Confirm the live page shows the six looks and Lab.
3. Start 0.3.0 from `ROADMAP.md` section 2: facade `createEngine()`, nested presets with flat normalization, HiDPI, `PointerInput`, frame budget in BENCHMARKS.md.

## Related

- The platform monorepo still has `plantasonic-platform/packages/visual-engine`. Retiring it in favour of the tag is a platform change, not this repo's.
- The portfolio (`portfolio-2.0/work/ascii-engine.html`) has a case study for this engine; keep its numbers (tests, presets, version) in step with releases.
