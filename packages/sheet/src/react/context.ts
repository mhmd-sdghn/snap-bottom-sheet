import type { Ref, RefObject } from "react";
import { createContext, useCallback, useContext, useRef } from "react";
import type { SheetController } from "../core/sheet.ts";
import { useIsomorphicLayoutEffect } from "./use-isomorphic-layout-effect.ts";

/**
 * Parts the Root tracks. `content`…`container` are handed to the controller as
 * `SheetElements`; `title`/`description` are tracked only so the Root knows
 * whether to pass `labelledBy`/`describedBy` at all.
 */
export type PartName =
  | "content"
  | "header"
  | "body"
  | "overlay"
  | "handle"
  | "container"
  | "title"
  | "description";

export interface SheetContextValue {
  /** callback-ref sink: parts report their node, or null on unmount */
  register(part: PartName, el: HTMLElement | null): void;
  controllerRef: RefObject<SheetController | null>;
  /** bumped whenever the controller is recreated, so subscriptions re-run */
  controllerVersion: number;
  titleId: string;
  descriptionId: string;
  /** the Root's controllable open setter — used by `Sheet.Close` */
  setOpen(open: boolean): void;
}

export const SheetContext = createContext<SheetContextValue | null>(null);

export function useSheetContext(part: string): SheetContextValue {
  const context = useContext(SheetContext);
  if (!context) {
    throw new Error(
      `snap-bottom-sheet: ${part} must be rendered inside <Sheet>`,
    );
  }
  return context;
}

/**
 * Keep `aria-labelledby` / `aria-describedby` pointing at the id that is
 * actually on the element.
 *
 * The Root registers the id when the element attaches, and reads it again
 * whenever it builds a controller, so mount and unmount are already covered.
 * What is not is a consumer `id` that *changes* while the element stays put:
 * nothing re-registers, so the sheet would keep the first id for ever. Only a
 * real change is pushed, which leaves the mount path at the single call the
 * Root already makes.
 */
export function useAriaId(part: "title" | "description", id: string): void {
  const { controllerRef } = useSheetContext(part);
  const last = useRef(id);

  useIsomorphicLayoutEffect(() => {
    if (last.current === id) return;
    last.current = id;
    controllerRef.current?.update(
      part === "title" ? { labelledBy: id } : { describedBy: id },
    );
  }, [part, id, controllerRef]);
}

/**
 * Callback ref that keeps `register` and a consumer's own ref both fed. Its
 * identity has to be stable: React detaches and reattaches a callback ref
 * whenever the callback changes, so a fresh closure per render would
 * re-register every part on every render — and the controller would see a
 * detach/attach pair each time. The consumer's ref is read through a box so
 * that an inline `ref={...}` cannot destabilise us either.
 */
export function usePartRef<T extends HTMLElement>(
  part: PartName,
  forwarded?: Ref<T>,
) {
  const { register } = useSheetContext(part);
  const forwardedBox = useRef(forwarded);
  forwardedBox.current = forwarded;

  return useCallback(
    (el: T | null) => {
      register(part, el);
      const consumerRef = forwardedBox.current;
      if (typeof consumerRef === "function") consumerRef(el);
      else if (consumerRef) (consumerRef as { current: T | null }).current = el;
    },
    [part, register],
  );
}
