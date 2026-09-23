'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Store, ShieldCheck, AlertTriangle, CheckCircle, Search, RefreshCw, LogOut, Plus, Pencil, Trash2, X, ShoppingBag, Users, Wallet } from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  ownerEmail: string;
  subscriptionPlan?: string;
  status?: string;
  createdAt?: any;
  totalOrders?: number;
  totalRevenue?: number;
  totalStaff?: number;
}

export default function SuperAdminDashboard() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal & Form State untuk CRUD
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    ownerEmail: '',
    subscriptionPlan: 'Standard / Free',
    status: 'active',
  });

  const router = useRouter();

  // Ambil daftar seluruh tenant beserta metrik lengkap dari database Firebase
  const fetchTenants = async () => {
    setLoading(true);
    try {
      const tenantsSnapshot = await getDocs(collection(db, 'tenants'));
      const ordersSnapshot = await getDocs(collection(db, 'orders'));
      const usersSnapshot = await getDocs(collection(db, 'users'));

      const ordersList = ordersSnapshot.docs.map(doc => doc.data());
      const usersList = usersSnapshot.docs.map(doc => doc.data());

      const list: Tenant[] = [];
      tenantsSnapshot.forEach((d) => {
        const tenantId = d.id;
        const data = d.data();

        // Hitung metrik spesifik untuk tenant ini langsung dari data database
        const tenantOrders = ordersList.filter(o => o.tenantId === tenantId);
        const totalOrders = tenantOrders.length;
        const totalRevenue = tenantOrders
          .filter(o => o.status === 'Selesai')
          .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        
        const totalStaff = usersList.filter(u => u.tenantId === tenantId).length;

        list.push({
          id: tenantId,
          name: data.name || 'Tanpa Nama',
          ownerEmail: data.ownerEmail || '-',
          subscriptionPlan: data.subscriptionPlan || 'Standard / Free',
          status: data.status || 'active',
          createdAt: data.createdAt,
          totalOrders,
          totalRevenue,
          totalStaff,
        });
      });

      setTenants(list);
    } catch (error) {
      console.error('Gagal mengambil data tenant dari database:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  // Buka Modal untuk Tambah Tenant Baru
  const handleOpenCreate = () => {
    setModalMode('create');
    setFormData({
      id: '',
      name: '',
      ownerEmail: '',
      subscriptionPlan: 'Standard / Free',
      status: 'active',
    });
    setIsModalOpen(true);
  };

  // Buka Modal untuk Edit Tenant
  const handleOpenEdit = (tenant: Tenant) => {
    setModalMode('edit');
    setFormData({
      id: tenant.id,
      name: tenant.name || '',
      ownerEmail: tenant.ownerEmail || '',
      subscriptionPlan: tenant.subscriptionPlan || 'Standard / Free',
      status: tenant.status || 'active',
    });
    setIsModalOpen(true);
  };

  // Submit Handler untuk Create & Update Tenant ke Firebase
  const handleSaveTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.ownerEmail) {
      alert('Nama Toko dan Email Owner wajib diisi!');
      return;
    }

    setIsSubmitting(true);
    try {
      if (modalMode === 'create') {
        const tenantId = formData.id.trim() 
          ? formData.id.trim().toLowerCase().replace(/\s+/g, '-') 
          : formData.name.trim().toLowerCase().replace(/\s+/g, '-');

        const tenantRef = doc(db, 'tenants', tenantId);
        await setDoc(tenantRef, {
          name: formData.name.trim(),
          ownerEmail: formData.ownerEmail.trim().toLowerCase(),
          subscriptionPlan: formData.subscriptionPlan,
          status: formData.status,
          createdAt: new Date(),
        });
      } else {
        const tenantRef = doc(db, 'tenants', formData.id);
        await updateDoc(tenantRef, {
          name: formData.name.trim(),
          ownerEmail: formData.ownerEmail.trim().toLowerCase(),
          subscriptionPlan: formData.subscriptionPlan,
          status: formData.status,
        });
      }

      setIsModalOpen(false);
      fetchTenants();
    } catch (error) {
      console.error('Gagal menyimpan tenant:', error);
      alert('Terjadi kesalahan saat menyimpan data tenant.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fungsi untuk Menghapus Tenant dari Firebase
  const handleDeleteTenant = async (tenantId: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus tenant "${tenantId}"? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'tenants', tenantId));
      setTenants(prev => prev.filter(t => t.id !== tenantId));
    } catch (error) {
      console.error('Gagal menghapus tenant:', error);
      alert('Gagal menghapus tenant dari database.');
    }
  };

  // Fungsi untuk mengaktifkan atau menangguhkan (suspend) toko
  const toggleTenantStatus = async (tenantId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      const tenantRef = doc(db, 'tenants', tenantId);
      await updateDoc(tenantRef, { status: newStatus });
      setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, status: newStatus } : t));
    } catch (error) {
      console.error('Gagal mengubah status tenant:', error);
      alert('Gagal memperbarui status tenant.');
    }
  };

  // Fungsi Logout Super Admin
  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/admin/login');
    } catch (error) {
      console.error('Gagal keluar:', error);
    }
  };

  // Filter pencarian berdasarkan nama atau email owner
  const filteredTenants = tenants.filter(t => 
    t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.ownerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeCount = tenants.filter(t => t.status !== 'suspended').length;
  const suspendedCount = tenants.filter(t => t.status === 'suspended').length;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-8 font-sans">
      
      {/* Header Halaman */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-sky-400" />
            Super Admin Control Plane
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Pusat monitoring seluruh cabang tenant laundry dan manajemen sistem SaaS.
          </p>
        </div>
        
        {/* Tombol Aksi Header */}
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Tambah Tenant Baru
          </button>

          <button 
            onClick={fetchTenants}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm transition-colors border border-slate-700"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Segarkan Data
          </button>

          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg text-sm transition-colors border border-rose-500/30"
          >
            <LogOut className="w-4 h-4" />
            Keluar
          </button>
        </div>
      </div>

      {/* Kartu Statistik Ringkasan */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <div className="text-slate-400 text-xs font-medium uppercase tracking-wider">Total Tenant</div>
            <div className="text-2xl font-bold text-white mt-1">{tenants.length}</div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-slate-400 text-xs font-medium uppercase tracking-wider">Tenant Aktif</div>
            <div className="text-2xl font-bold text-white mt-1">{activeCount}</div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-slate-400 text-xs font-medium uppercase tracking-wider">Tenant Ditangguhkan</div>
            <div className="text-2xl font-bold text-white mt-1">{suspendedCount}</div>
          </div>
        </div>
      </div>

      {/* Tabel Kontrol Tenant dengan Info Lengkap dari Database */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-lg overflow-hidden">
        <div className="p-5 border-b border-slate-700 flex flex-col sm:flex-row justify-between gap-4 items-center">
          <h2 className="text-lg font-semibold text-white">Daftar Cabang / Toko Terdaftar</h2>
          
          {/* Kolom Pencarian */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            <input
              type="text"
              placeholder="Cari nama toko, ID, atau email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-700">
                <th className="py-3 px-5">Nama Toko & ID</th>
                <th className="py-3 px-5">Owner / Admin</th>
                <th className="py-3 px-5">Statistik Tenant</th>
                <th className="py-3 px-5">Paket & Status</th>
                <th className="py-3 px-5 text-right">Aksi Kontrol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400">
                    Memuat data lengkap tenant dari database...
                  </td>
                </tr>
              ) : filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400">
                    Tidak ada tenant ditemukan.
                  </td>
                </tr>
              ) : (
                filteredTenants.map((t) => {
                  const isSuspended = t.status === 'suspended';
                  return (
                    <tr key={t.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="py-4 px-5">
                        <div className="font-semibold text-white">{t.name || 'Tanpa Nama'}</div>
                        <div className="text-xs text-slate-400 font-mono">ID: {t.id}</div>
                      </td>
                      <td className="py-4 px-5 text-slate-300">
                        {t.ownerEmail || '-'}
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex flex-col gap-1 text-xs">
                          <span className="text-slate-300 flex items-center gap-1.5">
                            <ShoppingBag className="w-3.5 h-3.5 text-sky-400" /> {t.totalOrders || 0} Pesanan
                          </span>
                          <span className="text-emerald-400 flex items-center gap-1.5 font-semibold">
                            <Wallet className="w-3.5 h-3.5" /> Rp {(t.totalRevenue || 0).toLocaleString('id-ID')}
                          </span>
                          <span className="text-indigo-300 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5" /> {t.totalStaff || 0} Staff / User
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-5 space-y-1.5">
                        <div>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            {t.subscriptionPlan || 'Standard / Free'}
                          </span>
                        </div>
                        <div>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold inline-block ${
                            isSuspended 
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {isSuspended ? 'Ditangguhkan' : 'Aktif'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => toggleTenantStatus(t.id, t.status || 'active')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                              isSuspended
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                : 'bg-amber-600/20 hover:bg-amber-600 text-amber-400 hover:text-white border border-amber-500/30'
                            }`}
                          >
                            {isSuspended ? 'Aktifkan' : 'Suspend'}
                          </button>
                          
                          <button
                            onClick={() => handleOpenEdit(t)}
                            className="p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors"
                            title="Edit Tenant"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteTenant(t.id)}
                            className="p-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg transition-colors border border-rose-500/30"
                            title="Hapus Tenant"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL FORM TAMBAH / EDIT TENANT */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative my-8 text-slate-100">
            <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-3">
              <h3 className="text-lg font-bold text-white">
                {modalMode === 'create' ? 'Tambah Tenant Baru' : 'Edit Detail Tenant'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTenant} className="space-y-4 text-sm">
              {modalMode === 'create' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Tenant ID (Slug Unik, e.g: lala-laundry)
                  </label>
                  <input
                    type="text"
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                    placeholder="Kosongkan untuk generate otomatis dari nama"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-sky-500 font-mono text-xs"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nama Toko / Tenant</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: LaLa Laundry Cabang 2"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email Owner / Admin Utama</label>
                <input
                  type="email"
                  required
                  value={formData.ownerEmail}
                  onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                  placeholder="owner@lalalaundry.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Paket Langganan</label>
                  <select
                    value={formData.subscriptionPlan}
                    onChange={(e) => setFormData({ ...formData, subscriptionPlan: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="Standard / Free">Standard / Free</option>
                    <option value="Pro Plan">Pro Plan</option>
                    <option value="Enterprise">Enterprise</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Status Toko</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="active">Aktif</option>
                    <option value="suspended">Ditangguhkan</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}