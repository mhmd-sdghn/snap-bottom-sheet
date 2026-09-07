import { isBrowser } from "./env.ts";

interface EscapeEntry {
  onEscape: () => void;
  /** A non-dismissible modal still owns Escape — it just does nothing with it. */
  dismissible: () => boolean;
}

const noop = () => {};

const stack: EscapeEntry[] = [];

function onDocumentKeyDown(event: KeyboardEvent): void {
  if (event.key !== "Escape") return;
  // Someone inside the sheet already handled this key.
  if (event.defaultPrevented) return;

  const top = stack[stack.length - 1];
  if (!top) return;

  // A modal sheet swallows Escape whether or not it is dismissible: falling
  // through would close the sheet *behind* the one the user is looking at.
  if (!top.dismissible()) return;

  top.onEscape();
}

/**
 * Register a sheet as the Escape recipient while it is open. Only the most
 * recently registered sheet receives Escape; the returned release deregisters
 * it (idempotent). A single shared `document` keydown listener is installed
 * while the stack is non-empty and removed when it empties. No-op outside the
 * browser.
 *
 * The explicit stack exists because two sheets both listening on `document`
 * cannot shield each other: `stopPropagation` does nothing to other listeners
 * on the same node, and `stopImmediatePropagation` fires in registration
 * order — outermost first, i.e. backwards. Routing to the top of the stack is
 * the only correct ordering.
 */
export function pushEscapeTarget(
  onEscape: () => void,
  dismissible: () => boolean = () => true,
): () => void {
  if (!isBrowser()) return noop;

  const entry: EscapeEntry = { onEscape, dismissible };
  stack.push(entry);
  if (stack.length === 1) {
    document.addEventListener("keydown", onDocumentKeyDown);
  }

  let released = false;
  return () => {
    if (released) return;
    released = true;

    // Splice by identity: entries below this one may already be gone, so the
    // index at push time is meaningless.
    const index = stack.indexOf(entry);
    if (index !== -1) stack.splice(index, 1);
    if (stack.length === 0) {
      document.removeEventListener("keydown", onDocumentKeyDown);
    }
  };
}

export interface HandleKeyActions {
  /** delta -1 = one snap up (taller sheet), +1 = one snap down. */
  step(delta: number): void;
  /** Enter/Space: advance to the next snap, wrapping. */
  cycle(): void;
}

/**
 * ArrowUp/ArrowDown/Enter/Space on the drag handle. Each handled key calls
 * `preventDefault` so Space does not scroll the page and the arrows do not
 * scroll a parent; anything else is left alone. Returns a detach function,
 * safe to call twice.
 */
export function attachHandleKeys(
  handle: HTMLElement,
  actions: HandleKeyActions,
): () => void {
  const onKeyDown = (event: KeyboardEvent): void => {
    switch (event.key) {
      case "ArrowUp":
        actions.step(-1);
        break;
      case "ArrowDown":
        actions.step(1);
        break;
      case "Enter":
      case " ":
        actions.cycle();
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  handle.addEventListener("keydown", onKeyDown);

  let detached = false;
  return () => {
    if (detached) return;
    detached = true;
    handle.removeEventListener("keydown", onKeyDown);
  };
}
