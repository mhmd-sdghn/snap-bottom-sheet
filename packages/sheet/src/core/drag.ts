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
  /** Read lazily: `setElements` can swap the body after attach. */
  body(): HTMLElement | null | undefined;
  spring: Spring;
  activeSnap(): ResolvedSnap | undefined;
  isOpen(): boolean;
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

/**
 * The same lock `onMove` applies to `dy`, applied to the release velocity. The
 * panel does not move in a locked direction, so a fling that way must not
 * project past a snap either — otherwise a fast flick down dismisses a sheet
 * whose active snap sets `drag: { down: false }`.
 */
function lockVelocity(snap: ResolvedSnap | undefined, vy: number): number {
  if (!snap) return vy;
  if (!snap.drag.up && vy < 0) return 0;
  if (!snap.drag.down && vy > 0) return 0;
  return vy;
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
  const { spring } = deps;
  const body = deps.body();
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
        // A closed panel is still in the DOM through the close animation.
        if (!deps.isOpen()) {
          state.cancel();
          return;
        }
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
          // A drag that started must always end: onDragStart already fired.
          deps.onDragEnd?.(deps.snapIndex());
          deps.snapTo(deps.snapIndex());
          deps.notify();
          return;
        }
        const decision = decideRelease({
          y: spring.get(),
          vy: lockVelocity(deps.activeSnap(), state.vy),
          resolved: deps.resolved(),
          dismissible: deps.dismissible(),
        });
        if (decision.close) {
          deps.onDragEnd?.(-1);
          deps.dismiss();
        } else {
          deps.onDragEnd?.(decision.snap.index);
          deps.snapTo(decision.snap.index, {
            velocity: lockVelocity(deps.activeSnap(), state.vy),
          });
        }
        deps.notify();
      },
    },
    { filter: dragFilter },
  );
}
