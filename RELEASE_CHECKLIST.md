# Release Checklist — v0.1.0

Initial MVP release of ASCII Visual Engine. Use this checklist before tagging or deploying.

## Build & Quality

- [x] `npm install` completes without errors
- [x] `npm run typecheck` passes
- [x] `npm test` — 162 tests passing
- [x] `npm run build` — library ESM + CJS + `.d.ts` artifacts
- [x] `npm run build:demo` — static demo in `dist-demo/`
- [x] `npm run lint` — TypeScript validation (via typecheck)

## Examples

- [x] Vanilla demo: fullscreen canvas rendering
- [x] Preset, pattern, motion, effect, and simulation toggles
- [x] Audio reactivity panel
- [x] MIDI & performance input panel
- [x] Debug panels (engine, motion, simulation, renderer, compositing, audio, export, script, performance)
- [x] Responsive resize handling
- [x] Script console with example gallery

## Package

- [x] `import { AsciiEngine } from 'ascii-visual-engine'` supported via built artifacts
- [x] TypeScript definitions exported from `dist/index.d.ts`
- [x] `package.json` exports map configured

## Documentation

- [x] README.md — MVP overview, badges, integration guide
- [x] CHANGELOG.md — v0.1.0 release notes
- [x] ROADMAP.md — milestone status
- [x] ARCHITECTURE.md, API.md, PLUGIN_API.md, PRESET_SCHEMA.md reviewed

## GitHub

- [x] Release commit: `Release v0.1.0`
- [x] Git tag: `v0.1.0`
- [x] Pushed to `origin/main`
- [x] Tag pushed to remote

## Vercel

- [x] `vercel.json` configured (`build:demo` → `dist-demo/`)
- [x] Production deployment succeeds
- [x] Live demo accessible with no console errors

## Integration Readiness

- [x] Engine importable into external projects (Plantasonic and prototypes)
- [x] No blocking unfinished work for first integration
- [x] Known future work tracked in ROADMAP (GPU rendering, npm publish, touch gestures)

---

**Release date:** 2026-06-28  
**Version:** 0.1.0  
**Status:** MVP — ready for Plantasonic integration
