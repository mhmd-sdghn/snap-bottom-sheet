# Graph Report - .  (2026-09-07)

## Corpus Check
- Corpus is ~17,682 words - fits in a single context window. You may not need a graph.

## Summary
- 360 nodes · 437 edges · 29 communities (24 shown, 5 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 29 edges (avg confidence: 0.86)
- Token cost: 225,331 input · 0 output

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

## God Nodes (most connected - your core abstractions)
1. `react` - 21 edges
2. `compilerOptions` - 20 edges
3. `compilerOptions` - 16 edges
4. `compilerOptions` - 15 edges
5. `SheetContainer()` - 13 edges
6. `keywords` - 13 edges
7. `getSnapValues()` - 10 edges
8. `--update Incremental Re-Extraction` - 10 edges
9. `scripts` - 9 edges
10. `Extraction Subagent Prompt` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Four portal / wrapper render modes` --references--> `SheetOverlay()`  [INFERRED]
  CLAUDE.md → lib/components/SheetOverlay.tsx
- `Four portal / wrapper render modes` --references--> `useWrapperRef()`  [INFERRED]
  CLAUDE.md → lib/hooks/useWrapperRef.ts
- `Responsibility split: state gate vs engine` --references--> `SheetContainer()`  [EXTRACTED]
  CLAUDE.md → lib/components/SheetContainer.tsx
- `Stable gesture binding via useEffectEvent` --references--> `SheetContainer()`  [EXTRACTED]
  CLAUDE.md → lib/components/SheetContainer.tsx
- `Styling hooks (.snap-bottom-sheet-container / -content)` --references--> `SheetContainer()`  [INFERRED]
  README.md → lib/components/SheetContainer.tsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Drag gesture flow (start, live drag, end/snap-or-close)** — lib_components_sheetcontainer_sheetcontainer, lib_events_ondragstarteventhandler_ondragstarteventhandler, lib_events_ondrageventhandler_ondrageventhandler, lib_events_ondragendeventhandler_ondragendeventhandler, lib_utils_getclosestindex, lib_hooks_useanim_useanim [EXTRACTED 1.00]
- **Dynamic height detection and measurement pipeline** — lib_components_sheetwithdynamicheight_sheetwithdynamicheight, lib_utils_finddynamicheightcomponent, lib_components_sheetdynamicheightcontent_sheetdynamicheightcontent, lib_hooks_usewatchheight_usewatchheight, lib_utils_validatedynamicsnapposition [EXTRACTED 1.00]
- **Portal / wrapper / SSR render-mode decision** — lib_components_sheetcontainer_sheetcontainer, lib_utils_isssr, lib_components_sheetoverlay_sheetoverlay, lib_hooks_usemount_usemount, lib_hooks_usewrapperref_usewrapperref [INFERRED 0.85]
- **AST + Semantic Extraction and Merge Flow** — _claude_skills_graphify_skill_detect_files, _claude_skills_graphify_skill_structural_extraction_ast, _claude_skills_graphify_skill_semantic_extraction, _claude_skills_graphify_skill_extraction_cache, _claude_skills_graphify_skill_build_cluster_analyze [EXTRACTED 1.00]
- **Optional Graph Export Targets** — _claude_skills_graphify_references_exports_neo4j_export, _claude_skills_graphify_references_exports_falkordb_export, _claude_skills_graphify_references_exports_svg_export, _claude_skills_graphify_references_exports_graphml_export, _claude_skills_graphify_references_exports_wiki_export, _claude_skills_graphify_references_exports_mcp_server [EXTRACTED 1.00]
- **Query Expansion, Traversal and Self-Improving Feedback Loop** — _claude_skills_graphify_references_query_constrained_query_expansion, _claude_skills_graphify_references_query_graph_vocabulary, _claude_skills_graphify_references_query_bfs_traversal, _claude_skills_graphify_references_query_save_result, _claude_skills_graphify_references_query_work_memory_lessons [EXTRACTED 1.00]

## Communities (29 total, 5 thin omitted)

### Community 0 - "Lint and Tooling Dev Deps"
Cohesion: 0.05
Nodes (41): eslint, eslint-config-prettier, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, husky, i (+33 more)

### Community 1 - "Package Manifest and Publishing"
Cohesion: 0.06
Nodes (35): author, bugs, email, url, dependencies, react-scan, exports, ./package.json (+27 more)

### Community 2 - "Snap Point Model and Utils"
Cohesion: 0.11
Nodes (27): Content mode (no real snap points), Sheet.DynamicHeight must be the first child, Pixel y-offset-from-top internal model, Four portal / wrapper render modes, Snap point model (number | dynamic | SnapPointConfigObj), SheetContainer(), SheetDynamicHeightContent(), SheetWithDynamicHeight() (+19 more)

### Community 3 - "Compound Component and Types"
Cohesion: 0.09
Nodes (24): Compound component pattern (Sheet + .Container + .DynamicHeight), Library conventions (default exports, types, constants, SSR effect), Responsibility split: state gate vs engine, Sheet(), Sheet, SnapPoints, DragEndEventHandlerFn, DynamicHeightContentComponentProps (+16 more)

### Community 4 - "Context, Overlay and Drag Events"
Cohesion: 0.08
Nodes (14): Nested sheets and overlay drag isolation, Per-snap scroll locking, Stable gesture binding via useEffectEvent, SheetOverlay(), SheetContext, onDragEventHandler(), onDragStartEventHandler(), useEffectEvent() (+6 more)

### Community 5 - "App TypeScript Config"
Cohesion: 0.07
Nodes (27): ES2020, src, compilerOptions, allowImportingTsExtensions, baseUrl, esModuleInterop, isolatedModules, jsx (+19 more)

### Community 6 - "Library Declarations Config"
Cohesion: 0.10
Nodes (21): esnext, compilerOptions, allowImportingTsExtensions, baseUrl, declaration, emitDeclarationOnly, jsx, lib (+13 more)

### Community 7 - "Node and Vite TS Config"
Cohesion: 0.10
Nodes (19): ES2023, vite.config.ts, compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection (+11 more)

### Community 8 - "Corpus Ingest and Incremental Update"
Cohesion: 0.21
Nodes (12): /graphify add URL Ingest, graphify.ingest.ingest, URL Type Auto-Detection, Transcripts Treated as Doc Files, GRAPHIFY_WHISPER_MODEL Setting, Whisper Transcription (transcribe_all), detect_incremental, graph_diff Update Summary (+4 more)

### Community 9 - "Semantic Extraction Spec"
Cohesion: 0.20
Nodes (12): Token Reduction Benchmark, calls Edge Direction and Same-Language Constraint, Hyperedges, Node ID Format Rule, semantically_similar_to Edge, Extraction Subagent Prompt, Image Vision Extraction Rules, Token Budget Truncation (+4 more)

### Community 10 - "Public API and Snap State Hook"
Cohesion: 0.24
Nodes (9): graphify skill trigger (/graphify), graphify query-first workflow for this repo, snap-bottom-sheet (library overview), Vite playground HTML entry, buildSnapPointsArray(), createDynamicSnapPoint(), useSnapState(), Sheet root component props (+1 more)

### Community 11 - "Graph Query and Traversal"
Cohesion: 0.27
Nodes (10): MCP stdio Server (graphify.serve), BFS Traversal, Constrained Query Expansion, DFS Traversal, Graph Label Vocabulary (.vocab.txt), /graphify explain Node Explanation, /graphify path Shortest Path, Inline NetworkX Traversal Fallback (+2 more)

### Community 12 - "Build, Audit Trail and Guards"
Cohesion: 0.20
Nodes (10): Discrete Confidence Score Rubric, DEEP_MODE Aggressive Inference, source_file Verbatim Rule, build_merge Replace-on-Re-Extract, prune_sources Deletion Pruning, Step 4 Build, Cluster and Analyze, EXTRACTED/INFERRED/AMBIGUOUS Audit Trail, Step 4.5 Graph Health Check (+2 more)

### Community 13 - "Shared Height Observers"
Cohesion: 0.29
Nodes (4): Shared ResizeObserver / resize-listener singletons, SharedResizeObserver, SharedWindowResizeListener, useWatchHeight()

### Community 14 - "React Peer Dependencies"
Cohesion: 0.22
Nodes (9): peerDependencies, react, react-dom, @react-spring/web, @use-gesture/react, react, react-dom, @react-spring/web (+1 more)

### Community 15 - "Package Scripts"
Cohesion: 0.22
Nodes (9): scripts, build, dev, lint, precommit, prepare, prepublishOnly, prettier (+1 more)

### Community 16 - "Watch and Auto-Rebuild Hooks"
Cohesion: 0.32
Nodes (8): Watch Debounce Window, needs_update Flag, --watch Folder Watcher, Post-Commit Auto-Rebuild Hook, Work Memory and LESSONS.md Reflection, Code-Only Change Fast Path, No API Key Requirement, Part A Structural AST Extraction

### Community 17 - "Spring Animation and Drag End"
Cohesion: 0.29
Nodes (6): Single spring on y, all motion via useAnim.animate, Close-by-drag threshold at index 0, isDragDownDisabled(), onDragEndEventHandler(), useAnim(), getClosestIndex()

### Community 18 - "Visualization and Wiki Exports"
Cohesion: 0.33
Nodes (6): GraphML Export, SVG Export, Wiki Export, --cluster-only Reclustering, Step 5 Community Labeling, Step 6 HTML and Obsidian Export

### Community 19 - "Repo Clone and Graph Merge"
Cohesion: 0.33
Nodes (6): graphify clone, graphify merge-graphs, Monorepo Per-Subfolder Extract, repo Node Attribute, Native CLAUDE.md Integration, Fast Path for Existing Graph

## Knowledge Gaps
- **147 isolated node(s):** `SheetContext`, `SnapPoints`, `SnapPointConfigObj`, `SheetPropsContext`, `SheetContextProviderProps` (+142 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Context, Overlay and Drag Events` to `Package Manifest and Publishing`, `Snap Point Model and Utils`, `Compound Component and Types`, `Public API and Snap State Hook`, `Shared Height Observers`, `Spring Animation and Drag End`?**
  _High betweenness centrality (0.240) - this node is a cross-community bridge._
- **Why does `keywords` connect `Package Manifest and Publishing` to `Context, Overlay and Drag Events`?**
  _High betweenness centrality (0.188) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Lint and Tooling Dev Deps` to `Package Manifest and Publishing`?**
  _High betweenness centrality (0.119) - this node is a cross-community bridge._
- **What connects `SheetContext`, `SnapPoints`, `SnapPointConfigObj` to the rest of the system?**
  _147 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Lint and Tooling Dev Deps` be split into smaller, more focused modules?**
  _Cohesion score 0.04878048780487805 - nodes in this community are weakly interconnected._
- **Should `Package Manifest and Publishing` be split into smaller, more focused modules?**
  _Cohesion score 0.05555555555555555 - nodes in this community are weakly interconnected._
- **Should `Snap Point Model and Utils` be split into smaller, more focused modules?**
  _Cohesion score 0.10695187165775401 - nodes in this community are weakly interconnected._