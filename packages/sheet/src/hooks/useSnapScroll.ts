import { useIsomorphicLayoutEffect } from "@react-spring/web";
import { useRef } from "react";
import type { useSnapScrollProps } from "../types.ts";
import { isSnapPointConfigObj, validateSnapTo } from "../utils.ts";

/**
 * This hook handles scroll-lock and drag based on each snap
 * @param state
 * @param animate
 */
const useSnapScroll = ({ state, animate }: useSnapScrollProps) => {
  // TODO you might need to move this to bottom sheet component
  const firstMount = useRef(true);

  const {
    activeSnapPoint,
    scrollLock,
    activeSnapValue,
    bottomSheetRef,
    noInitialAnimation,
  } = state;

  useIsomorphicLayoutEffect(() => {
    // handle scroll lock when active index changes from outside.
    if (isSnapPointConfigObj(activeSnapPoint) && activeSnapPoint.scroll) {
      scrollLock.current.deactivate();
    } else {
      bottomSheetRef.current?.scroll({ top: 0, behavior: "smooth" });
      scrollLock.current.activate();
    }

    animate(
      validateSnapTo({
        snapTo: activeSnapValue,
        sheetHeight: bottomSheetRef.current?.offsetHeight || 0,
      }),
      () => {
        firstMount.current = false;
      },
      { jump: firstMount.current && noInitialAnimation },
    );
  }, [activeSnapValue, noInitialAnimation]);
};

export default useSnapScroll;
