import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Mulish } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const mulish = Mulish({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "ARKE Scholars | Premium 1:1 Online Tutoring, JEE, NEET & Foundation (India · Dubai · Kuwait)",
  description: "1 Student. 1 Expert Teacher. 1 Learning Journey. Premium 1:1 online tutoring for Classes 6–12, JEE Main, JEE Advanced & NEET UG across India, Dubai & Kuwait.",
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en-IN"
      className={`${mulish.variable} ${plusJakartaSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

