# Task 01 — `@snap-bottom-sheet/spring`

Worker: W1. Branch: `w1/01-spring` off `v1` (after task 00 is merged). Plan section: §3.1.

## Goal

A zero-dependency scalar spring that replaces `@react-spring/web` for this library. One value, one target, rAF-driven, velocity-preserving retargeting, promise on rest. Framework-agnostic (no React import).

## Scope

Create `packages/spring/` only:

```
packages/spring/
├─ package.json        name "@snap-bottom-sheet/spring", private: true, type: module,
│                      exports: { ".": { types: "./src/index.ts", default: "./src/index.ts" } }
│                      scripts: test, test:watch, typecheck. devDeps: vitest, typescript, @types/node (pin like packages/sheet)
├─ tsconfig.json       copy of packages/sheet/tsconfig.json (include: src, test, vitest.config.ts)
├─ vitest.config.ts    environment "node" (no DOM needed), include test/**/*.test.ts
├─ src/index.ts
└─ test/spring.test.ts
```

No build step: the package is consumed as TypeScript source by `packages/sheet` (tsdown bundles it via `noExternal`). Root `package.json` scripts `test`/`typecheck` must run this package too — switch them to `pnpm -r --filter './packages/*' test` / `typecheck` (recursive) if they currently target only the sheet.

## API (exact)

```ts
export interface SpringConfig {
  stiffness?: number;  // default 170  (react-spring "tension")
  damping?: number;    // default 26   (react-spring "friction")
  mass?: number;       // default 1
  restDelta?: number;  // default 0.01 px — |target - value| below this AND |velocity| below restSpeed → at rest
  restSpeed?: number;  // default 0.01 px/ms
}

export interface SetOptions {
  immediate?: boolean; // jump to target synchronously, notify subscribers once, resolve true
  velocity?: number;   // px/ms initial velocity (e.g. from a drag release); default: current velocity
}

export interface Spring {
  get(): number;
  getVelocity(): number;                         // px/ms
  /** Resolves true when the spring rests at `target`; false if superseded by another set()/stop(). Never rejects. */
  set(target: number, opts?: SetOptions): Promise<boolean>;
  stop(): void;                                  // freeze at current value; pending promise resolves false
  subscribe(fn: (value: number) => void): () => void;
  readonly animating: boolean;
  readonly target: number;
}

export function createSpring(initial: number, config?: SpringConfig): Spring;
```

## Behaviour

- Integrator: semi-implicit Euler, fixed 1 ms sub-steps; per-frame `dt` clamped to 64 ms (tab switch / breakpoint must not explode). `a = (-stiffness * (x - target) - damping * v) / mass`.
- Retargeting mid-flight keeps the current velocity unless `opts.velocity` is given. No visual jump.
- Rest: when `|x - target| < restDelta && |v| < restSpeed` → snap `x = target`, `v = 0`, notify, resolve `true`, cancel rAF.
- `set` while animating: previous promise resolves `false` immediately, new animation continues from the current state in the same rAF loop (do not double-schedule).
- `subscribe` fires on every value change (each frame, on immediate set, on stop). Unsubscribe during notify must be safe (copy the set before iterating).
- SSR: importing the module must not touch `requestAnimationFrame`/`performance`. Resolve them lazily inside `set`. If `requestAnimationFrame` is undefined at call time (node), fall back to `setTimeout(cb, 16)` with `Date.now()`.
- No `restSpeed` false positives: a spring starting at rest far from target must not resolve on frame 0 (velocity is 0 but delta is large — both conditions are required).
- ≤ 150 LOC in `src/index.ts`, no classes needed (closure is fine), no external deps.

## Tests (`test/spring.test.ts`, vitest fake timers)

Set up: `vi.useFakeTimers()`; stub `requestAnimationFrame` as `(cb) => setTimeout(() => cb(performance.now()), 16)` and `cancelAnimationFrame` as `clearTimeout`; drive with `vi.advanceTimersByTime`.

1. `set(100)` from 0 with defaults converges: after 2 s `get()` is exactly `100` and the promise resolved `true`; `animating` is false.
2. Default config is under-damped-but-settling: `stiffness 170, damping 26, mass 1` overshoots? Assert it **does not** overshoot beyond `target + 1px` (react-spring's default is critically-ish damped; ζ = 26 / (2·√170) ≈ 0.997).
3. `immediate: true` → `get()` equals target synchronously, exactly one subscriber call, promise resolves `true`.
4. Retarget mid-flight: `set(100)`, advance 100 ms, record `getVelocity()` (non-zero), `set(0)` → first promise resolved `false`; velocity immediately after retarget equals the recorded velocity (no reset); eventually rests at `0`.
5. `opts.velocity` overrides: `set(100, { velocity: 5 })` → `getVelocity()` is `5` right after the call.
6. `stop()` mid-flight freezes value (two consecutive `get()` after further timers advance are equal), promise resolved `false`, `animating` false.
7. Frame clamp: with a stubbed rAF that reports a timestamp 5000 ms later than the previous frame, the spring stays finite and still converges.
8. `subscribe` returns an unsubscribe; unsubscribing inside the callback does not throw and stops further calls.
9. Node-safety: `vi.stubGlobal("requestAnimationFrame", undefined)` → `set()` still converges using the timeout fallback.
10. Rest detection requires both conditions: from `x=0, v=0, target=100` the promise is still pending after the first frame.

## Done when

```
pnpm --filter @snap-bottom-sheet/spring typecheck
pnpm --filter @snap-bottom-sheet/spring test
pnpm lint
wc -l packages/spring/src/index.ts     # ≤ 150
```

Commit: `feat(spring): scalar spring primitive` (+ a second commit only if you had to touch root scripts: `chore: run tests/typecheck across all packages`).

## Report

Worker report template (PLAN §4.1). Include the measured settle time for the default config from 0→100 (ms until rest) so the sheet task can sanity-check feel against react-spring.
