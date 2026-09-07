import type { FC } from "react";
import { OverlayElementId } from "../constants.ts";
import type { SheetOverlayProps } from "../types.ts";

const SheetOverlay: FC<SheetOverlayProps> = ({
  overlayClassName,
  overlayStyle,
  onOverlayClick,
  overlayColor,
}) => {
  return overlayColor ? (
    <div
      id={OverlayElementId}
      onClick={onOverlayClick}
      className={overlayClassName}
      style={{
        position: "absolute",
        inset: 0,
        transition: "background-color 0.2s ease-in-out",
        ...overlayStyle,
      }}
    />
  ) : null;
};

export default SheetOverlay;
