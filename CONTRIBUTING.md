# Contributing

Thanks for looking. This is a small repository with a strict set of quality
gates, so most of this page is about where things live and what has to pass.

## Prerequisites

- **Node 22+** (24 in CI; `.nvmrc` pins it)
- **pnpm** — the repo is a pnpm workspace and `packageManager` is pinned

## Setup

```bash
pnpm install     # also installs the lefthook git hooks
pnpm build       # the docs and playgrounds import the built package
```

## Repository layout

| Path | What |
| --- | --- |
| `packages/sheet` | `snap-bottom-sheet`, the published package. `src/core` is the engine, `src/react` the bindings. |
| `packages/spring` | `@snap-bottom-sheet/spring` — private, zero-dependency scalar spring |
| `packages/gesture` | `@snap-bottom-sheet/gesture` — private, zero-dependency pointer drag recogniser |
| `docs` | VitePress site. `docs/internal/` is orchestration notes, excluded from the site. |
| `playgrounds/react`, `playgrounds/vanilla`, `playgrounds/next` | manual testing |

The two private packages are bundled into the published output (tsdown
`deps.alwaysBundle`) and are in the changesets `ignore` list, so they never get
versions of their own.

## Development loop

```bash
pnpm dev                              # tsdown watch on packages/sheet
pnpm --filter playground-react dev    # or playground-vanilla / playground-next
pnpm docs:dev                         # the docs site
```

Leave `pnpm dev` running: the playgrounds and docs depend on
`snap-bottom-sheet: workspace:*` and resolve through its `exports` to `dist/`,
so without a build they import nothing. `.claude/launch.json` has
configurations for all three.

## Quality gates

Everything here runs in CI, and the same commands work locally:

```bash
pnpm lint          # biome check .
pnpm typecheck     # tsc --noEmit, every package
pnpm test          # vitest + jsdom
pnpm build         # ESM only, two entries
pnpm verify:pkg    # publint + are-the-types-wrong
pnpm docs:build    # needs pnpm build first
```

lefthook runs biome on staged files before each commit.

One expected piece of noise: building the docs prints Rollup's `Module level
directives cause errors when bundled, "use client" … was ignored` for the React
entry. Any `"use client"` in a bundled dependency triggers it, so every
RSC-aware library does the same. It is not a sign of a duplicate directive —
`dist/react/index.js` carries exactly one, and the core entry carries none.

Tests live in `<package>/test/**/*.test.{ts,tsx}`. React tests use React
Testing Library; cleanup is registered in `packages/sheet/vitest.setup.ts`
rather than per file, because `globals` is off in the vitest config.

Two rules that are easy to break by accident:

- **SSR.** No `window` or `document` at module scope or during render. There
  are tests that render in a `node` environment; they will catch you.
- **Public exports** must be added to `src/index.ts` (core) or
  `src/react/index.ts` (React). The published types are rolled up from those
  two entries, so an export that is not there does not exist.

## Commits and changesets

Conventional commits: `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `build:`,
`ci:`, `refactor:`. Add `!` for a breaking change.

Anything a user would notice needs a changeset:

```bash
pnpm changeset
```

Pick `snap-bottom-sheet` (the private packages are ignored), choose the bump,
and write the entry for someone reading a changelog — what changed, and what
they have to do about it.

## Releasing

Merging to `main` opens or updates a release pull request via changesets.
Merging *that* publishes to npm from GitHub Actions using OIDC trusted
publishing — no npm token lives in this repository. The docs site deploys to
GitHub Pages from the same push.

## How the engine works

The short version, for orientation:

1. `createSheet(elements, options)` returns a controller. It owns the spring,
   the gesture bindings, the observers, and every state-dependent DOM write —
   `role`/`aria-*`, all `data-*`, and the CSS custom properties.
2. Positions are pixel offsets from the top of the view: `0` is fully open,
   `viewHeight` is closed. Snap points are heights and get resolved into
   offsets.
3. Snap indices are the consumer's array order. A y-sorted view is kept
   separately for neighbour and closest searches, and never leaks into an index.
4. `"header"` and `"content"` are measured live through one shared
   `ResizeObserver`. When the active snap's measured value changes, the sheet
   springs to the new offset instead of jumping.
5. On release, velocity is projected 200 ms ahead and the nearest snap to that
   projection wins; past the lowest snap by the dismiss threshold it closes, if
   `dismissible`.
6. The React layer renders elements, registers them through context, mirrors
   props into the controller, and keeps children mounted while the close
   animation plays. No behaviour lives there.

The full design, and the audit of the 0.x code that motivated the rewrite, are
in [`docs/internal/PLAN.md`](./docs/internal/PLAN.md) and
[`docs/internal/AUDIT.md`](./docs/internal/AUDIT.md). They are historical
records, not maintained specs — the code and the
[docs site](https://mhmd-sdghn.github.io/react-bottom-sheet/) are the truth.

## Deliberate shortcuts

Simplifications with a known ceiling carry a `// ponytail:` comment naming the
ceiling and the upgrade path. If you hit one of those ceilings for real, that
comment is your permission to replace it — please say so in the changeset.

## License

By contributing you agree that your contributions are licensed under the MIT
License.
