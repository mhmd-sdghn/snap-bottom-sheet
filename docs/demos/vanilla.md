# Vanilla

The same sheet as [Basic](/demos/basic), built with `createSheet` against
hand-written markup. No React in this demo at all.

<script setup>
import mount from "../.vitepress/theme/demos/vanilla.ts";
</script>

<ClientOnly>
  <ReactDemo :mount="mount" />
</ClientOnly>

<<< @/.vitepress/theme/demos/vanilla.ts#demo{ts}
