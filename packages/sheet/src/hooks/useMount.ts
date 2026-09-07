import { useIsomorphicLayoutEffect } from "@react-spring/web";
import { OverlayElementId } from "../constants.ts";
import type { useMountProps } from "../types.ts";

/**
 * This hook manages flows when SheetContainer component mount and unmount
 */
const useMount = ({ animate, onClose, state }: useMountProps) => {
  const { viewHeight, wrapperRef, overlayColor, wrapper, isOpen } = state;

  useIsomorphicLayoutEffect(() => {
    if (!state.isOpen) {
      animate(viewHeight, () => {
        onClose();
      });
      if (wrapperRef.current && overlayColor) {
        const overlay = wrapperRef.current.querySelector(
          `#${OverlayElementId}`,
        ) as HTMLElement;

        if (overlay) overlay.style.backgroundColor = "";
      }
    } else {
      if (overlayColor) {
        if (!wrapper) {
          console.warn(
            "snap-bottom-sheet: Overlay will appear when you set value for wrapper prop",
          );
        } else if (wrapperRef.current) {
          const overlay = wrapperRef.current.querySelector(
            `#${OverlayElementId}`,
          ) as HTMLElement;

          if (overlay) overlay.style.backgroundColor = overlayColor;
        }
      }
    }
  }, [animate, viewHeight, isOpen]);
};

export default useMount;
