import { attachDrag } from "@snap-bottom-sheet/gesture";
import type { Spring } from "@snap-bottom-sheet/spring";
import { clamp, isBrowser } from "./env.ts";
import { topmostY } from "./position.ts";
import { decideRelease, type ResolvedSnap } from "./snap.ts";

/** px of slack before the sheet counts as displaced from its snap. */
const DisplacedEpsilon = 1;

const BlurredTags = new Set(["INPUT", "TEXTAREA"]);

/** The controller's side of the drag layer. */
export interface DragDeps {
  content: HTMLElement;
  body?: HTMLElement | null;
  spring: Spring;
  activeSnap(): ResolvedSnap | undefined;
  resolved(): ResolvedSnap[];
  viewHeight(): number;
  snapIndex(): number;
  dismissible(): boolean;
  setDragging(dragging: boolean): void;
  snapTo(index: number, opts?: { velocity?: number }): void;
  dismiss(): void;
  notify(): void;
  onDragStart?(): void;
  onDragEnd?(targetIndex: number): void;
}

/** Mobile ghost caret: a focused field inside the sheet loses focus on drag. */
function blurInside(content: HTMLElement) {
  const active = isBrowser() ? document.activeElement : null;
  if (
    active instanceof HTMLElement &&
    content.contains(active) &&
    BlurredTags.has(active.tagName)
  ) {
    active.blur();
  }
}

/** PLAN §3.4 rule 1: regions and situations that never start a drag. */
function dragFilter(target: Element): boolean {
  if (target.closest("[data-snap-sheet-no-drag]")) return false;
  if (target.closest("select")) return false;
  if (isBrowser() && document.getSelection()?.type === "Range") return false;
  return true;
}

/**
 * PLAN §3.4 rule 2: inside a scrollable Body the native scroll keeps the
 * gesture, unless the sheet is already displaced or the user pulls down from
 * the very top.
 */
function scrollWins(deps: DragDeps, dy: number, target: EventTarget | null) {
  const { body, spring } = deps;
  const snap = deps.activeSnap();
  if (!snap?.scroll || !body) return false;
  if (!(target instanceof Node) || !body.contains(target)) return false;
  if (Math.abs(spring.get() - snap.y) > DisplacedEpsilon) return false;
  return !(body.scrollTop <= 0 && dy > 0);
}

/** Wire the gesture recogniser to the controller. Returns a detach function. */
export function attachSheetDrag(deps: DragDeps): () => void {
  const { content, spring } = deps;
  let startY = 0;
  let dragging = false;

  return attachDrag(
    content,
    {
      onStart(state) {
        // Nested sheets: the inner panel swallows the gesture (P0-5).
        state.event.stopPropagation();
        if (scrollWins(deps, state.dy, state.target)) {
          state.cancel();
          return;
        }
        blurInside(content);
        dragging = true;
        startY = spring.get();
        content.setAttribute("data-dragging", "");
        deps.setDragging(true);
        deps.onDragStart?.();
        deps.notify();
      },
      onMove(state) {
        if (!dragging) return;
        const snap = deps.activeSnap();
        let dy = state.dy;
        if (snap && !snap.drag.up && dy < 0) dy = 0;
        if (snap && !snap.drag.down && dy > 0) dy = 0;
        const resolved = deps.resolved();
        void spring.set(
          clamp(startY + dy, topmostY(resolved), deps.viewHeight()),
          { immediate: true },
        );
      },
      onEnd(state) {
        if (!dragging) return;
        dragging = false;
        content.removeAttribute("data-dragging");
        deps.setDragging(false);
        if (state.cancelled) {
          deps.snapTo(deps.snapIndex());
          deps.notify();
          return;
        }
        const decision = decideRelease({
          y: spring.get(),
          vy: state.vy,
          resolved: deps.resolved(),
          dismissible: deps.dismissible(),
        });
        if (decision.close) {
          deps.onDragEnd?.(-1);
          deps.dismiss();
        } else {
          deps.onDragEnd?.(decision.snap.index);
          deps.snapTo(decision.snap.index, { velocity: state.vy });
        }
        deps.notify();
      },
    },
    { filter: dragFilter },
  );
}
