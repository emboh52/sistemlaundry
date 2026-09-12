"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  FileText,
  Users,
  DollarSign,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { logout } = useAuth();

  // Daftar seluruh menu admin beserta icon-nya
  const menuItems = [
    {
      title: "Dashboard",
      href: "/admin/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Kelola Pesanan",
      href: "/admin/orders",
      icon: ShoppingBag,
    },
    {
      title: "Manajemen Stok",
      href: "/admin/inventory",
      icon: Package,
    },
    {
      title: "Layanan & Paket",
      href: "/admin/services",
      icon: FileText,
    },
    {
      title: "Pelanggan",
      href: "/admin/customers",
      icon: Users,
    },
    {
      title: "Pengeluaran",
      href: "/admin/expenses",
      icon: DollarSign,
    },
    {
      title: "Laporan Keuangan",
      href: "/admin/reports",
      icon: FileText,
    },
    {
      title: "Karyawan & RBAC",
      href: "/admin/users",
      icon: Users,
    },
    {
      title: "Pengaturan Toko",
      href: "/admin/settings",
      icon: Settings,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-100 font-sans">
      {/* 1. Header / Navbar Atas (Hanya muncul di Layar HP) */}
      <div className="md:hidden bg-slate-900 text-slate-300 p-4 flex items-center justify-between border-b border-slate-800 sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <Image
            src="/icons/icon-512x512.png"
            alt="Logo LaLa Laundry"
            width={32}
            height={32}
            className="rounded-lg object-cover"
          />
          <span className="font-bold text-lg text-white">LALA LAUNDRY</span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 text-slate-400 hover:text-white rounded-lg focus:outline-none"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* 2. Overlay Latar Redup saat Menu HP Terbuka */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* 3. Sidebar Utama (Slide-over di HP & Permanent di Desktop) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#12185e]  flex flex-col justify-between shrink-0 transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4">
          {/* Logo / Brand */}
          <div className="px-2 py-4 mb-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Image
                src="/icons/icon-512x512.png"
                alt="Logo LaLa Laundry"
                width={32}
                height={32}
                className="rounded-lg object-cover"
              />
              <span className="font-bold text-lg text-white">LALA LAUNDRY</span>
            </div>
            {/* Tombol Tutup Tambahan khusus Mobile */}
            <button
              onClick={() => setIsOpen(false)}
              className="md:hidden text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigasi Menu */}
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)} // Otomatis menutup sidebar saat menu diklik di HP
                  className={`flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? "bg-sky-600 text-white font-medium"
                      : "hover:bg-slate-800 hover:text-white text-slate-400"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.title}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Tombol Logout */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={logout}
            className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-slate-800 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* 4. Area Konten Utama */}
      <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
    </div>
  );
}