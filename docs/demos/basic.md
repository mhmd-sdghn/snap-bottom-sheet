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

::: info Why `modal={false}`
Inside the docs these demos run with `modal={false}` so they never lock the
page you are reading. In your app the default `modal` is what you want: it adds
the body scroll lock, `inert` on everything behind the sheet, and Escape to
close. See [Accessibility](/guide/accessibility).
:::
