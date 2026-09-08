# Nested

A sheet opened from inside a sheet. Each one gets its own portal and overlay.
Closing the inner sheet leaves the outer sheet exactly where it was.

<script setup>
import mount from "../.vitepress/theme/demos/nested.tsx";
</script>

<ReactDemo :mount="mount" />

<<< @/.vitepress/theme/demos/nested.tsx#demo{tsx}
