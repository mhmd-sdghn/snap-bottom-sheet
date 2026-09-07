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
  /** -1 = closing */
  onDragEnd?: (targetIndex: number | -1) => void;
  /** spring at rest after open/close */
  onAnimationEnd?: (open: boolean) => void;

  children?: ReactNode;
}

export interface SheetHandle {
  snapTo(index: number, opts?: { immediate?: boolean }): Promise<void>;
  close(): Promise<void>;
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

    const controllerRef = useRef<SheetController | null>(null);
    const [controllerVersion, setControllerVersion] = useState(0);
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

    const register = useCallback(
      (part: PartName, el: HTMLElement | null) => {
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
          controller.update({ labelledBy: el ? titleId : undefined });
        } else if (part === "description") {
          controller.update({ describedBy: el ? descriptionId : undefined });
        }
      },
      [descriptionId, titleId],
    );

    // Latest props/callbacks for the controller options, read at attach time and
    // from controller callbacks — never a stale closure.
    const latest = useRef(props);
    latest.current = props;

    const buildOptions = useCallback((): SheetOptions => {
      const current = latest.current;
      const parts = partsRef.current;
      return {
        snapPoints: current.snapPoints ?? [],
        defaultSnapIndex:
          current.activeSnapIndex ?? current.defaultSnapIndex ?? 0,
        modal: current.modal ?? true,
        dismissible: current.dismissible ?? true,
        reducedMotion: current.reducedMotion ?? "system",
        skipInitialAnimation: current.skipInitialAnimation,
        labelledBy: parts.title ? titleId : undefined,
        describedBy: parts.description ? descriptionId : undefined,
        onOpenChange: (next) => {
          setOpen(next);
          // A controlled parent that has not agreed to close: the controller has
          // already closed itself, so put it back. This is the one-frame bounce
          // PLAN §2.2 documents — `dismissible: false` is the way to veto.
          if (next === false && latest.current.open === true) {
            controllerRef.current?.open();
          }
        },
        onSnapIndexChange: (index, point) => {
          setSnapIndex(index);
          latest.current.onSnapIndexChange?.(index, point);
        },
        onDragStart: () => latest.current.onDragStart?.(),
        onDragEnd: (targetIndex) => latest.current.onDragEnd?.(targetIndex),
        onAnimationEnd: (isOpen) => {
          if (!isOpen) setClosing(false);
          latest.current.onAnimationEnd?.(isOpen);
        },
      };
    }, [descriptionId, setOpen, setSnapIndex, titleId]);

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
      };
    }, [present, contentEl, containerEl, buildOptions]);

    // `open` → open()/close(). Also the first open after creation, so the
    // create effect never double-calls open().
    // controllerVersion is the trigger: a new controller must be re-synced.
    // biome-ignore lint/correctness/useExhaustiveDependencies: see above
    useEffect(() => {
      const controller = controllerRef.current;
      if (!controller || controller.getState().open === open) return;
      if (open) controller.open();
      else controller.close();
    }, [open, controllerVersion]);

    // biome-ignore lint/correctness/useExhaustiveDependencies: as above.
    useEffect(() => {
      const controller = controllerRef.current;
      if (!controller || controller.getState().snapIndex === snapIndex) return;
      controller.snapTo(snapIndex);
    }, [snapIndex, controllerVersion]);

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

    useImperativeHandle(
      forwardedRef,
      () => ({
        snapTo: (index, opts) =>
          controllerRef.current?.snapTo(index, opts) ?? Promise.resolve(),
        close: () => controllerRef.current?.close() ?? Promise.resolve(),
        get activeSnapIndex() {
          return controllerRef.current?.getState().snapIndex ?? snapIndex;
        },
        get y() {
          return controllerRef.current?.getState().y ?? 0;
        },
      }),
      [snapIndex],
    );

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
