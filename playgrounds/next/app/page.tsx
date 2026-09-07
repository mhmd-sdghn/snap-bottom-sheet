import SheetDemo from "./sheet-demo";

export default function Page() {
  return (
    <main>
      <h1>snap-bottom-sheet — Next.js 15 app router</h1>
      <p>
        This page is a React <strong>server component</strong> — no{" "}
        <code>"use client"</code> anywhere in <code>app/page.tsx</code> or{" "}
        <code>app/layout.tsx</code>. The sheet lives in a client island (
        <code>app/sheet-demo.tsx</code>), so a passing <code>next build</code>{" "}
        proves the package's <code>"use client"</code> boundary and its SSR-safe
        Portal survive a real RSC build.
      </p>
      <p>
        <code>Sheet.Portal</code> renders nothing on the server and on the first
        client render, so the sheet appears one tick after hydration. That is by
        design — it is what keeps hydration from mismatching.
      </p>
      <p>
        What to try: the sheet starts open; drag the handle between the three
        snap points, scroll the list at the tallest snap, click the overlay or
        press Escape to dismiss, then reopen with the button.
      </p>
      <SheetDemo />
    </main>
  );
}
