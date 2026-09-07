import { useCallback, useRef, useState } from "react";

/**
 * One state hook for both controlled and uncontrolled props (Radix pattern).
 * Controlled (`prop !== undefined`) never changes internal state — it only
 * reports through onChange. onChange is skipped when the value is unchanged,
 * and the setter identity is stable.
 */
export function useControllableState<T>(args: {
  prop: T | undefined;
  defaultProp: T;
  onChange?: (next: T) => void;
}): [T, (next: T | ((prev: T) => T)) => void] {
  const { prop, defaultProp, onChange } = args;

  const [uncontrolled, setUncontrolled] = useState<T>(defaultProp);
  const controlled = prop !== undefined;
  const value = controlled ? prop : uncontrolled;

  // Refs so the setter can stay stable without reading stale values.
  const valueRef = useRef(value);
  valueRef.current = value;
  const controlledRef = useRef(controlled);
  controlledRef.current = controlled;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const setValue = useCallback((next: T | ((prev: T) => T)) => {
    const prev = valueRef.current;
    const resolved =
      typeof next === "function" ? (next as (prev: T) => T)(prev) : next;

    if (Object.is(resolved, prev)) return;

    if (!controlledRef.current) {
      valueRef.current = resolved;
      setUncontrolled(resolved);
    }
    onChangeRef.current?.(resolved);
  }, []);

  return [value, setValue];
}
