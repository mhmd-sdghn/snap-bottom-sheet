# Task 15 — documentation style pass

Worker: W3 (after task 14.6). Branch: `w3/15-docs-style` off `v1`. Scope: every document a reader sees — `docs/**/*.md` (not `docs/internal/`), `README.md`, `packages/sheet/README.md`, `CONTRIBUTING.md`, `.changeset/*.md`. Not code, not code samples (leave code blocks byte-identical unless a comment inside them is prose).

## The style (owner's requirement)

Polite and a bit formal. Easy to read. Simple English words and simple sentence structures. Clear and direct meaning. A straightforward approach. It should sound like a helpful person wrote it, not a spec generator.

Concretely:
- Short sentences, one idea per sentence. Prefer "you" and the active voice ("The sheet closes when you press Escape", not "Escape dismissal is performed by the controller").
- Common words over rare ones ("use", "show", "move", "starts", not "leverage", "surface", "translate", "commences").
- Say what to do, then why, in that order. Explain a technical term the first time it appears, then use it consistently.
- No stacked clauses, no em-dash chains, no parenthetical asides longer than a few words, no rhetorical flourishes, no reviewer voice ("worth noting", "the tell is").
- Keep headings, tables and callouts; keep every fact. Facts are already verified — do not change meaning.

## Steps

1. Read each file once. Mark sentences that are long (> ~25 words), dense, or jargon-heavy.
2. Rewrite those sentences in the style above. Where a paragraph is a wall of text, split it or turn it into a short list.
3. Add a short "Writing style" section to `CONTRIBUTING.md` with the bullets above, so future contributors keep it.
4. Read the final pages once more end to end as a newcomer would.

## Done when

```
pnpm lint
pnpm build && pnpm docs:build        # exits 0, page count unchanged
git diff --stat v1                    # only .md files changed; no code blocks changed (spot-check with `git diff -U0 | grep '^[-+]```'` → empty)
```

Commit: `docs: plain-language style pass`.

## Report

Worker report template + a before/after example from three different pages so the orchestrator can judge the voice.
