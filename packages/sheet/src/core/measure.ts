import { isBrowser, noop, once } from "./env.ts";

type HeightCallback = (height: number) => void;

let observer: ResizeObserver | null = null;
const elementCallbacks = new Map<Element, Set<HeightCallback>>();

const viewCallbacks = new Set<HeightCallback>();
let viewListening = false;

const heightOf = (el: Element): number =>
  el instanceof HTMLElement
    ? el.offsetHeight
    : el.getBoundingClientRect().height;

function notify(el: Element): void {
  const callbacks = elementCallbacks.get(el);
  if (!callbacks) return;
  const height = heightOf(el);
  for (const cb of callbacks) cb(height);
}

/**
 * Observe an element's height with a document-wide shared ResizeObserver.
 * Calls cb immediately and on every resize; returns the unobserve function.
 * Falls back to a single immediate call where ResizeObserver is missing.
 */
export function observeHeight(el: Element, cb: HeightCallback): () => void {
  cb(heightOf(el));

  if (!isBrowser() || typeof ResizeObserver === "undefined") return noop;

  if (!observer) {
    observer = new ResizeObserver((entries) => {
      for (const entry of entries) notify(entry.target);
    });
  }

  let callbacks = elementCallbacks.get(el);
  if (!callbacks) {
    callbacks = new Set();
    elementCallbacks.set(el, callbacks);
    observer.observe(el);
  }
  callbacks.add(cb);

  return once(() => {
    const current = elementCallbacks.get(el);
    if (!current) return;
    current.delete(cb);
    if (current.size > 0) return;

    elementCallbacks.delete(el);
    observer?.unobserve(el);
    // The observer itself is kept deliberately: it is a process-wide singleton
    // shared by every sheet, and disconnecting on an empty map would just make
    // the next sheet build a new one. Nothing is observed once the map empties.
  });
}

function handleViewResize(): void {
  const height = window.innerHeight;
  for (const cb of viewCallbacks) cb(height);
}

/**
 * Observe the height available to the sheet: the container's offsetHeight when
 * one is given, otherwise window.innerHeight (window + visualViewport resize).
 * Calls cb immediately; returns the unsubscribe function.
 */
export function observeViewHeight(
  container: HTMLElement | null,
  cb: HeightCallback,
): () => void {
  if (container) return observeHeight(container, cb);
  if (!isBrowser()) return noop;

  cb(window.innerHeight);

  viewCallbacks.add(cb);
  if (!viewListening) {
    viewListening = true;
    window.addEventListener("resize", handleViewResize);
    window.visualViewport?.addEventListener("resize", handleViewResize);
  }

  return once(() => {
    viewCallbacks.delete(cb);
    if (viewCallbacks.size > 0 || !viewListening) return;

    viewListening = false;
    window.removeEventListener("resize", handleViewResize);
    window.visualViewport?.removeEventListener("resize", handleViewResize);
  });
}
