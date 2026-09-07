import type { SnapPoint } from "./snap.ts";

export interface SheetElements {
  /** The panel: transform, padding-bottom, data-*, CSS vars, role/aria. */
  content: HTMLElement;
  header?: HTMLElement | null;
  body?: HTMLElement | null;
  overlay?: HTMLElement | null;
  handle?: HTMLElement | null;
  /** View-height source and inert scope; defaults to the window/document.body. */
  container?: HTMLElement | null;
}

export interface SheetOptions {
  snapPoints?: SnapPoint[];
  defaultSnapIndex?: number;
  modal?: boolean;
  dismissible?: boolean;
  reducedMotion?: boolean | "system";
  skipInitialAnimation?: boolean;
  labelledBy?: string;
  describedBy?: string;
  onOpenChange?(open: boolean): void;
  onSnapIndexChange?(index: number, point: SnapPoint): void;
  onDragStart?(): void;
  /** -1 when the release dismisses the sheet. */
  onDragEnd?(targetIndex: number): void;
  onAnimationEnd?(open: boolean): void;
}

export interface SheetState {
  open: boolean;
  snapIndex: number;
  y: number;
  /** 0 closed → 1 at the tallest snap. */
  progress: number;
  dragging: boolean;
  animating: boolean;
  contentMode: boolean;
}

export interface SheetController {
  open(): Promise<void>;
  close(): Promise<void>;
  snapTo(index: number, opts?: { immediate?: boolean }): Promise<void>;
  update(options: Partial<SheetOptions>): void;
  /**
   * (Re)register optional parts after attach; `null` removes one. Only the keys
   * present are rewired, and the spring position is untouched. Changing
   * `content` or `container` throws a TypeError — recreate the sheet instead.
   */
  setElements(elements: Partial<SheetElements>): void;
  getState(): SheetState;
  subscribe(fn: (state: SheetState) => void): () => void;
  destroy(): void;
}
