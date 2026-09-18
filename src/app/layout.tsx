import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { cssTemas, marca, scriptTema } from "@/design/tokens";
import "./globals.css";

const display = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const cuerpo = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Ice Gym", template: "%s · Ice Gym" },
  description:
    "Cadena de gimnasios Ice Gym. Entrena en Madrid, Barcelona y Valencia con acceso libre, clases colectivas y sin permanencia.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: marca.hielo },
    { media: "(prefers-color-scheme: dark)", color: marca.negro },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${cuerpo.variable}`} suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: cssTemas() }} />
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
      </head>
      <body>
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
