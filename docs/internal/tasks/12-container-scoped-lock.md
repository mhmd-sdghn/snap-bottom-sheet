# Task 12 — container-scoped modal behaviour + handle JSDoc

Worker: W1 (after task 10). Branch: `w1/12-container-lock` off `v1`. Plan sections: §2.2, §3.5, §3.6.

> FINAL. Source: task 09 — every docs demo had to run `modal={false}` because a modal sheet inside a custom `container` still locks the *document* (`lockBodyScroll()` is unconditional; `container` scopes only `inert`). Embedded sheets (docs demos, split-pane apps, phone-frame previews) are a real use case.

## Changes

1. **Scoped lock:** when `elements.container` is given, `modal` locks the **container** instead of the document: save/restore the container's inline `overflow` and `overscroll-behavior` (no padding-right compensation), refcounted per container (a `WeakMap<HTMLElement, { count, saved }>` in `scroll-lock.ts` alongside the document lock). Without a container the behaviour is unchanged. `isBodyScrollLocked()` keeps reporting the document lock only.
2. **Escape stays global** (document keydown) — an embedded modal sheet still closes on Escape; `inert` stays scoped to the container's children (unchanged).
3. **JSDoc:** `SheetHandle.open()/close()` in `src/react/Sheet.tsx` must state the controlled case: "On a controlled sheet the call is advisory and resolves immediately — the parent owns `open`."
4. **Docs:** update `guide/accessibility.md`, `reference/core.md` (SheetElements.container row) and `demos/index.md` + `demos/basic.md` (they currently explain the `modal={false}` workaround) — the demos may now run `modal` where it makes sense (keep `basic` modal to prove the page does not lock). Coordinate with nothing — W2 is on task 06, these files are yours for this task.

## Tests

- Container + `modal: true` → `open()` leaves `document.documentElement/body` styles untouched, container gets `overflow: hidden`; `close()` restores the container's previous inline value; two sheets in one container → refcount; `destroy()` mid-open releases.
- No container → existing document-lock tests still pass unchanged.

## Done when

```
pnpm typecheck && pnpm test && pnpm lint && pnpm build && pnpm verify:pkg && pnpm docs:build
```

Commit: `feat(core): scope the modal scroll lock to a custom container`, `docs: container-scoped modal demos`.

## Also (tiny)

- `.claude/launch.json` `docs` entry: `pnpm docs:dev -- --port 5175 --strictPort` reaches vitepress as `vitepress dev -- --port 5175`, and vitepress ignores everything after `--`, so the server starts on 5173 while the launch config expects 5175. Fix: make `docs/package.json`'s `docs:dev` accept the port (`vitepress dev --port 5175 --strictPort` directly in the docs package script, or drop the `--`), and point the launch entry at the port it actually uses.
