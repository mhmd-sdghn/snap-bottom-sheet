import { useEffect, useLayoutEffect } from "react";
import { isBrowser } from "../core/env.ts";

/** useLayoutEffect in the browser, useEffect on the server (no SSR warning). */
export const useIsomorphicLayoutEffect = isBrowser()
  ? useLayoutEffect
  : useEffect;
