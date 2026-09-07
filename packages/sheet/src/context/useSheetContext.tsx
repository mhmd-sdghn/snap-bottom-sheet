import { useContext } from "react";
import SheetContext from "../context/context.tsx";
import type { SheetContextProviderValues } from "../types.ts";

const useSheetContext = (): SheetContextProviderValues => {
  const context = useContext(SheetContext);
  if (context === undefined) {
    throw new Error(
      "useSheetContext must be used within a SheetContextProvider",
    );
  }
  return context;
};

export default useSheetContext;
