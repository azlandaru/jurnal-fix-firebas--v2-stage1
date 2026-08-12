import React, { useState } from 'react';
import { Siswa, User, Jurnal, getTeacherClasses } from '../types';
import { Search, FileSpreadsheet, Download, AlertCircle, FileText } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { drawKopSurat, drawFooter } from '../utils/pdfGenerator';

interface RekapPresensiMenuProps {
  user: User;
  siswa: Siswa[];
  jurnal: Jurnal[];
}

export const RekapPresensiMenu: React.FC<RekapPresensiMenuProps> = ({
  user,
  siswa,
  jurnal
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const getAuthorizedClasses = (): string[] => {
    const activeSiswa = siswa.filter(s => s.kelas && !s.kelas.includes('Lulus') && !s.kelas.includes('Alumni'));
    const activeClassList = [...new Set(activeSiswa.map(s => s.kelas))].filter(Boolean).sort() as string[];
    if (['admin', 'pengawas'].includes(user.role)) {
      return activeClassList;
    }
    if (user.role === 'wali') {
      const childIds = user.id_referensi ? user.id_referensi.split(',').map(x => x.trim()) : [];
      const myChildren = siswa.filter(s => childIds.includes(s.id_siswa));
      return [...new Set(myChildren.map(s => s.kelas))].filter(Boolean).sort() as string[];
    }
    if (['guru', 'wali_kelas'].includes(user.role)) {
      const teacherClasses = getTeacherClasses(user);
      const res = teacherClasses.filter(k => activeClassList.includes(k)).sort();
      if (res.length > 0) return res;
      return teacherClasses;
    }
    return activeClassList;
  };

  const authClasses = getAuthorizedClasses();

  const getFilteredSiswaForClass = (kelas: string) => {
    const childIds = user.role === 'wali' ? (user.id_referensi ? user.id_referensi.split(',').map(x => x.trim()) : []) : [];
    return siswa
      .filter(s => s.kelas === kelas && !s.kelas.includes('Lulus') && !s.kelas.includes('Alumni'))
      .filter(s => user.role !== 'wali' || childIds.includes(s.id_siswa));
  };

  // Calculate attendance counters for a student
  const getStudentAbsenceStats = (studentName: string, studentKelas: string) => {
    let sakit = 0;
    let izin = 0;
    let alpa = 0;

    const classJournals = jurnal.filter(j => j.kelas === studentKelas);
    const totalSesi = classJournals.length;

    classJournals.forEach(j => {
      // Safe check if student name is in absent details
      const isSakit = j.siswa_sakit.includes(studentName);
      const isIzin = j.siswa_izin.includes(studentName);
      const isAlpa = j.siswa_alpa.includes(studentName);

      if (isSakit) sakit++;
      else if (isIzin) izin++;
      else if (isAlpa) alpa++;
    });

    const totalAbsen = sakit + izin + alpa;
    const hadir = Math.max(0, totalSesi - totalAbsen);

    return { sakit, izin, alpa, total: totalAbsen, hadir, totalSesi };
  };

  const getStudentMonthlyAbsenceStats = (studentName: string, studentKelas: string, month: number, year: number) => {
    let sakit = 0;
    let izin = 0;
    let alpa = 0;

    const classMonthlyJournals = jurnal.filter(j => {
      if (j.kelas !== studentKelas) return false;
      const date = new Date(j.tanggal);
      return date.getMonth() === month && date.getFullYear() === year;
    });

    const totalSesi = classMonthlyJournals.length;

    classMonthlyJournals.forEach(j => {
      const isSakit = j.siswa_sakit.includes(studentName);
      const isIzin = j.siswa_izin.includes(studentName);
      const isAlpa = j.siswa_alpa.includes(studentName);

      if (isSakit) sakit++;
      else if (isIzin) izin++;
      else if (isAlpa) alpa++;
    });

    const totalAbsen = sakit + izin + alpa;
    const hadir = Math.max(0, totalSesi - totalAbsen);

    return { sakit, izin, alpa, total: totalAbsen, hadir, totalSesi };
  };

  // Export functions
  const handleExportCSV = (kelas: string) => {
    const sKelas = getFilteredSiswaForClass(kelas);
    let csv = "No,Nama Santri,Kelas,Hadir (H),Sakit (S),Izin (I),Alpa (A),Total Ketidakhadiran\n";
    sKelas.forEach((s, idx) => {
      const stats = getStudentAbsenceStats(s.nama_siswa, s.kelas);
      csv += `${idx + 1},"${s.nama_siswa}","${s.kelas}",${stats.hadir},${stats.sakit},${stats.izin},${stats.alpa},${stats.total}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Rekap_Presensi_Kelas_${kelas}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = (kelas: string) => {
    const doc = new jsPDF();
    
    // Draw official letterhead
    drawKopSurat(doc);

    // Document Title
    let currentY = 18;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`LAPORAN REKAPITULASI PRESENSI SANTRI - KELAS ${kelas}`, 105, currentY, { align: 'center' });
    
    currentY += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`MTs Ibad Ar Rahman | Dicetak: ${new Date().toLocaleDateString('id-ID')}`, 105, currentY, { align: 'center' });

    const sKelas = getFilteredSiswaForClass(kelas);
    const bodyRows = sKelas.map((s, idx) => {
      const stats = getStudentAbsenceStats(s.nama_siswa, s.kelas);
      return [
        idx + 1,
        s.nama_siswa,
        stats.hadir,
        stats.sakit,
        stats.izin,
        stats.alpa,
        `${stats.total} kali`
      ];
    });

    autoTable(doc, {
      startY: currentY + 6,
      head: [['No', 'Nama Santri', 'Hadir (H)', 'Sakit (S)', 'Izin (I)', 'Alfa (A)', 'Total Absen']],
      body: bodyRows,
      theme: 'grid',
      headStyles: { fillColor: [13, 148, 136] }, // Use official Teal-600 color
      styles: { fontSize: 9, cellPadding: 3 },
      margin: { top: 38, bottom: 42, left: 14, right: 14 }
    });

    // Draw footer on all pages
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      if (i > 1) {
        drawKopSurat(doc);
      }
      drawFooter(doc, i, pageCount);
    }

    doc.save(`Rekap_Presensi_Kelas_${kelas}.pdf`);
  };

  const handleDownloadMonthlyPDF = (kelas: string, month: number, year: number) => {
    const doc = new jsPDF();
    
    // Header
    let currentY = 18;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    doc.text(`LAPORAN REKAPITULASI PRESENSI BULANAN SANTRI - KELAS ${kelas}`, 105, currentY, { align: 'center' });
    
    currentY += 5;
    doc.text(`BULAN: ${monthNames[month].toUpperCase()} ${year}`, 105, currentY, { align: 'center' });
    
    currentY += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`MTs Ibad Ar Rahman | Dicetak: ${new Date().toLocaleDateString('id-ID')}`, 105, currentY, { align: 'center' });

    const sKelas = getFilteredSiswaForClass(kelas);
    const bodyRows = sKelas.map((s, idx) => {
      const stats = getStudentMonthlyAbsenceStats(s.nama_siswa, s.kelas, month, year);
      return [
        idx + 1,
        s.nama_siswa,
        stats.hadir,
        stats.sakit,
        stats.izin,
        stats.alpa,
        stats.totalSesi > 0 ? `${Math.round((stats.hadir / stats.totalSesi) * 100)}%` : '0%'
      ];
    });

    autoTable(doc, {
      startY: currentY + 6,
      head: [['No', 'Nama Santri', 'Hadir (H)', 'Sakit (S)', 'Izin (I)', 'Alfa (A)', 'Persentase']],
      body: bodyRows,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] }, // Indigo color
      styles: { fontSize: 8.5, cellPadding: 2.5 },
      margin: { top: 38, bottom: 42, left: 14, right: 14 }
    });

    // Draw footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      drawFooter(doc, i, pageCount);
    }

    doc.save(`Rekap_Presensi_Bulanan_Kelas_${kelas}_${monthNames[month]}_${year}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 mb-1 flex items-center gap-2">
            📅 Rekapitulasi Presensi Santri
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            Akumulasi kehadiran dan ketidakhadiran santri yang diekstrak otomatis dari jurnal mengajar harian.
          </p>
        </div>

        <div className="relative w-full md:w-64 shrink-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Cari Nama Santri..."
            className="pl-11 pr-4 py-3.5 border border-slate-200 rounded-xl text-sm w-full focus:ring-2 focus:ring-teal-400 outline-none shadow-sm font-medium bg-white text-slate-700"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Monthly Report Download Section (For Wali Kelas & Admin) */}
      {authClasses.length > 0 && (user.role === 'wali_kelas' || user.role === 'admin') && (
        <div className="bg-gradient-to-r from-teal-500 to-emerald-600 p-6 rounded-3xl text-white shadow-md space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-lg font-black flex items-center gap-2">
                <Download className="w-5 h-5 animate-bounce" style={{ animationDuration: '3s' }} />
                Unduh Rekapitulasi Presensi Bulanan Resmi
              </h3>
              <p className="text-xs text-teal-100 font-medium leading-relaxed">
                Pilih bulan dan tahun ajaran aktif untuk mengunduh rekapitulasi kehadiran bulanan santri dalam format PDF resmi.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white/10 p-4 rounded-2xl">
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-teal-200 block mb-1">Pilih Kelas</label>
              <select
                id="select-kelas-bulanan"
                className="w-full bg-teal-600 border border-teal-400/40 rounded-xl p-3 text-sm font-black text-white focus:outline-none focus:ring-2 focus:ring-white/50 cursor-pointer"
                defaultValue={authClasses[0]}
              >
                {authClasses.map(c => (
                  <option key={c} value={c} className="text-slate-800 font-medium">Kelas {c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-teal-200 block mb-1">Pilih Bulan</label>
              <select
                className="w-full bg-teal-600 border border-teal-400/40 rounded-xl p-3 text-sm font-black text-white focus:outline-none focus:ring-2 focus:ring-white/50 cursor-pointer"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
              >
                {[
                  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
                ].map((m, idx) => (
                  <option key={idx} value={idx} className="text-slate-800 font-medium">{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-teal-200 block mb-1">Pilih Tahun</label>
              <select
                className="w-full bg-teal-600 border border-teal-400/40 rounded-xl p-3 text-sm font-black text-white focus:outline-none focus:ring-2 focus:ring-white/50 cursor-pointer"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                {[2025, 2026, 2027, 2028].map(y => (
                  <option key={y} value={y} className="text-slate-800 font-medium">{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => {
                const selectKelas = document.getElementById('select-kelas-bulanan') as HTMLSelectElement | null;
                const targetKelas = (selectKelas?.value || authClasses[0]) as string;
                handleDownloadMonthlyPDF(targetKelas, selectedMonth, selectedYear);
              }}
              className="bg-white hover:bg-teal-50 text-teal-700 px-6 py-3 rounded-xl font-black text-xs transition shadow-md cursor-pointer flex items-center gap-2"
            >
              <FileText className="w-4 h-4" /> Unduh Laporan PDF Bulanan
            </button>
          </div>
        </div>
      )}

      {authClasses.length === 0 ? (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-center flex flex-col items-center justify-center">
          <AlertCircle className="w-12 h-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-black text-slate-700">Akses Ditolak / Kelas Kosong</h3>
          <p className="text-slate-500 mt-2 font-medium">
            Akun Anda tidak memiliki otorisasi kelas mengajar/wali untuk memantau presensi.
          </p>
        </div>
      ) : (
        authClasses.map((kelas: string) => {
          const sKelas = getFilteredSiswaForClass(kelas)
            .filter(s => !searchTerm || s.nama_siswa.toLowerCase().includes(searchTerm.toLowerCase()));

          if (sKelas.length === 0) return null;

          return (
            <div key={kelas} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4 flex-wrap gap-2">
                <h3 className="text-lg font-black text-slate-800">
                  Rombel Kelas <span className="bg-teal-50 border border-teal-100 text-teal-700 px-3 py-1 rounded-lg text-sm ml-2">{kelas}</span>
                </h3>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => handleExportPDF(kelas)}
                    className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-4 py-2 rounded-xl font-bold transition flex items-center gap-1.5 text-xs cursor-pointer shadow-sm"
                  >
                    <FileText className="w-3.5 h-3.5" /> PDF
                  </button>
                  <button
                    onClick={() => handleExportCSV(kelas)}
                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 px-4 py-2 rounded-xl font-bold transition flex items-center gap-1.5 text-xs cursor-pointer shadow-sm"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" /> CSV / Excel
                  </button>
                </div>
              </div>

              {/* Attendance Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left animate-fade-in">
                  <thead className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <tr className="border-b border-slate-100">
                      <th className="py-3">No</th>
                      <th className="py-3">Nama Lengkap Santri</th>
                      <th className="py-3 text-center">Hadir (H)</th>
                      <th className="py-3 text-center">Sakit (S)</th>
                      <th className="py-3 text-center">Izin (I)</th>
                      <th className="py-3 text-center">Alpa (A)</th>
                      <th className="py-3 text-center">Total Absen</th>
                      <th className="py-3 text-center">Status Keaktifan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {sKelas.map((s, idx) => {
                      const stats = getStudentAbsenceStats(s.nama_siswa, s.kelas);
                      const isHighAbsence = stats.total > 5;
                      return (
                        <tr key={s.id_siswa} className="hover:bg-teal-50/10 transition-colors">
                          <td className="py-3.5 font-bold text-slate-400">{idx + 1}</td>
                          <td className="py-3.5">
                            <span className="font-bold text-slate-800">{s.nama_siswa}</span>
                            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{s.id_siswa}</span>
                          </td>
                          <td className="py-3.5 text-center font-bold text-emerald-600 bg-emerald-50/30">{stats.hadir}</td>
                          <td className="py-3.5 text-center font-bold text-amber-600">{stats.sakit}</td>
                          <td className="py-3.5 text-center font-bold text-purple-600">{stats.izin}</td>
                          <td className="py-3.5 text-center font-bold text-red-600">{stats.alpa}</td>
                          <td className="py-3.5 text-center font-black text-slate-800">{stats.total} kali</td>
                          <td className="py-3.5 text-center">
                            {isHighAbsence ? (
                              <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded-md font-black text-[9px] uppercase tracking-wide border border-red-100 animate-pulse">
                                ⚠️ SP / Warning
                              </span>
                            ) : (
                              <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-black text-[9px] uppercase tracking-wide border border-emerald-100">
                                ✓ Aman / Aktif
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
