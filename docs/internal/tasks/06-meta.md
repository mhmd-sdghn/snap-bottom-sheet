# Task 06 — repository meta: README, CONTRIBUTING, CLAUDE.md, changeset

Worker: W3. Branch: `w3/06-meta` off `v1` (after task 03 is merged; parallel with tasks 04 and 05). Plan sections: §0, §1, §2, §4.

> DRAFT — finalised by the orchestrator when Phase 1 has merged.

## Goal

Everything a contributor or npm visitor reads that is not the docs site. Mirror nBridge's tone and structure. **Do not edit `packages/sheet/package.json`** (task 04 owns it — description/keywords are set there) or anything under `packages/*/src`.

## Scope

```
README.md                          root: name + one-line pitch, badges (npm version, CI, license), 30-second React example,
                                   vanilla example, feature bullets, links (docs site, packages/sheet, playgrounds, CONTRIBUTING),
                                   repo layout table (packages/spring, packages/gesture, packages/sheet, docs, playgrounds)
packages/sheet/README.md           REWRITE (this is the npm page): install, React quickstart, vanilla quickstart, snap points cheat-sheet,
                                   why (per-snap scroll/drag locks, live-measured header/content snaps, ~X kB, zero runtime deps,
                                   SSR-safe), links to docs pages for everything deeper, "Migrating from 0.x" pointer. Keep under 200 lines.
CONTRIBUTING.md                    adapt nBridge's: prerequisites (Node 22+, pnpm), setup, repo layout, dev loop
                                   (`pnpm dev` = tsdown watch, playgrounds, docs), quality gates (biome, typecheck, vitest,
                                   build, verify:pkg), commit convention, changesets flow, release via GitHub Actions + OIDC,
                                   "How the engine works" (10-line summary of §3 with links to PLAN/AUDIT for the curious)
CLAUDE.md                          FULL REWRITE for the 1.0 monorepo: what it is, commands, layout, core vs react split, snap model
                                   (indices = consumer order, header/content), engine components (spring/gesture/controller),
                                   conventions (biome, tests location, `// ponytail:` comments, conventional commits, changesets),
                                   SSR rules, and keep the existing graphify section verbatim. Delete every 0.x-specific statement.
.changeset/<slug>.md               `"snap-bottom-sheet": major` — summary: 1.0 rewrite; bullet list of breaking changes from PLAN §2.4
                                   and the headline fixes (AUDIT P0 list, one line each) — this becomes the CHANGELOG entry
.github/pull_request_template.md   keep nBridge's if task 00 added it; otherwise add it
docs/internal/tasks/README.md      3 lines: what these files are, that they are orchestration artefacts, not user docs
```

Facts to get right: package name `snap-bottom-sheet`; import paths `snap-bottom-sheet` (core) and `snap-bottom-sheet/react`; repo `mhmd-sdghn/react-bottom-sheet`; docs URL `https://mhmd-sdghn.github.io/react-bottom-sheet/`; license MIT; author Mo Sadeghian; React 18/19 optional peers; Node ≥ 22. Code samples must match PLAN §2 exactly.

## Done when

```
pnpm lint                                       # biome formats markdown-adjacent json; no errors
pnpm changeset status                           # lists snap-bottom-sheet major
npx --yes markdown-link-check README.md packages/sheet/README.md CONTRIBUTING.md -q   # no dead relative links (external links may be skipped with -a 403)
```

Commit: `docs: README, CONTRIBUTING, CLAUDE.md, 1.0 changeset`.

## Report

Worker report template. Paste the changeset file content.
