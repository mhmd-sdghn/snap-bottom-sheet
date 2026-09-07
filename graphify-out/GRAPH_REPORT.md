# Graph Report - ho-3617d3  (2026-09-07)

## Corpus Check
- 57 files · ~26,854 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 800 nodes · 1025 edges · 74 communities (45 shown, 29 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 29 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a844999d`
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
- extraction-spec.md
- eslint
- eslint-config-prettier
- @eslint/js
- eslint-plugin-react-refresh
- globals
- i
- lint-staged
- npm
- prettier
- @types/body-scroll-lock
- @types/react-dom
- typescript
- typescript-eslint
- vite-plugin-dts
- exports
- README.md

## God Nodes (most connected - your core abstractions)
1. `react` - 42 edges
2. `compilerOptions` - 20 edges
3. `SheetContainer()` - 18 edges
4. `scripts` - 17 edges
5. `compilerOptions` - 16 edges
6. `compilerOptions` - 16 edges
7. `compilerOptions` - 15 edges
8. `keywords` - 13 edges
9. `compilerOptions` - 13 edges
10. `SheetContainer()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `Portal / wrapper modes` --references--> `SheetOverlay()`  [INFERRED]
  CLAUDE.md → lib/components/SheetOverlay.tsx
- `Portal / wrapper modes` --references--> `useWrapperRef()`  [INFERRED]
  CLAUDE.md → lib/hooks/useWrapperRef.ts
- `Styling hooks (.snap-bottom-sheet-container / -content)` --references--> `SheetContainer()`  [INFERRED]
  README.md → lib/components/SheetContainer.tsx
- `SSR compatibility claims` --references--> `isSSR()`  [INFERRED]
  README.md → lib/utils.ts
- `Snap points: pixels, percentages, dynamic` --references--> `getSnapValues()`  [INFERRED]
  README.md → lib/utils.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Drag gesture flow (start, live drag, end/snap-or-close)** — lib_components_sheetcontainer_sheetcontainer, lib_events_ondragstarteventhandler_ondragstarteventhandler, lib_events_ondrageventhandler_ondrageventhandler, lib_events_ondragendeventhandler_ondragendeventhandler, lib_utils_getclosestindex, lib_hooks_useanim_useanim [EXTRACTED 1.00]
- **Dynamic height detection and measurement pipeline** — lib_components_sheetwithdynamicheight_sheetwithdynamicheight, lib_utils_finddynamicheightcomponent, lib_components_sheetdynamicheightcontent_sheetdynamicheightcontent, lib_hooks_usewatchheight_usewatchheight, lib_utils_validatedynamicsnapposition [EXTRACTED 1.00]
- **Portal / wrapper / SSR render-mode decision** — lib_components_sheetcontainer_sheetcontainer, lib_utils_isssr, lib_components_sheetoverlay_sheetoverlay, lib_hooks_usemount_usemount, lib_hooks_usewrapperref_usewrapperref [INFERRED 0.85]
- **AST + Semantic Extraction and Merge Flow** — _claude_skills_graphify_skill_detect_files, _claude_skills_graphify_skill_structural_extraction_ast, _claude_skills_graphify_skill_semantic_extraction, _claude_skills_graphify_skill_extraction_cache, _claude_skills_graphify_skill_build_cluster_analyze [EXTRACTED 1.00]
- **Optional Graph Export Targets** — _claude_skills_graphify_references_exports_neo4j_export, _claude_skills_graphify_references_exports_falkordb_export, _claude_skills_graphify_references_exports_svg_export, _claude_skills_graphify_references_exports_graphml_export, _claude_skills_graphify_references_exports_wiki_export, _claude_skills_graphify_references_exports_mcp_server [EXTRACTED 1.00]
- **Query Expansion, Traversal and Self-Improving Feedback Loop** — _claude_skills_graphify_references_query_constrained_query_expansion, _claude_skills_graphify_references_query_graph_vocabulary, _claude_skills_graphify_references_query_bfs_traversal, _claude_skills_graphify_references_query_save_result, _claude_skills_graphify_references_query_work_memory_lessons [EXTRACTED 1.00]

## Communities (74 total, 29 thin omitted)

### Community 0 - "Lint and Tooling Dev Deps"
Cohesion: 0.18
Nodes (11): @changesets/changelog-github, eslint-plugin-react-hooks, husky, lefthook, devDependencies, @changesets/changelog-github, eslint-plugin-react-hooks, husky (+3 more)

### Community 1 - "Package Manifest and Publishing"
Cohesion: 0.06
Nodes (40): keywords, author, bugs, dependencies, @react-spring/web, @use-gesture/react, description, exports (+32 more)

### Community 2 - "Snap Point Model and Utils"
Cohesion: 0.05
Nodes (45): graphify skill trigger (/graphify), Compound component pattern (Sheet + .Container + .DynamicHeight), Content mode (no real snap points), Sheet.DynamicHeight must be the first child, graphify query-first workflow for this repo, Library conventions (default exports, types, constants, SSR effect), Nested sheets and overlay drag isolation, Portal / wrapper modes (+37 more)

### Community 3 - "Compound Component and Types"
Cohesion: 0.13
Nodes (17): DragEndEventHandlerFn, DynamicHeightContentComponentProps, OnDragEventHandlerState, ScrollLock, SheetCallbacks, SheetContainerProps, SheetContextProviderProps, SheetContextProviderValues (+9 more)

### Community 4 - "Context, Overlay and Drag Events"
Cohesion: 0.12
Nodes (14): Animation and gestures, Architecture, Height tracking, Pixel y-offset-from-top internal model, Scroll locking, Snap point model, `useSnapState`, onDragEventHandler() (+6 more)

### Community 5 - "App TypeScript Config"
Cohesion: 0.07
Nodes (27): ES2020, src, compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx (+19 more)

### Community 6 - "Library Declarations Config"
Cohesion: 0.10
Nodes (21): esnext, compilerOptions, allowImportingTsExtensions, baseUrl, declaration, emitDeclarationOnly, jsx, lib (+13 more)

### Community 7 - "Node and Vite TS Config"
Cohesion: 0.05
Nodes (37): compilerOptions, isolatedModules, jsx, lib, module, moduleResolution, noEmit, noUncheckedIndexedAccess (+29 more)

### Community 8 - "Corpus Ingest and Incremental Update"
Cohesion: 0.05
Nodes (59): Watch Debounce Window, /graphify add URL Ingest, graphify.ingest.ingest, needs_update Flag, URL Type Auto-Detection, --watch Folder Watcher, GraphML Export, MCP stdio Server (graphify.serve) (+51 more)

### Community 9 - "Semantic Extraction Spec"
Cohesion: 0.06
Nodes (59): Sheet(), SheetContainer(), SheetDynamicHeightContent(), SheetOverlay(), SheetWithDynamicHeight(), SheetContext, SheetContextProvider(), useSheetContext() (+51 more)

### Community 10 - "Public API and Snap State Hook"
Cohesion: 0.07
Nodes (29): @arethetypeswrong/cli, jsdom, @types/node, devDependencies, @arethetypeswrong/cli, jsdom, publint, react (+21 more)

### Community 11 - "Graph Query and Traversal"
Cohesion: 0.07
Nodes (23): Commands, Conventions, graphify, Imports, What this is, 1. Correctness bugs, 2. Footguns and latent bugs, 3. Performance (+15 more)

### Community 12 - "Build, Audit Trail and Guards"
Cohesion: 0.07
Nodes (28): Discrete Confidence Score Rubric, DEEP_MODE Aggressive Inference, EXTRACTED/INFERRED/AMBIGUOUS Audit Trail, Step 4.5 Graph Health Check, For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only (+20 more)

### Community 13 - "Shared Height Observers"
Cohesion: 0.29
Nodes (4): Shared ResizeObserver / resize-listener singletons, SharedResizeObserver, SharedWindowResizeListener, useWatchHeight()

### Community 14 - "React Peer Dependencies"
Cohesion: 0.22
Nodes (9): peerDependencies, react, react-dom, @react-spring/web, @use-gesture/react, react, react-dom, @react-spring/web (+1 more)

### Community 15 - "Package Scripts"
Cohesion: 0.12
Nodes (17): scripts, build, changeset, dev, docs:build, docs:dev, lint, lint:fix (+9 more)

### Community 16 - "Watch and Auto-Rebuild Hooks"
Cohesion: 0.08
Nodes (25): compilerOptions, allowImportingTsExtensions, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, jsx, lib, module (+17 more)

### Community 17 - "Spring Animation and Drag End"
Cohesion: 0.29
Nodes (6): Single spring on y, all motion via useAnim.animate, Close-by-drag threshold at index 0, isDragDownDisabled(), onDragEndEventHandler(), useAnim(), getClosestIndex()

### Community 18 - "Visualization and Wiki Exports"
Cohesion: 0.10
Nodes (21): 0. Decisions (final — do not re-open), 1. Target repository layout, 2.1 Snap points, 2.2 Core (vanilla) API — `snap-bottom-sheet`, 2.3 React API — `snap-bottom-sheet/react`, 2.4 Removed from 0.x, 2. Public API (1.0), 3.1 `@snap-bottom-sheet/spring` (+13 more)

### Community 19 - "Repo Clone and Graph Merge"
Cohesion: 0.10
Nodes (20): 1. Dynamic Height Handling, 1. `<Sheet>` (Root Component), 2. Scroll Management, 2. `<Sheet.Container>`, 3. Drag Behavior Control, 3. `<Sheet.DynamicHeight>\*\*, 4. Custom Positioning, Basic Usage 🚀 (+12 more)

### Community 29 - "package.json"
Cohesion: 0.10
Nodes (19): dependencies, react, react-dom, @react-spring/web, snap-bottom-sheet, @use-gesture/react, react, react-dom (+11 more)

### Community 30 - "config.json"
Cohesion: 0.12
Nodes (15): access, baseBranch, changelog, commit, fixed, ignore, linked, $schema (+7 more)

### Community 31 - "package.json"
Cohesion: 0.12
Nodes (15): author, engines, node, license, main, module, name, packageManager (+7 more)

### Community 32 - "Contracts"
Cohesion: 0.14
Nodes (13): Contracts, Done when, Goal, Report, Scope, `src/core/env.ts`, `src/core/measure.ts`, `src/core/scroll-lock.ts` (fixes P0-6) (+5 more)

### Community 33 - "devDependencies"
Cohesion: 0.15
Nodes (13): vite, @vitejs/plugin-react-swc, devDependencies, @types/react, @types/react-dom, typescript, vite, @vitejs/plugin-react-swc (+5 more)

### Community 34 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 35 - "Task 01 — `@snap-bottom-sheet/spring`"
Cohesion: 0.22
Nodes (8): API (exact), Behaviour, Done when, Goal, Report, Scope, Task 01 — `@snap-bottom-sheet/spring`, Tests (`test/spring.test.ts`, vitest fake timers)

### Community 36 - "Task 02 — `@snap-bottom-sheet/gesture`"
Cohesion: 0.22
Nodes (8): API (exact), Behaviour, Done when, Goal, Report, Scope, Task 02 — `@snap-bottom-sheet/gesture`, Tests (`test/drag.test.ts`, jsdom)

### Community 37 - "Task 00 — monorepo scaffold (nBridge tooling)"
Cohesion: 0.29
Nodes (6): Done when, Goal, Reference material (read first), Report, Steps, Task 00 — monorepo scaffold (nBridge tooling)

### Community 38 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 39 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 40 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 41 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 46 - "bugs"
Cohesion: 0.67
Nodes (3): bugs, email, url

### Community 47 - "dependencies"
Cohesion: 0.67
Nodes (3): dependencies, react-scan, react-scan

### Community 48 - "files"
Cohesion: 0.67
Nodes (3): files, files, dist

### Community 49 - "repository"
Cohesion: 0.67
Nodes (3): repository, type, url

## Knowledge Gaps
- **374 isolated node(s):** `$schema`, `@changesets/changelog-github`, `commit`, `fixed`, `linked` (+369 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **29 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Semantic Extraction Spec` to `Package Manifest and Publishing`, `Snap Point Model and Utils`, `Compound Component and Types`, `Context, Overlay and Drag Events`, `Shared Height Observers`, `context.tsx`, `Spring Animation and Drag End`?**
  _High betweenness centrality (0.235) - this node is a cross-community bridge._
- **Why does `keywords` connect `Package Manifest and Publishing` to `Semantic Extraction Spec`, `package.json`?**
  _High betweenness centrality (0.132) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Lint and Tooling Dev Deps` to `Public API and Snap State Hook`, `package.json`, `devDependencies`, `@biomejs/biome`, `@changesets/cli`, `eslint`, `eslint-config-prettier`, `@eslint/js`, `eslint-plugin-react-refresh`, `globals`, `i`, `lint-staged`, `npm`, `prettier`, `@types/body-scroll-lock`, `@types/react-dom`, `typescript`, `typescript-eslint`, `vite-plugin-dts`?**
  _High betweenness centrality (0.100) - this node is a cross-community bridge._
- **What connects `$schema`, `@changesets/changelog-github`, `commit` to the rest of the system?**
  _374 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Package Manifest and Publishing` be split into smaller, more focused modules?**
  _Cohesion score 0.06097560975609756 - nodes in this community are weakly interconnected._
- **Should `Snap Point Model and Utils` be split into smaller, more focused modules?**
  _Cohesion score 0.05136612021857923 - nodes in this community are weakly interconnected._
- **Should `Compound Component and Types` be split into smaller, more focused modules?**
  _Cohesion score 0.13071895424836602 - nodes in this community are weakly interconnected._