/** True in any environment with a DOM. Replaces the fragile 0.x `isSSR()`. */
export const isBrowser = (): boolean => typeof document !== "undefined";

export const clamp = (n: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, n));

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
