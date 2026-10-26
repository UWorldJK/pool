import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pool",
  description: "A smoother ride for every family.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
