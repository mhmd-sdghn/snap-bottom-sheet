import type { FC, ReactNode } from "react";
import { DynamicHeightComponentId } from "../constants.ts";

const SheetWithDynamicHeight: FC<{ children: ReactNode }> = ({ children }) => {
  return children;
};

SheetWithDynamicHeight.displayName = DynamicHeightComponentId;

export default SheetWithDynamicHeight;
