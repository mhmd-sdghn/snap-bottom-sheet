import type { ComponentPropsWithoutRef } from "react";
import { forwardRef } from "react";
import { useAriaId, usePartRef, useSheetContext } from "./context.ts";

export type TitleProps = ComponentPropsWithoutRef<"h2">;

/**
 * Carries the id the Root hands the controller as `aria-labelledby`. Rendering
 * this part is what makes the Root pass that option at all.
 *
 * Your own `id` wins. It is taken out of the spread rather than left in it: an
 * explicit `id={undefined}` would otherwise overwrite the generated one, and
 * the dialog would end up with no accessible name at all.
 */
export const Title = forwardRef<HTMLHeadingElement, TitleProps>(function Title(
  { id, ...rest },
  forwardedRef,
) {
  const { titleId } = useSheetContext("Title");
  const ref = usePartRef<HTMLHeadingElement>("title", forwardedRef);
  const resolvedId = id ?? titleId;
  useAriaId("title", resolvedId);
  return <h2 id={resolvedId} {...rest} ref={ref} />;
});
