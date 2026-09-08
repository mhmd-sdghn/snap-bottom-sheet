---
"snap-bottom-sheet": patch
---

Fix buttons inside the sheet not responding to a real click. The drag
recogniser captured the pointer on `pointerdown`, and a captured pointer sends
its `pointerup` — and the `click` the browser derives from that pair — to the
capturing element, so `Sheet.Close` and any button a consumer puts in the sheet
were never activated. The pointer is now captured once a drag actually starts.
