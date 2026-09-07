import type { SpringValue } from "@react-spring/web";
import type { CSSProperties, FC, ReactNode, RefObject } from "react";
import type { SnapPointDynamicValue } from "./constants.ts";
import type useScrollLock from "./hooks/useScrollLock.ts";

export interface SnapPointConfigObj {
  value: number | typeof SnapPointDynamicValue;
  scroll?: boolean;
  drag?:
    | boolean
    | {
        up?: boolean;
        down?: boolean;
      };
}

export type SnapPoint =
  | number
  | typeof SnapPointDynamicValue
  | SnapPointConfigObj;

export interface SheetCallbacks {
  onClose: () => void;
  onSnap: (snapPointIndex: number, snapPoint: SnapPoint | null) => void;
}

export interface SheetProps extends SheetCallbacks {
  isOpen: boolean;
  snapPoints: SnapPoint[];
  activeSnapPointIndex?: number;
  children?: ReactNode;
  noInitialAnimation?: boolean;
}

export interface SheetOverlayProps {
  overlayColor?: string;
  onOverlayClick?: () => void;
  overlayClassName?: string;
  overlayStyle?: CSSProperties;
}

export interface SheetContainerProps extends SheetOverlayProps {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
  wrapper?: boolean | RefObject<HTMLDivElement | null>;
  wrapperPortalElement?: Element | DocumentFragment;
  wrapperStyle?: CSSProperties;
  wrapperClassName?: string;
}

export type SheetPropsContext = Omit<SheetProps, keyof SheetCallbacks> & {
  callbacks: SheetCallbacks;
};

export type SheetContextProviderProps = {
  children: ReactNode;
  state: SheetPropsContext;
};

export type SheetContextProviderValues = SheetPropsContext & {
  dynamicHeightContent: number;
  setDynamicHeightContent: (value: number) => void;
};

export interface DynamicHeightContentComponentProps {
  children?: ReactNode;
}

export interface UseAnimAnimateFnOption {
  jump?: boolean;
}

export type UseAnimAnimateFn = (
  _y: number,
  cb?: () => void,
  options?: UseAnimAnimateFnOption,
) => void;

export type ScrollLock = ReturnType<typeof useScrollLock>;

export interface DragEndEventHandlerFn extends SheetContextProviderValues {
  y: SpringValue;
  viewHeight: number;
  activeSnapValue: number;
  contentMode: boolean;
  offsetY: number;
  snapValues: number[];
  scrollY: RefObject<number>;
  scrollLock: ScrollLock;
}

export interface OnDragEventHandlerState {
  movementY: number;
  activeSnapPoint: SnapPoint;
  elementY: RefObject<number>;
  scrollY: RefObject<number>;
  viewHeight: number;
  scrollLock: ReturnType<typeof useScrollLock>;
}

export type SheetCompound = FC<SheetProps> & {
  Container: FC<SheetContainerProps>;
  DynamicHeight: FC<{ children: ReactNode }>;
};

export interface useSnapScrollProps {
  animate: UseAnimAnimateFn;
  state: {
    bottomSheetRef: RefObject<HTMLDivElement | null>;
    activeSnapValue: number;
    activeSnapPoint: SnapPoint;
    scrollLock: ReturnType<typeof useScrollLock>;
    noInitialAnimation?: boolean;
  };
}

export interface useMountProps {
  animate: UseAnimAnimateFn;
  onClose: () => void;
  state: {
    viewHeight: number;
    wrapperRef: RefObject<HTMLDivElement | null>;
    overlayColor?: string;
    wrapper?: boolean | RefObject<HTMLDivElement | null>;
    isOpen: boolean;
  };
}
