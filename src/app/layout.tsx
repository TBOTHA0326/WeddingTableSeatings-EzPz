import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ever After · Wedding Name Studio",
  description: "Lovely names for your favourite people. Create transparent A4 wedding name stickers with elegant fonts and print-ready SVG or PNG downloads.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
