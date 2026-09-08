import type { ReactNode } from "react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type {
  SheetController,
  SheetElements,
  SheetOptions,
  SheetState,
} from "../core/sheet.ts";
import { createSheet } from "../core/sheet.ts";
import type { SnapPoint } from "../core/snap.ts";
import type { PartName, SheetContextValue } from "./context.ts";
import { SheetContext } from "./context.ts";
import { useControllableState } from "./use-controllable-state.ts";
import { useIsomorphicLayoutEffect } from "./use-isomorphic-layout-effect.ts";

export interface SheetProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;

  /** default: [] → content mode */
  snapPoints?: SnapPoint[];
  activeSnapIndex?: number;
  /** default 0 */
  defaultSnapIndex?: number;
  onSnapIndexChange?: (index: number, snapPoint: SnapPoint) => void;

  /** default true: Overlay shown, body scroll locked, siblings inert, Escape closes */
  modal?: boolean;
  /** default true: drag below the lowest snap / overlay click / Escape close */
  dismissible?: boolean;
  /** mount at position instead of animating from closed */
  skipInitialAnimation?: boolean;
  /** default "system" (prefers-reduced-motion → immediate) */
  reducedMotion?: boolean | "system";

  onDragStart?: () => void;
  /**
   * Snap index the release settled on. `-1` = the sheet is closing.
   */
  onDragEnd?: (targetIndex: number) => void;
  /** spring at rest after open/close */
  onAnimationEnd?: (open: boolean) => void;

  children?: ReactNode;
}

export interface SheetHandle {
  /**
   * Resolves when the open animation ends; immediately if already open.
   * On a controlled sheet the call is advisory and resolves immediately — the
   * parent owns `open`.
   */
  open(): Promise<void>;
  /**
   * Resolves when the close animation ends; immediately if already closed.
   * On a controlled sheet the call is advisory and resolves immediately — the
   * parent owns `open`.
   */
  close(): Promise<void>;
  snapTo(index: number, opts?: { immediate?: boolean }): Promise<void>;
  readonly activeSnapIndex: number;
  /** current px offset from the top (0 = fully open) */
  readonly y: number;
}

type Parts = Partial<Record<PartName, HTMLElement>>;

export const Sheet = forwardRef<SheetHandle, SheetProps>(
  function Sheet(props, forwardedRef) {
    const {
      open: openProp,
      defaultOpen = false,
      onOpenChange,
      snapPoints,
      activeSnapIndex: snapIndexProp,
      defaultSnapIndex = 0,
      modal = true,
      dismissible = true,
      reducedMotion = "system",
      children,
    } = props;

    const [open, setOpen] = useControllableState({
      prop: openProp,
      defaultProp: defaultOpen,
      onChange: onOpenChange,
    });
    const [snapIndex, setSnapIndex] = useControllableState({
      prop: snapIndexProp,
      defaultProp: defaultSnapIndex,
    });

    const [closing, setClosing] = useState(false);

    // Resolvers for handle.open()/close() calls still waiting on their
    // animation, keyed by the state they are waiting for.
    const pendingRef = useRef<{ open: (() => void)[]; close: (() => void)[] }>({
      open: [],
      close: [],
    });

    const controllerRef = useRef<SheetController | null>(null);
    const [controllerVersion, setControllerVersion] = useState(0);
    /**
     * Bumped whenever the controller changes `open` or `snapIndex` on its own
     * (a drag, Escape, the overlay, a handle key). The sync effects below then
     * run *after* the parent has had its render, which is the only moment at
     * which "did the parent agree?" is answerable — at callback time the
     * parent's own setState has not been processed yet, so an agreeing parent
     * and a vetoing one look identical.
     */
    const [reconcileVersion, setReconcileVersion] = useState(0);
    const reconcile = useCallback(() => {
      setReconcileVersion((version) => version + 1);
    }, []);
    const partsRef = useRef<Parts>({});
    // The one registration that gates controller creation, so a part arriving in
    // a later commit (the Portal's own mount, above all) still triggers it.
    // The two elements the controller cannot swap in place, so their identity
    // keys the create effect. Both are safe to hold as state: layout effects
    // run child-first, so the Portal has registered its container before the
    // Root's create effect ever gets a `content` to attach to.
    const [contentEl, setContentEl] = useState<HTMLElement | null>(null);
    const [containerEl, setContainerEl] = useState<HTMLElement | null>(null);

    // Children stay mounted while the closing animation runs. Adjusted during
    // render, not in an effect: an effect would run after the pass that already
    // unmounted them, so the animation would never be seen.
    const previousOpen = useRef(open);
    if (previousOpen.current !== open) {
      previousOpen.current = open;
      setClosing(!open && controllerRef.current !== null);
    }
    const present = open || closing;

    const generatedId = useId();
    const titleId = `${generatedId}title`;
    const descriptionId = `${generatedId}description`;

    const register = useCallback((part: PartName, el: HTMLElement | null) => {
      if (el) partsRef.current[part] = el;
      else delete partsRef.current[part];

      // Fixed for a controller's lifetime: a change destroys and recreates.
      if (part === "content") {
        setContentEl(el);
        return;
      }
      if (part === "container") {
        setContainerEl(el);
        return;
      }

      const controller = controllerRef.current;
      if (!controller) return;
      // Whitelisted, so a part added to PartName later cannot leak into
      // SheetElements by accident.
      if (
        part === "header" ||
        part === "body" ||
        part === "overlay" ||
        part === "handle"
      ) {
        controller.setElements({ [part]: el });
      } else if (part === "title") {
        controller.update({ labelledBy: el?.id || undefined });
      } else if (part === "description") {
        controller.update({ describedBy: el?.id || undefined });
      }
    }, []);

    // Latest props/callbacks for the controller options, read at attach time and
    // from controller callbacks — never a stale closure.
    const latest = useRef(props);
    latest.current = props;
    // Same trick for the snap index: read through a ref so buildOptions can use
    // the live value without taking it as a dependency (which would make the
    // create effect recreate the controller on every snap change).
    const snapIndexRef = useRef(snapIndex);
    snapIndexRef.current = snapIndex;

    const buildOptions = useCallback((): SheetOptions => {
      const current = latest.current;
      const parts = partsRef.current;
      return {
        snapPoints: current.snapPoints ?? [],
        // The live index, not the prop: snapTo() on a closed sheet moves state
        // only, and the controller should attach there rather than at the
        // default and then snap again on the next effect.
        defaultSnapIndex: snapIndexRef.current,
        modal: current.modal ?? true,
        dismissible: current.dismissible ?? true,
        reducedMotion: current.reducedMotion ?? "system",
        skipInitialAnimation: current.skipInitialAnimation,
        // The id that is actually on the element: `Sheet.Title` lets a
        // consumer's own `id` win, and aria must point at whatever won.
        labelledBy: parts.title?.id || undefined,
        describedBy: parts.description?.id || undefined,
        onOpenChange: (next) => {
          setOpen(next);
          reconcile();
        },
        onSnapIndexChange: (index, point) => {
          setSnapIndex(index);
          latest.current.onSnapIndexChange?.(index, point);
          reconcile();
        },
        onDragStart: () => latest.current.onDragStart?.(),
        onDragEnd: (targetIndex) => latest.current.onDragEnd?.(targetIndex),
        onAnimationEnd: (isOpen) => {
          if (!isOpen) setClosing(false);
          for (const resolve of pendingRef.current[
            isOpen ? "open" : "close"
          ].splice(0))
            resolve();
          latest.current.onAnimationEnd?.(isOpen);
        },
      };
    }, [reconcile, setOpen, setSnapIndex]);

    useIsomorphicLayoutEffect(() => {
      if (!present || !contentEl) return;

      const parts = partsRef.current;
      const elements: SheetElements = {
        content: contentEl,
        header: parts.header ?? null,
        body: parts.body ?? null,
        overlay: parts.overlay ?? null,
        handle: parts.handle ?? null,
        container: containerEl,
      };

      const controller = createSheet(elements, buildOptions());
      controllerRef.current = controller;
      setControllerVersion((version) => version + 1);

      return () => {
        controllerRef.current = null;
        controller.destroy();
        // Re-render anything reading the store: without this, `useSheetState`
        // in a component that outlives the portal keeps serving the snapshot
        // it cached from the controller that has just been destroyed. Ignored
        // by React when the Root itself is the thing unmounting.
        setControllerVersion((version) => version + 1);
      };
    }, [present, contentEl, containerEl, buildOptions]);

    // `open` → open()/close(). Also the first open after creation, so the
    // create effect never double-calls open(); and the veto check, since a
    // controller-initiated close bumps reconcileVersion. A parent that kept
    // `open` true is a veto and gets one re-open — the documented bounce. A
    // parent that agreed already matches, so nothing happens and `data-state`
    // goes open → closed with nothing in between.
    // biome-ignore lint/correctness/useExhaustiveDependencies: see above
    useEffect(() => {
      const controller = controllerRef.current;
      if (!controller) return;
      if (controller.getState().open === open) {
        // Already agreed. This is also the only place that can release the
        // presence gate when the close never animated: an immediate close
        // (reducedMotion) started by the sheet itself fires onAnimationEnd
        // *before* the render that turns `closing` on, so nothing else would
        // ever turn it off and the panel would stay mounted for good.
        if (!open && closing && !controller.getState().animating) {
          setClosing(false);
        }
        return;
      }
      if (open) controller.open();
      else controller.close();
    }, [open, closing, controllerVersion, reconcileVersion]);

    // Same shape for the snap index: in controlled mode `setSnapIndex` cannot
    // change anything, so without reconcileVersion a drag would leave the
    // controller at one index and the prop at another, permanently.
    // biome-ignore lint/correctness/useExhaustiveDependencies: as above.
    useEffect(() => {
      const controller = controllerRef.current;
      if (!controller || controller.getState().snapIndex === snapIndex) return;
      controller.snapTo(snapIndex);
    }, [snapIndex, controllerVersion, reconcileVersion]);

    // One options key as the only dependency, so an unrelated prop can never
    // trigger a re-resolve and a fresh literal array with equal content never
    // does either. The key is also what keeps mount quiet: it does not change
    // across the commits that create the controller, so this never re-runs
    // there — the controller gets these values from buildOptions instead.
    const optionsKey = JSON.stringify([
      snapPoints ?? [],
      modal,
      dismissible,
      reducedMotion,
    ]);
    // The key string is the change detector, not an input to the call.
    // biome-ignore lint/correctness/useExhaustiveDependencies: see above
    useEffect(() => {
      const controller = controllerRef.current;
      if (!controller) return;
      controller.update({
        snapPoints: latest.current.snapPoints ?? [],
        modal: latest.current.modal ?? true,
        dismissible: latest.current.dismissible ?? true,
        reducedMotion: latest.current.reducedMotion ?? "system",
      });
    }, [optionsKey]);

    // A request the parent refused never produces an animation, so
    // onAnimationEnd will never drain it: a controlled parent that ignores
    // onOpenChange would leave `await handle.close()` hanging forever. Once the
    // sheet has settled in the opposite state with no animation running, the
    // request is moot — resolve it.
    // biome-ignore lint/correctness/useExhaustiveDependencies: controllerVersion is the change detector
    useEffect(() => {
      if (closing) return;
      const pending = pendingRef.current;
      const moot = open ? pending.close : pending.open;
      for (const resolve of moot.splice(0)) resolve();
      // Closed with no controller — `await handle.close()` from a mount effect
      // on a `defaultOpen` sheet gets here before the panel ever attached.
      // There is nothing left to animate, so that request is done too.
      if (!open && !controllerRef.current) {
        for (const resolve of pending.close.splice(0)) resolve();
      }
    }, [open, closing, controllerVersion]);

    // A caller awaiting open()/close() on a sheet that unmounts would otherwise
    // wait forever.
    useEffect(() => {
      const pending = pendingRef.current;
      return () => {
        for (const resolve of pending.open.splice(0)) resolve();
        for (const resolve of pending.close.splice(0)) resolve();
      };
    }, []);

    useImperativeHandle(forwardedRef, () => {
      // Never the controller directly: a closed sheet has none, and a direct
      // controller.close() on a controlled sheet trips the veto bounce in
      // buildOptions().onOpenChange. State is the single entry point; the
      // open/controllerVersion effect is what reaches the controller.
      const request = (next: boolean) => {
        if (open === next) return Promise.resolve();
        setOpen(next);
        // Controlled: the parent owns `open`, and it may ignore the request
        // entirely — there is no animation to await and nothing would ever
        // resolve a deferred. The call is advisory, so resolve it now.
        if (latest.current.open !== undefined) return Promise.resolve();
        return new Promise<void>((resolve) => {
          pendingRef.current[next ? "open" : "close"].push(resolve);
        });
      };

      return {
        open: () => request(true),
        close: () => request(false),
        snapTo: (index, opts) => {
          const controller = controllerRef.current;
          if (controller) return controller.snapTo(index, opts);
          // No controller (closed sheet): pick the snap the next open() uses.
          setSnapIndex(index);
          return Promise.resolve();
        },
        get activeSnapIndex() {
          return controllerRef.current?.getState().snapIndex ?? snapIndex;
        },
        get y() {
          return controllerRef.current?.getState().y ?? 0;
        },
      };
    }, [open, snapIndex, setOpen, setSnapIndex]);

    const context: SheetContextValue = {
      register,
      controllerRef,
      controllerVersion,
      titleId,
      descriptionId,
      setOpen,
    };

    return (
      <SheetContext.Provider value={context}>
        {present ? children : null}
      </SheetContext.Provider>
    );
  },
);

export type { SheetState };
