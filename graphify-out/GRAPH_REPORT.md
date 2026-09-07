# Graph Report - new-session-6fbcab  (2026-09-07)

## Corpus Check
- 66 files · ~31,137 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 582 nodes · 719 edges · 59 communities (38 shown, 21 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8d2acc00`
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
- files
- repository
- @biomejs/biome
- @changesets/cli
- graphify
- extraction-spec.md
- eslint

## God Nodes (most connected - your core abstractions)
1. `react` - 21 edges
2. `SheetContainer()` - 18 edges
3. `compilerOptions` - 16 edges
4. `compilerOptions` - 15 edges
5. `keywords` - 13 edges
6. `compilerOptions` - 13 edges
7. `scripts` - 12 edges
8. `Snap Bottom Sheet 🎯` - 11 edges
9. `useWatchHeight()` - 10 edges
10. `isSnapPointConfigObj()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Snap points: pixels, percentages, dynamic` --semantically_similar_to--> `Pixel y-offset-from-top internal model`  [INFERRED] [semantically similar]
  README.md → CLAUDE.md
- `Dynamic height handling usage` --semantically_similar_to--> `Content mode (no real snap points)`  [INFERRED] [semantically similar]
  README.md → CLAUDE.md
- `Vite playground HTML entry` --conceptually_related_to--> `snap-bottom-sheet (library overview)`  [INFERRED]
  index.html → CLAUDE.md
- `Dynamic height handling usage` --conceptually_related_to--> `Sheet.DynamicHeight must be the first child`  [INFERRED]
  README.md → CLAUDE.md
- `graphify merge-graphs` --semantically_similar_to--> `build_merge Replace-on-Re-Extract`  [INFERRED] [semantically similar]
  .claude/skills/graphify/references/github-and-merge.md → .claude/skills/graphify/references/update.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **AST + Semantic Extraction and Merge Flow** — _claude_skills_graphify_skill_detect_files, _claude_skills_graphify_skill_structural_extraction_ast, _claude_skills_graphify_skill_semantic_extraction, _claude_skills_graphify_skill_extraction_cache, _claude_skills_graphify_skill_build_cluster_analyze [EXTRACTED 1.00]
- **Optional Graph Export Targets** — _claude_skills_graphify_references_exports_neo4j_export, _claude_skills_graphify_references_exports_falkordb_export, _claude_skills_graphify_references_exports_svg_export, _claude_skills_graphify_references_exports_graphml_export, _claude_skills_graphify_references_exports_wiki_export, _claude_skills_graphify_references_exports_mcp_server [EXTRACTED 1.00]
- **Query Expansion, Traversal and Self-Improving Feedback Loop** — _claude_skills_graphify_references_query_constrained_query_expansion, _claude_skills_graphify_references_query_graph_vocabulary, _claude_skills_graphify_references_query_bfs_traversal, _claude_skills_graphify_references_query_save_result, _claude_skills_graphify_references_query_work_memory_lessons [EXTRACTED 1.00]

## Communities (59 total, 21 thin omitted)

### Community 0 - "Lint and Tooling Dev Deps"
Cohesion: 0.07
Nodes (28): @biomejs/biome, @changesets/changelog-github, @changesets/cli, lefthook, devDependencies, @biomejs/biome, @changesets/changelog-github, @changesets/cli (+20 more)

### Community 1 - "Package Manifest and Publishing"
Cohesion: 0.05
Nodes (41): @react-spring/web, @use-gesture/react, bottom-drawer, bottom-sheet, bottomsheet, dialog, dist, draggableview (+33 more)

### Community 2 - "Snap Point Model and Utils"
Cohesion: 0.50
Nodes (4): graphify skill trigger (/graphify), graphify query-first workflow for this repo, snap-bottom-sheet (library overview), Vite playground HTML entry

### Community 3 - "Compound Component and Types"
Cohesion: 0.07
Nodes (27): author, description, devDependencies, jsdom, @types/node, typescript, vitest, exports (+19 more)

### Community 4 - "Context, Overlay and Drag Events"
Cohesion: 0.67
Nodes (3): Pixel y-offset-from-top internal model, Consumer best practices, Snap points: pixels, percentages, dynamic

### Community 5 - "App TypeScript Config"
Cohesion: 0.08
Nodes (23): compilerOptions, allowImportingTsExtensions, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, lib, module, moduleResolution (+15 more)

### Community 6 - "Library Declarations Config"
Cohesion: 0.12
Nodes (12): attachDrag(), DragHandlers, DragOptions, DragState, Phase, Sample, ends, FakePointerEvent (+4 more)

### Community 7 - "Node and Vite TS Config"
Cohesion: 0.10
Nodes (19): DOM, DOM.Iterable, ES2022, src, vite.config.ts, compilerOptions, isolatedModules, jsx (+11 more)

### Community 8 - "Corpus Ingest and Incremental Update"
Cohesion: 0.21
Nodes (12): /graphify add URL Ingest, graphify.ingest.ingest, URL Type Auto-Detection, Transcripts Treated as Doc Files, GRAPHIFY_WHISPER_MODEL Setting, Whisper Transcription (transcribe_all), detect_incremental, graph_diff Update Summary (+4 more)

### Community 9 - "Semantic Extraction Spec"
Cohesion: 0.06
Nodes (59): Sheet(), SheetContainer(), SheetDynamicHeightContent(), SheetOverlay(), SheetWithDynamicHeight(), SheetContext, SheetContextProvider(), useSheetContext() (+51 more)

### Community 10 - "Public API and Snap State Hook"
Cohesion: 0.07
Nodes (28): @arethetypeswrong/cli, jsdom, react, react-dom, @types/node, @types/react, @types/react-dom, typescript (+20 more)

### Community 11 - "Graph Query and Traversal"
Cohesion: 0.10
Nodes (20): 1. Dynamic Height Handling, 1. `<Sheet>` (Root Component), 2. Scroll Management, 2. `<Sheet.Container>`, 3. Drag Behavior Control, 3. `<Sheet.DynamicHeight>\*\*, 4. Custom Positioning, Basic Usage 🚀 (+12 more)

### Community 12 - "Build, Audit Trail and Guards"
Cohesion: 0.22
Nodes (10): calls Edge Direction and Same-Language Constraint, Discrete Confidence Score Rubric, DEEP_MODE Aggressive Inference, Hyperedges, Node ID Format Rule, semantically_similar_to Edge, Extraction Subagent Prompt, EXTRACTED/INFERRED/AMBIGUOUS Audit Trail (+2 more)

### Community 14 - "React Peer Dependencies"
Cohesion: 0.11
Nodes (18): 1. Correctness bugs, 2. Footguns and latent bugs, 3. Performance, 4. API and DX gaps, 5. Repo / tooling gaps (vs nbridge), 6. Proposed target, 7. Found during design (addendum), P0-1 — `snapPoints` index ≠ `snapValues` index (+10 more)

### Community 15 - "Package Scripts"
Cohesion: 0.27
Nodes (10): MCP stdio Server (graphify.serve), BFS Traversal, Constrained Query Expansion, DFS Traversal, Graph Label Vocabulary (.vocab.txt), /graphify explain Node Explanation, /graphify path Shortest Path, Inline NetworkX Traversal Fallback (+2 more)

### Community 16 - "Watch and Auto-Rebuild Hooks"
Cohesion: 0.08
Nodes (25): DOM, DOM.Iterable, ES2022, node, src, test, vitest.config.ts, tsdown.config.ts (+17 more)

### Community 18 - "Visualization and Wiki Exports"
Cohesion: 0.09
Nodes (21): 0. Decisions (final — do not re-open), 1. Target repository layout, 2.1 Snap points, 2.2 Core (vanilla) API — `snap-bottom-sheet`, 2.3 React API — `snap-bottom-sheet/react`, 2.4 Removed from 0.x, 2. Public API (1.0), 3.1 `@snap-bottom-sheet/spring` (+13 more)

### Community 19 - "Repo Clone and Graph Merge"
Cohesion: 0.22
Nodes (8): API (exact), Behaviour, Done when, Goal, Report, Scope, Task 01 — `@snap-bottom-sheet/spring`, Tests (`test/spring.test.ts`, vitest fake timers)

### Community 20 - "Root TS Project References"
Cohesion: 0.22
Nodes (8): API (exact), Behaviour, Done when, Goal, Report, Scope, Task 02 — `@snap-bottom-sheet/gesture`, Tests (`test/drag.test.ts`, jsdom)

### Community 25 - "ESLint Config File"
Cohesion: 0.32
Nodes (8): Watch Debounce Window, needs_update Flag, --watch Folder Watcher, Post-Commit Auto-Rebuild Hook, Work Memory and LESSONS.md Reflection, Code-Only Change Fast Path, No API Key Requirement, Part A Structural AST Extraction

### Community 26 - "Vite Env Types"
Cohesion: 0.25
Nodes (7): Contract, Done when, Goal, Report, Scope, Task 04 — core controller (`createSheet`), Tests (jsdom; stub `ResizeObserver`, `requestAnimationFrame` as in task 01, `matchMedia`)

### Community 27 - "Playground Vite Config"
Cohesion: 0.29
Nodes (6): Done when, Goal, Reference, Report, Scope, Task 05 — documentation site (VitePress)

### Community 28 - "Library Vite Config"
Cohesion: 0.29
Nodes (6): Done when, Goal, Reference material (read first), Report, Steps, Task 00 — monorepo scaffold (nBridge tooling)

### Community 29 - "package.json"
Cohesion: 0.06
Nodes (30): react, react-dom, @react-spring/web, @types/react, @types/react-dom, typescript, @use-gesture/react, snap-bottom-sheet (+22 more)

### Community 30 - "config.json"
Cohesion: 0.12
Nodes (15): @changesets/changelog-github, playground-next, playground-react, snap-bottom-sheet-docs, @snap-bottom-sheet/gesture, @snap-bottom-sheet/spring, access, baseBranch (+7 more)

### Community 31 - "package.json"
Cohesion: 0.33
Nodes (6): GraphML Export, SVG Export, Wiki Export, --cluster-only Reclustering, Step 5 Community Labeling, Step 6 HTML and Obsidian Export

### Community 32 - "Contracts"
Cohesion: 0.14
Nodes (13): Contracts, Done when, Goal, Report, Scope, `src/core/env.ts`, `src/core/measure.ts`, `src/core/scroll-lock.ts` (fixes P0-6) (+5 more)

### Community 33 - "devDependencies"
Cohesion: 0.33
Nodes (6): source_file Verbatim Rule, build_merge Replace-on-Re-Extract, prune_sources Deletion Pruning, Step 4 Build, Cluster and Analyze, Step 4.5 Graph Health Check, graph.json Shrink Guard

### Community 34 - "graphify reference: extra exports and benchmark"
Cohesion: 0.33
Nodes (6): graphify clone, graphify merge-graphs, Monorepo Per-Subfolder Extract, repo Node Attribute, Native CLAUDE.md Integration, Fast Path for Existing Graph

### Community 35 - "Task 01 — `@snap-bottom-sheet/spring`"
Cohesion: 0.33
Nodes (5): Done when, Goal, Report, Scope, Task 06 — repository meta: README, CONTRIBUTING, CLAUDE.md, changeset

### Community 36 - "Task 02 — `@snap-bottom-sheet/gesture`"
Cohesion: 0.40
Nodes (5): Token Reduction Benchmark, Image Vision Extraction Rules, Token Budget Truncation, Self-Composed Whisper Domain Hint, Step 2 Detect Files

### Community 37 - "Task 00 — monorepo scaffold (nBridge tooling)"
Cohesion: 0.67
Nodes (3): Content mode (no real snap points), Sheet.DynamicHeight must be the first child, Dynamic height handling usage

## Knowledge Gaps
- **302 isolated node(s):** `$schema`, `@changesets/changelog-github`, `commit`, `fixed`, `linked` (+297 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `keywords` connect `Package Manifest and Publishing` to `Semantic Extraction Spec`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Why does `react` connect `Semantic Extraction Spec` to `Package Manifest and Publishing`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Public API and Snap State Hook` to `Package Manifest and Publishing`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `$schema`, `@changesets/changelog-github`, `commit` to the rest of the system?**
  _302 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Lint and Tooling Dev Deps` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Should `Package Manifest and Publishing` be split into smaller, more focused modules?**
  _Cohesion score 0.047619047619047616 - nodes in this community are weakly interconnected._
- **Should `Compound Component and Types` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._