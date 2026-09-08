# Dynamic height

"header" and "content" used together. Add a row while the sheet is open. The
sheet measures itself again and springs to the new height instead of jumping.

<script setup>
import mount from "../.vitepress/theme/demos/dynamic-height.tsx";
</script>

<ReactDemo :mount="mount" />

<<< @/.vitepress/theme/demos/dynamic-height.tsx#demo{tsx}
