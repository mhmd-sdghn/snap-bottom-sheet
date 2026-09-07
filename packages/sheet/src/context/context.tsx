import type React from "react";
import { createContext, useState } from "react";
import type {
  SheetContextProviderProps,
  SheetContextProviderValues,
} from "../types.ts";

const SheetContext = createContext<SheetContextProviderValues | undefined>(
  undefined,
);

export const SheetContextProvider: React.FC<SheetContextProviderProps> = (
  props,
) => {
  const [dynamicHeightContent, setDynamicHeightContent] = useState(0);

  return (
    <SheetContext.Provider
      value={{
        dynamicHeightContent,
        setDynamicHeightContent,
        ...props.state,
      }}
    >
      {props.children}
    </SheetContext.Provider>
  );
};

export default SheetContext;
