import type { ReactNode } from "react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { useSheetContext } from "./context.ts";
import { useIsomorphicLayoutEffect } from "./use-isomorphic-layout-effect.ts";

export interface PortalProps {
  /** defaults to document.body; also becomes the controller's view-height source */
  container?: HTMLElement | null;
  children?: ReactNode;
}

/**
 * Renders nothing on the server and on the first client render, so hydration
 * sees the same empty output on both sides; the real subtree appears in the
 * effect that follows.
 */
export function Portal({ container, children }: PortalProps) {
  const { register } = useSheetContext("Sheet.Portal");
  const [mounted, setMounted] = useState(false);

  useIsomorphicLayoutEffect(() => {
    setMounted(true);
  }, []);

  // A layout effect, not a passive one: layout effects run child-first, so the
  // container is registered before the Root's effect builds SheetElements.
  useIsomorphicLayoutEffect(() => {
    register("container", container ?? null);
    return () => register("container", null);
  }, [container, register]);

  if (!mounted) return null;
  return createPortal(children, container ?? document.body);
}
