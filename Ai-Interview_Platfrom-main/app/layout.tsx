import type { Metadata } from "next";
import { Mona_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const monaSans = Mona_Sans({
  variable: "--font-mona-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PrepShape",
  description:
    "An AI-powered platform for preparing for mock interviews and shaping tech future.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Load face-api.js globally */}
        <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest/dist/tf.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/face-api.js@latest/dist/face-api.min.js"></script>
        <script src="https://unpkg.com/face-api.j"></script>
      </head>

      <body className={`${monaSans.className} antialiased pattern`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
