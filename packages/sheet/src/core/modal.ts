import { applyInert, focusFirst } from "./dom.ts";
import { isBrowser } from "./env.ts";
import { pushEscapeTarget } from "./keyboard.ts";
import { lockBodyScroll, lockContainerScroll } from "./scroll-lock.ts";

export interface ModalGuardParts {
  content: HTMLElement;
  /** Read live: `update({ dismissible })` must change what Escape does. */
  dismissible(): boolean;
  /** Read lazily: `setElements` can swap the overlay after attach. */
  overlay(): HTMLElement | null | undefined;
  container?: HTMLElement | null;
  /** Escape while this sheet is the innermost open one. */
  onEscape(): void;
}

export interface ModalGuard {
  /**
   * Scroll lock + `inert` on the surrounding content + Escape routing.
   * Idempotent: a re-entrant `open()` from inside `onOpenChange` must not
   * take a second reference on the refcounted scroll lock.
   */
  engage(): void;
  /** Undo everything `engage` did. Safe to call when nothing is engaged. */
  disengage(): void;
  /**
   * Remember the focused element, then focus into the panel. Idempotent: a
   * reopen mid-close must not overwrite the memory with a node inside the sheet.
   */
  captureFocus(): void;
  /** Return focus to whatever had it before `captureFocus`. */
  restoreFocus(): void;
  /** Route Escape here while engaged; no-op if already routed. */
  ensureEscape(): void;
  /** Drop Escape routing without releasing the lock or inert. */
  releaseEscape(): void;
}

/** The outermost ancestor of `el` that is still a child of `scope`. */
function rootOf(el: HTMLElement, scope: HTMLElement): HTMLElement {
  let node = el;
  while (node.parentElement && node.parentElement !== scope) {
    node = node.parentElement;
  }
  return node;
}

/**
 * The modal side effects of being open, kept together so `destroy()` and a
 * mid-flight `update({ modal })` can wind them back in one call each.
 */
export function createModalGuard(parts: ModalGuardParts): ModalGuard {
  const { content, overlay, container, onEscape, dismissible } = parts;

  let releaseLock: (() => void) | null = null;
  let restoreInert: (() => void) | null = null;
  let escapeRelease: (() => void) | null = null;
  let previousFocus: HTMLElement | null = null;
  let engaged = false;
  let focusCaptured = false;

  const ensureEscape = () => {
    if (!escapeRelease) {
      escapeRelease = pushEscapeTarget(onEscape, dismissible);
    }
  };

  const releaseEscape = () => {
    escapeRelease?.();
    escapeRelease = null;
  };

  return {
    engage() {
      if (engaged) return;
      engaged = true;
      // An embedded sheet is modal within its own box: locking the document
      // would freeze a host page that is not even showing the sheet.
      releaseLock = container
        ? lockContainerScroll(container)
        : lockBodyScroll();
      const scope = container ?? (isBrowser() ? document.body : null);
      if (scope) {
        restoreInert = applyInert(scope, [rootOf(content, scope), overlay()]);
      }
      ensureEscape();
    },
    disengage() {
      engaged = false;
      releaseLock?.();
      releaseLock = null;
      restoreInert?.();
      restoreInert = null;
      releaseEscape();
    },
    captureFocus() {
      if (focusCaptured) return;
      focusCaptured = true;
      previousFocus = isBrowser()
        ? (document.activeElement as HTMLElement | null)
        : null;
      focusFirst(content);
    },
    restoreFocus() {
      focusCaptured = false;
      const previous = previousFocus;
      previousFocus = null;
      const active = isBrowser() ? document.activeElement : null;
      const inside = active instanceof HTMLElement && content.contains(active);
      if (previous?.isConnected) previous.focus?.();
      // A non-focusable previous holder (document.body, the usual case when
      // nothing was focused) silently ignores focus(). Focus must not stay
      // inside a dialog that is now closed, so blur our way out.
      if (inside && document.activeElement === active) active.blur();
    },
    ensureEscape,
    releaseEscape,
  };
}
