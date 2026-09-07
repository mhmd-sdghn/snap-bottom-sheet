# Basic

A single sheet with no snap points, so it is in content mode and hugs its own
height. Drag it down past the threshold to dismiss it, or click the scrim.

<script setup>
import mount from "../.vitepress/theme/demos/basic.tsx";
</script>

<ClientOnly>
  <ReactDemo :mount="mount" />
</ClientOnly>

<<< @/.vitepress/theme/demos/basic.tsx#demo{tsx}

::: info This demo is modal
It runs with the default `modal`, and the page you are reading still scrolls.
When `Sheet.Portal` has a `container`, the scroll lock is scoped to that
container rather than the document, so an embedded sheet is modal within its
own box: `inert` covers the frame's children, Escape still closes, and the host
page is left alone. See [Accessibility](/guide/accessibility).
:::
