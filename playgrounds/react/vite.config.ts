import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

export default defineConfig({
  // The deployed playground lives under a sub-path of the docs site
  // (/snap-bottom-sheet/playground/), set by `pnpm site:build`. Local `dev`
  // and `build` stay at the root.
  // `||`, not `??`: an empty variable means "not set" here too.
  base: process.env.PLAYGROUND_BASE || "/",
  plugins: [react()],
});
