import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const viewport: Viewport = {
  themeColor: "#3b82f6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Mencegah zoom tidak disengaja saat tap input di HP
  viewportFit: "cover", // Memastikan tampilan penuh sampai area notch / poni HP
};

export const metadata: Metadata = {
  title: "SISTEM LAUNDRY",
  description: "Aplikasi Kasir & Booking Laundry Modern",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SISTEM LAUNDRY",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="h-full scroll-smooth">
      <body className="h-full bg-slate-50 text-slate-800 antialiased overflow-x-hidden selection:bg-sky-500 selection:text-white">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}