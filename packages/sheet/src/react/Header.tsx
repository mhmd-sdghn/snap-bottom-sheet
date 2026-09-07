import type { ComponentPropsWithoutRef } from "react";
import { forwardRef } from "react";
import { usePartRef } from "./context.ts";

export type HeaderProps = ComponentPropsWithoutRef<"div">;

/**
 * Non-scrolling top region. Measured by the controller for the `"header"`
 * snap value.
 */
export const Header = forwardRef<HTMLDivElement, HeaderProps>(
  function Header(props, forwardedRef) {
    const ref = usePartRef<HTMLDivElement>("header", forwardedRef);
    return <div {...props} ref={ref} />;
  },
);
