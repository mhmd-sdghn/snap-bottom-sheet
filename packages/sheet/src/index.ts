import { default as SheetBase } from "./components/Sheet";
import SheetContainer from "./components/SheetContainer.tsx";
import SheetWithDynamicHeight from "./components/SheetWithDynamicHeight.tsx";
import type { SheetCompound, SnapPoint as SnapPointType } from "./types.ts";

export const Sheet: SheetCompound = Object.assign(SheetBase, {
  Container: SheetContainer,
  DynamicHeight: SheetWithDynamicHeight,
});

// export types
export type SnapPoints = SnapPointType[];
export { SnapPointDynamicValue } from "./constants.ts";
export { default as useSnapState } from "./hooks/useSnapState.ts";
