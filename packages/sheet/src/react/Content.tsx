import type { ComponentPropsWithoutRef } from "react";
import { forwardRef } from "react";
import { usePartRef } from "./context.ts";

export type ContentProps = ComponentPropsWithoutRef<"div">;

/**
 * The panel. Children are wrapped in a single inner div so the controller has
 * one node whose natural height is the content height (the `"content"` snap
 * value). role/aria, `data-*`, transform and the CSS custom properties are all
 * written by the controller — nothing state-dependent is rendered here.
 */
export const Content = forwardRef<HTMLDivElement, ContentProps>(
  function Content({ children, ...rest }, forwardedRef) {
    const ref = usePartRef<HTMLDivElement>("content", forwardedRef);
    return (
      <div {...rest} ref={ref}>
        <div data-snap-sheet-inner="">{children}</div>
      </div>
    );
  },
);
