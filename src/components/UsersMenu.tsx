import React, { useState } from 'react';
import { User, Siswa } from '../types';
import { Search, UserPlus, Trash2, Power, Eye, Users, ShieldCheck, Key, Download, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface UsersMenuProps {
  user: User;
  siswa: Siswa[];
  users: User[];
  onAddUser: (u: User) => Promise<void>;
  onEditUser: (u: User) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
  onToggleUserStatus: (id: string, status: 'Aktif' | 'Nonaktif') => Promise<void>;
  onBatchGenerateWali: () => Promise<void>;
  onSingleGenerateWali?: (idSiswa: string, namaSiswa: string) => Promise<void>;
}

export const UsersMenu: React.FC<UsersMenuProps> = ({
  user,
  siswa,
  users,
  onAddUser,
  onEditUser,
  onDeleteUser,
  onToggleUserStatus,
  onBatchGenerateWali,
  onSingleGenerateWali
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Reset page to 1 when search term changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form states (Add)
  const [newNama, setNewNama] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'guru' | 'wali_kelas' | 'pengawas' | 'wali'>('guru');
  const [mapel, setMapel] = useState('');
  const [kelasWali, setKelasWali] = useState('');
  const [kelasAjar, setKelasAjar] = useState<string[]>([]);
  const [idSiswa, setIdSiswa] = useState(''); // singular or comma separated for wali

  // Form states (Edit)
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editMapel, setEditMapel] = useState('');
  const [editKelasWali, setEditKelasWali] = useState('');
  const [editKelasAjar, setEditKelasAjar] = useState<string[]>([]);
  const [editIdSiswa, setEditIdSiswa] = useState('');

  const parseIdReferensi = (role: string, refStr: string) => {
    let parsedMapel = '';
    let parsedKelasWali = '';
    let parsedKelasAjar: string[] = [];
    let parsedIdSiswa = '';

    if (!refStr) {
      return { parsedMapel, parsedKelasWali, parsedKelasAjar, parsedIdSiswa };
    }

    const parts = refStr.split('|');
    parts.forEach(part => {
      if (part.startsWith('MAPEL:')) {
        parsedMapel = part.replace('MAPEL:', '');
      } else if (part.startsWith('WALI:')) {
        parsedKelasWali = part.replace('WALI:', '');
      } else if (part.startsWith('AJAR:')) {
        parsedKelasAjar = part.replace('AJAR:', '').split(',').filter(Boolean);
      }
    });

    if (role === 'wali') {
      parsedIdSiswa = refStr;
    }

    return { parsedMapel, parsedKelasWali, parsedKelasAjar, parsedIdSiswa };
  };

  const handleToggleEditAjarKelas = (kls: string, checked: boolean) => {
    if (checked) {
      setEditKelasAjar(prev => [...prev, kls]);
    } else {
      setEditKelasAjar(prev => prev.filter(x => x !== kls));
    }
  };

  const isClassWali = user.role === 'wali_kelas';

  const getWaliClass = () => {
    if (user.role === 'wali_kelas' && user.id_referensi) {
      const w = user.id_referensi.split('|').find(x => x.startsWith('WALI:'));
      if (w) return w.replace('WALI:', '');
    }
    return null;
  };

  const currentWaliClass = getWaliClass();

  // Filtered accounts list
  const getFilteredUsers = () => {
    let list = users || [];
    if (isClassWali) {
      // Teachers can only view parent credentials of their own class students
      const wC = currentWaliClass;
      if (wC) {
        const classStudents = siswa.filter(s => s.kelas === wC).map(s => s.id_siswa);
        list = users.filter(u => u.role === 'wali' && classStudents.some(id => u.id_referensi && u.id_referensi.includes(id)));
      } else {
        list = [];
      }
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return list.filter(u =>
        u.nama_lengkap.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
      );
    }
    return list;
  };

  const filteredUsers = getFilteredUsers();

  // Paginated Users Logic
  const totalItems = filteredUsers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const safeCurrentPage = Math.min(currentPage, Math.max(1, totalPages));
  
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);
  const allAvailableClasses: string[] = [...new Set(siswa.map(s => s.kelas))].sort() as string[];

  const handleToggleAjarKelas = (kls: string, checked: boolean) => {
    if (checked) {
      setKelasAjar(prev => [...prev, kls]);
    } else {
      setKelasAjar(prev => prev.filter(x => x !== kls));
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNama || !newUsername || !newPassword) return;

    setLoading(true);
    try {
      let refStr = '';
      if (newRole === 'wali_kelas') {
        if (!kelasWali || !mapel || kelasAjar.length === 0) {
          alert("Data Wali Kelas, Mapel, dan Kelas Diajar harus diisi!");
          setLoading(false);
          return;
        }
        refStr = `WALI:${kelasWali}|AJAR:${kelasAjar.join(',')}|MAPEL:${mapel}`;
      } else if (newRole === 'guru') {
        if (!mapel || kelasAjar.length === 0) {
          alert("Mata Pelajaran dan Kelas Diajar harus diisi!");
          setLoading(false);
          return;
        }
        refStr = `AJAR:${kelasAjar.join(',')}|MAPEL:${mapel}`;
      } else if (newRole === 'wali') {
        if (!idSiswa) {
          alert("Target ID Siswa (anak) wajib diisi!");
          setLoading(false);
          return;
        }
        refStr = idSiswa.replace(/\s+/g, ''); // strip spaces
      }

      const payload: User = {
        id_user: 'U' + Date.now(),
        username: newUsername.trim().toLowerCase(),
        password: newPassword,
        role: newRole,
        nama_lengkap: newNama.trim(),
        id_referensi: refStr,
        status: 'Aktif'
      };

      await onAddUser(payload);
      setIsModalOpen(false);
      setNewNama('');
      setNewUsername('');
      setNewPassword('');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser || !editUser.nama_lengkap || !editUser.username || !editUser.password) return;
    setLoading(true);
    try {
      let refStr = editUser.id_referensi || '';
      if (editUser.role === 'wali_kelas') {
        if (!editKelasWali || !editMapel || editKelasAjar.length === 0) {
          alert("Data Wali Kelas, Mapel, dan Kelas Diajar harus diisi!");
          setLoading(false);
          return;
        }
        refStr = `WALI:${editKelasWali}|AJAR:${editKelasAjar.join(',')}|MAPEL:${editMapel}`;
      } else if (editUser.role === 'guru') {
        if (!editMapel || editKelasAjar.length === 0) {
          alert("Mata Pelajaran dan Kelas Diajar harus diisi!");
          setLoading(false);
          return;
        }
        refStr = `AJAR:${editKelasAjar.join(',')}|MAPEL:${editMapel}`;
      } else if (editUser.role === 'wali') {
        if (!editIdSiswa) {
          alert("Target ID Siswa (anak) wajib diisi!");
          setLoading(false);
          return;
        }
        refStr = editIdSiswa.replace(/\s+/g, '');
      } else {
        refStr = '';
      }

      await onEditUser({
        ...editUser,
        id_referensi: refStr
      });
      setIsEditModalOpen(false);
      setEditUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExportUsersCSV = () => {
    // Define CSV columns
    const headers = ['ID User', 'Username', 'Nama Lengkap', 'Peran Akses', 'Referensi Penargetan', 'Status'];
    
    // Get list of users (if admin, exports all; otherwise exports filtered)
    const dataList = users || [];
    const rows = dataList.map(u => [
      u.id_user,
      u.username,
      u.nama_lengkap,
      u.role,
      u.id_referensi || '',
      u.status
    ]);
    
    // Convert to CSV string, wrapping values in double-quotes and escaping existing ones
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\r\n');

    // Create file blob with UTF-8 BOM to ensure compatibility with Microsoft Excel
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Daftar_Pengguna_Sistem_E-Journal_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadQR = async () => {
    const element = document.getElementById('qr-code-download-container');
    if (!element) return;

    try {
      // Use html2canvas to capture the QR code container area only
      const canvas = await html2canvas(element, {
        useCORS: true,
        backgroundColor: '#ffffff',
        scale: 3, // scale up for high-quality printing
      });
      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imgData;
      link.download = `QRCode_Akses_MTs_Ibad_Ar_Rahman.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('html2canvas failed, falling back to direct image download:', err);
      // Fallback: download the raw QR code directly
      try {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(window.location.origin)}`;
        const response = await fetch(qrUrl);
        if (!response.ok) throw new Error('Network response was not ok');
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `QRCode_Akses_MTs_Ibad_Ar_Rahman.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      } catch (fallbackErr) {
        // Ultimate fallback
        window.open(`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(window.location.origin)}`, '_blank');
      }
    }
  };

  const handleExportClassWaliCSV = () => {
    if (!currentWaliClass) return;
    const classSiswa = siswa.filter(s => s.kelas === currentWaliClass && !s.kelas.includes('Lulus') && !s.kelas.includes('Alumni'));
    
    const headers = ['No', 'Nama Santri', 'ID Santri', 'Username Wali Santri', 'Password Wali Santri', 'Status Akun'];
    const rows = classSiswa.map((s, idx) => {
      const parentAcc = users.find(
        u => u.role === 'wali' && u.id_referensi && u.id_referensi.split(',').includes(s.id_siswa)
      );
      return [
        idx + 1,
        s.nama_siswa,
        s.id_siswa,
        parentAcc ? parentAcc.username : 'Belum Dibuat',
        parentAcc ? parentAcc.password || '-' : 'Belum Dibuat',
        parentAcc ? parentAcc.status : 'Belum Dibuat'
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\r\n');

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Daftar_Akun_Wali_Santri_Kelas_${currentWaliClass}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportClassWaliPDF = () => {
    if (!currentWaliClass) return;
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(16);
    doc.setFont('Helvetica', 'bold');
    doc.text('MTs IBAD AR RAHMAN', 14, 20);
    
    doc.setFontSize(11);
    doc.setFont('Helvetica', 'normal');
    doc.text(`DAFTAR AKUN LOGIN WALI SANTRI - KELAS ${currentWaliClass.toUpperCase()}`, 14, 27);
    doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, 14, 33);
    
    // Draw line
    doc.setLineWidth(0.5);
    doc.line(14, 37, 196, 37);

    const classSiswa = siswa.filter(s => s.kelas === currentWaliClass && !s.kelas.includes('Lulus') && !s.kelas.includes('Alumni'));
    const tableBody = classSiswa.map((s, idx) => {
      const parentAcc = users.find(
        u => u.role === 'wali' && u.id_referensi && u.id_referensi.split(',').includes(s.id_siswa)
      );
      return [
        idx + 1,
        s.nama_siswa,
        s.id_siswa,
        parentAcc ? parentAcc.username : 'Belum Dibuat',
        parentAcc ? parentAcc.password || '-' : 'Belum Dibuat',
        parentAcc ? parentAcc.status : 'Belum Dibuat'
      ];
    });

    autoTable(doc, {
      startY: 42,
      head: [['No', 'Nama Santri', 'ID Santri', 'Username Wali', 'Password', 'Status']],
      body: tableBody,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] }, // indigo-600
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 50 },
        2: { cellWidth: 30 },
        3: { cellWidth: 40 },
        4: { cellWidth: 30 },
        5: { cellWidth: 20 },
      }
    });

    doc.save(`Akun_Wali_Santri_Kelas_${currentWaliClass}.pdf`);
  };

  const handleExportSingleWaliPDF = (namaSiswa: string, idSiswa: string, parentAcc: User) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [100, 150] // Custom card size: 100mm x 150mm
    });

    // Outer border
    doc.setDrawColor(79, 70, 229); // Indigo
    doc.setLineWidth(1);
    doc.rect(5, 5, 90, 140);

    // Card Header
    doc.setFontSize(12);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('KARTU AKSES WALI SANTRI', 50, 18, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text('MTs IBAD AR RAHMAN', 50, 24, { align: 'center' });

    doc.setLineWidth(0.3);
    doc.setDrawColor(226, 232, 240);
    doc.line(10, 28, 90, 28);

    // Body Info
    doc.setFontSize(9);
    doc.setFont('Helvetica', 'normal');
    doc.text('Nama Santri:', 12, 38);
    doc.setFont('Helvetica', 'bold');
    doc.text(namaSiswa, 12, 43);

    doc.setFont('Helvetica', 'normal');
    doc.text('ID Santri:', 12, 51);
    doc.setFont('Helvetica', 'bold');
    doc.text(idSiswa, 12, 56);

    doc.setFont('Helvetica', 'normal');
    doc.text('Kelas:', 12, 64);
    doc.setFont('Helvetica', 'bold');
    doc.text(currentWaliClass || '-', 12, 69);

    // Credentials Box
    doc.setFillColor(248, 250, 252);
    doc.rect(10, 75, 80, 32, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(10, 75, 80, 32, 'S');

    doc.setFontSize(9);
    doc.setTextColor(79, 70, 229);
    doc.setFont('Helvetica', 'bold');
    doc.text('INFORMASI LOGIN WALI', 50, 81, { align: 'center' });

    doc.setTextColor(30, 41, 59);
    doc.setFont('Helvetica', 'normal');
    doc.text('Username:', 14, 91);
    doc.setFont('Helvetica', 'bold');
    doc.text(parentAcc.username, 34, 91);

    doc.setFont('Helvetica', 'normal');
    doc.text('Password:', 14, 99);
    doc.setFont('Helvetica', 'bold');
    doc.text(parentAcc.password || '-', 34, 99);

    // Footer/Instruction
    doc.setTextColor(100, 116, 139);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('Gunakan akun di atas untuk login ke aplikasi E-Journal.', 50, 115, { align: 'center' });
    doc.text('Simpan informasi ini secara rahasia dan aman.', 50, 120, { align: 'center' });

    doc.setTextColor(30, 41, 59);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Wali Kelas:', 50, 130, { align: 'center' });
    doc.text(user.nama_lengkap, 50, 135, { align: 'center' });

    doc.save(`Akses_Wali_${namaSiswa.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 mb-1 flex items-center gap-2">
            🔑 Kelola Hak Akses &amp; Akun
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            Atur dan monitor kredensial keamanan pengguna sistem.
          </p>
        </div>
      </div>

      {user.role === 'admin' && (
        <div className="bg-gradient-to-r from-slate-800 to-indigo-950 p-6 rounded-[2rem] text-white shadow-lg flex flex-col md:flex-row items-center gap-6 justify-between border border-indigo-900/35">
          <div className="space-y-2 max-w-xl text-left">
            <div className="bg-indigo-500/25 border border-indigo-400/30 text-indigo-200 font-black text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider inline-block">
              Fitur Baru Admin
            </div>
            <h3 className="text-xl font-black">QR Code Akses Guru &amp; Staff</h3>
            <p className="text-xs text-indigo-200/90 font-medium leading-relaxed">
              Guru Dewan Madrasah dapat memindai QR Code ini menggunakan smartphone untuk langsung membuka aplikasi E-Journal MTs Ibad Ar Rahman tanpa perlu mengetikkan URL web secara manual. Anda dapat membagikan atau mencetak lembaran ini untuk ditempel di ruang guru.
            </p>
            <div className="pt-3 flex flex-wrap gap-2">
              <button
                onClick={handleDownloadQR}
                className="bg-white hover:bg-slate-50 text-slate-900 px-4 py-2.5 rounded-xl text-xs font-black shadow transition cursor-pointer flex items-center gap-1.5"
              >
                💾 Unduh Gambar QR Code
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.origin);
                  alert('Tautan aplikasi berhasil disalin ke clipboard!');
                }}
                className="bg-indigo-600/30 border border-indigo-500/40 text-white hover:bg-indigo-600/40 px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer"
              >
                📋 Salin Link Aplikasi
              </button>
            </div>
          </div>
          
          <div id="qr-code-download-container" className="bg-white p-5 rounded-2xl flex flex-col items-center shrink-0 border border-slate-100">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(window.location.origin)}`}
              alt="QR Code Aplikasi"
              className="w-28 h-28 md:w-32 md:h-32 object-contain"
              crossOrigin="anonymous"
            />
            <span className="text-[9px] text-slate-500 font-black mt-2.5 uppercase tracking-widest">
              Scan Untuk Buka E-Journal
            </span>
          </div>
        </div>
      )}

      {isClassWali && currentWaliClass && (
        <div className="bg-slate-50 border border-slate-200 p-6 rounded-[2rem] space-y-4 shadow-sm my-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-black text-indigo-950 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600 animate-pulse" />
                Panel Akun Wali Santri Kelas {currentWaliClass}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Kelola dan terbitkan kredensial masuk untuk wali santri binaan Anda secara mandiri atau massal. Jika wali santri mendaftar mandiri, akun langsung terbaca di sini.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <button
                onClick={handleExportClassWaliCSV}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-black shadow-sm transition transform hover:-translate-y-0.5 flex items-center gap-1 text-xs cursor-pointer"
                title="Unduh Akun Wali Kelas ini format CSV"
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
              <button
                onClick={handleExportClassWaliPDF}
                className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl font-black shadow-sm transition transform hover:-translate-y-0.5 flex items-center gap-1 text-xs cursor-pointer"
                title="Unduh Akun Wali Kelas ini format PDF"
              >
                <Download className="w-3.5 h-3.5" /> PDF
              </button>
              <button
                onClick={onBatchGenerateWali}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-black shadow-sm transition transform hover:-translate-y-0.5 flex items-center gap-1.5 text-xs cursor-pointer"
              >
                <Users className="w-4 h-4" /> ⚡ Generate Akun Semua Wali
              </button>
            </div>
          </div>

          <div className="overflow-x-auto bg-white rounded-2xl border border-slate-100 shadow-3xs max-h-96 overflow-y-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-black border-b border-slate-100 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-6 py-4">No</th>
                  <th className="px-6 py-4">Santri</th>
                  <th className="px-6 py-4 text-center">Status Akun</th>
                  <th className="px-6 py-4">Kredensial Wali Santri</th>
                  <th className="px-6 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {siswa
                  .filter(s => s.kelas === currentWaliClass && !s.kelas.includes('Lulus') && !s.kelas.includes('Alumni'))
                  .map((s, idx) => {
                    const parentAcc = users.find(
                      u => u.role === 'wali' && u.id_referensi && u.id_referensi.split(',').includes(s.id_siswa)
                    );
                    return (
                      <tr key={s.id_siswa} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-3.5 font-bold text-slate-400">{idx + 1}</td>
                        <td className="px-6 py-3.5">
                          <span className="font-extrabold text-slate-800 block">{s.nama_siswa}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{s.id_siswa}</span>
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          {parentAcc ? (
                            <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md text-[10px] font-black border border-emerald-100 uppercase tracking-wider animate-pulse">
                              ✓ Terdaftar
                            </span>
                          ) : (
                            <span className="bg-slate-100 text-slate-500 px-2.5 py-1 rounded-md text-[10px] font-black border border-slate-200 uppercase tracking-wider">
                              Belum Ada Akun
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3.5">
                          {parentAcc ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">User:</span>
                                <span className="font-mono text-xs font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                                  {parentAcc.username}
                                </span>
                              </div>
                              {parentAcc.password && (
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Pass:</span>
                                  <span className="font-mono text-[11px] font-bold text-slate-600">{parentAcc.password}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium italic">Akun wali santri belum terbit</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          {!parentAcc && onSingleGenerateWali ? (
                            <button
                              onClick={() => onSingleGenerateWali(s.id_siswa, s.nama_siswa)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1 mx-auto border border-slate-200 shadow-3xs hover:-translate-y-0.5 active:translate-y-0"
                            >
                              <Key className="w-3 h-3 text-indigo-600" /> Generate Akun
                            </button>
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md text-[10px] font-black border border-emerald-100 uppercase tracking-wider">
                                ✓ Terbit
                              </span>
                              {parentAcc && (
                                <button
                                  onClick={() => handleExportSingleWaliPDF(s.nama_siswa, s.id_siswa, parentAcc)}
                                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 p-1.5 rounded-lg border border-indigo-100 transition cursor-pointer flex items-center justify-center"
                                  title="Unduh PDF Kartu Akses"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-2">
        <div className="flex flex-wrap gap-3 w-full">
          <div className="relative flex-1 md:max-w-xs">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Cari Akun..."
              className="pl-11 pr-4 py-3.5 border border-slate-200 rounded-xl text-sm w-full focus:ring-2 focus:ring-slate-500 outline-none shadow-sm font-medium bg-white text-slate-700"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {user.role === 'admin' ? (
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleExportUsersCSV}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3.5 rounded-xl font-black shadow-md transition transform hover:-translate-y-0.5 flex items-center gap-2 text-sm cursor-pointer shrink-0 animate-fadeIn"
                title="Ekspor Seluruh Data Pengguna ke CSV"
              >
                <Download className="w-4 h-4" /> Export Data User
              </button>
              <button
                onClick={() => {
                  setNewNama('');
                  setNewUsername('');
                  setNewPassword('');
                  setNewRole('guru');
                  setMapel('');
                  setKelasWali('');
                  setKelasAjar([]);
                  setIdSiswa('');
                  setIsModalOpen(true);
                }}
                className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-3.5 rounded-xl font-black shadow-md transition transform hover:-translate-y-0.5 flex items-center gap-2 text-sm cursor-pointer shrink-0"
              >
                <UserPlus className="w-4 h-4" /> Tambah Akun
              </button>
            </div>
          ) : isClassWali ? (
            <button
              onClick={onBatchGenerateWali}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3.5 rounded-xl font-black shadow-md transition transform hover:-translate-y-0.5 flex items-center gap-2 text-sm cursor-pointer shrink-0"
            >
              <Users className="w-4 h-4" /> Generator Akun Wali (KLS {currentWaliClass})
            </button>
          ) : null}
        </div>
      </div>

      {/* Grid Table */}
      <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-slate-100">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-black border-b border-slate-100">
            <tr>
              <th className="px-6 py-5 uppercase tracking-wider text-[11px]">User Login</th>
              <th className="px-6 py-5 uppercase tracking-wider text-[11px]">Nama Tampilan</th>
              <th className="px-6 py-5 uppercase tracking-wider text-[11px]">Peran Akses</th>
              <th className="px-6 py-5 uppercase tracking-wider text-[11px]">Referensi Penargetan</th>
              <th className="px-6 py-5 uppercase tracking-wider text-[11px]">Status</th>
              {(user.role === 'admin' || isClassWali) && (
                <th className="px-6 py-5 uppercase tracking-wider text-[11px] text-center">Keamanan</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-400 font-medium italic">
                  Tidak ada akun ditemukan.
                </td>
              </tr>
            ) : (
              paginatedUsers.map((u) => {
                const isActive = u.status === 'Aktif';
                return (
                  <tr key={u.id_user} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-xs font-black text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100">
                        {u.username}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-black text-slate-800">{u.nama_lengkap}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="uppercase text-[9px] font-black tracking-widest bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md border border-slate-200">
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="truncate text-xs font-mono font-bold text-slate-400 w-32" title={u.id_referensi || '-'}>
                        {u.id_referensi || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    {(user.role === 'admin' || isClassWali) && (
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-3">
                          <button
                            onClick={() => onToggleUserStatus(u.id_user, isActive ? 'Nonaktif' : 'Aktif')}
                            className="text-amber-500 hover:text-amber-600 font-black text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                            title="Tutup/Buka Akses"
                          >
                            <Power className="w-3.5 h-3.5" /> Switch
                          </button>
                          {user.role === 'admin' && (
                            <button
                              onClick={() => {
                                setEditUser(u);
                                const parsed = parseIdReferensi(u.role, u.id_referensi || '');
                                setEditMapel(parsed.parsedMapel);
                                setEditKelasWali(parsed.parsedKelasWali);
                                setEditKelasAjar(parsed.parsedKelasAjar);
                                setEditIdSiswa(parsed.parsedIdSiswa);
                                setIsEditModalOpen(true);
                              }}
                              className="text-blue-500 hover:text-blue-700 font-black text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                            >
                              Edit
                            </button>
                          )}
                          <button
                            onClick={() => onDeleteUser(u.id_user)}
                            className="text-slate-300 hover:text-red-500 transition cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination Controls */}
        {filteredUsers.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50 p-5 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-bold">
              <span>Tampilkan</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-slate-200 bg-white rounded-lg py-1.5 px-2.5 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-55 focus:ring-blue-500/20"
              >
                {[5, 10, 25, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size} entri
                  </option>
                ))}
              </select>
              <span>
                Menampilkan <span className="text-slate-800 font-black">{totalItems === 0 ? 0 : startIndex + 1}</span> s/d{' '}
                <span className="text-slate-800 font-black">{Math.min(endIndex, totalItems)}</span> dari{' '}
                <span className="text-blue-600 font-black">{totalItems}</span> pengguna
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
                          ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
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

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9990] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl flex flex-col p-6 max-h-[90vh] overflow-y-auto animate-fade-in my-auto">
            <h3 className="font-extrabold text-xl text-slate-800 mb-6 border-b border-slate-100 pb-4">
              Tambahkan Akses Akun Baru
            </h3>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-black text-slate-500 block mb-2 uppercase tracking-wider">
                  Nama Tampilan Lengkap
                </label>
                <input
                  type="text"
                  required
                  className="w-full border border-slate-200 p-4 rounded-xl font-bold focus:ring-2 focus:ring-slate-400 outline-none text-slate-700"
                  value={newNama}
                  onChange={(e) => setNewNama(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-slate-500 block mb-2 uppercase tracking-wider">
                    Username Login
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full border border-slate-200 p-4 rounded-xl font-bold focus:ring-2 focus:ring-slate-400 outline-none text-slate-700"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-500 block mb-2 uppercase tracking-wider">
                    Password Default
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full border border-slate-200 p-4 rounded-xl font-bold focus:ring-2 focus:ring-slate-400 outline-none text-slate-700"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 block mb-2 uppercase tracking-wider">
                  Level Peran (Role)
                </label>
                <select
                  required
                  className="w-full border border-slate-200 p-4 rounded-xl font-black bg-slate-50 focus:ring-2 focus:ring-slate-400 outline-none text-slate-700"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                >
                  <option value="guru">Guru Mapel</option>
                  <option value="wali_kelas">Wali Kelas</option>
                  <option value="pengawas">Pengawas Madrasah</option>
                  <option value="admin">Administrator</option>
                  <option value="wali">Wali Santri</option>
                </select>
              </div>

              {/* Mapel Field */}
              {(newRole === 'guru' || newRole === 'wali_kelas') && (
                <div>
                  <label className="text-xs font-black text-slate-500 block mb-2 uppercase tracking-wider">
                    Mata Pelajaran Utama (pisahkan koma)
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full border border-slate-200 p-4 rounded-xl font-medium focus:ring-2 focus:ring-slate-400 outline-none text-slate-700"
                    placeholder="Contoh: Matematika, IPA"
                    value={mapel}
                    onChange={(e) => setMapel(e.target.value)}
                  />
                </div>
              )}

              {/* Class Wali Field */}
              {newRole === 'wali_kelas' && (
                <div>
                  <label className="text-xs font-black text-slate-500 block mb-2 uppercase tracking-wider">
                    Ditetapkan Sebagai Wali Dari Kelas
                  </label>
                  <select
                    required
                    className="w-full border border-slate-200 p-4 rounded-xl font-bold focus:ring-2 focus:ring-slate-400 outline-none text-slate-700"
                    value={kelasWali}
                    onChange={(e) => setKelasWali(e.target.value)}
                  >
                    <option value="">-- Pilih Kelas --</option>
                    {allAvailableClasses.map((k, idx) => (
                      <option key={`usr-add-kls-${k}-${idx}`} value={k}>Kelas {k}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Class Teaching Grid */}
              {(newRole === 'guru' || newRole === 'wali_kelas') && (
                <div>
                  <label className="text-xs font-black text-slate-500 block mb-2 uppercase tracking-wider">
                    Memberikan Pelajaran di Kelas
                  </label>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 h-40 overflow-y-auto">
                    <div className="grid grid-cols-3 gap-2">
                      {allAvailableClasses.map((k, idx) => (
                        <label
                          key={`usr-add-ajar-${k}-${idx}`}
                          className="flex items-center gap-2 border border-slate-200 p-2.5 rounded-lg hover:bg-blue-50 cursor-pointer bg-white transition shadow-sm text-xs"
                        >
                          <input
                            type="checkbox"
                            value={k}
                            checked={kelasAjar.includes(k)}
                            onChange={(e) => handleToggleAjarKelas(k, e.target.checked)}
                          />
                          <span className="font-bold text-slate-700">{k}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Parent Linked Children */}
              {newRole === 'wali' && (
                <div>
                  <label className="text-xs font-black text-slate-500 block mb-2 uppercase tracking-wider">
                    ID Santri Terhubung (Koma jika lebih dari 1)
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full border border-slate-200 p-4 rounded-xl font-mono text-sm focus:ring-2 focus:ring-slate-400 outline-none text-slate-700"
                    placeholder="Contoh: 7A-01, 7A-05"
                    value={idSiswa}
                    onChange={(e) => setIdSiswa(e.target.value)}
                  />
                </div>
              )}

              <div className="flex gap-4 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 border border-slate-200 font-bold rounded-xl hover:bg-slate-50 text-sm cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-slate-800 text-white font-black text-base py-4 rounded-xl shadow-xl hover:bg-slate-900 transition transform active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Menyimpan...' : 'BUAT AKUN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && editUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9990] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl flex flex-col p-6 max-h-[90vh] overflow-y-auto animate-fade-in my-auto">
            <h3 className="font-extrabold text-xl text-slate-800 mb-6 border-b border-slate-100 pb-4">
              Edit Konfigurasi Akun: {editUser.username}
            </h3>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-black text-slate-500 block mb-2 uppercase tracking-wider">
                  Nama Tampilan Lengkap
                </label>
                <input
                  type="text"
                  required
                  className="w-full border border-slate-200 p-4 rounded-xl font-bold focus:ring-2 focus:ring-slate-400 outline-none text-slate-700"
                  value={editUser.nama_lengkap}
                  onChange={(e) => setEditUser({ ...editUser, nama_lengkap: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-slate-500 block mb-2 uppercase tracking-wider">
                    Username Identitas
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full border border-slate-200 p-4 rounded-xl font-bold focus:ring-2 focus:ring-slate-400 outline-none text-slate-700"
                    value={editUser.username}
                    onChange={(e) => setEditUser({ ...editUser, username: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-500 block mb-2 uppercase tracking-wider">
                    Password Valid
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full border border-slate-200 p-4 rounded-xl font-bold focus:ring-2 focus:ring-slate-400 outline-none text-slate-700"
                    value={editUser.password || ''}
                    onChange={(e) => setEditUser({ ...editUser, password: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 block mb-2 uppercase tracking-wider">
                  Kategori Peran (Role)
                </label>
                <select
                  required
                  className="w-full border border-slate-200 p-4 rounded-xl font-black bg-slate-50 focus:ring-2 focus:ring-slate-400 outline-none text-slate-700"
                  value={editUser.role}
                  onChange={(e) => {
                    const newRoleVal = e.target.value as any;
                    setEditUser({ ...editUser, role: newRoleVal });
                  }}
                >
                  <option value="guru">Guru Mapel</option>
                  <option value="wali_kelas">Wali Kelas</option>
                  <option value="pengawas">Pengawas Madrasah</option>
                  <option value="admin">Administrator</option>
                  <option value="wali">Wali Santri</option>
                </select>
              </div>

              {/* Mapel Field */}
              {(editUser.role === 'guru' || editUser.role === 'wali_kelas') && (
                <div>
                  <label className="text-xs font-black text-slate-500 block mb-2 uppercase tracking-wider">
                    Mata Pelajaran Utama (pisahkan koma)
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full border border-slate-200 p-4 rounded-xl font-medium focus:ring-2 focus:ring-slate-400 outline-none text-slate-700"
                    placeholder="Contoh: Matematika, IPA"
                    value={editMapel}
                    onChange={(e) => setEditMapel(e.target.value)}
                  />
                </div>
              )}

              {/* Class Wali Field */}
              {editUser.role === 'wali_kelas' && (
                <div>
                  <label className="text-xs font-black text-slate-500 block mb-2 uppercase tracking-wider">
                    Ditetapkan Sebagai Wali Dari Kelas
                  </label>
                  <select
                    required
                    className="w-full border border-slate-200 p-4 rounded-xl font-bold focus:ring-2 focus:ring-slate-400 outline-none text-slate-700"
                    value={editKelasWali}
                    onChange={(e) => setEditKelasWali(e.target.value)}
                  >
                    <option value="">-- Pilih Kelas --</option>
                    {allAvailableClasses.map((k, idx) => (
                      <option key={`usr-edt-kls-${k}-${idx}`} value={k}>Kelas {k}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Class Teaching Grid */}
              {(editUser.role === 'guru' || editUser.role === 'wali_kelas') && (
                <div>
                  <label className="text-xs font-black text-slate-500 block mb-2 uppercase tracking-wider">
                    Memberikan Pelajaran di Kelas
                  </label>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 h-40 overflow-y-auto">
                    <div className="grid grid-cols-3 gap-2">
                      {allAvailableClasses.map((k, idx) => (
                        <label
                          key={`usr-edt-ajar-${k}-${idx}`}
                          className="flex items-center gap-2 border border-slate-200 p-2.5 rounded-lg hover:bg-blue-50 cursor-pointer bg-white transition shadow-sm text-xs"
                        >
                          <input
                            type="checkbox"
                            value={k}
                            checked={editKelasAjar.includes(k)}
                            onChange={(e) => handleToggleEditAjarKelas(k, e.target.checked)}
                          />
                          <span className="font-bold text-slate-700">{k}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Parent Linked Children */}
              {editUser.role === 'wali' && (
                <div>
                  <label className="text-xs font-black text-slate-500 block mb-2 uppercase tracking-wider">
                    ID Santri Terhubung (Koma jika lebih dari 1)
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full border border-slate-200 p-4 rounded-xl font-mono text-sm focus:ring-2 focus:ring-slate-400 outline-none text-slate-700"
                    placeholder="Contoh: 7A-01, 7A-05"
                    value={editIdSiswa}
                    onChange={(e) => setEditIdSiswa(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-black text-slate-500 block mb-2 uppercase tracking-wider">
                  String Referensi Akses (Pakar - Diperbarui otomatis dari isian di atas)
                </label>
                <textarea
                  rows={2}
                  disabled
                  className="w-full border border-slate-200 p-4 rounded-xl font-mono text-sm bg-slate-100 text-slate-500 select-none outline-none"
                  value={
                    editUser.role === 'wali_kelas'
                      ? `WALI:${editKelasWali}|AJAR:${editKelasAjar.join(',')}|MAPEL:${editMapel}`
                      : editUser.role === 'guru'
                      ? `AJAR:${editKelasAjar.join(',')}|MAPEL:${editMapel}`
                      : editUser.role === 'wali'
                      ? editIdSiswa.replace(/\s+/g, '')
                      : ''
                  }
                />
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-4 border border-slate-200 font-bold rounded-xl hover:bg-slate-50 text-sm cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white font-black text-base py-4 rounded-xl shadow-xl hover:bg-blue-700 transition transform active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Menyimpan...' : 'SIMPAN PEMBARUAN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
