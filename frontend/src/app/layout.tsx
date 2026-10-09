import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";

import { Providers } from "@/components/providers";

import "./globals.css";

const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Panel de liderazgo · Flock",
  description: "Cumplimiento de sprints, satisfacción e informes en un solo lugar.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR" className={`${dmSans.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
