import { act, cleanup, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSheet } from "../../src/core/sheet.ts";
import { Sheet, useSheetState } from "../../src/react/index.ts";
import { type FakeController, makeFakeController } from "./fake-controller.ts";

vi.mock("../../src/core/sheet.ts", () => ({ createSheet: vi.fn() }));
const createSheetMock = vi.mocked(createSheet);

let fake: FakeController;

// `globals` is off in this project, so React Testing Library cannot register
// its own afterEach — portalled nodes would leak into the next test.
afterEach(cleanup);

beforeEach(() => {
  fake = makeFakeController();
  createSheetMock.mockImplementation((elements, options) => {
    fake.elements = elements;
    fake.options = options ?? null;
    return fake;
  });
});

describe("parts", () => {
  it("merges className and style and forwards refs", () => {
    const contentRef = createRef<HTMLDivElement>();
    render(
      <Sheet open>
        <Sheet.Portal>
          <Sheet.Content
            ref={contentRef}
            data-testid="content"
            className="panel"
            style={{ background: "red" }}
          >
            x
          </Sheet.Content>
        </Sheet.Portal>
      </Sheet>,
    );

    const content = screen.getByTestId("content");
    expect(contentRef.current).toBe(content);
    expect(content.className).toBe("panel");
    expect(content.style.background).toBe("red");
  });

  it("wraps Content children in the measured inner element", () => {
    render(
      <Sheet open>
        <Sheet.Portal>
          <Sheet.Content data-testid="content">hello</Sheet.Content>
        </Sheet.Portal>
      </Sheet>,
    );

    const inner = screen
      .getByTestId("content")
      .querySelector("[data-snap-sheet-inner]");
    expect(inner?.textContent).toBe("hello");
  });

  it("renders Handle and Close as real buttons", () => {
    render(
      <Sheet open>
        <Sheet.Portal>
          <Sheet.Content>
            <Sheet.Handle data-testid="handle" />
            <Sheet.Close data-testid="close">Close</Sheet.Close>
          </Sheet.Content>
        </Sheet.Portal>
      </Sheet>,
    );

    const handle = screen.getByTestId("handle") as HTMLButtonElement;
    const close = screen.getByTestId("close") as HTMLButtonElement;
    expect(handle.tagName).toBe("BUTTON");
    expect(handle.type).toBe("button");
    expect(handle.getAttribute("aria-label")).toBe("Resize sheet");
    expect(close.tagName).toBe("BUTTON");
    expect(close.type).toBe("button");
  });

  it("closes the sheet when Close is clicked", () => {
    const onOpenChange = vi.fn();
    render(
      <Sheet defaultOpen onOpenChange={onOpenChange}>
        <Sheet.Portal>
          <Sheet.Content>
            <Sheet.Close data-testid="close">Close</Sheet.Close>
          </Sheet.Content>
        </Sheet.Portal>
      </Sheet>,
    );

    act(() => screen.getByTestId("close").click());
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(fake.close).toHaveBeenCalledTimes(1);
  });

  it("throws when a part is rendered outside Sheet", () => {
    expect(() => render(<Sheet.Content>x</Sheet.Content>)).toThrow(
      /inside <Sheet>/,
    );
  });

  it("throws when useSheetState is called outside Sheet", () => {
    function Outside() {
      useSheetState();
      return null;
    }
    expect(() => render(<Outside />)).toThrow(/inside <Sheet>/);
  });
});
