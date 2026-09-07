# snap-bottom-sheet

Monorepo for `snap-bottom-sheet` — a draggable, snappable bottom sheet for
React, with snap points, dynamic content height, scroll-vs-drag arbitration and
nested sheets.

- [`packages/sheet`](./packages/sheet) — the published `snap-bottom-sheet`
  package (npm README lives there)
- [`playgrounds/`](./playgrounds) — apps for manual testing
- [`docs/`](./docs) — documentation site and internal plan/audit

```bash
pnpm install && pnpm build && pnpm --filter playground-react dev
```

Node >= 22, pnpm >= 10. MIT licensed.
