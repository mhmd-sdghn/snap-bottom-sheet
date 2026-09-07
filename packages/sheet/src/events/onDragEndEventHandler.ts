import type { RefObject } from "react";
import { DragOffsetThreshold, OverlayElementId } from "../constants.ts";
import type {
  DragEndEventHandlerFn,
  SnapPoint,
  UseAnimAnimateFn,
} from "../types.ts";
import { clamp, getClosestIndex, isSnapPointConfigObj } from "../utils.ts";

/**
 * Handles the drag end event for bottom sheet components with snap points
 * @param ref Reference to the draggable element
 * @param animate Function to animate to a specific position
 * @param wrapperRef Reference to the wrapper element
 * @param state
 */
const onDragEndEventHandler = (
  ref: RefObject<HTMLDivElement | null>,
  animate: UseAnimAnimateFn,
  wrapperRef: RefObject<HTMLDivElement | null>,
  state: DragEndEventHandlerFn,
): void => {
  const {
    offsetY,
    contentMode,
    viewHeight,
    dynamicHeightContent,
    snapValues,
    activeSnapPointIndex,
    snapPoints,
    activeSnapValue,
    scrollLock,
    scrollY,
    y,
    callbacks,
  } = state;

  const currentPosition = y.get();

  // Special case 1: Sheet is at the top
  // when the sheet is at the top, user most likely is scrolling the content and drag is disabled,
  // so for any reason the sheet drag moved the sheet, this code resets it's position
  if (currentPosition <= 0) {
    y.set(0);
    return;
  }

  // Special case 2: Content mode and user is dragging up
  // in this case we should not let the sheet height gets bigger than it's content
  if (contentMode && offsetY <= 0) {
    y.set(viewHeight - dynamicHeightContent);
    return;
  }

  // Normal behavior: Handle snap points
  // Calculate which snap point to move to
  const targetSnapIndex = contentMode
    ? 0
    : clamp(
        getClosestIndex(
          snapValues,
          currentPosition,
          offsetY,
          activeSnapPointIndex || 0,
        ),
        0,
        snapValues.length - 1,
      );

  const shouldClose =
    (contentMode && offsetY > DragOffsetThreshold) ||
    (!contentMode &&
      targetSnapIndex === 0 &&
      activeSnapPointIndex === 0 &&
      offsetY > DragOffsetThreshold);

  if (shouldClose) {
    // Handle sheet closing logic
    const nextSnap = snapPoints[targetSnapIndex];

    // Check if dragging down is disabled for this snap point
    if (isDragDownDisabled(nextSnap)) {
      return;
    }

    // Reset an overlay background if applicable
    if (wrapperRef?.current) {
      const overlay = wrapperRef.current.querySelector(
        `#${OverlayElementId}`,
      ) as HTMLElement;

      if (overlay) {
        overlay.style.backgroundColor = "";
      }
    }

    // Animate to fully closed position and trigger callbacks
    animate(viewHeight, () => {
      if (typeof callbacks.onSnap === "function") {
        callbacks.onSnap(-1, null);
      }
      callbacks.onClose();
    });
  } else {
    // Handle snap behavior
    const hasCustomSnapPoints =
      Array.isArray(snapPoints) && snapPoints.length > 0;
    const onlyDynamicSnap =
      snapPoints.length === 1 &&
      snapPoints[0] === viewHeight - dynamicHeightContent;

    if (hasCustomSnapPoints && !onlyDynamicSnap) {
      // Animate to current position if target is the same
      if (activeSnapPointIndex === targetSnapIndex) {
        animate(activeSnapValue);
      }

      // Trigger snap callback
      if (callbacks.onSnap) {
        callbacks.onSnap(targetSnapIndex, snapPoints[targetSnapIndex] ?? null);
      }
    }
  }

  // Handle lock or unlock scroll based on the final snap point configuration
  if (ref.current) {
    const snapPoint = snapPoints[targetSnapIndex ?? activeSnapPointIndex];

    const shouldEnableScroll =
      isSnapPointConfigObj(snapPoint) && snapPoint.scroll;
    const needsScrollReset = scrollY.current !== 0;

    if (shouldEnableScroll) {
      scrollLock.current.deactivate();
    } else {
      if (needsScrollReset) {
        ref.current.scroll({ top: 0, behavior: "smooth" });
      }
      scrollLock.current.activate();
    }
  }
};

/**
 * Determines if dragging down is disabled for a given snap point
 */
const isDragDownDisabled = (snapPoint?: SnapPoint): boolean => {
  if (!snapPoint) return false;
  if (typeof snapPoint === "number") return false;

  if (isSnapPointConfigObj(snapPoint)) {
    const dragConfig = snapPoint.drag;
    if (typeof dragConfig === "boolean") return !dragConfig;
    return dragConfig?.down === false;
  }

  return false;
};

export default onDragEndEventHandler;
