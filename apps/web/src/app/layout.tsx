import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import "../styles/globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["500", "700"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "oddly — Someone out there is oddly like you",
  description: "Five picks. About 30 seconds. One stranger twin anywhere in the world.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${inter.variable}`}>
      <body className="bg-bg text-text antialiased min-h-screen flex flex-col justify-center items-center">
        {children}
      </body>
    </html>
  );
}
