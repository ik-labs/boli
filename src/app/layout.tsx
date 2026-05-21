import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Boli — Voice-First Grocery Concierge",
  description:
    "Reorder groceries by voice. Compares Zepto, Blinkit & BigBasket for the best price.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${geist.className} antialiased bg-slate-900`}>
        {children}
      </body>
    </html>
  );
}
