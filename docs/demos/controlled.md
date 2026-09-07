# Controlled

External buttons drive `open` and `activeSnapIndex`, and the ref closes it. Drag the sheet and the buttons stay in sync.

<script setup>
import mount from "../.vitepress/theme/demos/controlled.tsx";
</script>

<ClientOnly>
  <ReactDemo :mount="mount" />
</ClientOnly>

<<< @/.vitepress/theme/demos/controlled.tsx#demo{tsx}
