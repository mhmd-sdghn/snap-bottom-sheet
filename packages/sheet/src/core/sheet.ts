import type { SnapPoint } from "./snap.ts";

/**
 * STUB — task 04 (`w1/04-core-controller`) owns the real implementation. The
 * types below are PLAN §2.2 verbatim and are the contract the React bindings
 * are written against; the orchestrator drops this file when task 04 merges.
 */

export interface SheetElements {
  /**
   * The panel: receives transform, padding-bottom, data-*, CSS vars, role/aria.
   * Required, and fixed for the controller's lifetime — every other element may
   * arrive later through `setElements`.
   */
  content: HTMLElement;
  /** measured for "header" */
  header?: HTMLElement | null;
  /** scroll region: overflow toggled per snap, scroll-vs-drag arbitration */
  body?: HTMLElement | null;
  /** click → close when dismissible; receives data-state, aria-hidden */
  overlay?: HTMLElement | null;
  /** keyboard: ArrowUp/ArrowDown step, Enter/Space cycle */
  handle?: HTMLElement | null;
  /** view-height source + inert scope; default document.body (window height) */
  container?: HTMLElement | null;
}

export interface SheetOptions {
  /** default [] → content mode */
  snapPoints?: SnapPoint[];
  /** default 0 */
  defaultSnapIndex?: number;
  /** default true */
  modal?: boolean;
  /** default true */
  dismissible?: boolean;
  /** default "system" */
  reducedMotion?: boolean | "system";
  skipInitialAnimation?: boolean;
  /** aria-labelledby id */
  labelledBy?: string;
  /** aria-describedby id */
  describedBy?: string;
  onOpenChange?(open: boolean): void;
  onSnapIndexChange?(index: number, point: SnapPoint): void;
  onDragStart?(): void;
  onDragEnd?(targetIndex: number | -1): void;
  onAnimationEnd?(open: boolean): void;
}

export interface SheetState {
  open: boolean;
  snapIndex: number;
  y: number;
  /** 0 closed → 1 topmost snap */
  progress: number;
  dragging: boolean;
  animating: boolean;
  contentMode: boolean;
}

export interface SheetController {
  open(): Promise<void>;
  close(): Promise<void>;
  snapTo(index: number, opts?: { immediate?: boolean }): Promise<void>;
  /** re-resolves snap points; re-snaps if the active value changed */
  update(options: Partial<SheetOptions>): void;
  /**
   * (Re)register optional parts after attach (null removes); rewires
   * observers/listeners for the changed parts only; position is kept.
   */
  setElements(elements: Partial<SheetElements>): void;
  getState(): SheetState;
  subscribe(fn: (state: SheetState) => void): () => void;
  /**
   * Detach gesture + observers, restore scroll lock / inert / focus / styles.
   * Idempotent. After destroy every method is a no-op; promise-returning
   * methods resolve immediately (React strict mode double-invokes effects).
   */
  destroy(): void;
}

export function createSheet(
  _elements: SheetElements,
  _options?: SheetOptions,
): SheetController {
  throw new Error("snap-bottom-sheet: createSheet stub (task 04)");
}
