# Dynamic height

"header" and "content" together. Add a row while the sheet is open and it re-measures, springing to the new height instead of jumping.

<script setup>
import mount from "../.vitepress/theme/demos/dynamic-height.tsx";
</script>

<ClientOnly>
  <ReactDemo :mount="mount" />
</ClientOnly>

<<< @/.vitepress/theme/demos/dynamic-height.tsx#demo{tsx}
