import type { RefObject } from "react";

const onDragStartEventHandler = (ref: RefObject<HTMLDivElement | null>) => {
  // Find focused input inside the sheet and blur it when dragging starts
  // to prevent a unique ghost caret "bug" on mobile
  const focusedElement = document.activeElement as HTMLElement | null;
  if (!focusedElement || !ref.current) return;

  const isInput =
    focusedElement.tagName === "INPUT" || focusedElement.tagName === "TEXTAREA";

  // Only blur the focused element if it's inside the sheet
  if (isInput && ref.current.contains(focusedElement)) {
    focusedElement.blur();
  }
};

export default onDragStartEventHandler;
