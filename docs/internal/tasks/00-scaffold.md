# Task 00 — monorepo scaffold (nBridge tooling)

Worker: W1. Branch: `w1/00-scaffold` off `v1`. Plan sections: §0, §1, §4.1.

## Goal

Turn the single-package Vite library into the nBridge-style pnpm monorepo **without changing library behaviour**. The old `lib/` code moves to `packages/sheet/src/` and must still build (with tsdown) and run in the React playground. Phase 2 will rewrite the library code; do not refactor it here beyond what the build needs.

## Reference material (read first)

- Verbatim nBridge files + rename map + answers: `/private/tmp/claude-501/-Users-nehn-Projects-Core-snap-bottom-sheet--claude-worktrees-bottom-sheet-audit-f63d97/4cf93f8c-a568-4d78-a164-34f1c87b4e64/scratchpad/nbridge-template.md`
- Live reference repo (read-only): `/Users/nehn/Projects/Core/nbridge`
- Current repo: `package.json`, `vite.config.lib.ts`, `tsconfig.*.json`, `eslint.config.js`, `lib/**`, `src/**`, `CLAUDE.md`

## Steps

1. **Moves** (use `git mv` so history follows):
   - `lib/` → `packages/sheet/src/`
   - `src/` → `playgrounds/react/src/`, `index.html` → `playgrounds/react/index.html`, `vite.config.ts` → `playgrounds/react/vite.config.ts` (rewrite: no aliases, `@vitejs/plugin-react-swc`), `src/assets` moves with it.
   - Inside `packages/sheet/src/**`, rewrite every `@lib/...` import to a relative path (`../utils.ts` etc.). Keep the `.ts`/`.tsx` extensions — tsdown, vitest and `moduleResolution: "bundler"` accept them. Delete the `@lib` alias everywhere.
   - `playgrounds/react/src/App.tsx`: import from `"snap-bottom-sheet"` instead of `"@lib/index"`. Remove the `react-scan` import if present anywhere.
2. **Delete**: `eslint.config.js`, `.prettierrc`, `.prettierignore`, `.husky/`, `.lintstagedrc.json`, `vite.config.lib.ts`, `tsconfig.app.json`, `tsconfig.node.json`, `tsconfig.lib.declarations.json`, root `tsconfig.json` (replace per package), `dist/` if present.
3. **Root files** (clone from the template, apply the rename map — package `snap-bottom-sheet`, repo `mhmd-sdghn/react-bottom-sheet`, author `Mo Sadeghian`, docs filter `snap-bottom-sheet-docs`):
   - `package.json` — `name: "snap-bottom-sheet-monorepo"`, `private: true`, `engines.node >=22`, `packageManager` = the pnpm version installed locally (`pnpm -v`), scripts: `build`, `dev`, `test`, `lint`, `lint:fix`, `typecheck`, `verify:pkg`, `changeset`, `release`, plus `docs:dev`/`docs:build` pointing at `snap-bottom-sheet-docs` (the docs package does not exist yet — that is fine, `--filter` on a missing package fails; leave the scripts in place, they are wired in task 05). devDeps: `@biomejs/biome`, `@changesets/cli`, `@changesets/changelog-github`, `lefthook`.
   - `pnpm-workspace.yaml` — `packages/*`, `playgrounds/*`, `docs`; `allowBuilds` for `esbuild`, `lefthook`, `@parcel/watcher`.
   - `biome.json` — as nBridge (2-space, 80 col, double quotes, trailing commas, LF, `recommended`), excludes `**/dist`, `**/.vitepress/cache`, `**/.vitepress/dist`, `**/graphify-out`. Add an `overrides` entry for `packages/sheet/src/**` that downgrades any rule the *legacy* code trips to `"warn"` — put a comment key `"//": "legacy 0.x code, removed in task 04"` next to it so task 04 deletes the override. Do not rewrite legacy code to satisfy lint.
   - `lefthook.yml`, `.editorconfig`, `.gitattributes`, `.nvmrc` (`24`), `.gitignore` (add `dist`, `.vitepress/cache`, `.vitepress/dist`, `*.tsbuildinfo`, `.next`).
   - `.changeset/config.json` — `changelog: ["@changesets/changelog-github", { repo: "mhmd-sdghn/react-bottom-sheet" }]`, `access: public`, `baseBranch: main`, `ignore: ["snap-bottom-sheet-docs", "playground-react", "playground-next", "@snap-bottom-sheet/spring", "@snap-bottom-sheet/gesture"]`.
   - `.github/workflows/ci.yml` (lint → typecheck → test → build → verify:pkg, node 24, pnpm/action-setup@v4), `.github/workflows/release.yml` (changesets/action, OIDC, `NPM_CONFIG_PROVENANCE`), `.github/pull_request_template.md`. Do **not** add `docs.yml` yet (task 05).
   - `LICENSE` — MIT, `Copyright (c) 2026 Mo Sadeghian`.
4. **`packages/sheet/`**:
   - `package.json`: `name: "snap-bottom-sheet"`, keep `version: "0.0.10"` (changesets bumps to 1.0.0 in task 07), `type: module`, `license: MIT`, `author`, `repository` (`git+https://github.com/mhmd-sdghn/react-bottom-sheet.git`, `directory: packages/sheet`), `homepage: https://mhmd-sdghn.github.io/react-bottom-sheet`, `bugs`, `keywords` (keep current list), `sideEffects: false`, `files: ["dist"]`, `exports: { ".": { types: "./dist/index.d.ts", default: "./dist/index.js" }, "./package.json": "./package.json" }`, no `main`/`module`/`unpkg`. Scripts: `build: tsdown`, `dev: tsdown --watch`, `test: vitest run`, `test:watch: vitest`, `typecheck: tsc --noEmit`, `verify:pkg: publint && attw --pack . --profile esm-only --exclude-entrypoints ./package.json`. `peerDependencies`: `react`, `react-dom` `^18.0.0 || ^19.0.0`. **Temporary** `dependencies`: `@react-spring/web ^9.7.5`, `@use-gesture/react ^10.3.1` (legacy code needs them; task 04 removes). devDeps: `tsdown`, `typescript`, `vitest`, `jsdom`, `@testing-library/react`, `react`, `react-dom`, `@types/react`, `@types/react-dom`, `@types/node`, `publint`, `@arethetypeswrong/cli` — pin to the versions listed in the template's item 14.
   - `tsconfig.json`: nBridge's (`ES2022`, `moduleResolution: bundler`, `strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `jsx: react-jsx`, `noEmit`, `allowImportingTsExtensions: true`), `include: ["src", "test", "tsdown.config.ts", "vitest.config.ts"]`. If `verbatimModuleSyntax` breaks legacy imports (`import { FC }` used as a type), fix those imports to `import type` — that is allowed.
   - `tsdown.config.ts`: `entry: { index: "src/index.ts" }`, `format: ["esm"]`, `dts: true`, `platform: "browser"`, `clean: true`, `deps.neverBundle: ["react", "react-dom", "react/jsx-runtime"]`, `outputOptions: { banner: '"use client";' }`. Verify the banner is the first line of `dist/index.js`.
   - `vitest.config.ts`: jsdom, `include: ["test/**/*.test.{ts,tsx}"]`, `restoreMocks: true`.
   - `test/index.test.ts`: smoke — import `../src/index.ts`, assert `Sheet`, `Sheet.Container`, `Sheet.DynamicHeight`, `useSnapState`, `SnapPointDynamicValue` are defined.
   - `README.md`: move the current root README here unchanged (it becomes the npm README; rewritten in task 07). Root `README.md` becomes a 10-line pointer (name, one-paragraph description, links to `packages/sheet`, `docs/`, `playgrounds/`).
5. **`playgrounds/react/`**: `package.json` (`name: "playground-react"`, private, scripts `dev`/`build`/`preview`, deps `snap-bottom-sheet: workspace:*`, `react`, `react-dom`, `@react-spring/web`, `@use-gesture/react`; devDeps `vite`, `@vitejs/plugin-react-swc`, `typescript`, `@types/react`, `@types/react-dom`), `tsconfig.json`, `vite.config.ts`. `playgrounds/README.md` explaining `pnpm build` first then `pnpm --filter playground-react dev`.
6. **`CLAUDE.md`**: update only paths and commands (`lib/` → `packages/sheet/src/`, `pnpm dev` → `pnpm --filter playground-react dev`, lint = biome, build = tsdown). Note at the top: "Architecture section describes the legacy 0.x engine; see docs/internal/PLAN.md for the 1.0 design." Full rewrite is task 07.
7. `pnpm install` (lockfile regenerates — commit the new `pnpm-lock.yaml`), `pnpm lint:fix`, then the Done-when commands.
8. `graphify update .` and include `graphify-out/` changes.
9. Commit (one commit): `chore!: restructure into pnpm monorepo with tsdown, biome, vitest, changesets` — body lists what moved, what was deleted, and that library behaviour is unchanged.

## Done when

```
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build                       # → packages/sheet/dist/index.js + index.d.ts (+ maps), nothing else
pnpm verify:pkg                  # publint + attw esm-only clean
pnpm --filter playground-react build
head -1 packages/sheet/dist/index.js   # → "use client";
git status --porcelain           # empty after commit
```

## Report

Use the format from PLAN §4.1 / the worker report template. Include: final tree (`find . -maxdepth 3 -type d -not -path '*/node_modules*' -not -path './.git*'`), the versions pinned, any legacy lint rules you had to downgrade, branch + HEAD.
