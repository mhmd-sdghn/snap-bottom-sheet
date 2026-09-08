# Task 20 — publish the React playground on GitHub Pages

Ship `playgrounds/react` as a live demo next to the docs, inside the same Pages
artifact.

## Scope

- `playgrounds/react/{vite.config.ts,index.html,src/App.tsx,src/App.css}`
- `package.json` (root scripts), `.github/workflows/docs.yml`
- `README.md`, `packages/sheet/README.md`, `docs/.vitepress/config.ts`,
  `docs/demos/index.md`

## Decisions

- **Base from an env var.** `base: process.env.PLAYGROUND_BASE ?? "/"`. Local
  `dev` and `build` stay at the root; only the site build sets the sub-path.
- **One script, both places.** `pnpm site:build` builds the docs, builds the
  playground with `PLAYGROUND_BASE=/snap-bottom-sheet/playground/`, and copies
  its `dist/` into `docs/.vitepress/dist/playground/`. CI runs that same script,
  so a local build and the deployed site have the same layout.
  `pnpm site:preview` is `vitepress preview`, which serves the whole `dist/`,
  the playground included.
- **The nav entry carries `target: "_self"`.** VitePress 1.6 skips its own
  router for any anchor that has a `target` attribute, so the browser navigates
  to `/playground/` normally instead of asking the SPA for a page that does not
  exist. The link is still base-prefixed, because the path is internal.
- **The prose link in `docs/demos/index.md` is a plain `<a>` with the base
  written out.** A markdown link to `/playground/` would fail the dead-link
  check, since no such page exists at build time.
- The dead `/vite.svg` favicon reference was dropped; there is no `public/`
  directory, so it was a 404 at any base.

## Ceilings

- `site:build` uses `rm -rf` and `cp -R`, so it needs a POSIX shell. That covers
  every developer machine here and the Ubuntu runner. Move it to a Node script
  if Windows ever has to build the site.
- The base path is written out in the script rather than read from the
  VitePress config. Two places name `/snap-bottom-sheet/`; a third would be one
  too many.

## Done when

- `pnpm build && pnpm site:build` produces `docs/.vitepress/dist/index.html` and
  `docs/.vitepress/dist/playground/index.html`, the latter with assets under
  `/snap-bottom-sheet/playground/assets/`.
- `pnpm site:preview` serves both.
- `pnpm --filter playground-react build` still works with no base set.
- `pnpm lint`, `pnpm typecheck`.
