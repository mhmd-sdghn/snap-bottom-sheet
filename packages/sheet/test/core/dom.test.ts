import { beforeEach, describe, expect, it } from "vitest";
import {
  applyBodyScroll,
  applyInert,
  bodyBaseStyles,
  contentBaseStyles,
  findContentInner,
  focusFirst,
  setAttrs,
  setStyles,
  writeFrame,
  writeRest,
} from "../../src/core/dom.ts";

const div = (html = ""): HTMLElement => {
  const el = document.createElement("div");
  el.innerHTML = html;
  document.body.append(el);
  return el;
};

const inert = (el: Element): boolean =>
  "inert" in el ? (el as HTMLElement).inert : el.hasAttribute("inert");

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("setStyles", () => {
  it("restores previous inline values and clears the ones that were absent", () => {
    const el = div();
    el.style.position = "relative";

    const restore = setStyles(el, { position: "fixed", top: "0" });
    expect(el.style.position).toBe("fixed");
    expect(el.style.top).toBe("0px");

    restore();
    expect(el.style.position).toBe("relative");
    expect(el.style.top).toBe("");
  });
});

describe("setAttrs", () => {
  it("restores present attributes and removes absent ones", () => {
    const el = div();
    el.setAttribute("role", "group");

    const restore = setAttrs(el, { role: "dialog", tabindex: "-1" });
    expect(el.getAttribute("role")).toBe("dialog");
    expect(el.getAttribute("tabindex")).toBe("-1");

    restore();
    expect(el.getAttribute("role")).toBe("group");
    expect(el.hasAttribute("tabindex")).toBe(false);
  });

  it("leaves an existing value untouched with onlyIfAbsent", () => {
    const el = div();
    el.setAttribute("tabindex", "0");

    const restore = setAttrs(el, { tabindex: "-1", role: "dialog" }, true);
    expect(el.getAttribute("tabindex")).toBe("0");
    expect(el.getAttribute("role")).toBe("dialog");

    restore();
    expect(el.getAttribute("tabindex")).toBe("0");
    expect(el.hasAttribute("role")).toBe(false);
  });
});

describe("contentBaseStyles", () => {
  it("is fixed/100dvh without a container and absolute/100% with one", () => {
    expect(contentBaseStyles(false)).toMatchObject({
      position: "fixed",
      height: "100dvh",
      display: "flex",
      flexDirection: "column",
    });
    expect(contentBaseStyles(true)).toMatchObject({
      position: "absolute",
      height: "100%",
    });
  });
});

describe("bodyBaseStyles", () => {
  it("contains the scroll region's overscroll", () => {
    expect(bodyBaseStyles()).toEqual({
      minHeight: "0",
      overscrollBehavior: "contain",
    });
  });
});

describe("writeFrame", () => {
  it("writes transform and both custom properties, sparing the document root", () => {
    const content = div();
    const overlay = div();

    writeFrame(content, overlay, 120, 0.5);

    expect(content.style.transform).toBe("translate3d(0, 120px, 0)");
    expect(content.style.getPropertyValue("--snap-sheet-y")).toBe("120px");
    expect(content.style.getPropertyValue("--snap-sheet-progress")).toBe("0.5");
    expect(overlay.style.getPropertyValue("--snap-sheet-progress")).toBe("0.5");
    expect(
      document.documentElement.style.getPropertyValue("--snap-sheet-progress"),
    ).toBe("");
  });

  it("survives a null overlay", () => {
    const content = div();
    expect(() => writeFrame(content, null, 0, 1)).not.toThrow();
    expect(content.style.transform).toBe("translate3d(0, 0px, 0)");
  });
});

describe("writeRest", () => {
  it("writes padding-bottom and --snap-sheet-offset", () => {
    const content = div();
    writeRest(content, 240);

    expect(content.style.paddingBottom).toBe("240px");
    expect(content.style.getPropertyValue("--snap-sheet-offset")).toBe("240px");
  });
});

describe("applyBodyScroll", () => {
  it("toggles both ways without leaving the other property set", () => {
    const body = div();

    applyBodyScroll(body, true);
    expect(body.style.overflowY).toBe("auto");
    expect(body.style.flex).toBe("1 1 auto");
    expect(body.style.getPropertyValue("overflow")).toBe("");

    applyBodyScroll(body, false);
    expect(body.style.overflow).toBe("hidden");
    expect(body.style.flex).toBe("0 0 auto");

    applyBodyScroll(body, true);
    expect(body.style.overflowY).toBe("auto");
    expect(body.style.getPropertyValue("overflow")).toBe("");
  });
});

describe("applyInert", () => {
  it("skips pre-inert children, keeps ancestors of every keep element", () => {
    const scope = div(
      '<div id="a"><span id="keep"></span></div>' +
        '<div id="b"></div>' +
        '<div id="c" inert></div>' +
        '<div id="d"><span id="keep2"></span></div>',
    );
    const pick = (id: string) => scope.querySelector<HTMLElement>(`#${id}`)!;

    const restore = applyInert(scope, [pick("keep"), null, pick("keep2")]);

    expect(inert(pick("a"))).toBe(false);
    expect(inert(pick("b"))).toBe(true);
    expect(inert(pick("d"))).toBe(false);
    expect(inert(pick("c"))).toBe(true);

    restore();
    expect(inert(pick("b"))).toBe(false);
    // Was inert before we ran, so it stays inert.
    expect(inert(pick("c"))).toBe(true);
  });
});

describe("focusFirst", () => {
  it("focuses the first focusable child", () => {
    const el = div("<div>text</div><button>ok</button><input />");
    focusFirst(el);
    expect(document.activeElement).toBe(el.querySelector("button"));
  });

  it("falls back to the element itself", () => {
    const el = div("<div>text</div>");
    el.tabIndex = -1;
    focusFirst(el);
    expect(document.activeElement).toBe(el);
  });
});

describe("findContentInner", () => {
  it("returns the element itself with no children", () => {
    const el = div();
    expect(findContentInner(el)).toBe(el);
  });

  it("returns the single element child", () => {
    const el = div("<div id='inner'>x</div>");
    expect(findContentInner(el)).toBe(el.firstElementChild);
  });

  it("returns the element itself with two children", () => {
    const el = div("<div>a</div><div>b</div>");
    expect(findContentInner(el)).toBe(el);
  });
});
