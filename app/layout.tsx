import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PVG's Academic Monitoring System",
  description: "Centralized daily lecture and practical attendance monitoring for engineering departments.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-IN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
