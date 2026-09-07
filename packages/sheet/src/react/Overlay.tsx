import type { ComponentPropsWithoutRef } from "react";
import { forwardRef } from "react";
import { usePartRef } from "./context.ts";

export type OverlayProps = ComponentPropsWithoutRef<"div">;

/**
 * The scrim. The controller owns its `data-state`, `aria-hidden`, opacity
 * and the click-to-close behaviour — this is just the element.
 */
export const Overlay = forwardRef<HTMLDivElement, OverlayProps>(
  function Overlay(props, forwardedRef) {
    const ref = usePartRef<HTMLDivElement>("overlay", forwardedRef);
    return <div {...props} ref={ref} />;
  },
);
