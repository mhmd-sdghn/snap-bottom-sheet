# Basic

A single sheet with no snap points. That puts it in content mode, where the
sheet takes the height of its own content. Drag it down far enough and it
closes. Clicking the overlay closes it too.

<script setup>
import mount from "../.vitepress/theme/demos/basic.tsx";
</script>

<ClientOnly>
  <ReactDemo :mount="mount" />
</ClientOnly>

<<< @/.vitepress/theme/demos/basic.tsx#demo{tsx}

::: info This demo is modal
It runs with the default `modal`, and the page you are reading still scrolls.
When `Sheet.Portal` has a `container`, the scroll lock covers that container
instead of the document. The sheet is then modal inside its own box. Only the
frame's children are marked `inert`, Escape still closes the sheet, and the
rest of the page is left alone. See [Accessibility](/guide/accessibility).
:::
