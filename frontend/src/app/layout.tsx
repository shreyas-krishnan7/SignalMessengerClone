import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Signal",
  description: "A Signal Messenger clone built with Next.js and FastAPI",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// Page dikhne se pehle hi saved theme laga do, warna light->dark flash dikhta hai
const themeScript = `
try {
  var theme = JSON.parse(localStorage.getItem("signal_theme") || '"system"');
  var dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  if (dark) document.documentElement.classList.add("dark");
} catch (e) {}
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${inter.variable} antialiased`}>{children}</body>
    </html>
  );
}
