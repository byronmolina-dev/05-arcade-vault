import type { Metadata } from "next";
import { courierPrime, jetBrainsMono, pressStart2P } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arcade Vault · Portal Retro",
  description: "Arcade Vault — juega online y compite por la mayor cantidad de puntos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${pressStart2P.variable} ${jetBrainsMono.variable} ${courierPrime.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <div className="av-bg" />
        <div className="av-noise" />
        <div id="root">{children}</div>
      </body>
    </html>
  );
}
