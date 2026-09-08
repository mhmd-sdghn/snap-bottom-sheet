# Scrollable

A hundred rows, with `scroll: true` on the top snap. Drag the sheet up and keep
moving: the same touch starts scrolling the list. Reach the top of the list,
keep pulling down, and the sheet takes the gesture back.

<script setup>
import mount from "../.vitepress/theme/demos/scrollable.tsx";
</script>

<ReactDemo :mount="mount" />

<<< @/.vitepress/theme/demos/scrollable.tsx#demo{tsx}
