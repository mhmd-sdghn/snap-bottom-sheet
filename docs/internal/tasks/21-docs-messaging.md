# Task 21 — docs messaging: capabilities, not 0.x bugs

Worker: solo. Branch: `agent/21-docs-messaging` off `main`.

## Why

The user-facing docs sold the library against the 0.x package: dropped peer
dependencies, "indices no longer disagree with your array", the tip in Core
Concepts that named a 0.x bug. A new reader has no 0.x context, and a fixed bug
is not a feature. The pages should say what the library does.

## Scope

`docs/index.md`, `docs/guide/*` (not `scrolling.md` or `gestures.md`, which
task 19 owns, and not `migration.md`), `docs/reference/*` prose,
`docs/demos/*` intros, `README.md`, `packages/sheet/README.md`,
`CONTRIBUTING.md`. `docs/guide/migration.md` and
`.changeset/spotty-pandas-rewrite.md` are the only places allowed to mention
0.x, and neither was edited.

## What to say instead

Snap points the consumer defines (fractions, percentages, pixels, `steps()`,
live-measured `"header"` / `"content"`, per-snap `scroll` and `drag`); small
with no runtime dependencies; content mode, nested sheets, portal containers,
controlled or uncontrolled; TypeScript first; a vanilla core with React
bindings, so another framework can sit on the same engine; SSR-safe including
the Next.js App Router; dialog semantics, focus, `inert`, Escape, reduced
motion; and one continuous touch that drags the sheet, then scrolls the body,
then hands the gesture back.

## Done when

```bash
git grep -n -i -E "0\.x|react-spring|use-gesture|no longer|previous version|used to" \
  -- docs README.md packages/sheet/README.md CONTRIBUTING.md \
  ':!docs/internal' ':!docs/guide/migration.md'   # only task 19's scrolling.md line
pnpm lint
pnpm build && pnpm docs:build
```

`docs/internal/**` keeps its 0.x references. Those are historical orchestration
notes and are excluded from the site.
