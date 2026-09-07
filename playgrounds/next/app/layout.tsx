import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "snap-bottom-sheet — Next.js playground",
  description:
    "SSR/RSC smoke test: a server component rendering the sheet as a client island.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
