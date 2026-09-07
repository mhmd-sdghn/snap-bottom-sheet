# snap-bottom-sheet playgrounds

Small apps used to develop and manually test the library. They depend on
`snap-bottom-sheet` via `workspace:*` and import its built `dist/` output (not
`src/`), so **build the library first**.

| Playground | What it is |
| --- | --- |
| [`react`](./react) | Vite + React 19. Drag scenarios: dynamic height, snap points, nested sheets. |

```bash
# from the repo root, once
pnpm install
pnpm build     # builds packages/sheet -> dist/

# then
pnpm --filter playground-react dev
```

After changing library source, rebuild it (`pnpm build`) or keep `pnpm dev`
(`tsdown --watch`) running — the playground resolves the compiled `dist/`.
