import type { Theme } from "vitepress";
import DefaultTheme from "vitepress/theme";
import ReactDemo from "./ReactDemo.vue";
import "./custom.css";

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    // Registered globally so any Markdown page can drop in a demo.
    app.component("ReactDemo", ReactDemo);
  },
} satisfies Theme;
