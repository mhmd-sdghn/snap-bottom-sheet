# Graph Report - snap-bottom-sheet  (2026-09-09)

## Corpus Check
- 156 files · ~97,894 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1302 nodes · 1848 edges · 130 communities (91 shown, 39 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 36 edges (avg confidence: 0.73)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `afe2176b`
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
- snap.ts
- devDependencies
- Core API
- drag.ts
- Parts
- modal.ts
- DragDeps
- Vanilla JS
- context.ts
- Gestures
- Styling
- ocr-core.test.ts
- Core Concepts
- Dynamic Height
- Snap Points
- Styling Hooks
- Scrolling
- Snap Points
- Migrating from 0.x
- FakeResizeObserver
- Spring
- ReactDemo.vue
- index.md
- main.ts
- App.tsx
- SheetController
- sheet-demo.tsx
- next.config.mjs
- FakeResizeObserver
- SheetElements
- App.tsx
- dynamic-height.md
- scrollable.md
- vanilla.md
- env.d.ts
- vanilla.test.ts
- review-lifecycle.test.ts
- package.json
- snap-bottom-sheet
- spotty-pandas-rewrite.md
- scripts
- peerDependencies
- exports
- peerDependenciesMeta
- repository
- use-controllable-state.ts
- Task 14 — review-loop fixes, React layer
- index.md
- playwright.config.ts
- Basic
- Controlled
- nested.md
- snap-points.md
- vanilla.md
- playwright.site.config.ts

## God Nodes (most connected - your core abstractions)
1. `createSheet()` - 54 edges
2. `react` - 32 edges
3. `SheetController` - 23 edges
4. `settle()` - 22 edges
5. `scripts` - 18 edges
6. `isBrowser()` - 18 edges
7. `SheetOptions` - 18 edges
8. `DragDeps` - 17 edges
9. `page` - 17 edges
10. `compilerOptions` - 16 edges

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

## Communities (130 total, 39 thin omitted)

### Community 0 - "Lint and Tooling Dev Deps"
Cohesion: 0.06
Nodes (34): @biomejs/biome, @changesets/changelog-github, @changesets/cli, lefthook, devDependencies, @biomejs/biome, @changesets/changelog-github, @changesets/cli (+26 more)

### Community 1 - "Package Manifest and Publishing"
Cohesion: 0.13
Nodes (15): keywords, bottom-drawer, bottom-sheet, bottomsheet, dialog, draggableview, drawer, headless (+7 more)

### Community 2 - "Snap Point Model and Utils"
Cohesion: 0.50
Nodes (4): graphify skill trigger (/graphify), graphify query-first workflow for this repo, snap-bottom-sheet (library overview), Vite playground HTML entry

### Community 3 - "Compound Component and Types"
Cohesion: 0.13
Nodes (33): collect(), readY(), Sample, Scenario, scenarios, startSampler(), waitForRest(), dragBodyUp() (+25 more)

### Community 4 - "Context, Overlay and Drag Events"
Cohesion: 0.67
Nodes (3): Pixel y-offset-from-top internal model, Consumer best practices, Snap points: pixels, percentages, dynamic

### Community 5 - "App TypeScript Config"
Cohesion: 0.07
Nodes (18): attachDrag(), DragHandlers, DragOptions, DragState, Phase, Sample, ends, FakePointerEvent (+10 more)

### Community 6 - "Library Declarations Config"
Cohesion: 0.15
Nodes (9): Budgets, dist, entries, line(), over, pad(), rows, shared (+1 more)

### Community 7 - "Node and Vite TS Config"
Cohesion: 0.10
Nodes (19): DOM, DOM.Iterable, ES2022, src, vite.config.ts, compilerOptions, isolatedModules, jsx (+11 more)

### Community 8 - "Corpus Ingest and Incremental Update"
Cohesion: 0.21
Nodes (12): /graphify add URL Ingest, graphify.ingest.ingest, URL Type Auto-Detection, Transcripts Treated as Doc Files, GRAPHIFY_WHISPER_MODEL Setting, Whisper Transcription (transcribe_all), detect_incremental, graph_diff Update Summary (+4 more)

### Community 9 - "Semantic Extraction Spec"
Cohesion: 0.11
Nodes (18): Body, BodyProps, Close, CloseProps, Content, ContentProps, Description, DescriptionProps (+10 more)

### Community 10 - "Public API and Snap State Hook"
Cohesion: 0.08
Nodes (25): @arethetypeswrong/cli, devDependencies, @arethetypeswrong/cli, jsdom, publint, @snap-bottom-sheet/gesture, @snap-bottom-sheet/spring, @testing-library/react (+17 more)

### Community 11 - "Graph Query and Traversal"
Cohesion: 0.21
Nodes (11): apply(), ContainerLock, containerLocks, isBodyScrollLocked(), isContainerScrollLocked(), lockBodyScroll(), restore(), SavedContainerStyles (+3 more)

### Community 12 - "Build, Audit Trail and Guards"
Cohesion: 0.22
Nodes (10): calls Edge Direction and Same-Language Constraint, Discrete Confidence Score Rubric, DEEP_MODE Aggressive Inference, Hyperedges, Node ID Format Rule, semantically_similar_to Edge, Extraction Subagent Prompt, EXTRACTED/INFERRED/AMBIGUOUS Audit Trail (+2 more)

### Community 14 - "React Peer Dependencies"
Cohesion: 0.27
Nodes (10): MCP stdio Server (graphify.serve), BFS Traversal, Constrained Query Expansion, DFS Traversal, Graph Label Vocabulary (.vocab.txt), /graphify explain Node Explanation, /graphify path Shortest Path, Inline NetworkX Traversal Fallback (+2 more)

### Community 15 - "Package Scripts"
Cohesion: 0.13
Nodes (22): focusFirst(), isBrowser(), noop(), once(), resetWarnings(), warned, attachHandleKeys(), EscapeEntry (+14 more)

### Community 16 - "Watch and Auto-Rebuild Hooks"
Cohesion: 0.07
Nodes (26): DOM, DOM.Iterable, ES2022, node, src, test, vitest.config.ts, tsdown.config.ts (+18 more)

### Community 18 - "Visualization and Wiki Exports"
Cohesion: 0.15
Nodes (12): Commits and changesets, Contributing, Deliberate shortcuts, Development loop, How the engine works, License, Prerequisites, Quality gates (+4 more)

### Community 19 - "Repo Clone and Graph Merge"
Cohesion: 0.18
Nodes (3): mountDemo(), metadata, react

### Community 20 - "Root TS Project References"
Cohesion: 0.32
Nodes (8): Watch Debounce Window, needs_update Flag, --watch Folder Watcher, Post-Commit Auto-Rebuild Hook, Work Memory and LESSONS.md Reflection, Code-Only Change Fast Path, No API Key Requirement, Part A Structural AST Extraction

### Community 25 - "ESLint Config File"
Cohesion: 0.19
Nodes (8): FakeObserver, installTestEnv(), observers, ResizeCallback, ResizeEntryLike, yOf(), controllers, make()

### Community 26 - "Vite Env Types"
Cohesion: 0.09
Nodes (18): attachSheetDrag(), blurInside(), BlurredTags, DragDeps, dragFilter(), Mode, pushSample(), Sample (+10 more)

### Community 27 - "Playground Vite Config"
Cohesion: 0.21
Nodes (7): Animatable, settle(), App(), dismissAndSample(), yOf(), flush(), opened()

### Community 28 - "Library Vite Config"
Cohesion: 0.33
Nodes (6): GraphML Export, SVG Export, Wiki Export, --cluster-only Reclustering, Step 5 Community Labeling, Step 6 HTML and Obsidian Export

### Community 29 - "package.json"
Cohesion: 0.07
Nodes (26): dependencies, react, react-dom, snap-bottom-sheet, devDependencies, @types/react, @types/react-dom, typescript (+18 more)

### Community 30 - "config.json"
Cohesion: 0.11
Nodes (17): access, baseBranch, changelog, commit, fixed, ignore, linked, $schema (+9 more)

### Community 31 - "package.json"
Cohesion: 0.33
Nodes (6): source_file Verbatim Rule, build_merge Replace-on-Re-Extract, prune_sources Deletion Pruning, Step 4 Build, Cluster and Analyze, Step 4.5 Graph Health Check, graph.json Shrink Guard

### Community 32 - "Contracts"
Cohesion: 0.07
Nodes (27): author, description, devDependencies, jsdom, @types/node, typescript, vitest, exports (+19 more)

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
Cohesion: 0.18
Nodes (10): devDependencies, @playwright/test, name, private, scripts, test, test:site, type (+2 more)

### Community 39 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.07
Nodes (27): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+19 more)

### Community 53 - "compilerOptions"
Cohesion: 0.08
Nodes (23): DOM, DOM.Iterable, ES2022, node, src, test, vitest.config.ts, compilerOptions (+15 more)

### Community 54 - "package.json"
Cohesion: 0.11
Nodes (17): devDependencies, @types/node, typescript, vitest, exports, @types/node, typescript, vitest (+9 more)

### Community 55 - "Contracts"
Cohesion: 0.15
Nodes (6): SheetController, controllers, Fixture, make(), opened(), rest()

### Community 56 - "Task 07 — React bindings (`snap-bottom-sheet/react`)"
Cohesion: 0.16
Nodes (25): applyInert(), applySnapLayout(), bodyBaseStyles(), contentBaseStyles(), findContentInner(), FOCUSABLE, hasInertProp(), innerBaseStyles() (+17 more)

### Community 57 - "Task 05 — documentation site (VitePress)"
Cohesion: 0.20
Nodes (9): Controlled, Controlled State, `onAnimationEnd` and unmounting, Reading live state, The dismissal contract, The imperative handle, The two pairs of props, Uncontrolled (+1 more)

### Community 58 - "Task 06 — repository meta: README, CONTRIBUTING, CLAUDE.md, changeset"
Cohesion: 0.27
Nodes (7): controllers, make(), open(), Snaps, resizeTo(), setHeight(), stubScroller()

### Community 62 - "Task 09 — live demos in the docs site"
Cohesion: 0.22
Nodes (8): Accessibility, Dialog semantics, Escape, Next, Reduced motion, The handle, What `modal` turns on, Your checklist

### Community 63 - "Task 10 — integration tests, regression suite, bundle budget"
Cohesion: 0.22
Nodes (8): Content mode, Dynamic Height, How each one is measured, Live re-measure, and the spring-not-jump rule, The peek-and-list pattern, The two values, The vanilla contract for the inner element, Where next

### Community 65 - "sheet.test.ts"
Cohesion: 0.22
Nodes (4): controllers, Fixture, make(), isObserved()

### Community 68 - "snap.ts"
Cohesion: 0.26
Nodes (13): closest(), decideRelease(), isConfig(), isContentMode(), MeasureContext, normalize(), NormalizedSnap, project() (+5 more)

### Community 69 - "devDependencies"
Cohesion: 0.07
Nodes (26): devDependencies, react, react-dom, snap-bottom-sheet, @types/node, @types/react, @types/react-dom, typescript (+18 more)

### Community 74 - "Core API"
Cohesion: 0.11
Nodes (17): `close()`, Core API, `createSheet(elements, options?)`, `destroy()`, `getState()`, `open()`, Semantics, `setElements(elements)` (+9 more)

### Community 75 - "drag.ts"
Cohesion: 0.25
Nodes (7): SheetElements, Fixture, Fixture, controllers, Fixture, make(), opened()

### Community 76 - "Parts"
Cohesion: 0.12
Nodes (16): Parts, Peer dependencies, React API, Selecting one field, `<Sheet>`, `Sheet.Body`, `Sheet.Close`, `Sheet.Content` (+8 more)

### Community 77 - "modal.ts"
Cohesion: 0.08
Nodes (25): next, dependencies, next, react, react-dom, snap-bottom-sheet, devDependencies, @types/node (+17 more)

### Community 78 - "DragDeps"
Cohesion: 0.12
Nodes (12): SnapPoint, SheetOptions, SheetState, PartName, SheetContext, Parts, Sheet, SheetProps (+4 more)

### Community 79 - "Vanilla JS"
Cohesion: 0.18
Nodes (10): A complete sheet, Controller lifecycle, Dialog semantics without React, The content-inner measurement contract, The CSS, The JavaScript, The markup, Vanilla JS (+2 more)

### Community 80 - "context.ts"
Cohesion: 0.27
Nodes (7): SheetContextValue, useAriaId(), usePartRef(), useSheetContext(), Portal(), PortalProps, CLOSED_STATE

### Community 81 - "Gestures"
Cohesion: 0.18
Nodes (10): Dismissing by drag, Drag callbacks, Dragging with a mouse, Gestures, Keyboard, Locking a direction per snap, Opting a region out, The whole panel drags (+2 more)

### Community 82 - "Styling"
Cohesion: 0.20
Nodes (9): A starter stylesheet, CSS custom properties, Data attributes, Next, Safe areas, Styling, The overlay fade, What the library writes (+1 more)

### Community 83 - "ocr-core.test.ts"
Cohesion: 0.25
Nodes (5): FakePointerEvent, FireInit, press(), controllers, make()

### Community 84 - "Core Concepts"
Cohesion: 0.22
Nodes (8): Content mode, Controller and bindings, Core Concepts, Everything is a y-offset, Measured snap values, Modal and non-modal, Snap indices are your array order, Where next

### Community 85 - "Dynamic Height"
Cohesion: 0.22
Nodes (8): A mixed array, Indices stay in your order, Per-snap options, Snap Points, `steps()`, Value forms, When a measured value changes, Where next

### Community 86 - "Snap Points"
Cohesion: 0.25
Nodes (7): App Router, Other server renderers, Pages Router, SSR & Next.js, The `"use client"` banner, What the library guarantees, Where next

### Community 87 - "Styling Hooks"
Cohesion: 0.22
Nodes (8): CSS custom properties, Data attributes, Overlay fade, Recipes, Style by active snap, Styling Hooks, Where next, Write cadence

### Community 88 - "Scrolling"
Cohesion: 0.20
Nodes (9): A scrollable list, After you let go, Nested scrollers inside the body, One gesture, two phases, Reaching the end of the content, Scrolling, `Sheet.Body` is the scroll region, Where next (+1 more)

### Community 90 - "Snap Points"
Cohesion: 0.25
Nodes (7): Resolution rules, Snap Points, `SnapPointConfig`, `SnapValue` forms, `steps(count, opts?)`, Types, Where next

### Community 92 - "Migrating from 0.x"
Cohesion: 0.29
Nodes (6): 1. Install, 2. A sheet in React, 3. The same sheet in vanilla JS, Getting Started, Next steps, Two entry points

### Community 94 - "FakeResizeObserver"
Cohesion: 0.11
Nodes (18): DOM, DOM.Iterable, ES2022, src, vite.config.ts, compilerOptions, isolatedModules, lib (+10 more)

### Community 95 - "Spring"
Cohesion: 0.12
Nodes (16): dependencies, snap-bottom-sheet, devDependencies, typescript, vite, snap-bottom-sheet, typescript, vite (+8 more)

### Community 96 - "ReactDemo.vue"
Cohesion: 0.07
Nodes (26): DOM, DOM.Iterable, ES2022, node, frame, props, .vitepress/config.ts, .vitepress/env.d.ts (+18 more)

### Community 101 - "main.ts"
Cohesion: 0.17
Nodes (14): actions, app, button(), el(), hint, host, mount(), pick (+6 more)

### Community 103 - "App.tsx"
Cohesion: 0.18
Nodes (8): declarations, dist, files, isDir(), manifest, problems, scripts, walk()

### Community 104 - "SheetController"
Cohesion: 0.15
Nodes (11): SheetHandle, useSheetState(), createSheetMock, Threshold(), Outside(), All(), createSheetMock, OpenOnly() (+3 more)

### Community 112 - "SheetElements"
Cohesion: 0.18
Nodes (11): swipe(), drag(), isInert(), fire(), drag(), drag(), attach(), controllers (+3 more)

### Community 121 - "vanilla.md"
Cohesion: 0.33
Nodes (5): Before and after, Migrating from 0.x, Removals and replacements, What also changed, Where next

### Community 125 - "review-lifecycle.test.ts"
Cohesion: 0.33
Nodes (5): A two-level example, Nested Sheets, Next, What nesting does not do for you, What nesting gives you

### Community 129 - "package.json"
Cohesion: 0.17
Nodes (11): author, bugs, description, files, homepage, license, name, sideEffects (+3 more)

### Community 130 - "snap-bottom-sheet"
Cohesion: 0.25
Nodes (7): Going deeper, License, React, snap-bottom-sheet, Snap points, Vanilla, Why this one

### Community 131 - "spotty-pandas-rewrite.md"
Cohesion: 0.29
Nodes (6): Also, Escape and the modal lock, Fixed, New, Removed, Two entry points

### Community 134 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, check:dist, dev, size, test, test:watch, typecheck (+1 more)

### Community 135 - "peerDependencies"
Cohesion: 0.29
Nodes (7): react, react-dom, react, react-dom, peerDependencies, react, react-dom

### Community 137 - "exports"
Cohesion: 0.40
Nodes (5): exports, ./package.json, ./react, default, types

### Community 138 - "peerDependenciesMeta"
Cohesion: 0.40
Nodes (5): peerDependenciesMeta, react, react-dom, optional, optional

### Community 139 - "repository"
Cohesion: 0.50
Nodes (4): repository, directory, type, url

### Community 140 - "use-controllable-state.ts"
Cohesion: 0.29
Nodes (4): controllers, drag(), Fixture, make()

### Community 141 - "Task 14 — review-loop fixes, React layer"
Cohesion: 0.40
Nodes (4): Manual QA checklist, Running, snap-bottom-sheet playgrounds, The styling contract

## Knowledge Gaps
- **600 isolated node(s):** `$schema`, `@changesets/changelog-github`, `commit`, `fixed`, `linked` (+595 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **39 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Repo Clone and Graph Merge` to `Package Manifest and Publishing`, `SheetController`, `Semantic Extraction Spec`, `sheet-demo.tsx`, `DragDeps`, `context.ts`, `App.tsx`, `Playground Vite Config`, `vanilla.test.ts`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Why does `keywords` connect `Package Manifest and Publishing` to `package.json`, `Repo Clone and Graph Merge`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Why does `createSheet()` connect `Task 07 — React bindings (`snap-bottom-sheet/react`)` to `sheet.test.ts`, `snap.ts`, `main.ts`, `App TypeScript Config`, `Task 06 — repository meta: README, CONTRIBUTING, CLAUDE.md, changeset`, `SheetController`, `Semantic Extraction Spec`, `drag.ts`, `use-controllable-state.ts`, `DragDeps`, `Package Scripts`, `SheetElements`, `ocr-core.test.ts`, `Contracts`, `ESLint Config File`, `Vite Env Types`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `createSheet()` (e.g. with `.cycle()` and `el()`) actually correct?**
  _`createSheet()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `@changesets/changelog-github`, `commit` to the rest of the system?**
  _600 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Lint and Tooling Dev Deps` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._
- **Should `Package Manifest and Publishing` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._