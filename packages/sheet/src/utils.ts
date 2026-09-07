import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  DragOffsetThreshold,
  DynamicHeightComponentId,
  SnapPointDynamicValue,
} from "./constants.ts";
import type { SnapPoint, SnapPointConfigObj } from "./types.ts";

export const isSSR = () =>
  typeof window === "undefined" ||
  !window.navigator ||
  /ServerSideRendering|^Deno\//.test(window.navigator.userAgent) ||
  (typeof process !== "undefined" &&
    process.versions &&
    process.versions.node !== undefined);

/**
 * helper function that returns a number between min if num is less than min
 * and returns max if its more than max value
 * and return num if non of above happens.
 * @param num
 * @param min
 * @param max
 */
export const clamp = (num: number, min: number, max: number) => {
  return num <= min ? min : num >= max ? max : num;
};

/**
 * This function Checks if the snap point is a number value, or
 * it's a snap point configuration object.
 * @param point snap point
 */
export const isSnapPointConfigObj = (
  point?: SnapPoint | null,
): point is SnapPointConfigObj =>
  typeof point === "object" && point !== null && "value" in point;

/**
 * Checks a Sheet Container component to find DynamicHeightComponent
 * @param children Sheet Container children
 */
export const findDynamicHeightComponent = (
  children: ReactNode,
): ReactElement<{ children: ReactNode }> | null => {
  const _children = Children.toArray(children);

  if (_children.length === 0) return null;

  const child = _children[0] as ReactElement<{ children: ReactNode }> & {
    type: { displayName: string };
  };

  if (!isValidElement(child)) return null;

  if (child.type.displayName !== DynamicHeightComponentId) return null;

  return child;
};

/**
 * @param arr
 * @param target
 * @param offset
 * @param activeIndex
 */
export function getClosestIndex(
  arr: number[],
  target: number,
  offset: number,
  activeIndex: number,
) {
  let closestIndex = 0;
  let minDiff = Math.abs(target - (arr[0] ?? 0));

  for (let i = 1; i < arr.length; i++) {
    // biome-ignore lint/style/noNonNullAssertion: i < arr.length
    const currentDiff = Math.abs(arr[i]! - target);

    if (currentDiff < minDiff) {
      closestIndex = i;
      minDiff = currentDiff;
    }
  }

  // Avoid getting back to the same snap point if y movement is more than DragOffsetThreshold
  if (activeIndex === closestIndex && Math.abs(offset) > DragOffsetThreshold) {
    if (offset > 0) {
      return Math.max(closestIndex - 1, 0);
    }

    return closestIndex + 1;
  }

  return closestIndex;
}

/**
 * This function checks the next snap value is inside the view bounds
 * @param snapTo
 * @param sheetHeight
 */
export function validateSnapTo({
  snapTo,
  sheetHeight,
}: {
  snapTo: number;
  sheetHeight: number;
}) {
  if (snapTo < 0) {
    console.warn(
      `snap-bottom-sheet: Snap point is out of bounds. Sheet height is ${sheetHeight} but snap point is ${
        sheetHeight + Math.abs(snapTo)
      }.`,
    );
  }

  return Math.max(Math.round(snapTo), 0);
}

/**
 * if there is no snap value or if the only snap value is
 * dynamic content height value then, content mode is on.
 * @param snapValues
 * @param viewHeight
 * @param dynamicHeightContent
 */
export const isContentMode = (
  snapValues: SnapPoint[],
  viewHeight: number,
  dynamicHeightContent: number,
) => {
  return (
    !snapValues.length ||
    (snapValues.length === 1 &&
      snapValues[0] === viewHeight - dynamicHeightContent)
  );
};

/**
 * Returns active snap point value
 * @param snapValues
 * @param viewHeight
 * @param contentMode
 * @param activeSnapPointIndex
 * @param dynamicHeightContent
 */
export const getActiveValue = (
  snapValues: number[],
  viewHeight: number,
  contentMode: boolean,
  activeSnapPointIndex: number,
  dynamicHeightContent: number,
) => {
  if (!contentMode) {
    if (activeSnapPointIndex === 0 && dynamicHeightContent)
      return viewHeight - dynamicHeightContent;
    return snapValues[activeSnapPointIndex] ?? 0;
  }

  return snapValues[0] || 0;
};

/**
 * @param activeSnapPointIndex
 * @param dynamicContentHeight
 * @param snapPoints
 */
export const getActiveSnapPoint = (
  activeSnapPointIndex: number,
  dynamicContentHeight: number,
  snapPoints?: SnapPoint[] | null,
) => {
  if (Array.isArray(snapPoints) && snapPoints.length > 0)
    return snapPoints[activeSnapPointIndex] ?? 1;
  if (dynamicContentHeight) return dynamicContentHeight;
  return 1; // full-height
};

/**
 * It checks if the snap is the dynamic height snap
 * @param snap
 */
const isDynamicSnapValue = (snap: SnapPoint) => {
  if (isSnapPointConfigObj(snap) && snap.value === SnapPointDynamicValue)
    return true;
  return snap === SnapPointDynamicValue;
};

/**
 * snap-bottom-sheet gets snap values in efferent formats from developers, but we
 * convert them to pixel values to use them for calculations.
 * @param snap
 * @param viewHeight
 */
const convertSnapToPixels = (snap: SnapPoint, viewHeight: number): number => {
  const valueToConvert = isSnapPointConfigObj(snap) ? snap.value : snap;

  const numericValue =
    typeof valueToConvert === "string"
      ? parseFloat(valueToConvert)
      : valueToConvert;

  if (isNaN(numericValue)) {
    console.warn("snap-bottom-sheet: Invalid snap value:", valueToConvert);
    return 0;
  }

  // Calculate the height offset (percentage if ≤1, otherwise absolute pixels)
  const heightOffset =
    numericValue <= 1 ? numericValue * viewHeight : numericValue;

  // Return the pixel position (ensure it's not negative)
  return Math.max(viewHeight - heightOffset, 0);
};

/**
 * Using DynamicHeight component requires passing SnapPointDynamicValue as
 *  the first argument of the snap points array; this function warns developers
 *  in case they forgot to do that.
 * @param hasDynamicComponent
 * @param dynamicIndex
 */
const validateDynamicSnapPosition = (
  hasDynamicComponent: boolean,
  dynamicIndex: number,
) => {
  if (!hasDynamicComponent) return;

  if (dynamicIndex === -1) {
    console.warn(
      "snap-bottom-sheet: DynamicHeight component Required configuration missing: \n" +
        "    When using DynamicHeight component, you must include 'SnapPointDynamicValue' \n" +
        "    as your FIRST snap point for proper layout calculations.",
    );
  } else if (dynamicIndex > 0) {
    console.warn(`snap-bottom-sheet: Invalid DynamicHeight configuration:
    'SnapPointDynamicValue' must be the FIRST snap point in the array 
    to ensure correct dynamic content height calculations. Found at position ${dynamicIndex}.`);
  }
};

/**
 * snap-bottom-sheet needs snap values sorted but it does not force developers
 *  to sort their snap values, snap-bottom-sheet sorts values for them.
 * @param values
 */
const sortSnapValues = (values: number[]): number[] =>
  [...values].sort((a, b) => {
    if (a === 0) return 1;
    if (b === 0) return -1;
    return b - a;
  });

/**
 * This function adds dynamic content height (if exists) to the snap values and also
 * extracts snap values from snap points
 * @param viewHeight
 * @param dynamicContentHeight
 * @param snapPoints
 */
export const getSnapValues = (
  viewHeight: number,
  dynamicContentHeight: number,
  snapPoints?: SnapPoint[] | null,
): number[] => {
  if (!Array.isArray(snapPoints)) {
    const defaultSnapValue = getActiveSnapPoint(
      0,
      dynamicContentHeight,
      snapPoints,
    );

    return [defaultSnapValue as number];
  }

  let dynamicSnapIndex = -1;
  const processedValues: number[] = [];

  snapPoints.forEach((snap, index) => {
    if (isDynamicSnapValue(snap)) {
      dynamicSnapIndex = index;
      processedValues.push(viewHeight);
    } else {
      const pixelValue = convertSnapToPixels(snap, viewHeight);
      processedValues.push(pixelValue);
    }
  });

  validateDynamicSnapPosition(!!dynamicContentHeight, dynamicSnapIndex);

  return sortSnapValues(processedValues);
};
