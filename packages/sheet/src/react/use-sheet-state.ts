import { useCallback, useRef, useSyncExternalStore } from "react";
import type { SheetState } from "../core/sheet.ts";
import { useSheetContext } from "./context.ts";

/** What the server (and a not-yet-created or destroyed controller) reports. */
const CLOSED_STATE: SheetState = Object.freeze({
  open: false,
  snapIndex: 0,
  y: 0,
  progress: 0,
  dragging: false,
  animating: false,
  contentMode: false,
});

export function useSheetState(): SheetState;
export function useSheetState<T>(selector: (state: SheetState) => T): T;
/**
 * Live `SheetState` from the controller.
 *
 * The snapshot is cached from the subscription payload rather than read through
 * `getState()` on every call, because `useSyncExternalStore` needs a stable
 * reference between notifications.
 *
 * Pass a `selector` to re-render only when the part you read changes. The
 * sheet notifies on every animation frame, so a component that only needs
 * `open` would otherwise re-render twenty or thirty times per transition:
 *
 * ```tsx
 * const open = useSheetState((state) => state.open);
 * ```
 *
 * React compares the selected value with `Object.is`, so a primitive or a
 * stable reference re-renders only on a real change. Returning a fresh object
 * or array is safe but re-renders on every frame, since no two are equal.
 */
export function useSheetState<T>(
  selector?: (state: SheetState) => T,
): SheetState | T {
  const { controllerRef, controllerVersion } = useSheetContext("useSheetState");
  const cache = useRef<SheetState>(CLOSED_STATE);

  // Latest selector without destabilising the store callbacks: an inline arrow
  // is the normal way to call this, and re-subscribing on every render would
  // make the selector cost more than it saves.
  const selectorRef = useRef(selector);
  selectorRef.current = selector;
  const selection = useRef<{ source: SheetState; value: T } | null>(null);

  // Resubscribing is the point: a new controller means a new store.
  // biome-ignore lint/correctness/useExhaustiveDependencies: see above
  const subscribe = useCallback(
    (onChange: () => void) => {
      const controller = controllerRef.current;
      if (!controller) return () => {};
      cache.current = controller.getState();
      return controller.subscribe((state) => {
        cache.current = state;
        onChange();
      });
    },
    [controllerRef, controllerVersion],
  );

  /**
   * The controller keeps one frozen state object until a field actually moves,
   * so identity is a safe cache key here. A destroyed controller is reported as
   * closed rather than frozen at whatever it last was — the cache outlives it.
   */
  const select = useCallback((source: SheetState): SheetState | T => {
    const selectFn = selectorRef.current;
    if (!selectFn) return source;

    // Memoised per source object, not for speed: `useSyncExternalStore`
    // calls this several times per render and requires a stable result, so a
    // selector returning a fresh object or array would otherwise hand React
    // a new reference every call and trip its "getSnapshot should be cached"
    // loop. React compares the value it gets back with `Object.is`, and that
    // is what limits re-renders to actual changes.
    const previous = selection.current;
    if (previous && previous.source === source) return previous.value;

    const value = selectFn(source);
    selection.current = { source, value };
    return value;
  }, []);

  const getSnapshot = useCallback(
    () => select(controllerRef.current ? cache.current : CLOSED_STATE),
    [controllerRef, select],
  );
  const getServerSnapshot = useCallback(() => select(CLOSED_STATE), [select]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
