import { useIsomorphicLayoutEffect } from "@react-spring/web";
import { type RefObject, useRef } from "react";

function useScrollLock(targetRef: RefObject<HTMLDivElement | null>) {
  const ref = useRef<{ activate: () => void; deactivate: () => void }>({
    activate: () => {
      throw new TypeError("Tried to activate scroll lock too early");
    },
    deactivate: () => {},
  });

  useIsomorphicLayoutEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    let active: boolean | null = null;

    document.documentElement.style.overflowY = "hidden";
    document.body.style.overflowY = "hidden";
    document.documentElement.style.overscrollBehavior = "none";
    document.body.style.overscrollBehavior = "none";

    ref.current = {
      activate: () => {
        if (active === true) return;
        target.style.overflowY = "hidden";
        target.style.touchAction = "none";
        active = true;
      },
      deactivate: () => {
        if (active === false) return;
        target.style.overflowY = "auto";
        target.style.touchAction = "pan-y";
        active = false;
      },
    };

    return () => {
      document.documentElement.style.overflowY = "";
      document.body.style.overflowY = "";
      document.documentElement.style.overscrollBehavior = "";
      document.body.style.overscrollBehavior = "";
    };
  }, [targetRef.current]);

  return ref;
}

export default useScrollLock;
