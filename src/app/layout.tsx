import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-geist-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Регистрация гостей",
  description: "Контроль гостей на мероприятии: QR-бейджи и этапы регистрации",
  applicationName: "Регистрация гостей",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Гости",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#2f6e60",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className={`${manrope.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
