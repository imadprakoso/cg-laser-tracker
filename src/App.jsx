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
  Bell
} from 'lucide-react';

/**
 * --- CONFIGURATION ---
 */
const supabaseUrl = "https://mqtjbesctzixdnwnqctt.supabase.co";
const supabaseKey = "sb_publishable_y9VJKwDA_FKBCK9W84b9rg_FAZW3JrM";

// SILAKAN GANTI PASSWORD ADMIN DI SINI
const ADMIN_PASSWORD = "cgprintkarawang";

const App = () => {
  const [activeTab, setActiveTab] = useState('input');
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Admin State
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [passInput, setPassInput] = useState("");
  const [loginError, setLoginError] = useState("");

  // Notification State
  const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });

  // Edit State
  const [editingJob, setEditingJob] = useState(null);

  // Form State
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

  // --- HELPER: SHOW NOTIFICATION ---
  const notify = (message, type = 'info') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'info' }), 3000);
  };

  // --- LOGIC: TIERING HARGA ---
  useEffect(() => {
    const qty = parseInt(formData.jumlah_unit) || 0;
    let price = 50000;
    if (qty >= 10 && qty <= 50) price = 35000;
    else if (qty > 50) price = 25000;

    setFormData(prev => ({ ...prev, harga_per_unit: price }));
  }, [formData.jumlah_unit]);

  // --- DATA FETCHING (REST API) ---
  const fetchJobs = async () => {
    if (!supabaseUrl || !supabaseKey) return;
    setLoading(true);
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/laser_jobs?select=*&order=tanggal.desc`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });
      if (!response.ok) throw new Error('Gagal mengambil data dari Supabase');
      const data = await response.json();
      setJobs(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [supabaseUrl, supabaseKey]);

  // --- ACTIONS ---
  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (passInput === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setShowLoginModal(false);
      setPassInput("");
      setLoginError("");
      notify("Berhasil masuk sebagai Admin", "success");
    } else {
      setLoginError("Password salah! Silakan coba lagi.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!supabaseUrl || !supabaseKey) return;

    const total = formData.jumlah_unit * formData.harga_per_unit;
    const payload = { ...formData, total_penghasilan: total };

    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/laser_jobs`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
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
    delete payload.id;
    delete payload.created_at;

    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/laser_jobs?id=eq.${editingJob.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
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
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/laser_jobs?id=eq.${id}`, {
        method: 'DELETE',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
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
    const rows = jobs.map(j => [
      j.tanggal, j.operator, j.invoice_code, j.customer, j.deskripsi, j.jumlah_unit, j.harga_per_unit, j.durasi_menit, j.total_penghasilan
    ]);
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

  // --- STATS CALCULATION (FIXED LOGIC) ---
  const stats = {
    income: jobs.reduce((acc, curr) => acc + (curr.total_penghasilan || 0), 0),
    units: jobs.reduce((acc, curr) => acc + (parseInt(curr.jumlah_unit) || 0), 0),
    // Runtime dihitung dari (Jumlah Pcs x Durasi per Pcs)
    duration: jobs.reduce((acc, curr) => {
      const qty = parseInt(curr.jumlah_unit) || 0;
      const timePerUnit = parseInt(curr.durasi_menit) || 0;
      return acc + (qty * timePerUnit);
    }, 0)
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8 pb-20">

      {/* Toast Notification */}
      {notification.show && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl animate-bounce ${notification.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          <Bell size={20} />
          <span className="font-bold text-sm">{notification.message}</span>
        </div>
      )}

      {/* Header Section */}
      <div className="max-w-6xl mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
            <span className="bg-yellow-400 p-2.5 rounded-2xl text-white shadow-lg shadow-yellow-200">⚡</span>
            CG Digital Print
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Monitoring Fiber Laser — Karawang Warehouse</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => isAdmin ? setIsAdmin(false) : setShowLoginModal(true)}
            className={`p-3 rounded-2xl flex items-center gap-2 font-bold transition-all shadow-sm border ${isAdmin ? 'bg-red-50 text-red-600 border-red-100' : 'bg-white text-slate-400 border-slate-200'}`}
          >
            {isAdmin ? <Unlock size={20} /> : <Lock size={20} />}
            <span className="text-xs uppercase tracking-tighter">{isAdmin ? "Admin Mode Active" : "Lock"}</span>
          </button>

          <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200">
            <button
              onClick={() => setActiveTab('input')}
              className={`px-6 py-2.5 rounded-xl flex items-center gap-2 font-bold transition-all ${activeTab === 'input' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <PlusCircle size={18} /> Input
            </button>
            <button
              onClick={() => { setActiveTab('report'); fetchJobs(); }}
              className={`px-6 py-2.5 rounded-xl flex items-center gap-2 font-bold transition-all ${activeTab === 'report' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <History size={18} /> Riwayat
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-7 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-5">
            <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600"><DollarSign size={28} /></div>
            <div>
              <p className="text-xs text-slate-400 font-black uppercase tracking-widest mb-1">Total Pemasukan</p>
              <p className="text-2xl font-black text-slate-800">Rp {stats.income.toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-white p-7 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-5">
            <div className="p-4 bg-blue-50 rounded-2xl text-blue-600"><Package size={28} /></div>
            <div>
              <p className="text-xs text-slate-400 font-black uppercase tracking-widest mb-1">Unit Terproduksi</p>
              <p className="text-2xl font-black text-slate-800">{stats.units.toLocaleString()} <span className="text-sm font-normal text-slate-400">Pcs</span></p>
            </div>
          </div>
          <div className="bg-white p-7 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-5">
            <div className="p-4 bg-purple-50 rounded-2xl text-purple-600"><Clock size={28} /></div>
            <div>
              <p className="text-xs text-slate-400 font-black uppercase tracking-widest mb-1">Runtime Mesin (Total)</p>
              <p className="text-2xl font-black text-slate-800">{stats.duration.toLocaleString()} <span className="text-sm font-normal text-slate-400">m</span></p>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'input' ? (
          <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
            <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">📝 Catat Antrian Baru</h2>
              <div className="flex gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-200"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-slate-200"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="p-10 grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-8">
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Tanggal Produksi</label>
                  <input type="date" value={formData.tanggal} onChange={e => setFormData({ ...formData, tanggal: e.target.value })} className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-yellow-400 transition-all font-bold text-slate-700" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Nama Operator</label>
                  <div className="relative">
                    <User size={18} className="absolute left-4 top-4.5 text-slate-300" />
                    <input type="text" required placeholder="Nama Staff" value={formData.operator} onChange={e => setFormData({ ...formData, operator: e.target.value })} className="w-full pl-12 p-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-yellow-400 transition-all" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Invoice Code</label>
                  <div className="relative">
                    <Hash size={18} className="absolute left-4 top-4.5 text-slate-300" />
                    <input type="text" placeholder="INV/CG/..." value={formData.invoice_code} onChange={e => setFormData({ ...formData, invoice_code: e.target.value })} className="w-full pl-12 p-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-yellow-400 transition-all" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Nama Pelanggan</label>
                  <input type="text" placeholder="PT / Individu" value={formData.customer} onChange={e => setFormData({ ...formData, customer: e.target.value })} className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-yellow-400 transition-all" />
                </div>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Deskripsi Barang & Marking</label>
                  <input type="text" placeholder="Detail Pekerjaan" value={formData.deskripsi} onChange={e => setFormData({ ...formData, deskripsi: e.target.value })} className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-yellow-400 transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Volume (Pcs)</label>
                    <input type="number" min="1" value={formData.jumlah_unit} onChange={e => setFormData({ ...formData, jumlah_unit: e.target.value })} className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-yellow-400 transition-all font-bold" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Durasi per Pcs (Menit)</label>
                    <input type="number" min="0" value={formData.durasi_menit} onChange={e => setFormData({ ...formData, durasi_menit: e.target.value })} className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-yellow-400 transition-all font-bold" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Harga Jasa/Pcs (IDR)</label>
                  <div className="relative">
                    <div className="absolute left-4 top-4.5 text-slate-400 font-bold text-sm">Rp</div>
                    <input type="number" value={formData.harga_per_unit} onChange={e => setFormData({ ...formData, harga_per_unit: e.target.value })} className="w-full pl-11 p-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-yellow-400 font-black text-slate-800" />
                  </div>
                </div>
                <div className="pt-6">
                  <button type="submit" className="w-full bg-slate-900 hover:bg-black text-white font-black py-5 rounded-2xl transition-all transform hover:-translate-y-1 flex items-center justify-center gap-3 shadow-2xl shadow-slate-200">
                    <Save size={22} /> Simpan ke Database
                  </button>
                </div>
              </div>
            </form>
          </div>
        ) : (
          <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
            <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-800">📜 Log Produksi</h2>
              <button onClick={exportCSV} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-2 transition-all">
                <Download size={16} /> Export CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-400 text-[10px] uppercase tracking-[0.2em] font-black">
                    <th className="px-8 py-5">Job Info</th>
                    <th className="px-8 py-5">Detail Klien</th>
                    <th className="px-8 py-5 text-center">Volume</th>
                    <th className="px-8 py-5 text-right">Total IDR</th>
                    <th className="px-8 py-5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan="5" className="p-16 text-center text-slate-400 text-sm italic font-medium">Menghubungkan ke server...</td></tr>
                  ) : jobs.length === 0 ? (
                    <tr><td colSpan="5" className="p-16 text-center text-slate-400 text-sm">Belum ada data produksi.</td></tr>
                  ) : (
                    jobs.map((job) => (
                      <tr key={job.id} className="hover:bg-slate-50/40 transition-colors group">
                        <td className="px-8 py-6">
                          <p className="text-sm font-black text-slate-800">{job.tanggal}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Op: {job.operator}</p>
                        </td>
                        <td className="px-8 py-6">
                          <p className="text-[10px] text-blue-600 font-black uppercase mb-1 tracking-wider">{job.customer || 'Pelanggan Umum'}</p>
                          <p className="text-xs text-slate-500 italic leading-relaxed">"{job.deskripsi}"</p>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <div className="bg-slate-100 inline-block px-3 py-1 rounded-lg">
                            <span className="text-xs font-black text-slate-700">{job.jumlah_unit} <span className="text-[9px] font-normal text-slate-400">Pcs</span></span>
                          </div>
                          <p className="text-[9px] text-slate-400 mt-1.5 font-bold uppercase tracking-tighter">@{job.durasi_menit}m/pcs</p>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <p className="text-sm font-black text-slate-900">{(job.total_penghasilan || 0).toLocaleString()}</p>
                          <p className="text-[9px] text-slate-400 font-bold tracking-tighter">@ {job.harga_per_unit.toLocaleString()}</p>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <div className="flex justify-center gap-2">
                            {isAdmin ? (
                              <>
                                <button
                                  onClick={() => setEditingJob(job)}
                                  className="p-2 text-blue-400 hover:text-blue-600 transition-all hover:scale-110"
                                  title="Edit"
                                >
                                  <Edit3 size={18} />
                                </button>
                                <button
                                  onClick={() => deleteJob(job.id)}
                                  className="p-2 text-red-300 hover:text-red-500 transition-all hover:scale-110"
                                  title="Hapus"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </>
                            ) : (
                              <Lock size={16} className="text-slate-200" />
                            )}
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

      {/* --- MODAL LOGIN ADMIN --- */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-yellow-400"></div>
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-slate-800">Admin Login</h3>
              <button onClick={() => { setShowLoginModal(false); setLoginError(""); }} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            <p className="text-xs text-slate-400 mb-8 font-medium leading-relaxed">Masukkan password owner untuk membuka akses modifikasi data produksi.</p>
            <form onSubmit={handleAdminLogin}>
              <div className="relative mb-4">
                <input
                  type="password"
                  autoFocus
                  value={passInput}
                  onChange={(e) => { setPassInput(e.target.value); if (loginError) setLoginError(""); }}
                  placeholder="Password"
                  className={`w-full p-5 bg-slate-50 rounded-2xl border-2 outline-none transition-all text-center font-black tracking-widest text-lg ${loginError ? 'border-red-400' : 'border-transparent focus:border-yellow-400'}`}
                />
              </div>

              {loginError && (
                <div className="flex items-center gap-2 text-red-500 text-[10px] font-bold mb-6 justify-center animate-pulse">
                  <AlertCircle size={14} /> {loginError}
                </div>
              )}

              <button type="submit" className="w-full bg-slate-900 hover:bg-black text-white font-black py-5 rounded-2xl shadow-xl shadow-slate-200 transition-all active:scale-95">
                Unlock System
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL EDIT JOB --- */}
      {editingJob && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-2xl w-full shadow-2xl my-8 relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-blue-500"></div>
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">🛠️ Revisi Produksi</h3>
              <button onClick={() => setEditingJob(null)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            <form onSubmit={handleUpdateJob} className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Tanggal</label>
                  <input type="date" value={editingJob.tanggal} onChange={(e) => setEditingJob({ ...editingJob, tanggal: e.target.value })} className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-400 font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Operator</label>
                  <input type="text" value={editingJob.operator} onChange={(e) => setEditingJob({ ...editingJob, operator: e.target.value })} className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Invoice</label>
                  <input type="text" value={editingJob.invoice_code} onChange={(e) => setEditingJob({ ...editingJob, invoice_code: e.target.value })} className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Customer</label>
                  <input type="text" value={editingJob.customer} onChange={(e) => setEditingJob({ ...editingJob, customer: e.target.value })} className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Deskripsi</label>
                  <input type="text" value={editingJob.deskripsi} onChange={(e) => setEditingJob({ ...editingJob, deskripsi: e.target.value })} className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Volume</label>
                    <input type="number" value={editingJob.jumlah_unit} onChange={(e) => setEditingJob({ ...editingJob, jumlah_unit: e.target.value })} className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-400 font-bold" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Durasi per Pcs (m)</label>
                    <input type="number" value={editingJob.durasi_menit} onChange={(e) => setEditingJob({ ...editingJob, durasi_menit: e.target.value })} className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-400 font-bold" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Harga Jasa</label>
                  <input type="number" value={editingJob.harga_per_unit} onChange={(e) => setEditingJob({ ...editingJob, harga_per_unit: e.target.value })} className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-400 font-black" />
                </div>
                <div className="pt-6 flex gap-4">
                  <button type="button" onClick={() => setEditingJob(null)} className="flex-1 bg-slate-100 text-slate-600 font-bold py-5 rounded-2xl hover:bg-slate-200 transition-all uppercase text-[10px] tracking-widest">Batal</button>
                  <button type="submit" className="flex-1 bg-blue-600 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-xl shadow-blue-100"><Check size={20} /> Update</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto mt-12 text-center text-slate-300 text-[9px] font-black uppercase tracking-[0.5em] opacity-50">
        CG Digital Print Karawang • Cloud Control Hub
      </div>
    </div>
  );
};

export default App;