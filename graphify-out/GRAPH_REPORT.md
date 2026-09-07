# Graph Report - bottom-sheet-audit-f63d97  (2026-09-07)

## Corpus Check
- 129 files · ~74,950 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1189 nodes · 1454 edges · 113 communities (85 shown, 28 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 34 edges (avg confidence: 0.72)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b02f2e40`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Lint and Tooling Dev Deps
- Package Manifest and Publishing
- Snap Point Model and Utils
- Compound Component and Types
- Context, Overlay and Drag Events
- App TypeScript Config
- Library Declarations Config
- Node and Vite TS Config
- Corpus Ingest and Incremental Update
- Semantic Extraction Spec
- Public API and Snap State Hook
- Graph Query and Traversal
- Build, Audit Trail and Guards
- Shared Height Observers
- React Peer Dependencies
- Package Scripts
- Watch and Auto-Rebuild Hooks
- Spring Animation and Drag End
- Visualization and Wiki Exports
- Repo Clone and Graph Merge
- Root TS Project References
- Graph Database Exports
- Vite Template Branding
- Import Alias Convention
- External Peer Deps Rationale
- ESLint Config File
- Vite Env Types
- Playground Vite Config
- Library Vite Config
- package.json
- config.json
- package.json
- Contracts
- devDependencies
- graphify reference: extra exports and benchmark
- Task 01 — `@snap-bottom-sheet/spring`
- Task 02 — `@snap-bottom-sheet/gesture`
- Task 00 — monorepo scaffold (nBridge tooling)
- graphify reference: query, path, explain
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- pull_request_template.md
- context.tsx
- bugs
- dependencies
- files
- repository
- @biomejs/biome
- @changesets/cli
- graphify
- compilerOptions
- package.json
- Contracts
- Task 07 — React bindings (`snap-bottom-sheet/react`)
- Task 05 — documentation site (VitePress)
- Task 06 — repository meta: README, CONTRIBUTING, CLAUDE.md, changeset
- Task 09 — live demos in the docs site
- Task 10 — integration tests, regression suite, bundle budget
- sheet.ts
- sheet.test.ts
- ModalGuard
- devDependencies
- Core API
- drag.ts
- Parts
- modal.ts
- DragDeps
- Vanilla JS
- Controlled State
- Gestures
- Styling
- Accessibility
- Core Concepts
- Dynamic Height
- Snap Points
- Styling Hooks
- Scrolling
- SSR & Next.js
- Snap Points
- Getting Started
- Migrating from 0.x
- Nested Sheets
- FakeResizeObserver
- Spring
- ReactDemo.vue
- Task 11 — core/react follow-ups surfaced by the docs pass
- index.md
- index.md
- main.ts
- sheet.test.tsx
- App.tsx
- SheetController
- Sheet.tsx
- sheet-demo.tsx
- snap-bottom-sheet playgrounds
- next.config.mjs
- pointer.ts
- FakeResizeObserver
- SheetElements

## God Nodes (most connected - your core abstractions)
1. `createSheet()` - 34 edges
2. `react` - 21 edges
3. `SheetController` - 17 edges
4. `keywords` - 16 edges
5. `compilerOptions` - 16 edges
6. `compilerOptions` - 16 edges
7. `compilerOptions` - 16 edges
8. `compilerOptions` - 15 edges
9. `DragDeps` - 14 edges
10. `scripts` - 13 edges

## Surprising Connections (you probably didn't know these)
- `Snap points: pixels, percentages, dynamic` --semantically_similar_to--> `Pixel y-offset-from-top internal model`  [INFERRED] [semantically similar]
  README.md → CLAUDE.md
- `Dynamic height handling usage` --semantically_similar_to--> `Content mode (no real snap points)`  [INFERRED] [semantically similar]
  README.md → CLAUDE.md
- `applyInert()` --indirect_call--> `el()`  [INFERRED]
  packages/sheet/src/core/dom.ts → playgrounds/vanilla/src/main.ts
- `createSheet()` --indirect_call--> `el()`  [INFERRED]
  packages/sheet/src/core/sheet.ts → playgrounds/vanilla/src/main.ts
- `usePartRef()` --indirect_call--> `el()`  [INFERRED]
  packages/sheet/src/react/context.ts → playgrounds/vanilla/src/main.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **AST + Semantic Extraction and Merge Flow** — _claude_skills_graphify_skill_detect_files, _claude_skills_graphify_skill_structural_extraction_ast, _claude_skills_graphify_skill_semantic_extraction, _claude_skills_graphify_skill_extraction_cache, _claude_skills_graphify_skill_build_cluster_analyze [EXTRACTED 1.00]
- **Optional Graph Export Targets** — _claude_skills_graphify_references_exports_neo4j_export, _claude_skills_graphify_references_exports_falkordb_export, _claude_skills_graphify_references_exports_svg_export, _claude_skills_graphify_references_exports_graphml_export, _claude_skills_graphify_references_exports_wiki_export, _claude_skills_graphify_references_exports_mcp_server [EXTRACTED 1.00]
- **Query Expansion, Traversal and Self-Improving Feedback Loop** — _claude_skills_graphify_references_query_constrained_query_expansion, _claude_skills_graphify_references_query_graph_vocabulary, _claude_skills_graphify_references_query_bfs_traversal, _claude_skills_graphify_references_query_save_result, _claude_skills_graphify_references_query_work_memory_lessons [EXTRACTED 1.00]

## Communities (113 total, 28 thin omitted)

### Community 0 - "Lint and Tooling Dev Deps"
Cohesion: 0.07
Nodes (29): @biomejs/biome, @changesets/changelog-github, @changesets/cli, lefthook, devDependencies, @biomejs/biome, @changesets/changelog-github, @changesets/cli (+21 more)

### Community 1 - "Package Manifest and Publishing"
Cohesion: 0.04
Nodes (47): author, bugs, description, exports, ./package.json, ./react, files, homepage (+39 more)

### Community 2 - "Snap Point Model and Utils"
Cohesion: 0.50
Nodes (4): graphify skill trigger (/graphify), graphify query-first workflow for this repo, snap-bottom-sheet (library overview), Vite playground HTML entry

### Community 3 - "Compound Component and Types"
Cohesion: 0.18
Nodes (9): elementCallbacks, handleViewResize(), HeightCallback, heightOf(), notify(), observeHeight(), observeViewHeight(), viewCallbacks (+1 more)

### Community 4 - "Context, Overlay and Drag Events"
Cohesion: 0.67
Nodes (3): Pixel y-offset-from-top internal model, Consumer best practices, Snap points: pixels, percentages, dynamic

### Community 5 - "App TypeScript Config"
Cohesion: 0.10
Nodes (20): 1. Dynamic Height Handling, 1. `<Sheet>` (Root Component), 2. Scroll Management, 2. `<Sheet.Container>`, 3. Drag Behavior Control, 3. `<Sheet.DynamicHeight>\*\*, 4. Custom Positioning, Basic Usage 🚀 (+12 more)

### Community 6 - "Library Declarations Config"
Cohesion: 0.09
Nodes (20): closest(), decideRelease(), isConfig(), isContentMode(), MeasureContext, normalize(), NormalizedSnap, project() (+12 more)

### Community 7 - "Node and Vite TS Config"
Cohesion: 0.10
Nodes (19): DOM, DOM.Iterable, ES2022, src, vite.config.ts, compilerOptions, isolatedModules, jsx (+11 more)

### Community 8 - "Corpus Ingest and Incremental Update"
Cohesion: 0.21
Nodes (12): /graphify add URL Ingest, graphify.ingest.ingest, URL Type Auto-Detection, Transcripts Treated as Doc Files, GRAPHIFY_WHISPER_MODEL Setting, Whisper Transcription (transcribe_all), detect_incremental, graph_diff Update Summary (+4 more)

### Community 9 - "Semantic Extraction Spec"
Cohesion: 0.05
Nodes (38): Body, BodyProps, Close, CloseProps, Content, ContentProps, PartName, SheetContext (+30 more)

### Community 10 - "Public API and Snap State Hook"
Cohesion: 0.06
Nodes (32): @arethetypeswrong/cli, devDependencies, @arethetypeswrong/cli, jsdom, publint, react, react-dom, @snap-bottom-sheet/gesture (+24 more)

### Community 11 - "Graph Query and Traversal"
Cohesion: 0.11
Nodes (18): 1. Correctness bugs, 2. Footguns and latent bugs, 3. Performance, 4. API and DX gaps, 5. Repo / tooling gaps (vs nbridge), 6. Proposed target, 7. Found during design (addendum), P0-1 — `snapPoints` index ≠ `snapValues` index (+10 more)

### Community 12 - "Build, Audit Trail and Guards"
Cohesion: 0.22
Nodes (10): calls Edge Direction and Same-Language Constraint, Discrete Confidence Score Rubric, DEEP_MODE Aggressive Inference, Hyperedges, Node ID Format Rule, semantically_similar_to Edge, Extraction Subagent Prompt, EXTRACTED/INFERRED/AMBIGUOUS Audit Trail (+2 more)

### Community 14 - "React Peer Dependencies"
Cohesion: 0.27
Nodes (10): MCP stdio Server (graphify.serve), BFS Traversal, Constrained Query Expansion, DFS Traversal, Graph Label Vocabulary (.vocab.txt), /graphify explain Node Explanation, /graphify path Shortest Path, Inline NetworkX Traversal Fallback (+2 more)

### Community 15 - "Package Scripts"
Cohesion: 0.22
Nodes (8): API (exact), Behaviour, Done when, Goal, Report, Scope, Task 01 — `@snap-bottom-sheet/spring`, Tests (`test/spring.test.ts`, vitest fake timers)

### Community 16 - "Watch and Auto-Rebuild Hooks"
Cohesion: 0.07
Nodes (26): compilerOptions, allowImportingTsExtensions, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, jsx, lib, module (+18 more)

### Community 18 - "Visualization and Wiki Exports"
Cohesion: 0.09
Nodes (21): 0. Decisions (final — do not re-open), 1. Target repository layout, 2.1 Snap points, 2.2 Core (vanilla) API — `snap-bottom-sheet`, 2.3 React API — `snap-bottom-sheet/react`, 2.4 Removed from 0.x, 2. Public API (1.0), 3.1 `@snap-bottom-sheet/spring` (+13 more)

### Community 19 - "Repo Clone and Graph Merge"
Cohesion: 0.22
Nodes (8): API (exact), Behaviour, Done when, Goal, Report, Scope, Task 02 — `@snap-bottom-sheet/gesture`, Tests (`test/drag.test.ts`, jsdom)

### Community 20 - "Root TS Project References"
Cohesion: 0.32
Nodes (8): Watch Debounce Window, needs_update Flag, --watch Folder Watcher, Post-Commit Auto-Rebuild Hook, Work Memory and LESSONS.md Reflection, Code-Only Change Fast Path, No API Key Requirement, Part A Structural AST Extraction

### Community 25 - "ESLint Config File"
Cohesion: 0.22
Nodes (8): 04b — review findings to fix on the same branch (orchestrator review of 816d148), Contract, Done when, Goal, Report, Scope, Task 04 — core controller (`createSheet`), Tests (jsdom; stub `ResizeObserver`, `requestAnimationFrame` as in task 01, `matchMedia`)

### Community 26 - "Vite Env Types"
Cohesion: 0.07
Nodes (18): attachDrag(), DragHandlers, DragOptions, DragState, Phase, Sample, ends, FakePointerEvent (+10 more)

### Community 27 - "Playground Vite Config"
Cohesion: 0.29
Nodes (6): Done when, Goal, Reference material (read first), Report, Steps, Task 00 — monorepo scaffold (nBridge tooling)

### Community 28 - "Library Vite Config"
Cohesion: 0.33
Nodes (6): GraphML Export, SVG Export, Wiki Export, --cluster-only Reclustering, Step 5 Community Labeling, Step 6 HTML and Obsidian Export

### Community 29 - "package.json"
Cohesion: 0.07
Nodes (26): dependencies, react, react-dom, snap-bottom-sheet, devDependencies, @types/react, @types/react-dom, typescript (+18 more)

### Community 30 - "config.json"
Cohesion: 0.12
Nodes (16): access, baseBranch, changelog, commit, fixed, ignore, linked, $schema (+8 more)

### Community 31 - "package.json"
Cohesion: 0.33
Nodes (6): source_file Verbatim Rule, build_merge Replace-on-Re-Extract, prune_sources Deletion Pruning, Step 4 Build, Cluster and Analyze, Step 4.5 Graph Health Check, graph.json Shrink Guard

### Community 32 - "Contracts"
Cohesion: 0.07
Nodes (27): jsdom, @types/node, typescript, vitest, author, description, devDependencies, jsdom (+19 more)

### Community 33 - "devDependencies"
Cohesion: 0.33
Nodes (6): graphify clone, graphify merge-graphs, Monorepo Per-Subfolder Extract, repo Node Attribute, Native CLAUDE.md Integration, Fast Path for Existing Graph

### Community 34 - "graphify reference: extra exports and benchmark"
Cohesion: 0.08
Nodes (24): DOM, DOM.Iterable, ES2022, node, src, test, vitest.config.ts, compilerOptions (+16 more)

### Community 35 - "Task 01 — `@snap-bottom-sheet/spring`"
Cohesion: 0.40
Nodes (5): Token Reduction Benchmark, Image Vision Extraction Rules, Token Budget Truncation, Self-Composed Whisper Domain Hint, Step 2 Detect Files

### Community 36 - "Task 02 — `@snap-bottom-sheet/gesture`"
Cohesion: 0.67
Nodes (3): Content mode (no real snap points), Sheet.DynamicHeight must be the first child, Dynamic height handling usage

### Community 37 - "Task 00 — monorepo scaffold (nBridge tooling)"
Cohesion: 0.29
Nodes (6): Done when, Goal, Report, Rules, Scope, Task 08 — playgrounds (vanilla, react, next)

### Community 39 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.07
Nodes (26): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+18 more)

### Community 53 - "compilerOptions"
Cohesion: 0.08
Nodes (23): DOM, DOM.Iterable, ES2022, node, src, test, vitest.config.ts, compilerOptions (+15 more)

### Community 54 - "package.json"
Cohesion: 0.11
Nodes (17): @types/node, typescript, vitest, devDependencies, @types/node, typescript, vitest, exports (+9 more)

### Community 55 - "Contracts"
Cohesion: 0.14
Nodes (13): Contracts, Done when, Goal, Report, Scope, `src/core/env.ts`, `src/core/measure.ts`, `src/core/scroll-lock.ts` (fixes P0-6) (+5 more)

### Community 56 - "Task 07 — React bindings (`snap-bottom-sheet/react`)"
Cohesion: 0.25
Nodes (7): Behaviour, Done when, Goal, Report, Scope, Task 07 — React bindings (`snap-bottom-sheet/react`), Tests (mock `createSheet` with `vi.mock("../../src/core/sheet.ts")` returning a fake controller whose methods are `vi.fn()` and whose `subscribe` lets tests push states)

### Community 57 - "Task 05 — documentation site (VitePress)"
Cohesion: 0.29
Nodes (6): Done when, Goal, Reference, Report, Scope, Task 05 — documentation site (VitePress)

### Community 58 - "Task 06 — repository meta: README, CONTRIBUTING, CLAUDE.md, changeset"
Cohesion: 0.33
Nodes (5): Done when, Goal, Report, Scope, Task 06 — repository meta: README, CONTRIBUTING, CLAUDE.md, changeset

### Community 62 - "Task 09 — live demos in the docs site"
Cohesion: 0.29
Nodes (6): Done when, Goal, Report, Rules, Scope, Task 09 — live demos in the docs site

### Community 63 - "Task 10 — integration tests, regression suite, bundle budget"
Cohesion: 0.29
Nodes (6): Done when, Goal, Report, Rules, Scope, Task 10 — integration tests, regression suite, bundle budget

### Community 64 - "sheet.ts"
Cohesion: 0.18
Nodes (19): applyBodyScroll(), applyInert(), bodyBaseStyles(), contentBaseStyles(), findContentInner(), FOCUSABLE, focusFirst(), hasInertProp() (+11 more)

### Community 65 - "sheet.test.ts"
Cohesion: 0.12
Nodes (4): controllers, make(), observerCallbacks, ResizeEntryLike

### Community 69 - "devDependencies"
Cohesion: 0.09
Nodes (21): devDependencies, react, react-dom, snap-bottom-sheet, @types/react, @types/react-dom, vitepress, react (+13 more)

### Community 74 - "Core API"
Cohesion: 0.11
Nodes (17): `close()`, Core API, `createSheet(elements, options?)`, `destroy()`, `getState()`, `open()`, Semantics, `setElements(elements)` (+9 more)

### Community 75 - "drag.ts"
Cohesion: 0.11
Nodes (4): controllers, make(), observerCallbacks, ResizeEntryLike

### Community 76 - "Parts"
Cohesion: 0.12
Nodes (15): Parts, Peer dependencies, React API, `<Sheet>`, `Sheet.Body`, `Sheet.Close`, `Sheet.Content`, `Sheet.Description` (+7 more)

### Community 77 - "modal.ts"
Cohesion: 0.08
Nodes (25): next, dependencies, next, react, react-dom, snap-bottom-sheet, devDependencies, @types/node (+17 more)

### Community 79 - "Vanilla JS"
Cohesion: 0.18
Nodes (10): A complete sheet, Controller lifecycle, Dialog semantics without React, The content-inner measurement contract, The CSS, The JavaScript, The markup, Vanilla JS (+2 more)

### Community 80 - "Controlled State"
Cohesion: 0.20
Nodes (9): Controlled, Controlled State, `onAnimationEnd` and unmounting, Reading live state, The dismissal contract, The imperative handle, The two pairs of props, Uncontrolled (+1 more)

### Community 81 - "Gestures"
Cohesion: 0.20
Nodes (9): Dismissing by drag, Drag callbacks, Gestures, Keyboard, Locking a direction per snap, Opting a region out, The whole panel drags, Where a release lands (+1 more)

### Community 82 - "Styling"
Cohesion: 0.20
Nodes (9): A starter stylesheet, CSS custom properties, Data attributes, Next, Safe areas, Styling, The overlay fade, What the library writes (+1 more)

### Community 83 - "Accessibility"
Cohesion: 0.22
Nodes (8): Accessibility, Dialog semantics, Escape, Next, Reduced motion, The handle, What `modal` turns on, Your checklist

### Community 84 - "Core Concepts"
Cohesion: 0.22
Nodes (8): Content mode, Controller and bindings, Core Concepts, Everything is a y-offset, Measured snap values, Modal and non-modal, Snap indices are your array order, Where next

### Community 85 - "Dynamic Height"
Cohesion: 0.22
Nodes (8): Content mode, Dynamic Height, How each one is measured, Live re-measure, and the spring-not-jump rule, The peek-and-list pattern, The two values, The vanilla contract for the inner element, Where next

### Community 86 - "Snap Points"
Cohesion: 0.22
Nodes (8): A mixed array, Indices stay in your order, Per-snap options, Snap Points, `steps()`, Value forms, When a measured value changes, Where next

### Community 87 - "Styling Hooks"
Cohesion: 0.22
Nodes (8): CSS custom properties, Data attributes, Overlay fade, Recipes, Style by active snap, Styling Hooks, Where next, Write cadence

### Community 88 - "Scrolling"
Cohesion: 0.25
Nodes (7): A scrollable list, Reaching the end of the content, Scroll versus drag, Scrolling, `Sheet.Body` is the scroll region, Where next, Why the panel is `touch-action: none`

### Community 89 - "SSR & Next.js"
Cohesion: 0.25
Nodes (7): App Router, Other server renderers, Pages Router, SSR & Next.js, The `"use client"` banner, What the library guarantees, Where next

### Community 90 - "Snap Points"
Cohesion: 0.25
Nodes (7): Resolution rules, Snap Points, `SnapPointConfig`, `SnapValue` forms, `steps(count, opts?)`, Types, Where next

### Community 91 - "Getting Started"
Cohesion: 0.29
Nodes (6): 1. Install, 2. A sheet in React, 3. The same sheet in vanilla JS, Getting Started, Next steps, Two entry points

### Community 92 - "Migrating from 0.x"
Cohesion: 0.33
Nodes (5): Before and after, Migrating from 0.x, Removals and replacements, What also changed, Where next

### Community 93 - "Nested Sheets"
Cohesion: 0.33
Nodes (5): A two-level example, Nested Sheets, Next, What nesting does not do for you, What nesting gives you

### Community 94 - "FakeResizeObserver"
Cohesion: 0.11
Nodes (18): compilerOptions, isolatedModules, lib, module, moduleResolution, noEmit, noUncheckedIndexedAccess, skipLibCheck (+10 more)

### Community 95 - "Spring"
Cohesion: 0.12
Nodes (16): dependencies, snap-bottom-sheet, devDependencies, typescript, vite, snap-bottom-sheet, typescript, vite (+8 more)

### Community 97 - "Task 11 — core/react follow-ups surfaced by the docs pass"
Cohesion: 0.50
Nodes (3): Changes, Done when, Task 11 — core/react follow-ups surfaced by the docs pass

### Community 101 - "main.ts"
Cohesion: 0.15
Nodes (15): actions, app, button(), el(), hint, host, mount(), page (+7 more)

### Community 102 - "sheet.test.tsx"
Cohesion: 0.24
Nodes (12): clamp(), warned, warnOnce(), cycleFrom(), pickIndex(), progressOf(), stepFrom(), topmostY() (+4 more)

### Community 103 - "App.tsx"
Cohesion: 0.17
Nodes (8): attachHandleKeys(), EscapeEntry, HandleKeyActions, onDocumentKeyDown(), pushEscapeTarget(), stack, createModalGuard(), ModalGuardParts

### Community 104 - "SheetController"
Cohesion: 0.27
Nodes (7): apply(), isBodyScrollLocked(), lockBodyScroll(), restore(), SavedStyles, html(), setClientWidth()

### Community 105 - "Sheet.tsx"
Cohesion: 0.48
Nodes (5): attachSheetDrag(), blurInside(), BlurredTags, dragFilter(), isBrowser()

### Community 107 - "snap-bottom-sheet playgrounds"
Cohesion: 0.40
Nodes (4): Manual QA checklist, Running, snap-bottom-sheet playgrounds, The styling contract

### Community 110 - "pointer.ts"
Cohesion: 0.29
Nodes (5): drag(), drag(), FakePointerEvent, fire(), FireInit

### Community 112 - "SheetElements"
Cohesion: 0.67
Nodes (3): SheetElements, Fixture, Fixture

## Knowledge Gaps
- **611 isolated node(s):** `$schema`, `@changesets/changelog-github`, `commit`, `fixed`, `linked` (+606 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **28 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Semantic Extraction Spec` to `Package Manifest and Publishing`, `sheet-demo.tsx`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Why does `keywords` connect `Package Manifest and Publishing` to `Semantic Extraction Spec`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `createSheet()` connect `sheet.ts` to `sheet.test.ts`, `Compound Component and Types`, `main.ts`, `sheet.test.tsx`, `App.tsx`, `Library Declarations Config`, `Sheet.tsx`, `Semantic Extraction Spec`, `drag.ts`, `DragDeps`, `Vite Env Types`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `$schema`, `@changesets/changelog-github`, `commit` to the rest of the system?**
  _611 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Lint and Tooling Dev Deps` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._
- **Should `Package Manifest and Publishing` be split into smaller, more focused modules?**
  _Cohesion score 0.041666666666666664 - nodes in this community are weakly interconnected._
- **Should `App TypeScript Config` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._