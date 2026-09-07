import { vi } from "vitest";
import type {
  SheetController,
  SheetElements,
  SheetOptions,
  SheetState,
} from "../../src/core/sheet.ts";
import type { SnapPoint } from "../../src/core/snap.ts";

const INITIAL: SheetState = {
  open: false,
  snapIndex: 0,
  y: 0,
  progress: 0,
  dragging: false,
  animating: false,
  contentMode: false,
};

export interface FakeController extends SheetController {
  /** what `createSheet` was handed */
  elements: SheetElements | null;
  options: SheetOptions | null;
  /** push a state change at every subscriber */
  push(patch: Partial<SheetState>): void;
  /** the controller dismissing itself, the way a drag or Escape would */
  selfClose(): void;
  /** the controller settling on a new snap, then reporting it */
  selfSnap(index: number, point: SnapPoint): void;
}

/**
 * A stateful stand-in for the real controller. Stateful on purpose: the Root
 * skips calls that match `getState()`, so a fake with frozen state would let
 * that logic pass untested.
 */
export function makeFakeController(): FakeController {
  let state = INITIAL;
  const listeners = new Set<(next: SheetState) => void>();

  const push = (patch: Partial<SheetState>) => {
    state = { ...state, ...patch };
    for (const listener of listeners) listener(state);
  };

  const fake: FakeController = {
    elements: null,
    options: null,
    push,
    open: vi.fn(async () => push({ open: true })),
    close: vi.fn(async () => push({ open: false })),
    snapTo: vi.fn(async (index: number) => push({ snapIndex: index })),
    update: vi.fn(),
    setElements: vi.fn(),
    getState: () => state,
    subscribe: vi.fn((fn: (next: SheetState) => void) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    }),
    destroy: vi.fn(),
    selfClose: () => {
      push({ open: false });
      fake.options?.onOpenChange?.(false);
    },
    selfSnap: (index, point) => {
      push({ snapIndex: index });
      fake.options?.onSnapIndexChange?.(index, point);
    },
  };

  return fake;
}
