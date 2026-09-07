import { type RefObject, useLayoutEffect, useState } from "react";
import { isSSR } from "../utils.ts";

// Singleton ResizeObserver that is shared across the application
class SharedResizeObserver {
  private static instance: ResizeObserver | null = null;
  private static listeners: Map<Element, Set<() => void>> = new Map();

  public static observe(element: Element, callback: () => void): void {
    // Create the observer if it doesn't exist yet
    if (!this.instance) {
      this.instance = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const callbacks = this.listeners.get(entry.target);
          if (callbacks) {
            callbacks.forEach((cb) => cb());
          }
        }
      });
    }

    // Add the callback to our listener map
    if (!this.listeners.has(element)) {
      this.listeners.set(element, new Set());
      this.instance.observe(element);
    }

    this.listeners.get(element)!.add(callback);
  }

  public static unobserve(element: Element, callback: () => void): void {
    const callbacks = this.listeners.get(element);
    if (!callbacks) return;

    callbacks.delete(callback);

    if (callbacks.size === 0) {
      this.listeners.delete(element);
      this.instance?.unobserve(element);
    }
  }
}

// Singleton manager for window resize event
class SharedWindowResizeListener {
  private static listeners: Set<() => void> = new Set();
  private static isListening: boolean = false;

  public static subscribe(callback: () => void): void {
    this.listeners.add(callback);

    if (!this.isListening && this.listeners.size === 1) {
      window.addEventListener("resize", this.handleResize);
      this.isListening = true;
    }
  }

  public static unsubscribe(callback: () => void): void {
    this.listeners.delete(callback);

    if (this.isListening && this.listeners.size === 0) {
      window.removeEventListener("resize", this.handleResize);
      this.isListening = false;
    }
  }

  private static handleResize = (): void => {
    this.listeners.forEach((callback) => callback());
  };
}

/**
 * Custom hook that tracks the height of an element or window viewport
 * using shared observers for optimal performance.
 */
const useWatchHeight = (
  wrapperRef?: RefObject<HTMLElement | null>,
  cb?: (height: number) => void,
): number => {
  const [height, setHeight] = useState<number>(
    !isSSR()
      ? wrapperRef?.current
        ? wrapperRef.current.offsetHeight
        : window.innerHeight
      : 0,
  );

  useLayoutEffect(() => {
    const element = wrapperRef?.current;

    const updateHeight = () => {
      if (element) {
        setHeight(element.offsetHeight);
        if (typeof cb === "function") cb(element.offsetHeight);
      } else {
        setHeight(window.innerHeight);
        if (typeof cb === "function") cb(window.innerHeight);
      }
    };

    updateHeight();

    if (element) {
      SharedResizeObserver.observe(element, updateHeight);

      return () => {
        SharedResizeObserver.unobserve(element, updateHeight);
      };
    } else {
      SharedWindowResizeListener.subscribe(updateHeight);

      return () => {
        SharedWindowResizeListener.unsubscribe(updateHeight);
      };
    }
  }, [cb, wrapperRef]);

  return height;
};

export default useWatchHeight;
