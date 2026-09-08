# Task 05 — documentation site (VitePress)

Worker: W2. Branch: `w2/05-docs` off `v1` (after task 03 is merged; runs in parallel with task 04). Plan sections: §0, §1, §2 (the whole public API — it is fixed; document it as specified even though the code lands in tasks 04/07), §3.3–3.7.

> DRAFT — finalised by the orchestrator when Phase 1 has merged.

## Goal

A VitePress documentation site in `docs/`, cloned from nBridge's docs setup (structure, theme, writing style, GitHub Pages deployment), covering the 1.0 API for both React and vanilla JS. Live React demos are **not** part of this task (task 09) — but the Vue↔React demo wrapper and its dependencies are set up here so task 09 only adds demo files.

## Reference

- nBridge docs, verbatim: template spec (path in PLAN §0) sections for `docs/package.json`, `.vitepress/config.ts`, `theme/index.ts`, `theme/custom.css`, `index.md`, `guide/getting-started.md`, a reference page, and the template's answer Q1 (proposed `ReactDemo.vue` pattern). Live repo: `/Users/nehn/Projects/Core/nbridge/docs`.
- API source of truth: `docs/internal/PLAN.md` §2. Behavioural details: §3. Old README (`packages/sheet/README.md` after task 00) for the 0.x API used in the migration guide.

## Scope

```
docs/package.json                      name "snap-bottom-sheet-docs", private, vitepress ^1.6, plus react, react-dom,
                                       snap-bottom-sheet (workspace:*) as devDeps for the demo wrapper (task 09 uses them)
docs/.vitepress/config.ts              base "/snap-bottom-sheet/", title "Snap Bottom Sheet", cleanUrls, local search,
                                       srcExclude: ["internal/**"], nav Guide/Reference/Demos, sidebar as below,
                                       vite: { esbuild: { jsx: "automatic" } } for the React demo wrapper,
                                       head favicon with base prefix, socialLinks → GitHub repo, MIT footer
docs/.vitepress/theme/index.ts         default theme + custom.css + global `ReactDemo` component registration
docs/.vitepress/theme/custom.css       brand tokens (pick a distinct accent, not nBridge's)
docs/.vitepress/theme/ReactDemo.vue    props: { mount: (el: HTMLElement) => () => void } — calls mount in onMounted,
                                       cleanup in onBeforeUnmount; renders a bordered "device" frame (relative, overflow
                                       hidden, fixed height ~520px) that demos use as the sheet `container`
docs/public/logo.svg                   simple mark (a rounded sheet with a handle)
docs/index.md                          layout: home — hero, 8 feature cards, "Show me code" code-group (React / Vanilla)
docs/guide/getting-started.md          install, React quickstart, vanilla quickstart, "next steps"
docs/guide/core-concepts.md            y-offset model, snap indices = your array order, header/content, content mode, modal vs non-modal
docs/guide/snap-points.md              numbers, "%", "px", steps(), "header", "content", per-snap { scroll, drag }, sorting rule
docs/guide/dynamic-height.md           "header" + "content", live re-measure, the peek + list pattern
docs/guide/scrolling.md                Sheet.Body, scroll-vs-drag rule, touch-action model (§3.2), reaching the end of content (§3.3)
docs/guide/gestures.md                 drag locks, velocity projection, dismiss threshold, data-snap-sheet-no-drag, handle keyboard
docs/guide/controlled-state.md         open/defaultOpen/onOpenChange, activeSnapIndex/defaultSnapIndex/onSnapIndexChange, SheetHandle ref, veto via dismissible
docs/guide/styling.md                  no CSS shipped; data-state / data-snap-index / data-dragging / data-content-mode; --snap-sheet-y / -progress / -offset; overlay fade recipe; safe-area top offset recipe
docs/guide/accessibility.md            dialog semantics, Title/Description, focus, inert, Escape, reduced motion
docs/guide/nested-sheets.md
docs/guide/ssr-nextjs.md               "use client", Portal renders null until mounted, app router + pages router snippets, dynamic import not required
docs/guide/vanilla.md                  createSheet end-to-end example with plain HTML/CSS
docs/guide/migration.md                0.x → 1.0 table (PLAN §2.4) + before/after code for the README example
docs/reference/react.md                <Sheet> props table, every part (props, rendered element, data attrs), SheetHandle, useSheetState
docs/reference/core.md                 createSheet, SheetElements, SheetOptions, SheetState, SheetController — tables + semantics from §2.2
docs/reference/snap-points.md          SnapValue / SnapPointConfig / SnapPoint / steps()
docs/reference/styling-hooks.md        data attributes + CSS custom properties, where each is written and when
docs/demos/index.md                    placeholder page: "Live demos are added in task 09" + list of planned demos (basic, snap points, dynamic height, scrollable list, nested, vanilla)
.github/workflows/docs.yml             nBridge's docs.yml + a `pnpm build` step before `pnpm docs:build` (the site imports the built package)
package.json (root)                    make sure docs:dev / docs:build / docs:preview filter `snap-bottom-sheet-docs`
```

Writing style: nBridge's — short intro sentence, numbered steps for procedures, `::: tip` / `::: warning` callouts, `::: code-group` for React/Vanilla, 4-column tables (`Prop | Type | Default | Description`), extensionless root-relative links. Every code sample must type-check against PLAN §2 signatures (imports from `snap-bottom-sheet` and `snap-bottom-sheet/react`). No marketing fluff; state limitations honestly (e.g. padding-bottom is stale mid-drag, one-frame bounce on controlled veto).

## Done when

```
pnpm install
pnpm docs:build                 # exits 0; docs/.vitepress/dist exists; internal/ pages are NOT emitted
grep -rl "internal/" docs/.vitepress/dist --include=*.html | wc -l   # 0
pnpm lint
```

If `pnpm docs:build` needs the library built first, run `pnpm build` before it and say so in the report (that is why docs.yml gets a build step).

Commit: `docs: VitePress site with guides and reference` (+ `ci: deploy docs to GitHub Pages` for the workflow).

## Report

Worker report template. Include the page list with word counts and any API question you could not answer from PLAN.md (the orchestrator will fix the plan or the docs).
