---
"snap-bottom-sheet": patch
---

Fix a close animation that could be skipped entirely. When a parent flushed its
`open` state synchronously from `onOpenChange`, the React layer released the
presence gate in the gap between the dismissal being announced and the closing
spring being started, so the panel unmounted before its first frame.
