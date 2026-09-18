import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed, Barlow_Semi_Condensed } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { color, variablesCss } from "@/design/tokens";
import "./globals.css";

const display = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-display",
  display: "swap",
});

const cuerpo = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

const util = Barlow_Semi_Condensed({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-util",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Ice Gym",
    template: "%s · Ice Gym",
  },
  description:
    "Cadena de gimnasios Ice Gym. Entrena en Madrid, Barcelona y Valencia con acceso libre, clases colectivas y sin permanencia.",
};

export const viewport: Viewport = {
  themeColor: color.negro,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={`${display.variable} ${cuerpo.variable} ${util.variable}`}
      style={variablesCss as React.CSSProperties}
      suppressHydrationWarning
    >
      <body>
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
