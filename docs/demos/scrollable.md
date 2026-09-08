# Scrollable

A hundred rows, with `scroll: true` on the top snap. Drag the list up and the
sheet rises to that snap, then the same movement scrolls the list. Scroll back
to the top and the sheet drags again. You never lift your finger.

<script setup>
import mount from "../.vitepress/theme/demos/scrollable.tsx";
</script>

<ReactDemo :mount="mount" />

<<< @/.vitepress/theme/demos/scrollable.tsx#demo{tsx}
