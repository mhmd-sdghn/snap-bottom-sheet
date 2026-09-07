# Snap points

Three snaps at 25%, 50% and 90% of the frame, opening at index 1. The readout
is live `useSheetState()`.

<script setup>
import mount from "../.vitepress/theme/demos/snap-points.tsx";
</script>

<ClientOnly>
  <ReactDemo :mount="mount" />
</ClientOnly>

<<< @/.vitepress/theme/demos/snap-points.tsx#demo{tsx}
