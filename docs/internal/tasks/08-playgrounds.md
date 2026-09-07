# Task 08 — playgrounds (vanilla, react, next)

Worker: W1. Branch: `w1/08-playgrounds` off `v1` (after tasks 04 and 07 are merged). Plan sections: §1, §2.2, §2.3, §0 (SSR row).

> DRAFT — finalised when 04 + 07 have merged.

## Goal

Three small apps that exercise the shipped package the way consumers will — through `dist/` via `workspace:*` — for manual testing and as CI smoke builds. Mirror nBridge's `playgrounds/` conventions (one Vite app per target, `playgrounds/README.md`, `build` script that CI can run).

## Scope

```
playgrounds/README.md                 how to run each (build the lib first; `pnpm --filter playground-<x> dev`)
playgrounds/vanilla/                  Vite, no framework: index.html + src/main.ts + src/style.css
                                      — import { createSheet, steps } from "snap-bottom-sheet"
                                      — scenarios switchable from a <select>: content mode; [ "header", 0.5, 1 ] with a
                                        scrollable list; steps(3); { drag: { down: false } } on the lowest snap;
                                        non-modal; controlled snapTo buttons; destroy/recreate
playgrounds/react/                    REWRITE src/App.tsx against snap-bottom-sheet/react (remove @react-spring/web +
                                      @use-gesture/react deps): scenarios as tabs — login sheet (content mode, inputs),
                                      map-style peek sheet ("header" + 0.5 + scrollable Body with 100 items), dynamic
                                      content growing/shrinking while open, nested sheets (sheet opens a second sheet),
                                      controlled open/snap with external buttons, reduced-motion toggle, custom Portal
                                      container (sheet inside a phone-frame div). Plain CSS file with data-attribute
                                      selectors — no inline styling beyond layout.
playgrounds/next/                     Next.js 15 app router, `playground-next`: app/layout.tsx, app/page.tsx (server
                                      component) rendering a client component that uses snap-bottom-sheet/react with
                                      `defaultOpen`; second route app/pages-router-like/… is unnecessary — one route
                                      is enough. `next build` must pass (this is the SSR/RSC smoke test). next.config
                                      with `transpilePackages` only if actually required (it should not be).
.github/workflows/ci.yml              add step: `pnpm --filter playground-next build` and `pnpm --filter playground-react build`
                                      and `pnpm --filter playground-vanilla build` after the library build
.changeset/config.json                ensure playground-vanilla is in `ignore`
```

## Rules

- Playgrounds import only from `snap-bottom-sheet` / `snap-bottom-sheet/react`. No deep imports, no `../packages` paths.
- No new runtime deps in the react/vanilla playgrounds beyond react/react-dom/vite. Next playground: next, react, react-dom only.
- Every scenario has a heading and a one-line description of what to try (these become the manual QA checklist).
- If a scenario reveals a library bug, do NOT patch the library here — write it up in the report (repro steps) and keep the scenario in place.

## Done when

```
pnpm build
pnpm --filter playground-vanilla build
pnpm --filter playground-react build
pnpm --filter playground-next build
pnpm lint
pnpm typecheck        # root recursive over packages/*; playgrounds typecheck inside their own build scripts
```

Commit: `chore: vanilla, react and next playgrounds` (+ `ci: build playgrounds`).

## Report

Worker report template + the list of scenarios per playground + any library bugs found (with repro).
