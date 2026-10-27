import { Geist, Geist_Mono } from "next/font/google";
import "highlight.js/styles/github-dark.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: {
    default: "SpatialDev · Developer Community",
    template: "%s · SpatialDev",
  },
  description:
    "A spatial workspace for developers: join servers, ask questions with Markdown and code, vote on answers and chat live in groups.",
  applicationName: "SpatialDev",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#17171a",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full overflow-hidden bg-zinc-950 font-sans text-white">
        {children}
      </body>
    </html>
  );
}
