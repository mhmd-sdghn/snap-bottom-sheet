import type { ComponentPropsWithoutRef } from "react";
import { forwardRef } from "react";
import { usePartRef } from "./context.ts";

export type BodyProps = ComponentPropsWithoutRef<"div">;

/**
 * Scroll region. The controller toggles its overflow per snap and arbitrates
 * scroll against drag inside it.
 */
export const Body = forwardRef<HTMLDivElement, BodyProps>(
  function Body(props, forwardedRef) {
    const ref = usePartRef<HTMLDivElement>("body", forwardedRef);
    return <div {...props} ref={ref} />;
  },
);
