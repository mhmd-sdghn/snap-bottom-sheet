import { applyInert, focusFirst } from "./dom.ts";
import { isBrowser } from "./env.ts";
import { pushEscapeTarget } from "./keyboard.ts";
import { lockBodyScroll } from "./scroll-lock.ts";

export interface ModalGuardParts {
  content: HTMLElement;
  overlay?: HTMLElement | null;
  container?: HTMLElement | null;
  /** Escape while this sheet is the innermost open one. */
  onEscape(): void;
}

export interface ModalGuard {
  /** Body scroll lock + `inert` on the surrounding content + Escape routing. */
  engage(dismissible: boolean): void;
  /** Undo everything `engage` did. Safe to call when nothing is engaged. */
  disengage(): void;
  /** Remember the focused element, then focus into the panel. */
  captureFocus(): void;
  /** Return focus to whatever had it before `captureFocus`. */
  restoreFocus(): void;
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
  const { content, overlay, container, onEscape } = parts;

  let releaseLock: (() => void) | null = null;
  let restoreInert: (() => void) | null = null;
  let escapeRelease: (() => void) | null = null;
  let previousFocus: HTMLElement | null = null;

  const releaseEscape = () => {
    escapeRelease?.();
    escapeRelease = null;
  };

  return {
    engage(dismissible) {
      releaseLock = lockBodyScroll();
      const scope = container ?? (isBrowser() ? document.body : null);
      if (scope) {
        restoreInert = applyInert(scope, [rootOf(content, scope), overlay]);
      }
      if (dismissible && !escapeRelease) {
        escapeRelease = pushEscapeTarget(onEscape);
      }
    },
    disengage() {
      releaseLock?.();
      releaseLock = null;
      restoreInert?.();
      restoreInert = null;
      releaseEscape();
    },
    captureFocus() {
      previousFocus = isBrowser()
        ? (document.activeElement as HTMLElement | null)
        : null;
      focusFirst(content);
    },
    restoreFocus() {
      previousFocus?.focus?.();
      previousFocus = null;
    },
    releaseEscape,
  };
}
