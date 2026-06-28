# Contributing

Guidelines for contributing to ASCII Visual Engine.

Thank you for considering a contribution. This project aims to be a professional, reusable framework — consistency and clarity matter as much as code.

---

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Install dependencies:

```bash
npm install
```

4. Start the dev server to verify the example works:

```bash
npm run dev
```

5. Create a feature branch from `main`:

```bash
git checkout -b feat/my-feature
```

---

## Folder Structure

```
src/
├── core/           Engine, event bus, shared types
├── renderers/      Rendering backends (canvas, future: WebGL)
├── effects/        Built-in visual effects
├── presets/        Built-in preset definitions
└── index.ts        Public API barrel export

examples/
└── vanilla/        Reference browser integration

dist/               Build output (do not edit)
```

### Where to put new code

| Adding | Location |
| --- | --- |
| New effect | `src/effects/MyEffect.ts` + export from `src/index.ts` |
| New preset | `src/presets/my-preset.ts` + register in `src/presets/index.ts` |
| New renderer | `src/renderers/MyRenderer.ts` |
| Engine feature | `src/core/AsciiEngine.ts` or new file in `src/core/` |
| Shared types | `src/core/types.ts` |
| Example | `examples/<name>/` |
| Documentation | Repository root (`.md` files) |

---

## Coding Standards

### TypeScript

- Strict mode is enabled. No `any` unless absolutely necessary with a comment explaining why.
- All public API symbols must have explicit types exported from `src/index.ts`.
- Prefer interfaces over type aliases for object shapes.
- Use `readonly` for properties that should not be reassigned after construction.

### Naming

| Element | Convention | Example |
| --- | --- | --- |
| Classes | PascalCase | `AsciiEngine`, `NoiseField` |
| Interfaces | PascalCase | `AsciiPreset`, `EffectContext` |
| Files (classes) | PascalCase | `AsciiEngine.ts`, `GlyphBurst.ts` |
| Files (modules) | camelCase or kebab | `basic.ts`, `index.ts` |
| Functions | camelCase | `listPresets`, `getPreset` |
| Constants | UPPER_SNAKE or camelCase | `DEFAULT_PRESET` |
| Effect types | lowercase string | `'noise'`, `'burst'` |
| Preset ids | lowercase kebab | `'terminal'`, `'organic'` |
| Event names | camelCase | `'noteOn'`, `'frame'` |

### Code style

- Match the style of surrounding code.
- Keep functions focused. If a method exceeds ~40 lines, consider extracting helpers.
- Avoid unnecessary abstractions. A one-use helper function inline is fine.
- No comments on obvious code. Comment non-obvious business logic and technical constraints.
- No project-specific names in library code. The engine must remain generic.

### Imports

- Use relative imports within `src/`.
- Export all public symbols through `src/index.ts`.
- Do not import from `examples/` in `src/`.

---

## Commit Style

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>
```

### Types

| Type | Use for |
| --- | --- |
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `refactor` | Code change that neither fixes nor adds |
| `perf` | Performance improvement |
| `test` | Adding or updating tests |
| `chore` | Build, CI, tooling |

### Examples

```
feat(effects): add RippleEffect for concentric note waves
fix(renderer): rebuild grid on density change during resize
docs(api): document noteOn intensity parameter
refactor(core): extract effect pool into separate module
```

Keep the subject line under 72 characters. Use the body for context when needed.

---

## Documentation Requirements

Any change that affects the public API must update documentation:

| Change | Update |
| --- | --- |
| New public class or method | `API.md` |
| New effect or plugin pattern | `PLUGIN_API.md` |
| Preset schema change | `PRESET_SCHEMA.md` |
| Architecture change | `ARCHITECTURE.md` |
| New milestone or completed task | `ROADMAP.md` |
| Released version | `CHANGELOG.md` |
| User-facing feature | `README.md` |

Documentation is written for developers who have never seen this repository. Avoid internal jargon. No project-specific references.

---

## Testing Expectations

> Test infrastructure is not yet set up (see ROADMAP Milestone 16). These are the expectations once it is.

- All new effects must have unit tests covering `update`, `onNoteOn`, and `reset`.
- Engine lifecycle changes must have integration tests.
- Preset changes must not break existing preset validation.
- Run the full test suite before submitting a PR:

```bash
npm test
```

- Run type checking:

```bash
npm run typecheck
```

- Verify the example still works:

```bash
npm run dev
```

Until the test runner is configured, manually verify your changes in the vanilla example.

---

## Pull Request Guidelines

### Before submitting

- [ ] Branch is up to date with `main`
- [ ] `npm run typecheck` passes
- [ ] `npm run build` succeeds
- [ ] Example demo works with your changes
- [ ] Documentation updated for API changes
- [ ] CHANGELOG updated for user-facing changes
- [ ] ROADMAP checkboxes updated if completing milestone tasks
- [ ] No project-specific names or hardcoded product references
- [ ] Commit messages follow conventional commit format

### PR description template

```markdown
## Summary
Brief description of what changed and why.

## Type of change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation
- [ ] Refactor
- [ ] Performance

## Test plan
- [ ] Typecheck passes
- [ ] Build succeeds
- [ ] Example demo verified
- [ ] Unit tests added/updated (when available)

## Screenshots
(if visual change)
```

### Review process

1. Submit PR against `main`
2. At least one maintainer review required
3. CI must pass (when configured)
4. Squash merge preferred for clean history

---

## Adding a New Effect

1. Create `src/effects/MyEffect.ts` implementing the `Effect` interface
2. Export from `src/index.ts`
3. Add the effect type to `EffectType` in `src/core/types.ts`
4. Register in `AsciiEngine.rebuildEffects()` effect pool
5. Document in `API.md` and `PLUGIN_API.md`
6. Add a preset or example demonstrating the effect
7. Update `ROADMAP.md` Milestone 05 if applicable

See [PLUGIN_API.md](./PLUGIN_API.md) for the full effect development guide.

---

## Adding a New Preset

1. Create `src/presets/my-preset.ts` exporting an `AsciiPreset` object
2. Register in `src/presets/index.ts`
3. Export from `src/index.ts` (via presets barrel)
4. Add to the vanilla example preset selector
5. Document in `PRESET_SCHEMA.md` if it introduces new patterns

---

## Questions

Open a GitHub issue for:

- Bug reports
- Feature requests
- Architecture discussions
- Documentation improvements

For quick questions, open a draft PR with your approach and ask for feedback.

---

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
