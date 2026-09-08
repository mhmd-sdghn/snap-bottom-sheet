# Controlled

The buttons outside the sheet set `open` and `activeSnapIndex`, and the ref
closes the sheet. Drag the sheet yourself and the buttons stay in sync.

<script setup>
import mount from "../.vitepress/theme/demos/controlled.tsx";
</script>

<ClientOnly>
  <ReactDemo :mount="mount" />
</ClientOnly>

<<< @/.vitepress/theme/demos/controlled.tsx#demo{tsx}
