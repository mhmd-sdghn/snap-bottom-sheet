<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

/**
 * Frame for a live React demo. The page passes a `mount` function that takes
 * the frame element, renders into it, and returns its own teardown — so React
 * and the library are imported by the demo module, never by this wrapper, and
 * stay out of the SSR build.
 *
 * The frame is the sheet's `container`: positioned, clipped, and a fixed
 * height, so a demo behaves like a phone screen instead of taking over the
 * page.
 */
const props = defineProps<{
  mount: (el: HTMLElement) => () => void;
  height?: number;
}>();

const frame = ref<HTMLDivElement | null>(null);
let unmount: (() => void) | undefined;

onMounted(() => {
  if (frame.value) unmount = props.mount(frame.value);
});

onBeforeUnmount(() => {
  unmount?.();
  unmount = undefined;
});
</script>

<template>
  <div
    ref="frame"
    class="react-demo"
    :style="{ height: `${props.height ?? 520}px` }"
  />
</template>

<style scoped>
.react-demo {
  position: relative;
  overflow: hidden;
  margin: 24px 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg-alt);
}
</style>
