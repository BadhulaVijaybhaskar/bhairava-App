import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { BootSplash } from "@/components/boot-splash";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Bhairava Real Estate",
  description: "Open plot real estate management — Bhairava Real Estate Admin",
  icons: {
    icon: "/branding/bhairava-logo.png",
    apple: "/branding/bhairava-logo.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={cn("font-sans", inter.variable, spaceGrotesk.variable)}>
      <body className={`${inter.variable} ${spaceGrotesk.variable} antialiased`}>
        <TooltipProvider delay={200}>
          <BootSplash>{children}</BootSplash>
        </TooltipProvider>
      </body>
    </html>
  );
}
