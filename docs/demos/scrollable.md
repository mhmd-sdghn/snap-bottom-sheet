# Scrollable

A hundred rows, with `scroll: true` on the top snap. Scroll the list. When you
reach the top and keep pulling down, the drag takes over.

<script setup>
import mount from "../.vitepress/theme/demos/scrollable.tsx";
</script>

<ClientOnly>
  <ReactDemo :mount="mount" />
</ClientOnly>

<<< @/.vitepress/theme/demos/scrollable.tsx#demo{tsx}
