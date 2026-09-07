import { useCallback, useRef, useSyncExternalStore } from "react";
import type { SheetState } from "../core/sheet.ts";
import { useSheetContext } from "./context.ts";

/** What the server (and a not-yet-created controller) reports. */
const CLOSED_STATE: SheetState = {
  open: false,
  snapIndex: 0,
  y: 0,
  progress: 0,
  dragging: false,
  animating: false,
  contentMode: false,
};

/**
 * Live `SheetState` from the controller. The snapshot is cached from the
 * subscription payload rather than read through `getState()` on every call,
 * because `useSyncExternalStore` needs a stable reference between
 * notifications and PLAN §2.2 does not promise `getState()` returns one.
 */
export function useSheetState(): SheetState {
  const { controllerRef, controllerVersion } = useSheetContext("useSheetState");
  const cache = useRef<SheetState>(CLOSED_STATE);

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

  const getSnapshot = useCallback(() => cache.current, []);
  const getServerSnapshot = useCallback(() => CLOSED_STATE, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
