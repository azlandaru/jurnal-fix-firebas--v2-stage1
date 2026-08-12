import React, { useState } from 'react';
import { User, Jurnal, Administrasi, ActivityLog } from '../types';
import { 
  Search, ShieldCheck, Clock, Calendar, Users, CheckCircle2, 
  AlertTriangle, RefreshCw, FileText, BookOpen, UserCheck, ArrowUpRight,
  PlusCircle, Edit, Trash2, LogIn, Settings, BarChart3,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

interface RiwayatAktivitasMenuProps {
  user: User;
  users: User[];
  jurnal: Jurnal[];
  administrasi: Administrasi[];
  activityLogs: ActivityLog[];
  onClearLogs?: () => void;
}

export const RiwayatAktivitasMenu: React.FC<RiwayatAktivitasMenuProps> = ({
  user,
  users,
  jurnal,
  administrasi,
  activityLogs,
  onClearLogs
}) => {
  const [activeTab, setActiveTab] = useState<'logs' | 'kepatuhan'>('logs');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterAksi, setFilterAksi] = useState('');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25); // default logs count is higher, so 25 is better!

  // Reset page to 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterRole, filterAksi]);

  // Helper to get week range string
  const getWeekRangeString = (dateStr: string): string => {
    const d = new Date(dateStr);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const startDay = monday.getDate();
    const startMonth = months[monday.getMonth()];
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const endDay = sunday.getDate();
    const endMonth = months[sunday.getMonth()];

    return `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
  };

  // Helper to calculate weekly journal inputs for the bar chart
  const getWeeklyJournalInputs = () => {
    const weekGroups: { [key: string]: { count: number; timestamp: number } } = {};

    jurnal.forEach(j => {
      if (!j.tanggal) return;
      const weekStr = getWeekRangeString(j.tanggal);
      const timestamp = new Date(j.tanggal).getTime();

      if (!weekGroups[weekStr]) {
        weekGroups[weekStr] = { count: 0, timestamp };
      }
      weekGroups[weekStr].count++;
      if (timestamp < weekGroups[weekStr].timestamp) {
        weekGroups[weekStr].timestamp = timestamp;
      }
    });

    return Object.entries(weekGroups)
      .map(([week, vals]) => ({
        week,
        'Jumlah Jurnal': vals.count,
        timestamp: vals.timestamp
      }))
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-8); // Show last 8 weeks
  };

  // 1. Get List of Teachers to Audit
  const teachers = users.filter(u => u.role === 'guru' || u.role === 'wali_kelas');

  // 2. Audit compliance data for each teacher
  const auditData = teachers.map(teacher => {
    // Last Jurnal Entry
    const teacherJurnals = jurnal
      .filter(j => j.nama_guru === teacher.nama_lengkap)
      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
    const lastJurnal = teacherJurnals.length > 0 ? teacherJurnals[0].tanggal : null;

    // Last Administrasi Entry
    const teacherFiles = administrasi
      .filter(a => a.nama_guru === teacher.nama_lengkap)
      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
    const lastAdmin = teacherFiles.length > 0 ? teacherFiles[0].tanggal : null;

    const hasFilledJurnal = teacherJurnals.length > 0;
    const hasUploadedAdmin = teacherFiles.length > 0;

    return {
      teacher,
      lastJurnal,
      lastAdmin,
      jurnalCount: teacherJurnals.length,
      adminCount: teacherFiles.length,
      hasFilledJurnal,
      hasUploadedAdmin,
      isCompliant: hasFilledJurnal && hasUploadedAdmin
    };
  });

  // Calculate overall compliance stats
  const totalTeachers = teachers.length;
  const compliantJurnalCount = auditData.filter(d => d.hasFilledJurnal).length;
  const compliantAdminCount = auditData.filter(d => d.hasUploadedAdmin).length;

  const complianceJurnalPercent = totalTeachers > 0 
    ? Math.round((compliantJurnalCount / totalTeachers) * 100) 
    : 100;
  
  const complianceAdminPercent = totalTeachers > 0 
    ? Math.round((compliantAdminCount / totalTeachers) * 100) 
    : 100;

  // Filter logs
  const filteredLogs = activityLogs.filter(log => {
    const matchSearch = 
      log.nama_user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.aksi.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.rincian.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchRole = filterRole ? log.role?.toLowerCase() === filterRole.toLowerCase() : true;
    const matchAksi = filterAksi ? log.aksi === filterAksi : true;

    return matchSearch && matchRole && matchAksi;
  });

  // Paginated Logs Logic
  const totalItems = filteredLogs.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const safeCurrentPage = Math.min(currentPage, Math.max(1, totalPages));
  
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

  // List unique actions for dropdown filter
  const uniqueActions = [...new Set(activityLogs.map(l => l.aksi))];

  // Formatting date helper
  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return '-';
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return '-';
    }
  };

  // Export to CSV helper for admin archiving
  const exportToCSV = () => {
    if (activityLogs.length === 0) {
      alert("Tidak ada log aktivitas untuk diekspor.");
      return;
    }
    
    // Header row
    const headers = ["ID Log", "Tanggal & Waktu", "Nama Pengguna", "Peran", "Aksi / Tindakan", "Rincian Aktivitas"];
    
    // Data rows
    const rows = activityLogs.map(log => [
      log.id_log,
      formatDate(log.timestamp),
      log.nama_user,
      log.role.toUpperCase(),
      log.aksi,
      log.rincian
    ]);
    
    // Combine with proper escaping
    const csvContent = [
      headers.join(","),
      ...rows.map(row => 
        row.map(value => {
          const escaped = String(value).replace(/"/g, '""');
          return `"${escaped}"`;
        }).join(",")
      )
    ].join("\n");
    
    // Download as file with UTF-8 BOM
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `audit_log_edu_santri_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <span className="bg-rose-100 text-rose-700 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">Admin</span>;
      case 'wali_kelas':
        return <span className="bg-teal-100 text-teal-700 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">Wali Kelas</span>;
      case 'guru':
        return <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">Guru</span>;
      case 'pengawas':
        return <span className="bg-purple-100 text-purple-700 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">Pengawas</span>;
      case 'wali':
        return <span className="bg-slate-100 text-slate-700 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">Wali</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">{role}</span>;
    }
  };

  const getActionBadge = (aksi: string) => {
    const actLower = aksi.toLowerCase();
    
    // Category 1: Deletion / Removal
    if (actLower.includes('hapus') || actLower.includes('delete') || actLower.includes('mengeluarkan')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200/50 font-black text-[10px] uppercase tracking-wider shadow-3xs">
          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
          {aksi}
        </span>
      );
    }
    
    // Category 2: Update / Edit / Modify
    if (actLower.includes('ubah') || actLower.includes('mengubah') || actLower.includes('edit')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/50 font-black text-[10px] uppercase tracking-wider shadow-3xs">
          <Edit className="w-3.5 h-3.5 text-amber-500" />
          {aksi}
        </span>
      );
    }
    
    // Category 3: Creation / Addition / Logging / Generation
    if (actLower.includes('tambah') || actLower.includes('mencatat') || actLower.includes('mengisi') || actLower.includes('unggah') || actLower.includes('buat') || actLower.includes('generate')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/50 font-black text-[10px] uppercase tracking-wider shadow-3xs">
          <PlusCircle className="w-3.5 h-3.5 text-emerald-500" />
          {aksi}
        </span>
      );
    }
    
    // Category 4: Login / Authentication
    if (actLower.includes('login') || actLower.includes('masuk') || actLower.includes('auth')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200/50 font-black text-[10px] uppercase tracking-wider shadow-3xs">
          <LogIn className="w-3.5 h-3.5 text-indigo-500" />
          {aksi}
        </span>
      );
    }
    
    // Category 5: Settings / Config / System / Sync
    if (actLower.includes('sinkronisasi') || actLower.includes('setelan') || actLower.includes('system') || actLower.includes('config')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-teal-50 text-teal-700 border border-teal-200/50 font-black text-[10px] uppercase tracking-wider shadow-3xs">
          <Settings className="w-3.5 h-3.5 text-teal-500" />
          {aksi}
        </span>
      );
    }
    
    // Default fallback
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-50 text-slate-700 border border-slate-200/50 font-black text-[10px] uppercase tracking-wider shadow-3xs">
        <FileText className="w-3.5 h-3.5 text-slate-500" />
        {aksi}
      </span>
    );
  };

  const renderSyncStatusBadge = (status?: string) => {
    switch (status) {
      case 'Berhasil':
        return (
          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/50 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            SINKRON
          </span>
        );
      case 'Gagal':
        return (
          <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-200/50 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
            GAGAL
          </span>
        );
      case 'Proses':
        return (
          <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200/50 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce" />
            PROSES
          </span>
        );
      case 'Tidak Aktif':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-400 border border-slate-100 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
            OFFLINE
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto" id="riwayat_aktivitas_menu">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-5 gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
            <Clock className="text-teal-600 w-8 h-8" /> Riwayat Aktivitas &amp; Audit Kepatuhan
          </h2>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Sistem pencatatan log aktivitas mandiri dan audit kedisiplinan guru dalam mengunggah jurnal serta perangkat administrasi.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {user.role === 'admin' && (
            <button
              onClick={exportToCSV}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-md border border-emerald-500"
            >
              📥 Ekspor ke CSV
            </button>
          )}

          {user.role === 'admin' && onClearLogs && activityLogs.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm("Apakah Anda yakin ingin mengosongkan seluruh riwayat aktivitas audit?")) {
                  onClearLogs();
                }
              }}
              className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-xs py-2.5 px-4 rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-rose-200"
            >
              Kosongkan Log
            </button>
          )}
        </div>
      </div>

      {/* Statistics Panels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <span className="p-3 bg-teal-50 text-teal-600 rounded-2xl">
            <Clock className="w-6 h-6" />
          </span>
          <div>
            <p className="text-xs text-slate-400 font-black uppercase tracking-wider">Total Tindakan Log</p>
            <h4 className="text-2xl font-black text-slate-800 mt-0.5">{activityLogs.length}</h4>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <span className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <Users className="w-6 h-6" />
          </span>
          <div>
            <p className="text-xs text-slate-400 font-black uppercase tracking-wider">Guru Di-Audit</p>
            <h4 className="text-2xl font-black text-slate-800 mt-0.5">{totalTeachers} Orang</h4>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <span className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <BookOpen className="w-6 h-6" />
          </span>
          <div>
            <p className="text-xs text-slate-400 font-black uppercase tracking-wider">Kepatuhan Jurnal</p>
            <div className="flex items-baseline gap-2">
              <h4 className="text-2xl font-black text-slate-800 mt-0.5">{complianceJurnalPercent}%</h4>
              <span className="text-[10px] font-bold text-slate-400">({compliantJurnalCount}/{totalTeachers})</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <span className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <FileText className="w-6 h-6" />
          </span>
          <div>
            <p className="text-xs text-slate-400 font-black uppercase tracking-wider">Kepatuhan Admin</p>
            <div className="flex items-baseline gap-2">
              <h4 className="text-2xl font-black text-slate-800 mt-0.5">{complianceAdminPercent}%</h4>
              <span className="text-[10px] font-bold text-slate-400">({compliantAdminCount}/{totalTeachers})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Control */}
      <div className="flex border-b border-slate-100 gap-1 p-1 bg-slate-50 rounded-2xl max-w-sm">
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex-1 py-3 text-center rounded-xl font-bold text-xs transition cursor-pointer ${
            activeTab === 'logs'
              ? 'bg-white text-teal-700 shadow-sm font-extrabold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Semua Log Aktivitas
        </button>
        <button
          onClick={() => setActiveTab('kepatuhan')}
          className={`flex-1 py-3 text-center rounded-xl font-bold text-xs transition cursor-pointer ${
            activeTab === 'kepatuhan'
              ? 'bg-white text-teal-700 shadow-sm font-extrabold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Kepatuhan Guru
        </button>
      </div>

      {activeTab === 'logs' ? (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Cari nama pengguna, tindakan, rincian log..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-teal-400 bg-slate-50/50 outline-none"
              />
            </div>

            <div className="relative">
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="w-full border border-slate-200 pl-4 pr-10 py-3 rounded-2xl text-xs font-semibold bg-slate-50 text-slate-700 outline-none focus:ring-2 focus:ring-teal-400 appearance-none cursor-pointer"
              >
                <option value="">👥 Semua Peran (Filter)</option>
                <option value="admin">🛡️ Admin</option>
                <option value="wali_kelas">🎓 Wali Kelas</option>
                <option value="guru">📝 Guru Pengajar</option>
                <option value="pengawas">👁️ Pengawas</option>
                <option value="wali">🏡 Wali Santri</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                </svg>
              </div>
            </div>

            <div className="relative">
              <select
                value={filterAksi}
                onChange={(e) => setFilterAksi(e.target.value)}
                className="w-full border border-slate-200 pl-4 pr-10 py-3 rounded-2xl text-xs font-semibold bg-slate-50 text-slate-700 outline-none focus:ring-2 focus:ring-teal-400 appearance-none cursor-pointer"
              >
                <option value="">⚡ Semua Tindakan</option>
                {uniqueActions.map(act => (
                  <option key={act} value={act}>{act}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Logs Table */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-wider w-[180px]">Waktu Log</th>
                    <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-wider w-[180px]">Pengguna</th>
                    <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-wider w-[120px]">Peran</th>
                    <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-wider w-[180px]">Aksi / Tindakan</th>
                    <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-wider w-[150px]">Sinkronisasi Sheets</th>
                    <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Rincian Aktivitas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        <Clock className="w-10 h-10 mx-auto text-slate-200 mb-2" />
                        Belum ada data log aktivitas yang cocok atau direkam.
                      </td>
                    </tr>
                  ) : (
                    paginatedLogs.map((log) => (
                      <tr key={log.id_log} className="hover:bg-slate-50/40 transition">
                        <td className="p-4 font-mono text-slate-400">{formatDate(log.timestamp)}</td>
                        <td className="p-4 font-extrabold text-slate-700">{log.nama_user}</td>
                        <td className="p-4">{getRoleBadge(log.role)}</td>
                        <td className="p-4">
                          {getActionBadge(log.aksi)}
                        </td>
                        <td className="p-4">
                          {renderSyncStatusBadge(log.sync_status)}
                        </td>
                        <td className="p-4 text-slate-600 font-medium leading-relaxed">{log.rincian}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {filteredLogs.length > 0 && (
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50 p-5 border-t border-slate-100">
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-bold">
                  <span>Tampilkan</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="border border-slate-200 bg-white rounded-lg py-1.5 px-2.5 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {[10, 25, 50, 100, 250].map((size) => (
                      <option key={size} value={size}>
                        {size} entri
                      </option>
                    ))}
                  </select>
                  <span>
                    Menampilkan <span className="text-slate-800 font-black">{totalItems === 0 ? 0 : startIndex + 1}</span> s/d{' '}
                    <span className="text-slate-800 font-black">{Math.min(endIndex, totalItems)}</span> dari{' '}
                    <span className="text-indigo-600 font-black">{totalItems}</span> log aktivitas
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(1)}
                    disabled={safeCurrentPage === 1}
                    className="p-2 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer text-slate-600"
                    title="Halaman Pertama"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={safeCurrentPage === 1}
                    className="p-2 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer text-slate-600"
                    title="Halaman Sebelumnya"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {/* Page number button groups */}
                  {(() => {
                    const pages: (number | string)[] = [];
                    const maxVisible = 5;
                    
                    if (totalPages <= maxVisible) {
                      for (let i = 1; i <= totalPages; i++) pages.push(i);
                    } else {
                      // Always show first page
                      pages.push(1);
                      
                      // Calculate middle range
                      let start = Math.max(2, safeCurrentPage - 1);
                      let end = Math.min(totalPages - 1, safeCurrentPage + 1);
                      
                      if (safeCurrentPage <= 2) {
                        end = 4;
                      } else if (safeCurrentPage >= totalPages - 1) {
                        start = totalPages - 3;
                      }
                      
                      if (start > 2) {
                        pages.push('...');
                      }
                      
                      for (let i = start; i <= end; i++) {
                        pages.push(i);
                      }
                      
                      if (end < totalPages - 1) {
                        pages.push('...');
                      }
                      
                      // Always show last page
                      pages.push(totalPages);
                    }

                    return pages.map((page, idx) => {
                      if (page === '...') {
                        return (
                          <span key={`ellipsis-${idx}`} className="px-2.5 py-1.5 text-xs text-slate-400 font-bold select-none">
                            ...
                          </span>
                        );
                      }

                      const isCurrent = page === safeCurrentPage;
                      return (
                        <button
                          key={`page-${page}`}
                          type="button"
                          onClick={() => setCurrentPage(Number(page))}
                          className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer border bg-white
                            ${isCurrent
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                              : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                            }
                          `}
                        >
                          {page}
                        </button>
                      );
                    });
                  })()}

                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={safeCurrentPage === totalPages}
                    className="p-2 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer text-slate-600"
                    title="Halaman Berikutnya"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={safeCurrentPage === totalPages}
                    className="p-2 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer text-slate-600"
                    title="Halaman Terakhir"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Kepatuhan Teachers Audit */
        <div className="space-y-6">
          <div className="bg-amber-50/40 border border-amber-100 p-5 rounded-3xl flex gap-4 items-start">
            <span className="p-2 bg-amber-100 rounded-xl text-amber-700">
              <AlertTriangle className="w-5 h-5" />
            </span>
            <div className="text-left">
              <h5 className="font-black text-slate-800 text-sm">Prinsip Kepatuhan &amp; Disiplin Administrasi</h5>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed font-medium">
                Guru dinyatakan **Patuh (Compliant)** apabila telah minimal mengisi 1 entri Jurnal Pembelajaran dan telah mengunggah minimal 1 berkas Perangkat Administrasi Mengajar di database lokal / tersinkronisasi.
              </p>
            </div>
          </div>

          {/* Chart: Jumlah Input Jurnal per Minggu */}
          <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-slate-200/50 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-teal-600 animate-pulse" />
                  Grafik Batang Input Jurnal per Minggu (Audit Pengawas)
                </h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">
                  Memantau kedisiplinan guru berdasarkan frekuensi pengisian jurnal harian setiap minggu (8 minggu terakhir)
                </p>
              </div>
              <div className="bg-teal-50 border border-teal-100 px-3.5 py-1.5 rounded-2xl flex items-center gap-2 shrink-0">
                <span className="w-2 h-2 rounded-full bg-teal-600 animate-pulse"></span>
                <span className="text-[10px] font-black text-teal-800 uppercase tracking-wider">
                  Total: {jurnal.length} Jurnal
                </span>
              </div>
            </div>

            <div className="bg-slate-50/40 p-5 rounded-2xl border border-slate-100 min-h-[320px] flex flex-col justify-between">
              {getWeeklyJournalInputs().length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2 font-bold text-xs">
                  <span>📊</span>
                  <span>Belum ada data jurnal untuk dipetakan secara mingguan.</span>
                </div>
              ) : (
                <div className="w-full h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={getWeeklyJournalInputs()}
                      margin={{ top: 15, right: 15, left: -20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="week" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} 
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} 
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(13, 148, 136, 0.04)' }}
                        contentStyle={{
                          background: '#fff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          fontSize: '11px',
                          fontWeight: 'bold',
                        }}
                      />
                      <Legend 
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} 
                      />
                      <Bar 
                        dataKey="Jumlah Jurnal" 
                        fill="#0d9488" 
                        radius={[4, 4, 0, 0]} 
                        barSize={30} 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Nama Guru</th>
                    <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-wider w-[100px]">Peran</th>
                    <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center w-[120px]">Jurnal (KBM)</th>
                    <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center w-[120px]">Administrasi</th>
                    <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-wider w-[180px]">Terakhir Isi Jurnal</th>
                    <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-wider w-[180px]">Terakhir Unggah File</th>
                    <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center w-[130px]">Status Kepatuhan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {auditData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        Tidak ada guru yang terdaftar untuk dilakukan audit kepatuhan.
                      </td>
                    </tr>
                  ) : (
                    auditData.map((data, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/40 transition">
                        <td className="p-4 font-extrabold text-slate-800">{data.teacher.nama_lengkap}</td>
                        <td className="p-4">{getRoleBadge(data.teacher.role)}</td>
                        <td className="p-4 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black ${
                            data.jurnalCount > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {data.jurnalCount} entri
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black ${
                            data.adminCount > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {data.adminCount} berkas
                          </span>
                        </td>
                        <td className="p-4 font-mono text-slate-500 font-medium">
                          {data.lastJurnal ? formatDate(data.lastJurnal) : <span className="text-rose-400 font-bold font-sans">Belum Mengisi</span>}
                        </td>
                        <td className="p-4 font-mono text-slate-500 font-medium">
                          {data.lastAdmin ? formatDate(data.lastAdmin) : <span className="text-rose-400 font-bold font-sans">Belum Mengunggah</span>}
                        </td>
                        <td className="p-4 text-center">
                          {data.isCompliant ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 font-extrabold text-[10px]">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> PATUH
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-100 font-extrabold text-[10px]">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> KURANG DISIPLIN
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
