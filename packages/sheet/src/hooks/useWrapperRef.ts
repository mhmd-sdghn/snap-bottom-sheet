import { type RefObject, useRef } from "react";

const useWrapperRef = (
  wrapper?: boolean | RefObject<HTMLDivElement | null>,
) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  if (typeof wrapper === "object" && "current" in wrapper) return wrapper;
  return wrapperRef;
};

export default useWrapperRef;
