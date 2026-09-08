/**
 * Vite turns a stylesheet import into a side effect. TypeScript 7 rejects a
 * side-effect import it cannot resolve (TS2882), so it needs to be told the
 * module exists.
 */
declare module "*.css";

/**
 * VitePress compiles the theme's `.vue` files itself; TypeScript only needs to
 * know they resolve to a component.
 */
declare module "*.vue" {
  import type { DefineComponent } from "vue";

  const component: DefineComponent<Record<string, unknown>, unknown, unknown>;
  export default component;
}
