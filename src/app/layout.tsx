import type { Metadata, Viewport } from "next";
import { DM_Sans, Manrope } from "next/font/google";
import { cookies } from "next/headers";
import { Toaster } from "@/components/toaster";
import "./globals.css";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Pool", template: "%s · Pool" },
  description: "A smoother ride for every family.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f2" },
    { media: "(prefers-color-scheme: dark)", color: "#17231e" },
  ],
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // A saved choice overrides the system setting; "system" leaves it to CSS.
  const theme = (await cookies()).get("pool-theme")?.value;
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${manrope.variable}`}
      data-theme={theme === "dark" || theme === "light" ? theme : undefined}
    >
      <body>
        <a className="skip" href="#main">
          Skip to main content
        </a>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
