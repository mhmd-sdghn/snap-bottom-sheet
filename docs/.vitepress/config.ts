import { defineConfig } from "vitepress";

// A GitHub Pages project site served under /snap-bottom-sheet/, so every
// asset needs that prefix.
const base = "/snap-bottom-sheet/";

export default defineConfig({
  base,
  title: "Snap Bottom Sheet",
  description:
    "A draggable, snappable bottom sheet for the web — framework-agnostic core, React bindings, zero runtime dependencies.",
  cleanUrls: true,

  // The plan and task files live under docs/internal/ and are not part of the
  // published site.
  srcExclude: ["internal/**"],

  // `head` hrefs are emitted verbatim (no automatic base prefix).
  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: `${base}logo.svg` }],
  ],

  vite: {
    // Let Vite's esbuild compile the .tsx demo files with the automatic JSX
    // runtime — no plugin needed, since VitePress remounts a demo anyway.
    esbuild: { jsx: "automatic" },
    // One React copy across the docs and the workspace-linked library.
    resolve: { dedupe: ["react", "react-dom"] },
  },

  themeConfig: {
    logo: "/logo.svg",

    nav: [
      { text: "Guide", link: "/guide/getting-started", activeMatch: "/guide/" },
      {
        text: "Reference",
        link: "/reference/react",
        activeMatch: "/reference/",
      },
      { text: "Demos", link: "/demos/", activeMatch: "/demos/" },
      // The playground is a separate Vite app copied into dist/playground/ by
      // `pnpm site:build`. `target` keeps VitePress's router from handling the
      // click, so the browser navigates to it normally.
      { text: "Playground", link: "/playground/", target: "_self" },
    ],

    sidebar: {
      "/guide/": [
        {
          text: "Introduction",
          items: [
            { text: "Getting Started", link: "/guide/getting-started" },
            { text: "Core Concepts", link: "/guide/core-concepts" },
          ],
        },
        {
          text: "Positioning",
          items: [
            { text: "Snap Points", link: "/guide/snap-points" },
            { text: "Dynamic Height", link: "/guide/dynamic-height" },
          ],
        },
        {
          text: "Interaction",
          items: [
            { text: "Scrolling", link: "/guide/scrolling" },
            { text: "Gestures", link: "/guide/gestures" },
            { text: "Controlled State", link: "/guide/controlled-state" },
          ],
        },
        {
          text: "Presentation",
          items: [
            { text: "Styling", link: "/guide/styling" },
            { text: "Accessibility", link: "/guide/accessibility" },
            { text: "Nested Sheets", link: "/guide/nested-sheets" },
          ],
        },
        {
          text: "Integrations",
          items: [
            { text: "SSR & Next.js", link: "/guide/ssr-nextjs" },
            { text: "Vanilla JS", link: "/guide/vanilla" },
            { text: "Migration guide", link: "/guide/migration" },
          ],
        },
      ],
      "/demos/": [
        {
          text: "Demos",
          items: [
            { text: "Overview", link: "/demos/" },
            { text: "Basic", link: "/demos/basic" },
            { text: "Snap Points", link: "/demos/snap-points" },
            { text: "Dynamic Height", link: "/demos/dynamic-height" },
            { text: "Scrollable", link: "/demos/scrollable" },
            { text: "Nested", link: "/demos/nested" },
            { text: "Controlled", link: "/demos/controlled" },
            { text: "Vanilla", link: "/demos/vanilla" },
          ],
        },
      ],
      "/reference/": [
        {
          text: "Reference",
          items: [
            { text: "React API", link: "/reference/react" },
            { text: "Core API", link: "/reference/core" },
            { text: "Snap Points", link: "/reference/snap-points" },
            { text: "Styling Hooks", link: "/reference/styling-hooks" },
          ],
        },
      ],
    },

    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/mhmd-sdghn/snap-bottom-sheet",
      },
    ],

    search: {
      provider: "local",
    },

    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © 2026 Mo Sadeghian",
    },
  },
});
