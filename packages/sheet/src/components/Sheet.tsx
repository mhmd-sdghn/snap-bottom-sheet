import { type FC, useLayoutEffect, useState } from "react";
import { SheetContextProvider } from "../context/context.tsx";
import type { SheetProps, SheetPropsContext } from "../types.ts";

const Sheet: FC<SheetProps> = ({
  isOpen = false,
  activeSnapPointIndex = 0,
  snapPoints = [],
  onClose,
  onSnap = () => null,
  noInitialAnimation = false,
  children,
}) => {
  const [present, setPresent] = useState(isOpen);
  const handleOnClose = () => {
    onClose();
    setPresent(false);
  };

  const callbacks = {
    onSnap,
    onClose: handleOnClose,
  };

  const context: SheetPropsContext = {
    callbacks,
    isOpen,
    activeSnapPointIndex,
    snapPoints,
    noInitialAnimation,
  };

  useLayoutEffect(() => {
    if (isOpen) {
      setPresent(true);
    }
  }, [isOpen]);

  return present ? (
    <SheetContextProvider state={context}>{children}</SheetContextProvider>
  ) : null;
};

export default Sheet;
