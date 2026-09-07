# Task 09 — live demos in the docs site

Worker: W2. Branch: `w2/09-docs-demos` off `v1` (after tasks 04, 05, 07 are merged). Plan section: §1 (docs), task 05 (the `ReactDemo.vue` wrapper).

> DRAFT — finalised when 04 + 05 + 07 have merged.

## Goal

Interactive React demos embedded in the VitePress pages, running the real published build (`snap-bottom-sheet/react` via `workspace:*` → `dist/`), each inside a phone-frame container so the sheet does not take over the docs page (uses `Sheet.Portal container={frame}` and `modal={false}` where appropriate; body scroll lock must never fire on the docs page — use a non-body container so the controller scopes `inert`/lock to the frame, or verify `modal` behaviour is acceptable inside the frame and document the choice).

## Scope

```
docs/.vitepress/theme/demos/*.tsx      one file per demo, default export `(el: HTMLElement) => () => void` (createRoot/unmount)
docs/.vitepress/theme/demos/demo.css   shared demo styling via data-attributes (no inline styles in demos)
docs/demos/index.md                    overview grid linking each demo page
docs/demos/basic.md                    open/close, content mode
docs/demos/snap-points.md              [0.25, 0.5, 0.9] + steps(); shows activeSnapIndex live via useSheetState()
docs/demos/dynamic-height.md           "header" + "content" with a button that adds/removes rows while open
docs/demos/scrollable.md               Body with 100 rows, scroll: true at the top snap; shows scroll-vs-drag rule
docs/demos/nested.md                   sheet opening a second sheet
docs/demos/controlled.md               external buttons drive open + snap index; handle ref
docs/demos/vanilla.md                  the same basic demo written with createSheet in plain TS (mounted through the same wrapper, no React)
docs/guide/*.md                        embed the matching demo at the top of getting-started, snap-points, dynamic-height, scrolling, controlled-state (<ClientOnly><ReactDemo :mount="..."/></ClientOnly> with a script setup import)
```

## Rules

- Demos are the docs' code samples: keep them short, copy-pasteable, and identical to the snippet shown below them (use `<<< @/.vitepress/theme/demos/basic.tsx` VitePress file includes so the snippet IS the demo source).
- No `any`, no `@ts-ignore`. Demos type-check under the docs tsconfig (add one if missing: extends the sheet's, `jsx: react-jsx`, includes `.vitepress/theme`).
- Do not modify the library. Bugs → report with repro.

## Done when

```
pnpm build
pnpm docs:build         # green; every demos/*.md page emitted
pnpm lint
```

Manual: `pnpm docs:dev`, open each demo page, drag the sheet, confirm the docs page itself does not scroll-lock or shift.

Commit: `docs: live React demos`.

## Report

Worker report template + a screenshot-free checklist of what you verified by hand in `docs:dev` per demo.
