/**
 * Task 16, the React findings of the OpenCodeReview pass that need no real
 * engine. Every test here fails on the code as it was before its fix.
 */
import { act, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSheet } from "../../src/core/sheet.ts";
import type { SheetHandle } from "../../src/react/index.ts";
import { Sheet, useSheetState } from "../../src/react/index.ts";
import { type FakeController, makeFakeController } from "./fake-controller.ts";

vi.mock("../../src/core/sheet.ts", () => ({ createSheet: vi.fn() }));
const createSheetMock = vi.mocked(createSheet);

let fake: FakeController;

beforeEach(() => {
  fake = makeFakeController();
  createSheetMock.mockImplementation((elements, options) => {
    fake.elements = elements;
    fake.options = options ?? null;
    return fake;
  });
});

describe("useSheetState selector", () => {
  function Threshold({ limit }: { limit: number }) {
    const past = useSheetState((state) => state.y > limit);
    return <span data-testid="sel">{String(past)}</span>;
  }

  it("re-selects when the selector changes but the state does not", () => {
    const { rerender } = render(
      <Sheet open>
        <Sheet.Portal>
          <Sheet.Content>
            <Threshold limit={100} />
          </Sheet.Content>
        </Sheet.Portal>
      </Sheet>,
    );

    act(() => fake.push({ y: 500 }));
    expect(screen.getByTestId("sel").textContent).toBe("true");

    // Same state object, a selector that now reads a different limit. Keyed on
    // the state alone, the memo served the old answer for ever.
    rerender(
      <Sheet open>
        <Sheet.Portal>
          <Sheet.Content>
            <Threshold limit={900} />
          </Sheet.Content>
        </Sheet.Portal>
      </Sheet>,
    );
    expect(screen.getByTestId("sel").textContent).toBe("false");
  });
});

describe("Title and Description ids", () => {
  const tree = (props: { id?: string }) => (
    <Sheet open>
      <Sheet.Portal>
        <Sheet.Content>
          <Sheet.Title data-testid="title" id={props.id}>
            T
          </Sheet.Title>
          <Sheet.Description data-testid="description" id={props.id}>
            D
          </Sheet.Description>
        </Sheet.Content>
      </Sheet.Portal>
    </Sheet>
  );

  it("keeps the generated id when the consumer passes id={undefined}", () => {
    render(tree({ id: undefined }));

    const title = screen.getByTestId("title");
    const description = screen.getByTestId("description");
    expect(title.id).toBeTruthy();
    expect(description.id).toBeTruthy();
    expect(fake.options?.labelledBy).toBe(title.id);
    expect(fake.options?.describedBy).toBe(description.id);
  });

  it("pushes a consumer id that changes after mount", () => {
    const { rerender } = render(tree({ id: "mine" }));
    expect(screen.getByTestId("title").id).toBe("mine");
    expect(fake.options?.labelledBy).toBe("mine");

    rerender(tree({ id: "other" }));

    expect(screen.getByTestId("title").id).toBe("other");
    expect(fake.update).toHaveBeenCalledWith({ labelledBy: "other" });
    expect(fake.update).toHaveBeenCalledWith({ describedBy: "other" });
  });
});

describe("handle.close()", () => {
  it("resolves when no controller ever attached", async () => {
    const ref = createRef<SheetHandle>();
    // No Sheet.Content anywhere, so nothing ever registers and no controller
    // is created — the request can never be answered by an animation.
    render(
      <Sheet defaultOpen ref={ref}>
        <span />
      </Sheet>,
    );

    let resolved = false;
    await act(async () => {
      void ref.current?.close().then(() => {
        resolved = true;
      });
    });

    expect(resolved).toBe(true);
  });
});
