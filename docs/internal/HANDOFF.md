# Hand-off — snap-bottom-sheet 1.0

This note is for the repository owner. It explains what is on `main` (fast-forwarded from `v1` on 2026-09-08), how it was checked, and what is left for you to do.

## What is on `main`

- A pnpm monorepo in the nBridge shape: `packages/sheet` (published as `snap-bottom-sheet`), two private packages (`@snap-bottom-sheet/spring`, `@snap-bottom-sheet/gesture`) that are bundled in, a VitePress docs site with live demos, and three playgrounds (vanilla, React, Next.js).
- A framework-agnostic core (`snap-bottom-sheet`) and thin React bindings (`snap-bottom-sheet/react`). No runtime dependencies. `react` and `react-dom` are optional peers.
- Tooling copied from nBridge: biome, lefthook, tsdown, vitest, changesets, publint + are-the-types-wrong, GitHub Actions for CI, docs and release.
- Tests: about 290 across the three packages, including one named regression test per bug found in the 0.x audit and a bundle-size budget checked in CI.
- Documentation: guides, reference pages, migration guide, and demos. All written in plain, polite English (task 15 finished the style pass).

## How it was checked

Every change went through the same gate before it was merged into `v1`: `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm verify:pkg`, the bundle-size check, `pnpm docs:build`, and the three playground builds (the Next.js build is the SSR/RSC smoke test). Two review rounds were run over the finished code (an independent read of the core and a ten-angle automated review). All 15 confirmed findings are fixed and merged.

## What is left for you

1. **Push `main`.** `main` already contains everything (`git push origin main`). The push starts CI, the docs deployment, and the release workflow, so do steps 2 and 3 first if you want them to succeed on the first run.
2. **Enable GitHub Pages** for the repository (source: GitHub Actions). The `docs.yml` workflow deploys the site to `https://mhmd-sdghn.github.io/react-bottom-sheet/` on the first push to `main`.
3. **Set up npm trusted publishing** for `snap-bottom-sheet` (OIDC, no token), the same way nBridge does it. The `release.yml` workflow then opens a "chore: release" pull request; merging it publishes 1.0.0 from the changeset already on `v1`.
4. **Optional: run OpenCodeReview.** The `ocr` CLI is installed, but it needs an LLM endpoint (`OCR_LLM_URL`, `OCR_LLM_TOKEN`, `OCR_LLM_MODEL`, or `~/.opencodereview/config.json`). Run `ocr review --from main --to v1 --audience agent` once that is set.
5. **Housekeeping.** Most worker branches are already deleted. Three are still checked out in the closed worker sessions' worktrees (`w1/13-review-fixes`, `w2/14-review-fixes-react`, `w3/15-docs-style`); close those sessions, then `git worktree prune` and delete the branches. `v1` can be deleted once `main` is pushed. The root checkout's `node_modules` predates the monorepo: run `pnpm install` there before working in it. `docs/internal/` is a historical record of the rewrite; keep it or prune it before publishing the repository.

## Known limits (deliberate)

- iOS rubber-band scrolling is not prevented while the body lock is on (`// ponytail:` note in `scroll-lock.ts`).
- There is no `asChild` on the React parts and no Vue or Angular binding yet. The core is ready for both.
- The Next.js Pages Router is expected to work by the same mechanism as the App Router, but only the App Router is exercised by a build in CI.
