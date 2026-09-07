import { describe, expect, it } from "vitest";
import { Sheet, SnapPointDynamicValue, useSnapState } from "../src/index.ts";

describe("public entry", () => {
  it("exports the compound Sheet component", () => {
    expect(Sheet).toBeDefined();
    expect(Sheet.Container).toBeDefined();
    expect(Sheet.DynamicHeight).toBeDefined();
  });

  it("exports the snap helpers", () => {
    expect(useSnapState).toBeDefined();
    expect(SnapPointDynamicValue).toBeDefined();
  });
});
