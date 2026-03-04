import React, { useState, useEffect } from 'react';
import {
  PlusCircle,
  History,
  Save,
  Trash2,
  Edit3,
  Download,
  Clock,
  User,
  Hash,
  Package,
  DollarSign,
  AlertCircle,
  Lock,
  Unlock,
  X,
  Check,
  Bell,
  Sun,
  Moon
} from 'lucide-react';

/**
 * --- KONFIGURASI DATABASE ---
 */
const supabaseUrl = "https://mqtjbesctzixdnwnqctt.supabase.co";
const supabaseKey = "sb_publishable_y9VJKwDA_FKBCK9W84b9rg_FAZW3JrM";
const ADMIN_PASSWORD = "cg";

const App = () => {
  const [activeTab, setActiveTab] = useState('input');
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  // State Admin & Notifikasi
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [passInput, setPassInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });
  const [editingJob, setEditingJob] = useState(null);

  // --- STATE DARK MODE ---
  const [isDark, setIsDark] = useState(() => {
    // Cek apakah sebelumnya user milih dark mode (disimpan di browser)
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark';
    }
    return false;
  });

  // Efek untuk mengganti class di body HTML saat Dark Mode di-klik
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  // State Form Input
  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    operator: '',
    invoice_code: '',
    customer: '',
    deskripsi: '',
    jumlah_unit: 1,
    harga_per_unit: 50000,
    durasi_menit: 10
  });

  const notify = (message, type = 'info') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'info' }), 3000);
  };

  useEffect(() => {
    const qty = parseInt(formData.jumlah_unit) || 0;
    let price = 50000;
    if (qty >= 10 && qty <= 50) price = 35000;
    else if (qty > 50) price = 25000;
    setFormData(prev => ({ ...prev, harga_per_unit: price }));
  }, [formData.jumlah_unit]);

  const fetchJobs = async () => {
    if (!supabaseUrl || !supabaseKey) return;
    setLoading(true);
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/laser_jobs?select=*&order=tanggal.desc`, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
      });
      if (!response.ok) throw new Error('Gagal mengambil data dari server');
      const data = await response.json();
      setJobs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchJobs(); }, []);

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (passInput === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setShowLoginModal(false);
      setPassInput("");
      setLoginError("");
      notify("Berhasil masuk sebagai Admin", "success");
    } else {
      setLoginError("Password salah!");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const total = formData.jumlah_unit * formData.harga_per_unit;
    const payload = { ...formData, total_penghasilan: total };

    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/laser_jobs`, {
        method: 'POST',
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Gagal menyimpan data');
      notify('Job berhasil disimpan ke Cloud!', 'success');
      setFormData({ ...formData, invoice_code: '', customer: '', deskripsi: '', jumlah_unit: 1 });
      fetchJobs();
    } catch (err) {
      notify('Gagal simpan: ' + err.message, 'error');
    }
  };

  const handleUpdateJob = async (e) => {
    e.preventDefault();
    if (!editingJob || !isAdmin) return;

    const total = editingJob.jumlah_unit * editingJob.harga_per_unit;
    const payload = { ...editingJob, total_penghasilan: total };
    delete payload.id; delete payload.created_at;

    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/laser_jobs?id=eq.${editingJob.id}`, {
        method: 'PATCH',
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Gagal update data');
      notify('Data berhasil diperbarui!', 'success');
      setEditingJob(null);
      fetchJobs();
    } catch (err) {
      notify('Gagal update: ' + err.message, 'error');
    }
  };

  const deleteJob = async (id) => {
    if (!isAdmin) return;
    if (!window.confirm('Hapus permanen data ini?')) return;
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/laser_jobs?id=eq.${id}`, {
        method: 'DELETE',
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
      });
      if (!response.ok) throw new Error('Gagal menghapus data');
      notify('Data dihapus', 'success');
      fetchJobs();
    } catch (err) {
      notify('Gagal hapus: ' + err.message, 'error');
    }
  };

  const exportCSV = () => {
    const headers = ["Tanggal", "Operator", "Invoice", "Customer", "Deskripsi", "Unit", "Harga/Unit", "Durasi(m)", "Total"];
    const rows = jobs.map(j => [j.tanggal, j.operator, j.invoice_code, j.customer, j.deskripsi, j.jumlah_unit, j.harga_per_unit, j.durasi_menit, j.total_penghasilan]);
    let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Laporan_Laser_CG_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify('Data siap diunduh!', 'success');
  };

  const stats = {
    income: jobs.reduce((acc, curr) => acc + (curr.total_penghasilan || 0), 0),
    units: jobs.reduce((acc, curr) => acc + (parseInt(curr.jumlah_unit) || 0), 0),
    duration: jobs.reduce((acc, curr) => acc + ((parseInt(curr.jumlah_unit) || 0) * (parseInt(curr.durasi_menit) || 0)), 0)
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans p-4 md:p-8 pb-20 transition-colors duration-300">

      {/* Toast Notifikasi */}
      {notification.show && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 animate-bounce`}>
          <Bell size={20} className={isDark ? "text-yellow-600" : "text-yellow-400"} />
          <span className="font-bold text-sm tracking-wide">{notification.message}</span>
        </div>
      )}

      {/* Bagian Header */}
      <div className="max-w-6xl mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3 transition-colors duration-300">
            <span className="bg-yellow-400 dark:bg-yellow-500 p-2.5 rounded-2xl text-white dark:text-slate-900 shadow-lg shadow-yellow-200 dark:shadow-none">⚡</span>
            CG
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium transition-colors">Monitoring Fiber Laser</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Tombol Toggle Dark Mode */}
          <button
            onClick={() => setIsDark(!isDark)}
            className="p-3 rounded-2xl flex items-center justify-center font-bold transition-all shadow-sm border bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
            title="Toggle Tema"
          >
            {isDark ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} />}
          </button>

          <button
            onClick={() => isAdmin ? setIsAdmin(false) : setShowLoginModal(true)}
            className={`p-3 rounded-2xl flex items-center gap-2 font-bold transition-all shadow-sm border ${isAdmin ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/50' : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
          >
            {isAdmin ? <Unlock size={20} /> : <Lock size={20} />}
            <span className="text-xs uppercase tracking-tighter font-black hidden sm:block">{isAdmin ? "Admin Active" : "Locked"}</span>
          </button>

          <div className="flex bg-white dark:bg-slate-800 p-1.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
            <button
              onClick={() => setActiveTab('input')}
              className={`px-6 py-2.5 rounded-xl flex items-center gap-2 font-bold transition-all ${activeTab === 'input' ? 'bg-slate-800 dark:bg-slate-700 text-white shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
            >
              <PlusCircle size={18} /> <span className="hidden sm:block">Input</span>
            </button>
            <button
              onClick={() => { setActiveTab('report'); fetchJobs(); }}
              className={`px-6 py-2.5 rounded-xl flex items-center gap-2 font-bold transition-all ${activeTab === 'report' ? 'bg-slate-800 dark:bg-slate-700 text-white shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
            >
              <History size={18} /> <span className="hidden sm:block">Riwayat</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        {/* Widget Ringkasan */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-900 p-7 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-5 hover:shadow-md transition-all">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl text-emerald-600 dark:text-emerald-400"><DollarSign size={28} /></div>
            <div>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Total Pemasukan</p>
              <p className="text-2xl font-black text-slate-800 dark:text-white">Rp {stats.income.toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-7 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-5 hover:shadow-md transition-all">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-2xl text-blue-600 dark:text-blue-400"><Package size={28} /></div>
            <div>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Unit Terproduksi</p>
              <p className="text-2xl font-black text-slate-800 dark:text-white">{stats.units.toLocaleString()} <span className="text-sm font-normal text-slate-400">Pcs</span></p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-7 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-5 hover:shadow-md transition-all">
            <div className="p-4 bg-purple-50 dark:bg-purple-900/30 rounded-2xl text-purple-600 dark:text-purple-400"><Clock size={28} /></div>
            <div>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Runtime Mesin Total</p>
              <p className="text-2xl font-black text-slate-800 dark:text-white">{stats.duration.toLocaleString()} <span className="text-sm font-normal text-slate-400">m</span></p>
            </div>
          </div>
        </div>

        {/* Konten Utama */}
        {activeTab === 'input' ? (
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden relative transition-colors">
            <div className="absolute top-0 left-0 w-full h-2 bg-yellow-400 dark:bg-yellow-500"></div>
            <div className="p-8 border-b border-slate-50 dark:border-slate-800/50 bg-slate-50/30 dark:bg-slate-800/20 flex justify-between items-center mt-2">
              <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">📝 Input Job Antrian</h2>
              <div className="flex gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-700"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-700"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 dark:bg-yellow-500"></span>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="p-10 grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-8">
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block">Tanggal Produksi</label>
                  <input type="date" value={formData.tanggal} onChange={e => setFormData({ ...formData, tanggal: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border-none outline-none focus:ring-2 focus:ring-yellow-400 transition-all font-bold text-slate-700 dark:text-slate-200 color-scheme-light dark:color-scheme-dark" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block">Nama Operator</label>
                  <input type="text" required placeholder="Contoh: Angga" value={formData.operator} onChange={e => setFormData({ ...formData, operator: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border-none outline-none focus:ring-2 focus:ring-yellow-400 transition-all font-bold text-slate-900 dark:text-slate-100 placeholder-slate-300 dark:placeholder-slate-600" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block">Invoice Code</label>
                  <input type="text" placeholder="INV/CG/..." value={formData.invoice_code} onChange={e => setFormData({ ...formData, invoice_code: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border-none outline-none focus:ring-2 focus:ring-yellow-400 transition-all text-slate-900 dark:text-slate-100 placeholder-slate-300 dark:placeholder-slate-600" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block">Nama Customer</label>
                  <input type="text" placeholder="Nama PT / Individu" value={formData.customer} onChange={e => setFormData({ ...formData, customer: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border-none outline-none focus:ring-2 focus:ring-yellow-400 transition-all text-slate-900 dark:text-slate-100 placeholder-slate-300 dark:placeholder-slate-600" />
                </div>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block">Deskripsi Kerja</label>
                  <input type="text" placeholder="Contoh: Grafir Lensa Kacamata" value={formData.deskripsi} onChange={e => setFormData({ ...formData, deskripsi: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border-none outline-none focus:ring-2 focus:ring-yellow-400 transition-all text-slate-900 dark:text-slate-100 placeholder-slate-300 dark:placeholder-slate-600" />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block">Volume (Pcs)</label>
                    <input type="number" min="1" value={formData.jumlah_unit} onChange={e => setFormData({ ...formData, jumlah_unit: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border-none outline-none focus:ring-2 focus:ring-yellow-400 transition-all font-bold text-slate-900 dark:text-slate-100" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block">Durasi/Pcs (m)</label>
                    <input type="number" min="0" value={formData.durasi_menit} onChange={e => setFormData({ ...formData, durasi_menit: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border-none outline-none focus:ring-2 focus:ring-yellow-400 transition-all font-bold text-slate-900 dark:text-slate-100" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block">Harga Jasa/Pcs (IDR)</label>
                  <div className="relative">
                    <div className="absolute left-4 top-4.5 text-slate-400 dark:text-slate-500 font-bold text-sm">Rp</div>
                    <input type="number" value={formData.harga_per_unit} onChange={e => setFormData({ ...formData, harga_per_unit: e.target.value })} className="w-full pl-12 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border-none outline-none focus:ring-2 focus:ring-yellow-400 font-black text-slate-800 dark:text-slate-100" />
                  </div>
                </div>
                <div className="pt-6">
                  <button type="submit" className="w-full bg-slate-900 dark:bg-yellow-500 hover:bg-black dark:hover:bg-yellow-400 text-white dark:text-slate-900 font-black py-5 rounded-2xl transition-all shadow-xl dark:shadow-none flex items-center justify-center gap-3 active:scale-95 uppercase tracking-widest text-sm">
                    <Save size={20} className={isDark ? "" : "text-yellow-400"} /> Simpan Data
                  </button>
                </div>
              </div>
            </form>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden relative transition-colors">
            <div className="absolute top-0 left-0 w-full h-2 bg-slate-800 dark:bg-slate-700"></div>
            <div className="p-8 border-b border-slate-50 dark:border-slate-800/50 bg-slate-50/30 dark:bg-slate-800/20 flex items-center justify-between mt-2">
              <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">📜 Log Produksi</h2>
              <button onClick={exportCSV} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-md dark:shadow-none">
                <Download size={16} /> Export CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-[0.2em] font-black border-b border-slate-100 dark:border-slate-800">
                    <th className="px-8 py-5">Info Job</th>
                    <th className="px-8 py-5">Klien & Deskripsi</th>
                    <th className="px-8 py-5 text-center">Volume</th>
                    <th className="px-8 py-5 text-right">Total IDR</th>
                    <th className="px-8 py-5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {loading ? (
                    <tr><td colSpan="5" className="p-16 text-center text-slate-400 dark:text-slate-500 text-sm italic font-medium tracking-widest">Menghubungkan ke server cloud...</td></tr>
                  ) : jobs.length === 0 ? (
                    <tr><td colSpan="5" className="p-16 text-center text-slate-400 dark:text-slate-500 text-sm">Belum ada data produksi yang tersimpan.</td></tr>
                  ) : (
                    jobs.map((job) => (
                      <tr key={job.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                        <td className="px-8 py-6">
                          <p className="font-black text-slate-800 dark:text-slate-200 text-sm">{job.tanggal}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tight mt-0.5">Op: {job.operator}</p>
                        </td>
                        <td className="px-8 py-6">
                          <p className="text-[10px] text-blue-600 dark:text-blue-400 font-black uppercase mb-1 tracking-wider">{job.customer || 'Pelanggan Umum'}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 italic leading-relaxed">"{job.deskripsi}"</p>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <div className="bg-slate-100 dark:bg-slate-800 inline-block px-3 py-1.5 rounded-lg">
                            <span className="text-xs font-black text-slate-700 dark:text-slate-300">{job.jumlah_unit} <span className="text-[9px] font-normal text-slate-400 dark:text-slate-500">Pcs</span></span>
                          </div>
                          <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1.5 font-bold uppercase tracking-tighter">@{job.durasi_menit}m/pcs</p>
                        </td>
                        <td className="px-8 py-6 text-right font-black text-sm text-slate-900 dark:text-slate-200">{(job.total_penghasilan || 0).toLocaleString()}</td>
                        <td className="px-8 py-6 text-center">
                          <div className="flex justify-center gap-3">
                            {isAdmin ? (
                              <>
                                <button onClick={() => setEditingJob(job)} className="text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-all hover:scale-110"><Edit3 size={18} /></button>
                                <button onClick={() => deleteJob(job.id)} className="text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-all hover:scale-110"><Trash2 size={18} /></button>
                              </>
                            ) : <Lock size={16} className="text-slate-200 dark:text-slate-700" title="Locked" />}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal Admin Password */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 max-w-sm w-full shadow-2xl relative overflow-hidden transition-colors">
            <div className="absolute top-0 left-0 w-full h-2 bg-yellow-400 dark:bg-yellow-500"></div>
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter">Admin Akses</h3>
              <button onClick={() => { setShowLoginModal(false); setLoginError(""); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all"><X size={24} /></button>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-8 font-medium leading-relaxed uppercase tracking-widest text-center">Password Khusus Owner</p>
            <form onSubmit={handleAdminLogin}>
              <input type="password" autoFocus value={passInput} onChange={(e) => { setPassInput(e.target.value); setLoginError(""); }} placeholder="******" className="w-full p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border-none outline-none focus:ring-2 focus:ring-yellow-400 transition-all mb-4 text-center font-black text-lg tracking-widest text-slate-800 dark:text-white" />
              {loginError && <p className="text-red-500 text-[10px] font-bold text-center mb-4 uppercase tracking-wider">{loginError}</p>}
              <button type="submit" className="w-full bg-slate-900 dark:bg-yellow-500 text-white dark:text-slate-900 font-black py-5 rounded-2xl shadow-xl dark:shadow-none transition-all active:scale-95 uppercase tracking-widest text-sm">Unlock System</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Data */}
      {editingJob && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 max-w-2xl w-full shadow-2xl my-8 relative transition-colors">
            <div className="absolute top-0 left-0 w-full h-2 bg-blue-500"></div>
            <div className="flex justify-between items-center mb-10 mt-2">
              <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">🛠️ Revisi Produksi</h3>
              <button onClick={() => setEditingJob(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all"><X size={24} /></button>
            </div>
            <form onSubmit={handleUpdateJob} className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <label className="block"><span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">Tanggal</span><input type="date" value={editingJob.tanggal} onChange={(e) => setEditingJob({ ...editingJob, tanggal: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-400 font-bold color-scheme-light dark:color-scheme-dark" /></label>
                <label className="block"><span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">Operator</span><input type="text" value={editingJob.operator} onChange={(e) => setEditingJob({ ...editingJob, operator: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-400 font-bold" /></label>
                <label className="block"><span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">Invoice</span><input type="text" value={editingJob.invoice_code} onChange={(e) => setEditingJob({ ...editingJob, invoice_code: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-400" /></label>
                <label className="block"><span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">Customer</span><input type="text" value={editingJob.customer} onChange={(e) => setEditingJob({ ...editingJob, customer: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-400" /></label>
              </div>
              <div className="space-y-6">
                <label className="block"><span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">Deskripsi</span><input type="text" value={editingJob.deskripsi} onChange={(e) => setEditingJob({ ...editingJob, deskripsi: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-400" /></label>
                <div className="grid grid-cols-2 gap-6">
                  <label className="block"><span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">Volume</span><input type="number" value={editingJob.jumlah_unit} onChange={(e) => setEditingJob({ ...editingJob, jumlah_unit: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-400 font-bold" /></label>
                  <label className="block"><span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">Durasi (m)</span><input type="number" value={editingJob.durasi_menit} onChange={(e) => setEditingJob({ ...editingJob, durasi_menit: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-400 font-bold" /></label>
                </div>
                <label className="block"><span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">Harga/Unit</span><input type="number" value={editingJob.harga_per_unit} onChange={(e) => setEditingJob({ ...editingJob, harga_per_unit: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-400 font-black text-slate-800 dark:text-slate-200" /></label>
                <div className="pt-6 flex gap-4">
                  <button type="button" onClick={() => setEditingJob(null)} className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold py-5 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all uppercase text-[10px] tracking-widest font-black">Batal</button>
                  <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-100 dark:shadow-none transition-all flex items-center justify-center gap-2 active:scale-95 uppercase text-[10px] tracking-widest"><Check size={18} /> Update</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer System */}
      <div className="max-w-6xl mx-auto mt-12 text-center text-slate-400 dark:text-slate-500 text-[9px] font-black uppercase tracking-[0.5em] opacity-50 pb-10 transition-colors">
        CG Digital Print Karawang • Production System Pro v1.6
      </div>
    </div>
  );
};

export default App;
