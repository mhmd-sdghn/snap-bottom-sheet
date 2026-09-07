import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useControllableState } from "../../src/react/use-controllable-state.ts";

describe("useControllableState", () => {
  it("updates its own state when uncontrolled", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useControllableState({ prop: undefined, defaultProp: 0, onChange }),
    );

    act(() => result.current[1](2));

    expect(result.current[0]).toBe(2);
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it("only reports when controlled", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useControllableState({ prop: 1, defaultProp: 0, onChange }),
    );

    act(() => result.current[1](2));

    expect(result.current[0]).toBe(1);
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it("supports a functional updater", () => {
    const { result } = renderHook(() =>
      useControllableState({ prop: undefined, defaultProp: 1 }),
    );

    act(() => result.current[1]((prev) => prev + 1));
    act(() => result.current[1]((prev) => prev + 1));

    expect(result.current[0]).toBe(3);
  });

  it("skips onChange when the value is unchanged", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useControllableState({ prop: undefined, defaultProp: 5, onChange }),
    );

    act(() => result.current[1](5));

    expect(onChange).not.toHaveBeenCalled();
  });

  it("keeps a stable setter and a fresh onChange", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { result, rerender } = renderHook(
      ({ onChange }) =>
        useControllableState({ prop: undefined, defaultProp: 0, onChange }),
      { initialProps: { onChange: first } },
    );

    const setValue = result.current[1];
    rerender({ onChange: second });

    expect(result.current[1]).toBe(setValue);

    act(() => setValue(1));

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith(1);
  });
});
