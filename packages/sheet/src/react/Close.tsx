import type { ComponentPropsWithoutRef, MouseEvent } from "react";
import { forwardRef } from "react";
import { useSheetContext } from "./context.ts";

export type CloseProps = ComponentPropsWithoutRef<"button">;

/** Button that closes the sheet through the Root's open state. */
export const Close = forwardRef<HTMLButtonElement, CloseProps>(function Close(
  { onClick, ...rest },
  forwardedRef,
) {
  const { setOpen } = useSheetContext("Sheet.Close");
  return (
    <button
      type="button"
      {...rest}
      ref={forwardedRef}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
        if (!event.defaultPrevented) setOpen(false);
      }}
    />
  );
});
