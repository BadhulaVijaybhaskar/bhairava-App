import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Bhairava Agent",
  description: "Sales agent portal — Bhairava Real Estate",
  icons: {
    icon: "/branding/bhairava-logo.png",
    apple: "/branding/bhairava-logo.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={cn(jakarta.variable, "font-sans")}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
