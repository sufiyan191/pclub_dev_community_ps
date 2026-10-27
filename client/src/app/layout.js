import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const svgIcon = `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 rx=%2250%22 fill=%22%231d9bf0%22/><path d=%22M32 36L20 50L32 64M68 36L80 50L68 64M55 28L45 72%22 stroke=%22white%22 stroke-width=%228%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22 fill=%22none%22/></svg>`;

export const metadata = {
  title: "SpatialDev — Developer Community | PClub IIT Indore",
  description:
    "VisionOS-inspired spatial developer community platform with real-time group channels, Q&A threads, and polyglot persistence.",
  icons: {
    icon: svgIcon,
    shortcut: svgIcon,
    apple: svgIcon,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1c1c1e",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased selection:bg-[#1d9bf0]/30 selection:text-white overflow-hidden">
        {children}
      </body>
    </html>
  );
}