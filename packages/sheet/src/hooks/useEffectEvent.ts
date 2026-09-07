import { useIsomorphicLayoutEffect } from "@react-spring/web";
import { useCallback, useRef } from "react";

// eslint-disable-next-line
function useEffectEvent<T extends (...args: any[]) => any>(handler: T) {
  const handlerRef = useRef<T>(undefined);

  useIsomorphicLayoutEffect(() => {
    handlerRef.current = handler;
  });

  // eslint-disable-next-line
  return useCallback((...args: any[]) => {
    const fn = handlerRef.current;
    return fn?.(...args);
  }, []) as T;
}

export default useEffectEvent;
