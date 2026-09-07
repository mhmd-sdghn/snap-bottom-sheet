import { useState } from "react";
import { SnapPointDynamicValue } from "../constants.ts";
import type { SnapPoint, SnapPointConfigObj } from "../types.ts";

/**
 * Hook for managing snap points with optional dynamic content
 * @param snapPoints - Array of snap points or null
 * @param dynamicContent - Boolean or configuration object for dynamic snap point
 * @returns State and setter for snap points
 */
const useSnapState = (
  snapPoints: SnapPoint[] | null,
  dynamicContent: boolean | Omit<SnapPointConfigObj, "value"> = false,
): [SnapPoint[], (snaps: SnapPoint[]) => void] => {
  const initialSnapPoints = buildSnapPointsArray(snapPoints, dynamicContent);

  const [snapState, setSnapState] = useState<SnapPoint[]>(initialSnapPoints);

  function handleSetSnaps(snaps: SnapPoint[]) {
    setSnapState(buildSnapPointsArray(snaps, dynamicContent));
  }

  return [snapState, handleSetSnaps];
};

function buildSnapPointsArray(
  snapPoints: SnapPoint[] | null,
  dynamicContent: boolean | Omit<SnapPointConfigObj, "value">,
): SnapPoint[] {
  if (!snapPoints && !dynamicContent) {
    return [];
  }

  const dynamicSnapPoint = createDynamicSnapPoint(dynamicContent);

  return dynamicSnapPoint
    ? [dynamicSnapPoint, ...(snapPoints || [])]
    : [...(snapPoints || [])];
}

function createDynamicSnapPoint(
  dynamicContent: boolean | Omit<SnapPointConfigObj, "value">,
): SnapPoint | null {
  if (!dynamicContent) {
    return null;
  }

  if (typeof dynamicContent === "object") {
    return { value: SnapPointDynamicValue, ...dynamicContent };
  }

  return SnapPointDynamicValue;
}

export default useSnapState;
