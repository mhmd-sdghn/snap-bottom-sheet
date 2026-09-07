import type { Ref, RefObject } from "react";
import { createContext, useContext } from "react";
import type { SheetController } from "../core/sheet.ts";

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

/** Callback ref that keeps `register` and a consumer's own ref both fed. */
export function usePartRef<T extends HTMLElement>(
  part: PartName,
  forwarded?: Ref<T>,
) {
  const { register } = useSheetContext(part);
  return (el: T | null) => {
    register(part, el);
    if (typeof forwarded === "function") forwarded(el);
    else if (forwarded) (forwarded as { current: T | null }).current = el;
  };
}
