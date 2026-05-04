import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { MuiRegistry } from "@/components/mui/MuiRegistry";

import { BRAND_DISPLAY_NAME } from "@/config/branding";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: `${BRAND_DISPLAY_NAME} · POS`,
  description: `${BRAND_DISPLAY_NAME} · Inventory & POS Management`,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full ${inter.variable}`}>
      <body
        className={`${inter.className} h-full bg-gray-50 text-gray-900 antialiased`}
        style={{ colorScheme: "light" }}
      >
        <MuiRegistry>{children}</MuiRegistry>
      </body>
    </html>
  );
}
