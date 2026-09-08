# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`snap-bottom-sheet` — a draggable, snappable bottom sheet published to npm. A
pnpm monorepo: one published package with two entry points, two private
packages bundled into it, a VitePress docs site, and three playgrounds.

The engine is framework-agnostic. `createSheet(elements, options)` attaches to
DOM nodes the consumer already rendered; the React layer renders those nodes
and hands them over. There is no third framework binding yet, but the split
exists so one can be added as another subpath.

## Commands

```bash
pnpm dev                       # tsdown watch on packages/sheet
pnpm build                     # packages/sheet -> dist/ (ESM only, two entries)
pnpm test                      # vitest, all packages
pnpm typecheck                 # tsc --noEmit, all packages (needs `pnpm build` first)
pnpm lint                      # biome check .
pnpm lint:fix                  # biome check --write .
pnpm docs:dev                  # VitePress dev server
pnpm docs:build                # VitePress build (needs `pnpm build` first)
pnpm e2e                       # Playwright, the React playground (needs `pnpm build`)
pnpm verify:pkg                # publint + are-the-types-wrong
pnpm changeset                 # record a release note
```

`pnpm e2e` needs a Chromium once per machine:
`pnpm --filter snap-bottom-sheet-e2e exec playwright install chromium` (the
filter matters — playwright is not linked at the workspace root).

`pnpm typecheck` needs the build for the same reason `pnpm docs:build` does:
the docs package typechecks the demo files, and those resolve
`snap-bottom-sheet` through its `exports` to `dist/`. On a fresh clone or
worktree it reports eight `TS2307 Cannot find module` errors until you build.

Playgrounds: `pnpm --filter playground-react dev`, `playground-vanilla`,
`playground-next`. The playgrounds and the docs depend on
`snap-bottom-sheet: workspace:*` and resolve through its `exports` to `dist/`,
so **run `pnpm build` before them** (or leave `pnpm dev` running).

`.claude/launch.json` has ready-made configurations for the React playground,
the vanilla playground, and the docs site.

## Layout

```
packages/spring        @snap-bottom-sheet/spring   private — scalar spring, no deps
packages/gesture       @snap-bottom-sheet/gesture  private — pointer drag recogniser, no deps
packages/sheet         snap-bottom-sheet           published
  src/index.ts           core entry   -> exports "."
  src/core/              the engine (see below)
  src/react/index.ts     React entry  -> exports "./react"
  src/react/             Root, parts, hooks
docs/                  VitePress site; docs/internal/ is orchestration notes, excluded from the site
playgrounds/{react,vanilla,next}
e2e/                   Playwright suite for the drag/scroll handoff; builds and previews the React playground itself
```

Both private packages are listed in tsdown's `deps.alwaysBundle`, so the
published bundle is self-contained. They are in the changesets `ignore` list and never
get their own version.

## Architecture

### Core (`packages/sheet/src/core`)

| File | Owns |
| --- | --- |
| `sheet.ts` | `createSheet` — the controller; wires everything below together |
| `snap.ts` | snap types, `steps`, resolution, closest/projection, release decision |
| `position.ts` | y math, progress, and the index/step/cycle helpers |
| `measure.ts` | shared `ResizeObserver` for `"header"` / `"content"` / view height |
| `drag.ts` | gesture bindings and the per-move drag ↔ scroll arbiter (one finger moves the sheet up to its scroll ceiling, then the content, and back) |
| `keyboard.ts` | handle keys, the Escape stack |
| `modal.ts` | scroll lock + `inert` + focus capture/restore, as one guard |
| `scroll-lock.ts` | refcounted document scroll lock that restores what it saved |
| `scroll-momentum.ts` | the decay loop for a released content fling |
| `dom.ts` | the frame and rest writes, attribute/style helpers, base style tables, `inert`, focus, content-inner lookup |
| `env.ts` | `isBrowser`, `clamp`, `warnOnce` |
| `types.ts` | the public core types |

The controller owns **all** state-dependent DOM: `role`/`aria-*`, every
`data-*`, the CSS custom properties, and the transform. Nothing that depends
on sheet state is rendered by React.

### React (`packages/sheet/src/react`)

`Sheet.tsx` is a state gate and a lifecycle owner, not an engine: controllable
`open` and `activeSnapIndex`, presence across the close animation, the
prop-to-controller sync effects, and the `SheetHandle` ref. Parts
(`Content`, `Header`, `Body`, `Overlay`, `Handle`, `Title`, `Description`,
`Close`, `Portal`) each render one element and register it through context.

Things that will bite you here:

- `present = open || closing` gates the children, so **a closed sheet has no
  controller**. Anything imperative must go through the open state, not
  `controllerRef.current` — that is why `SheetHandle.open()`/`close()` call the
  controllable setter and resolve through a deferred list.
- `usePartRef` must stay memoised. React detaches and reattaches a callback ref
  whose identity changed, so a fresh closure per render re-registers every part
  on every commit.
- `content` and `container` are fixed for a controller's lifetime; their
  identity keys the create effect (destroy + recreate). Every other part is
  handed over in place with `controller.setElements`.

### Snap model

A snap point is `SnapValue | SnapPointConfig`. `SnapValue` is a number
(`<= 1` a fraction of view height, `> 1` pixels), a `"50%"` or `"320px"`
string, or `"header"` / `"content"` — measured live.

**Indices are the consumer's array order, always.** Internally each point
resolves to `{ index, y, config }` and a y-sorted view is used for
neighbour and closest search, but that ordering never leaks into an index.
`0` is not a valid snap; it is warned about once in dev and dropped. No snap
points (or only `"content"`) is content mode: one snap synthesized from the
measured content height.

## Conventions

- **biome** for lint and format (`biome.jsonc`), enforced by lefthook on commit.
- Tests live in `<package>/test/**/*.test.{ts,tsx}`, vitest + jsdom. React tests
  use RTL; cleanup comes from `packages/sheet/vitest.setup.ts` because `globals`
  is off.
- `.ts`/`.tsx` extensions are included in import specifiers
  (`allowImportingTsExtensions`).
- Deliberate shortcuts carry a `// ponytail:` comment naming the ceiling and the
  upgrade path.
- Conventional commits. User-visible changes need a changeset
  (`pnpm changeset`); the private packages are ignored there.
- New public exports must be added to `src/index.ts` or `src/react/index.ts` —
  the `dist` types are rolled up from those two entries.

## SSR rules

Non-negotiable, and there are tests for them:

- No `window` / `document` at module scope or during render. Use `isBrowser()`
  from `core/env.ts`, or `useIsomorphicLayoutEffect`.
- `Sheet.Portal` returns `null` on the server **and** on the first client
  render, so hydration matches.
- The React entry starts with `"use client"`, and tsdown adds the banner to that
  chunk only — the core entry must stay directive-free.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
