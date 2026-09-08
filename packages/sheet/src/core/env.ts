/** True in any environment with a DOM. Replaces the fragile 0.x `isSSR()`. */
export const isBrowser = (): boolean => typeof document !== "undefined";

export const clamp = (n: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, n));

/** The cleanup of something that never happened. */
export const noop = (): void => {};

/**
 * Wrap a cleanup so the second and later calls do nothing. Every unwire this
 * library hands out is idempotent; this is that guard, written once.
 */
export function once(fn: () => void): () => void {
  let done = false;
  return () => {
    if (done) return;
    done = true;
    fn();
  };
}

const warned = new Set<string>();

/**
 * Dev-only warning, emitted once per key. `process` is guarded so the core
 * entry also runs in a plain <script type="module"> with no bundler define;
 * bundlers still fold the literal and drop the branch.
 */
export function warnOnce(key: string, message: string): void {
  const isProd =
    typeof process !== "undefined" && process.env?.NODE_ENV === "production";
  if (isProd) return;
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(`snap-bottom-sheet: ${message}`);
}

/**
 * @internal test seam — the `warned` set is module-global, so without a reset
 * between tests every warning assertion depends on the order the files ran in.
 */
export function resetWarnings(): void {
  warned.clear();
}
