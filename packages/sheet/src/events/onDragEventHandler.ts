import type { RefObject } from "react";
import type { OnDragEventHandlerState, UseAnimAnimateFn } from "../types.ts";
import { clamp, isSnapPointConfigObj } from "../utils.ts";

/**
 * Handles drag events for draggable elements with support for snap points and scrolling
 * @param containerRef Reference to the container element
 * @param animate Function to animate the element to a position
 * @param state Current state of the drag event
 */
const onDragEventHandler = (
  containerRef: RefObject<HTMLDivElement | null>,
  animate: UseAnimAnimateFn,
  state: OnDragEventHandlerState,
): void => {
  const {
    movementY,
    activeSnapPoint,
    scrollY,
    scrollLock,
    elementY,
    viewHeight,
  } = state;

  if (!containerRef.current) return;

  const targetPosition = elementY.current + movementY;
  const dragDirection = movementY < 0 ? "up" : movementY > 0 ? "down" : "";

  if (isSnapPointConfigObj(activeSnapPoint)) {
    const snapConfig = activeSnapPoint;
    const dragConfig = snapConfig.drag;

    // Check if drag should be blocked based on the direction
    const isDragBlocked =
      dragConfig === false ||
      (typeof dragConfig === "object" &&
        ((dragDirection === "down" && dragConfig.down === false) ||
          (dragDirection === "up" && dragConfig.up === false)));

    if (!isDragBlocked) {
      const isScrollingEnabled = snapConfig.scroll;
      const isDraggingDown = movementY > 0;
      const isAtTop = scrollY.current === 0;

      if (isScrollingEnabled && isDraggingDown && isAtTop) {
        scrollLock.current.activate();
        animate(clamp(targetPosition, 0, viewHeight));
      } else if (!isScrollingEnabled) {
        animate(clamp(targetPosition, 0, viewHeight));
      }
    }
  } else {
    // Simple animation without snap point constraints
    animate(targetPosition);
  }
};

export default onDragEventHandler;
