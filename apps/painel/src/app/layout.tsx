import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
import { AuthGate } from "@/components/AuthGate";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-title",
  subsets: ["latin"],
  weight: ["600"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Painel · Babá de Família Rica",
  description: "Painel de administração do app Babá de Família Rica.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#FBF8F5",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${cormorant.variable} ${dmSans.variable}`}>
      <body>
        <AuthProvider>
          <AuthGate>{children}</AuthGate>
        </AuthProvider>
      </body>
    </html>
  );
}
