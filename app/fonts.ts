import { Courier_Prime, JetBrains_Mono, Press_Start_2P } from "next/font/google";

export const pressStart2P = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-press-start",
  display: "swap",
});

export const jetBrainsMono = JetBrains_Mono({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const courierPrime = Courier_Prime({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-courier-prime",
  display: "swap",
});
