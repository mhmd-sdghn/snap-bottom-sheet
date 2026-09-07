import type { ComponentPropsWithoutRef } from "react";
import { forwardRef } from "react";
import { usePartRef, useSheetContext } from "./context.ts";

export type TitleProps = ComponentPropsWithoutRef<"h2">;

/**
 * Carries the id the Root hands the controller as `aria-labelledby`. Rendering
 * this part is what makes the Root pass that option at all.
 */
export const Title = forwardRef<HTMLHeadingElement, TitleProps>(
  function Title(props, forwardedRef) {
    const { titleId } = useSheetContext("Title");
    const ref = usePartRef<HTMLHeadingElement>("title", forwardedRef);
    return <h2 id={titleId} {...props} ref={ref} />;
  },
);
