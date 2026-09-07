import type { ComponentPropsWithoutRef } from "react";
import { forwardRef } from "react";
import { usePartRef } from "./context.ts";

export type HandleProps = ComponentPropsWithoutRef<"button">;

/**
 * Drag affordance, and the keyboard entry point to the snap points: the
 * controller binds ArrowUp/ArrowDown and Enter/Space on this element.
 */
export const Handle = forwardRef<HTMLButtonElement, HandleProps>(
  function Handle(
    { "aria-label": ariaLabel = "Resize sheet", ...rest },
    forwardedRef,
  ) {
    const ref = usePartRef<HTMLButtonElement>("handle", forwardedRef);
    return <button type="button" aria-label={ariaLabel} {...rest} ref={ref} />;
  },
);
