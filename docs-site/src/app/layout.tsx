import "./global.css";
import { RootProvider } from "fumadocs-ui/provider/next";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: { default: "Panel de liderazgo · Docs", template: "%s · Panel de liderazgo" },
  description: "Documentación del panel único de liderazgo de Flockit.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <RootProvider search={{ options: { api: "/api/search" } }}>{children}</RootProvider>
      </body>
    </html>
  );
}
