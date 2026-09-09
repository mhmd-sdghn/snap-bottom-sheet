# Contributing

Thank you for taking a look. This is a small repository with a strict set of
quality gates. Most of this page is therefore about where things live, and about
what your change has to pass.

## Prerequisites

- **Node 22.22.2 or later, 24.15 or later, or 26 and above.** The floors come
  from the development toolchain rather than from the library: jsdom, tsdown
  and vitest each refuse to run on older patch releases. CI uses 24, and
  `.nvmrc` pins it. The published package itself has no Node requirement — it
  runs in the browser.
- **pnpm.** The repo is a pnpm workspace, and `packageManager` is pinned.

## Setup

```bash
pnpm install     # also installs the lefthook git hooks
pnpm build       # the docs and playgrounds import the built package
```

## Repository layout

| Path | What |
| --- | --- |
| `packages/sheet` | `snap-bottom-sheet`, the published package. `src/core` is the engine, `src/react` the bindings. |
| `packages/spring` | `@snap-bottom-sheet/spring`, a private scalar spring with no dependencies |
| `packages/gesture` | `@snap-bottom-sheet/gesture`, a private pointer drag recogniser with no dependencies |
| `docs` | VitePress site. |
| `playgrounds/react`, `playgrounds/vanilla`, `playgrounds/next` | manual testing |

The two private packages are bundled into the published output by tsdown, using
`deps.alwaysBundle`. They are also in the changesets `ignore` list, so they
never get versions of their own.

## Development loop

```bash
pnpm dev                              # tsdown watch on packages/sheet
pnpm --filter playground-react dev    # or playground-vanilla / playground-next
pnpm docs:dev                         # the docs site
```

Please leave `pnpm dev` running. The playgrounds and the docs depend on
`snap-bottom-sheet: workspace:*`, and they resolve through its `exports` to
`dist/`. Without a build there is nothing for them to import.
`.claude/launch.json` has configurations for all three.

## Quality gates

Everything below runs in CI, and the same commands work on your machine:

```bash
pnpm lint          # biome check .
pnpm typecheck     # tsc --noEmit, every package
pnpm test          # vitest + jsdom
pnpm build         # ESM only, two entries
pnpm verify:pkg    # publint + are-the-types-wrong
pnpm docs:build    # needs pnpm build first
```

lefthook runs biome on staged files before each commit.

There is one warning you can expect to see. Building the docs prints Rollup's
`Module level directives cause errors when bundled, "use client" … was ignored`
for the React entry. Any `"use client"` in a bundled dependency triggers it, so
every RSC-aware library does the same. It does not mean the directive is
duplicated. `dist/react/index.js` carries exactly one, and the core entry
carries none.

Tests live in `<package>/test/**/*.test.{ts,tsx}`. React tests use React
Testing Library. Cleanup is registered once in `packages/sheet/vitest.setup.ts`
rather than in each file, because `globals` is off in the vitest config.

Two rules are easy to break by accident:

- **Server-side rendering (SSR).** Nothing may touch `window` or `document` at
  module scope or during render. Some tests render in a `node` environment, and
  they will catch you.
- **Public exports** must be added to `src/index.ts` (core) or
  `src/react/index.ts` (React). The published types are rolled up from those
  two entries, so an export that is missing there does not exist.

## Writing style

The prose in this project has one voice: polite, a bit formal, and easy to
read. It applies to everything in `docs/`, to both READMEs, and to changeset
entries.

- Write short sentences, with one idea in each.
- Say "you", and use the active voice. "The sheet closes when you press
  Escape", not "Escape dismissal is performed by the controller".
- Choose common words over rare ones. "use", not "leverage". "show", not
  "surface".
- Say what to do first, then say why.
- Explain a technical term the first time it appears on a page, then use that
  same term throughout.
- Avoid stacked clauses, chains of em dashes, and long asides in brackets.
- Keep the headings, tables and VitePress callouts as they are. They carry
  meaning of their own.

## Commits and changesets

Conventional commits: `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `build:`,
`ci:`, `refactor:`. Add `!` for a breaking change.

Anything a user would notice needs a changeset:

```bash
pnpm changeset
```

Pick `snap-bottom-sheet`, since the private packages are ignored, then choose
the bump. Write the entry for someone reading a changelog. Say what changed, and
say what they have to do about it.

## Releasing

Merging to `main` opens or updates a release pull request through changesets.
Merging *that* pull request publishes to npm from GitHub Actions, using OIDC
trusted publishing. No npm token lives in this repository. The docs site deploys
to GitHub Pages from the same push.

## How the engine works

Here is the short version, to help you find your way:

1. `createSheet(elements, options)` returns a controller. The controller owns
   the spring, the gesture bindings and the observers. It also owns every DOM
   write that depends on state: `role` and `aria-*`, all `data-*`, and the CSS
   custom properties.
2. Positions are pixel offsets from the top of the view. `0` is fully open, and
   `viewHeight` is closed. Snap points are heights, and they are resolved into
   offsets.
3. Snap indices follow the consumer's array order. A y-sorted view is kept
   separately, for neighbour and closest searches, and it never leaks into an
   index.
4. `"header"` and `"content"` are measured live through one shared
   `ResizeObserver`. When the measured value of the active snap changes, the
   sheet springs to the new offset instead of jumping.
5. On release, the velocity is projected 200 ms ahead, and the snap nearest to
   that projection wins. If the projection passes the lowest snap by the dismiss
   threshold, the sheet closes, as long as it is `dismissible`.
6. The React layer renders the elements, registers them through context, mirrors
   props into the controller, and keeps children mounted while the close
   animation plays. No behaviour lives there.

## Deliberate shortcuts

A simplification with a known ceiling carries a `// ponytail:` comment. The
comment names the ceiling and the way to move past it. If you reach one of those
ceilings in real use, the comment is your permission to replace the code. Please
say so in the changeset when you do.

## License

By contributing you agree that your contributions are licensed under the MIT
License.
