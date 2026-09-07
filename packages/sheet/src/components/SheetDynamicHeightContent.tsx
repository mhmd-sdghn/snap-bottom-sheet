import { type FC, useRef } from "react";
import useSheetContext from "../context/useSheetContext.tsx";
import useWatchHeight from "../hooks/useWatchHeight.ts";
import type { DynamicHeightContentComponentProps } from "../types.ts";

const SheetDynamicHeightContent: FC<DynamicHeightContentComponentProps> = ({
  children,
}) => {
  const state = useSheetContext();

  const ref = useRef<HTMLDivElement>(null);

  useWatchHeight(ref, state.setDynamicHeightContent);

  return <div ref={ref}>{children}</div>;
};

export default SheetDynamicHeightContent;
