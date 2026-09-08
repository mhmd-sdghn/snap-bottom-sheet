import type { ComponentPropsWithoutRef } from "react";
import { forwardRef } from "react";
import { useAriaId, usePartRef, useSheetContext } from "./context.ts";

export type DescriptionProps = ComponentPropsWithoutRef<"p">;

/**
 * Carries the id the Root hands the controller as `aria-describedby`. Rendering
 * this part is what makes the Root pass that option at all.
 *
 * Your own `id` wins, and is taken out of the spread for the same reason as in
 * `Sheet.Title`.
 */
export const Description = forwardRef<HTMLParagraphElement, DescriptionProps>(
  function Description({ id, ...rest }, forwardedRef) {
    const { descriptionId } = useSheetContext("Description");
    const ref = usePartRef<HTMLParagraphElement>("description", forwardedRef);
    const resolvedId = id ?? descriptionId;
    useAriaId("description", resolvedId);
    return <p id={resolvedId} {...rest} ref={ref} />;
  },
);
