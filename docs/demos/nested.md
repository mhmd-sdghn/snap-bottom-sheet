# Nested

A sheet opened from inside a sheet. Each gets its own portal and overlay; closing the inner one leaves the outer exactly where it was.

<script setup>
import mount from "../.vitepress/theme/demos/nested.tsx";
</script>

<ClientOnly>
  <ReactDemo :mount="mount" />
</ClientOnly>

<<< @/.vitepress/theme/demos/nested.tsx#demo{tsx}
