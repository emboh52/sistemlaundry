'use client';

import { useState } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { initializeApp, getApps, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { db, firebaseConfig } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

export default function RegisterTenantPage() {
  const router = useRouter();
  
  // State untuk form input (ditambah password)
  const [formData, setFormData] = useState({
    name: '',
    tenantId: '',
    ownerEmail: '',
    password: '',
    address: '',
    phone: '',
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Fungsi otomatis membuat slug unik dari Nama Toko untuk Tenant ID
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const storeName = e.target.value;
    const generatedId = storeName
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')    // Hapus simbol khusus
      .replace(/[\s_-]+/g, '-')     // Ganti spasi dengan tanda hubung (-)
      .replace(/^-+|-+$/g, '');     // Hapus tanda hubung di awal/akhir

    setFormData((prev) => ({
      ...prev,
      name: storeName,
      tenantId: generatedId,
    }));
  };

  // Handle perubahan input lainnya
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Submit data ke Firebase Auth & Firestore
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    let secondaryApp: any = null;

    try {
      if (!formData.tenantId) {
        throw new Error('Tenant ID tidak boleh kosong.');
      }

      if (formData.password.length < 6) {
        throw new Error('Password minimal harus 6 karakter.');
      }

      // 1. Buat akun di Firebase Auth menggunakan Secondary App 
      // (Agar sesi Admin utama yang sedang login tidak ikut ter-logout)
      const secondaryAppName = 'SecondaryRegisterApp';
      const existingApps = getApps();
      const existingSecondary = existingApps.find(app => app.name === secondaryAppName);
      
      secondaryApp = existingSecondary || initializeApp(firebaseConfig, secondaryAppName);
      const secondaryAuth = getAuth(secondaryApp);

      // Daftarkan email & password ke Auth
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth, 
        formData.ownerEmail, 
        formData.password
      );
      const newUserId = userCredential.user.uid;

      // Bersihkan secondary app auth instance
      await deleteApp(secondaryApp);

      // 2. Simpan data tenant ke koleksi "tenants"
      const tenantRef = doc(db, 'tenants', formData.tenantId);
      await setDoc(tenantRef, {
        name: formData.name,
        ownerEmail: formData.ownerEmail,
        address: formData.address,
        phone: formData.phone,
        status: 'active',
        createdAt: serverTimestamp(),
      });

      // 3. Simpan data relasi user ke koleksi "users" agar sistem tahu role & tenant-nya
      const userRef = doc(db, 'users', newUserId);
      await setDoc(userRef, {
        email: formData.ownerEmail,
        role: 'Admin', // Set sebagai Admin untuk tenant tersebut
        tenantId: formData.tenantId,
        createdAt: serverTimestamp(),
      });

      setSuccessMessage('Tenant dan akun login berhasil dibuat!');
      setTimeout(() => {
        router.push('/admin/dashboard');
      }, 2000);

    } catch (error: any) {
      console.error('Gagal mendaftarkan tenant:', error);
      if (secondaryApp) {
        try { await deleteApp(secondaryApp); } catch (e) {}
      }
      setErrorMessage(error.message || 'Terjadi kesalahan saat menyimpan data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Daftar Tenant / Cabang Baru
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Sistem SaaS Manajemen Laundry Multi-Tenant
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          
          {errorMessage && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 text-sm text-red-700">
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="mb-4 bg-green-50 border-l-4 border-green-400 p-4 text-sm text-green-700">
              {successMessage}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700">Nama Toko Laundry</label>
              <div className="mt-1">
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleNameChange}
                  placeholder="Contoh: Lala Laundry Melati"
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Tenant ID <span className="text-xs text-gray-400">(Otomatis dari Nama Toko)</span>
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="tenantId"
                  required
                  value={formData.tenantId}
                  onChange={handleChange}
                  placeholder="lala-laundry-melati"
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 text-gray-600 sm:text-sm cursor-not-allowed"
                  readOnly
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email Pemilik (Owner)</label>
              <div className="mt-1">
                <input
                  type="email"
                  name="ownerEmail"
                  required
                  value={formData.ownerEmail}
                  onChange={handleChange}
                  placeholder="owner@lalalaundry.com"
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black"
                />
              </div>
            </div>

            {/* Field Password Baru */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Password Login (Min. 6 Karakter)</label>
              <div className="mt-1">
                <input
                  type="password"
                  name="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Alamat Lengkap Toko</label>
              <div className="mt-1">
                <textarea
                  name="address"
                  rows={3}
                  required
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Jl. Raya Melati No. 12, Jakarta Selatan"
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Nomor HP / WhatsApp Toko</label>
              <div className="mt-1">
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="081234567890"
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Memproses...' : 'Daftarkan Tenant & Buat Akun'}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}