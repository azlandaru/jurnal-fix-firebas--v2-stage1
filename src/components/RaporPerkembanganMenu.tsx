import React, { useState } from 'react';
import { Siswa, User, Jurnal, CatatanPerkembangan, CatatanPerilaku, HomeVisit, Prestasi, getTeacherClasses } from '../types';
import {
  Search, FileSpreadsheet, Download, Award, Smile, Home, FileText, CheckCircle2,
  Calendar, UserCheck, AlertTriangle, ChevronRight, BookOpen, Clock, Heart, Users,
  Eye, Printer
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDateID, drawKopSurat, drawFooter, getCleanImageBase64 } from '../utils/pdfGenerator';

interface RaporPerkembanganMenuProps {
  user: User;
  siswa: Siswa[];
  jurnal: Jurnal[];
  perkembangan: CatatanPerkembangan[];
  perilaku: CatatanPerilaku[];
  homeVisits: HomeVisit[];
  prestasi?: Prestasi[];
  onLogActivity?: (aksi: string, rincian: string) => void;
}

export const RaporPerkembanganMenu: React.FC<RaporPerkembanganMenuProps> = ({
  user,
  siswa,
  jurnal,
  perkembangan,
  perilaku,
  homeVisits,
  prestasi,
  onLogActivity
}) => {
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSiswaId, setSelectedSiswaId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'ringkasan' | 'presensi' | 'akademik' | 'perilaku' | 'homevisit' | 'prestasi'>('ringkasan');
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number; name: string } | null>(null);
  const [isBulkDropdownOpen, setIsBulkDropdownOpen] = useState<boolean>(false);

  // Determine authorized classes
  const getAuthorizedClasses = () => {
    const activeSiswa = siswa.filter(s => s.kelas && !s.kelas.includes('Lulus') && !s.kelas.includes('Alumni'));
    const activeClassList = [...new Set(activeSiswa.map(s => s.kelas))].filter(Boolean).sort();
    if (['admin', 'pengawas'].includes(user.role)) {
      return activeClassList;
    }
    if (user.role === 'wali') {
      const childIds = user.id_referensi ? user.id_referensi.split(',').map(x => x.trim()) : [];
      const myChildren = activeSiswa.filter(s => childIds.includes(s.id_siswa));
      const res = [...new Set(myChildren.map(s => s.kelas))].sort();
      return res.length > 0 ? res : activeClassList;
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

  // If selectedClass is empty, set default
  React.useEffect(() => {
    if (authClasses.length > 0 && !selectedClass) {
      setSelectedClass(authClasses[0]);
    }
  }, [authClasses, selectedClass]);

  // Filter students based on selected class
  const classStudents = siswa
    .filter(s => s.kelas === selectedClass && !s.kelas.includes('Lulus') && !s.kelas.includes('Alumni') && (user.role !== 'wali' || (user.id_referensi ? user.id_referensi.split(',').map(x => x.trim()).includes(s.id_siswa) : false)))
    .sort((a, b) => a.nama_siswa.localeCompare(b.nama_siswa));

  // If selectedSiswaId is not in classStudents, reset it
  React.useEffect(() => {
    if (classStudents.length > 0) {
      const exists = classStudents.some(s => s.id_siswa === selectedSiswaId);
      if (!exists) {
        setSelectedSiswaId(classStudents[0].id_siswa);
      }
    } else {
      setSelectedSiswaId('');
    }
  }, [selectedClass, classStudents, selectedSiswaId]);

  const currentStudent = siswa.find(s => s.id_siswa === selectedSiswaId);

  // Compute available months dynamically
  const availableMonths = React.useMemo(() => {
    if (!currentStudent) return [];
    
    const monthsSet = new Set<string>();
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    // Collect dates from all modules
    const allDates: string[] = [];
    jurnal.filter(j => j.kelas === currentStudent.kelas).forEach(j => { if (j.tanggal) allDates.push(j.tanggal); });
    perkembangan.filter(p => p.id_siswa === selectedSiswaId).forEach(p => { if (p.tanggal) allDates.push(p.tanggal); });
    perilaku.filter(p => p.id_siswa === selectedSiswaId).forEach(p => { if (p.tanggal) allDates.push(p.tanggal); });
    homeVisits.filter(v => v.id_siswa === selectedSiswaId).forEach(v => { if (v.tanggal) allDates.push(v.tanggal); });
    (prestasi || []).filter(pr => pr.id_siswa === selectedSiswaId).forEach(pr => { if (pr.tanggal) allDates.push(pr.tanggal); });

    allDates.forEach(d => {
      const parts = d.split('-');
      if (parts.length >= 2) {
        const year = parts[0];
        const month = parts[1];
        monthsSet.add(`${year}-${month}`);
      }
    });

    return Array.from(monthsSet)
      .sort()
      .reverse()
      .map(key => {
        const [year, month] = key.split('-');
        const name = `${monthNames[parseInt(month, 10) - 1]} ${year}`;
        return { key, label: name };
      });
  }, [selectedSiswaId, currentStudent, jurnal, perkembangan, perilaku, homeVisits, prestasi]);

  // Set default month to the most recent one on student change
  React.useEffect(() => {
    if (availableMonths.length > 0) {
      setSelectedMonth(availableMonths[0].key);
    } else {
      setSelectedMonth('all');
    }
  }, [availableMonths]);

  // Calculate statistics for the current student
  const getStudentStats = () => {
    if (!currentStudent) return { sakit: 0, izin: 0, alpa: 0, totalAbsen: 0, totalJurnal: 0, attendanceRate: 100 };

    let sakit = 0;
    let izin = 0;
    let alpa = 0;

    let classJurnals = jurnal.filter(j => j.kelas === currentStudent.kelas);
    if (selectedMonth !== 'all') {
      classJurnals = classJurnals.filter(j => j.tanggal && j.tanggal.startsWith(selectedMonth));
    }
    const totalJurnal = classJurnals.length;

    classJurnals.forEach(j => {
      if (j.siswa_sakit.includes(currentStudent.nama_siswa)) sakit++;
      if (j.siswa_izin.includes(currentStudent.nama_siswa)) izin++;
      if (j.siswa_alpa.includes(currentStudent.nama_siswa)) alpa++;
    });

    const totalAbsen = sakit + izin + alpa;
    const attendanceRate = totalJurnal > 0 
      ? Math.max(0, Math.round(((totalJurnal - totalAbsen) / totalJurnal) * 100)) 
      : 100;

    return { sakit, izin, alpa, totalAbsen, totalJurnal, attendanceRate };
  };

  const stats = getStudentStats();

  const getActiveTahunAjaran = () => {
    let activeTahun = '';
    try {
      const stored = localStorage.getItem('edu_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.tahun_ajaran) {
          activeTahun = parsed.tahun_ajaran;
        }
      }
    } catch (e) {}
    if (!activeTahun) activeTahun = '2025/2026';
    return activeTahun;
  };
  const activeTahunAjaran = getActiveTahunAjaran();

  const getMonthlyStats = () => {
    if (!currentStudent) return [];
    let classJurnals = jurnal.filter(j => j.kelas === currentStudent.kelas);
    if (selectedMonth !== 'all') {
      classJurnals = classJurnals.filter(j => j.tanggal && j.tanggal.startsWith(selectedMonth));
    }
    const monthlyGroups: { [key: string]: { monthName: string; totalKBM: number; sakit: number; izin: number; alpa: number; timestamp: number } } = {};
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    classJurnals.forEach(j => {
      if (!j.tanggal) return;
      const date = new Date(j.tanggal);
      const year = date.getFullYear();
      const monthIdx = date.getMonth();
      const key = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
      const monthName = `${monthNames[monthIdx]} ${year}`;

      if (!monthlyGroups[key]) {
        monthlyGroups[key] = {
          monthName,
          totalKBM: 0,
          sakit: 0,
          izin: 0,
          alpa: 0,
          timestamp: date.getTime()
        };
      }

      monthlyGroups[key].totalKBM++;
      if (j.siswa_sakit.includes(currentStudent.nama_siswa)) monthlyGroups[key].sakit++;
      if (j.siswa_izin.includes(currentStudent.nama_siswa)) monthlyGroups[key].izin++;
      if (j.siswa_alpa.includes(currentStudent.nama_siswa)) monthlyGroups[key].alpa++;
    });

    return Object.values(monthlyGroups)
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(g => {
        const totalAbsen = g.sakit + g.izin + g.alpa;
        const hadir = g.totalKBM - totalAbsen;
        const attendanceRate = g.totalKBM > 0 ? Math.max(0, Math.round((hadir / g.totalKBM) * 100)) : 100;
        return {
          monthName: g.monthName,
          totalKBM: g.totalKBM,
          hadir,
          sakit: g.sakit,
          izin: g.izin,
          alpa: g.alpa,
          attendanceRate
        };
      });
  };

  // Get data specifically for selected student
  const studentPerkembanganAll = perkembangan
    .filter(p => p.id_siswa === selectedSiswaId)
    .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

  const studentPerilakuAll = perilaku
    .filter(p => p.id_siswa === selectedSiswaId)
    .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

  const studentHomeVisitsAll = homeVisits
    .filter(v => v.id_siswa === selectedSiswaId)
    .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

  const studentPrestasiAll = (prestasi || [])
    .filter(p => p.id_siswa === selectedSiswaId)
    .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

  // Filter lists by selectedMonth if not 'all'
  const studentPerkembangan = selectedMonth === 'all'
    ? studentPerkembanganAll
    : studentPerkembanganAll.filter(p => p.tanggal && p.tanggal.startsWith(selectedMonth));

  const studentPerilaku = selectedMonth === 'all'
    ? studentPerilakuAll
    : studentPerilakuAll.filter(p => p.tanggal && p.tanggal.startsWith(selectedMonth));

  const studentHomeVisits = selectedMonth === 'all'
    ? studentHomeVisitsAll
    : studentHomeVisitsAll.filter(v => v.tanggal && v.tanggal.startsWith(selectedMonth));

  const studentPrestasi = selectedMonth === 'all'
    ? studentPrestasiAll
    : studentPrestasiAll.filter(p => p.tanggal && p.tanggal.startsWith(selectedMonth));

  // Find journals where this student was absent
  let allAbsentJurnals = currentStudent ? jurnal.filter(j => 
    j.kelas === currentStudent.kelas && (
      j.siswa_sakit.includes(currentStudent.nama_siswa) ||
      j.siswa_izin.includes(currentStudent.nama_siswa) ||
      j.siswa_alpa.includes(currentStudent.nama_siswa)
    )
  ) : [];

  if (selectedMonth !== 'all') {
    allAbsentJurnals = allAbsentJurnals.filter(j => j.tanggal && j.tanggal.startsWith(selectedMonth));
  }

  const absentLogs = allAbsentJurnals.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

  // Core PDF renderer for a single student's report
  const renderStudentReportOnDoc = async (doc: jsPDF, student: Siswa, isFirstSiswa: boolean) => {
    const primaryColor: [number, number, number] = [13, 148, 136]; // Teal-600
    
    // Calculate student-specific stats
    let sakit = 0;
    let izin = 0;
    let alpa = 0;

    let classJurnals = jurnal.filter(j => j.kelas === student.kelas);
    if (selectedMonth !== 'all') {
      classJurnals = classJurnals.filter(j => j.tanggal && j.tanggal.startsWith(selectedMonth));
    }
    const totalJurnal = classJurnals.length;

    classJurnals.forEach(j => {
      if (j.siswa_sakit.includes(student.nama_siswa)) sakit++;
      if (j.siswa_izin.includes(student.nama_siswa)) izin++;
      if (j.siswa_alpa.includes(student.nama_siswa)) alpa++;
    });

    const totalAbsen = sakit + izin + alpa;
    const attendanceRate = totalJurnal > 0 
      ? Math.max(0, Math.round(((totalJurnal - totalAbsen) / totalJurnal) * 100)) 
      : 100;

    const stats = { sakit, izin, alpa, totalAbsen, totalJurnal, attendanceRate };

    // --- 1. Draw Kop Surat ---
    drawKopSurat(doc);

    // --- 3. DOCUMENT TITLE ---
    let currentY = 18;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('RAPOR PERKEMBANGAN SANTRI TERPADU', 105, currentY, { align: 'center' });

    let activeTahunAjaran = '';
    try {
      const stored = localStorage.getItem('edu_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.tahun_ajaran) {
          activeTahunAjaran = parsed.tahun_ajaran;
        }
      }
    } catch (e) {}
    if (!activeTahunAjaran) activeTahunAjaran = '2025/2026';
    
    currentY += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Tahun Ajaran: ${activeTahunAjaran}`, 105, currentY, { align: 'center' });

    // --- 4. BIODATA ---
    currentY += 8;
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    doc.setFont("helvetica", "bold");
    doc.text("IDENTITAS SANTRI", 14, currentY);

    doc.setFont("helvetica", "normal");
    doc.text("Nama Lengkap", 14, currentY + 6);
    doc.text(`: ${student.nama_siswa}`, 45, currentY + 6);
    
    doc.text("Kelas Rombel", 14, currentY + 11);
    doc.text(`: Kelas ${student.kelas}`, 45, currentY + 11);
    
    doc.text("Nama Wali", 14, currentY + 16);
    doc.text(`: ${student.nama_wali || '-'}`, 45, currentY + 16);

    doc.text("Tanggal Cetak", 110, currentY + 6);
    doc.text(`: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, 140, currentY + 6);

    doc.text("Peran Pencetak", 110, currentY + 11);
    doc.text(`: ${user.nama_lengkap} (${user.role.replace('_', ' ')})`, 140, currentY + 11);

    // --- 5. REKAP PRESENSI ---
    currentY += 26;
    doc.setFont("helvetica", "bold");
    doc.text("1. REKAPITULASI KEHADIRAN (PRESENSI) & RINGKASAN BULANAN", 14, currentY);
    
    // 1.1 Ringkasan Umum Keseluruhan
    autoTable(doc, {
      startY: currentY + 3,
      head: [['Total KBM', 'Hadir', 'Sakit (S)', 'Izin (I)', 'Alpa (A)', 'Tingkat Kehadiran']],
      body: [[
        `${stats.totalJurnal} sesi`,
        `${stats.totalJurnal - stats.totalAbsen} sesi`,
        `${stats.sakit} kali`,
        `${stats.izin} kali`,
        `${stats.alpa} kali`,
        `${stats.attendanceRate}%`
      ]],
      theme: 'grid',
      headStyles: { fillColor: primaryColor, halign: 'center' },
      bodyStyles: { halign: 'center', fontStyle: 'bold' },
      margin: { top: 38, bottom: 42, left: 14, right: 14 }
    });

    let currentYMonthly = (doc as any).lastAutoTable.finalY + 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("1.2 RINGKASAN PRESENSI BULANAN", 14, currentYMonthly);

    // Calculate monthly attendance data automatically
    const getMonthlyStats = () => {
      let classJurnals = jurnal.filter(j => j.kelas === student.kelas);
      if (selectedMonth !== 'all') {
        classJurnals = classJurnals.filter(j => j.tanggal && j.tanggal.startsWith(selectedMonth));
      }
      const monthlyGroups: { [key: string]: { monthName: string; totalKBM: number; sakit: number; izin: number; alpa: number; timestamp: number } } = {};
      const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

      classJurnals.forEach(j => {
        if (!j.tanggal) return;
        const date = new Date(j.tanggal);
        const year = date.getFullYear();
        const monthIdx = date.getMonth();
        const key = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
        const monthName = `${monthNames[monthIdx]} ${year}`;

        if (!monthlyGroups[key]) {
          monthlyGroups[key] = {
            monthName,
            totalKBM: 0,
            sakit: 0,
            izin: 0,
            alpa: 0,
            timestamp: date.getTime()
          };
        }

        monthlyGroups[key].totalKBM++;
        if (j.siswa_sakit.includes(student.nama_siswa)) monthlyGroups[key].sakit++;
        if (j.siswa_izin.includes(student.nama_siswa)) monthlyGroups[key].izin++;
        if (j.siswa_alpa.includes(student.nama_siswa)) monthlyGroups[key].alpa++;
      });

      return Object.values(monthlyGroups)
        .sort((a, b) => a.timestamp - b.timestamp)
        .map(g => {
          const totalAbsen = g.sakit + g.izin + g.alpa;
          const hadir = g.totalKBM - totalAbsen;
          const attendanceRate = g.totalKBM > 0 ? Math.max(0, Math.round((hadir / g.totalKBM) * 100)) : 100;
          return {
            monthName: g.monthName,
            totalKBM: g.totalKBM,
            hadir,
            sakit: g.sakit,
            izin: g.izin,
            alpa: g.alpa,
            attendanceRate
          };
        });
    };

    const monthlyStats = getMonthlyStats();
    const monthlyRows = monthlyStats.map(m => [
      m.monthName,
      `${m.totalKBM} sesi`,
      `${m.hadir} sesi`,
      `${m.sakit} kali`,
      `${m.izin} kali`,
      `${m.alpa} kali`,
      `${m.attendanceRate}%`
    ]);

    autoTable(doc, {
      startY: currentYMonthly + 3,
      head: [['Bulan', 'Total KBM', 'Hadir', 'Sakit', 'Izin', 'Alpa', 'Tingkat Kehadiran']],
      body: monthlyRows.length > 0 ? monthlyRows : [['', '', '', '', '', '', '']],
      theme: 'striped',
      headStyles: { fillColor: [15, 118, 110], halign: 'center' }, // slate-700 / dark teal style
      bodyStyles: { halign: 'center' },
      columnStyles: {
        0: { halign: 'left', fontStyle: 'bold' }
      },
      margin: { top: 38, bottom: 42, left: 14, right: 14 }
    });

    let currentY2 = (doc as any).lastAutoTable.finalY + 12;

    // --- 6. EVALUASI AKADEMIK ---
    doc.setFont("helvetica", "bold");
    doc.text("2. EVALUASI AKADEMIK & KOMPETENSI", 14, currentY2);
    
    const studentPerkembanganAll = perkembangan
      .filter(p => p.id_siswa === student.id_siswa)
      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
    const studentPerkembangan = selectedMonth === 'all'
      ? studentPerkembanganAll
      : studentPerkembanganAll.filter(p => p.tanggal && p.tanggal.startsWith(selectedMonth));

    const akademikRows = studentPerkembangan.map((p, idx) => [
      idx + 1,
      formatDateID(p.tanggal),
      p.mata_pelajaran,
      p.kategori,
      p.deskripsi_perkembangan,
      p.nama_guru
    ]);

    autoTable(doc, {
      startY: currentY2 + 3,
      head: [['No', 'Tanggal', 'Mata Pelajaran', 'Kategori', 'Deskripsi Capaian', 'Guru']],
      body: akademikRows.length > 0 ? akademikRows : [['', '', '', '', '', '']],
      theme: 'striped',
      headStyles: { fillColor: primaryColor },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 24 },
        2: { cellWidth: 28 },
        3: { cellWidth: 24 },
        4: { cellWidth: 78 },
        5: { cellWidth: 28 }
      },
      margin: { top: 38, bottom: 42, left: 14, right: 14 }
    });

    let currentY3 = (doc as any).lastAutoTable.finalY + 12;

    // Check page break
    if (currentY3 > 215) {
      doc.addPage();
      currentY3 = 42;
    }

    // --- 7. CATATAN ADAB & PERILAKU ---
    doc.setFont("helvetica", "bold");
    doc.text("3. CATATAN ADAB & PERILAKU (AKHLAK)", 14, currentY3);

    const studentPerilakuAll = perilaku
      .filter(p => p.id_siswa === student.id_siswa)
      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
    const studentPerilaku = selectedMonth === 'all'
      ? studentPerilakuAll
      : studentPerilakuAll.filter(p => p.tanggal && p.tanggal.startsWith(selectedMonth));

    const perilakuRows = studentPerilaku.map((p, idx) => [
      idx + 1,
      formatDateID(p.tanggal),
      p.jenis_perilaku,
      p.deskripsi_perilaku,
      p.tindak_lanjut,
      p.nama_guru
    ]);

    autoTable(doc, {
      startY: currentY3 + 3,
      head: [['No', 'Tanggal', 'Jenis', 'Uraian Perilaku', 'Tindak Lanjut', 'Guru']],
      body: perilakuRows.length > 0 ? perilakuRows : [['', '', '', '', '', '']],
      theme: 'striped',
      headStyles: { fillColor: primaryColor },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 24 },
        2: { cellWidth: 22 },
        3: { cellWidth: 68 },
        4: { cellWidth: 48 },
        5: { cellWidth: 24 }
      },
      margin: { top: 38, bottom: 42, left: 14, right: 14 }
    });

    let currentY4 = (doc as any).lastAutoTable.finalY + 12;

    // Check page break
    if (currentY4 > 215) {
      doc.addPage();
      currentY4 = 42;
    }

    // --- 8. PRESTASI & PENGHARGAAN SANTRI ---
    doc.setFont("helvetica", "bold");
    doc.text("4. PRESTASI & PENGHARGAAN SANTRI", 14, currentY4);

    const studentPrestasiAll = (prestasi || [])
      .filter(p => p.id_siswa === student.id_siswa)
      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
    const studentPrestasi = selectedMonth === 'all'
      ? studentPrestasiAll
      : studentPrestasiAll.filter(p => p.tanggal && p.tanggal.startsWith(selectedMonth));

    const prestasiRows = studentPrestasi.map((p, idx) => [
      idx + 1,
      formatDateID(p.tanggal),
      p.nama_kompetisi,
      p.kategori,
      `${p.kategori_juara} (${p.tingkat})`,
      p.penyelenggara
    ]);

    autoTable(doc, {
      startY: currentY4 + 3,
      head: [['No', 'Tanggal', 'Nama Kompetisi / Prestasi', 'Kategori', 'Juara & Tingkat', 'Penyelenggara']],
      body: prestasiRows.length > 0 ? prestasiRows : [['', '', '', '', '', '']],
      theme: 'striped',
      headStyles: { fillColor: primaryColor },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 24 },
        2: { cellWidth: 54 },
        3: { cellWidth: 24 },
        4: { cellWidth: 36 },
        5: { cellWidth: 34 }
      },
      margin: { top: 38, bottom: 42, left: 14, right: 14 }
    });

    let currentY5_home = (doc as any).lastAutoTable.finalY + 12;

    // Check page break
    if (currentY5_home > 215) {
      doc.addPage();
      currentY5_home = 42;
    }

    // --- 9. LOG KUNJUNGAN RUMAH (HOME VISIT) ---
    doc.setFont("helvetica", "bold");
    doc.text("5. LOG KUNJUNGAN RUMAH (HOME VISIT)", 14, currentY5_home);

    const studentHomeVisitsAll = homeVisits
      .filter(v => v.id_siswa === student.id_siswa)
      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
    const studentHomeVisits = selectedMonth === 'all'
      ? studentHomeVisitsAll
      : studentHomeVisitsAll.filter(v => v.tanggal && v.tanggal.startsWith(selectedMonth));

    const visitRows = studentHomeVisits.map((v, idx) => [
      idx + 1,
      formatDateID(v.tanggal),
      v.alasan_kunjungan,
      v.hasil_kunjungan,
      v.tindak_lanjut,
      v.nama_guru
    ]);

    autoTable(doc, {
      startY: currentY5_home + 3,
      head: [['No', 'Tanggal Kunjungan', 'Alasan / Fokus Masalah', 'Hasil Diskusi / Solusi', 'Tindak Lanjut', 'Petugas']],
      body: visitRows.length > 0 ? visitRows : [['', '', '', '', '', '']],
      theme: 'striped',
      headStyles: { fillColor: primaryColor },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 24 },
        2: { cellWidth: 48 },
        3: { cellWidth: 54 },
        4: { cellWidth: 34 },
        5: { cellWidth: 22 }
      },
      margin: { top: 38, bottom: 42, left: 14, right: 14 }
    });

    // --- 10. DOKUMENTASI KUNJUNGAN RUMAH (PHOTOS APPENDIX) ---
    const loadedPhotos: { tanggal: string; label: string; base64: string }[] = [];
    for (const v of studentHomeVisits) {
      if (v.foto_1) {
        try {
          const b64 = await getCleanImageBase64(v.foto_1);
          if (b64) {
            loadedPhotos.push({ tanggal: v.tanggal, label: `Kunjungan - ${v.alasan_kunjungan}`, base64: b64 });
          }
        } catch (e) {
          console.error("Gagal memproses foto kunjungan:", e);
        }
      }
      if (v.foto_2) {
        try {
          const b64 = await getCleanImageBase64(v.foto_2);
          if (b64) {
            loadedPhotos.push({ tanggal: v.tanggal, label: `Kunjungan Tambahan - ${v.alasan_kunjungan}`, base64: b64 });
          }
        } catch (e) {
          console.error("Gagal memproses foto kunjungan:", e);
        }
      }
    }

    let currentY_photos = 0;
    if (loadedPhotos.length > 0) {
      doc.addPage();
      currentY_photos = 18;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 118, 110); // Teal accent
      doc.text("6. LAMPIRAN DOKUMENTASI VISUAL KUNJUNGAN RUMAH", 14, currentY_photos);
      currentY_photos += 8;

      const imgW = 85;
      const imgH = 55;

      for (let idx = 0; idx < loadedPhotos.length; idx += 2) {
        const p1 = loadedPhotos[idx];
        const p2 = loadedPhotos[idx + 1];

        if (currentY_photos + 68 > 280) {
          doc.addPage();
          currentY_photos = 18;
        }

        // Photo 1
        try {
          doc.addImage(p1.base64, 'JPEG', 14, currentY_photos, imgW, imgH);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(71, 85, 105);
          doc.text(`Tgl: ${formatDateID(p1.tanggal)} - ${p1.label.substring(0, 38)}...`, 14, currentY_photos + imgH + 4);
        } catch (err) {
          console.error(err);
        }

        // Photo 2
        if (p2) {
          try {
            doc.addImage(p2.base64, 'JPEG', 14 + imgW + 10, currentY_photos, imgW, imgH);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(71, 85, 105);
            doc.text(`Tgl: ${formatDateID(p2.tanggal)} - ${p2.label.substring(0, 38)}...`, 14 + imgW + 10, currentY_photos + imgH + 4);
          } catch (err) {
            console.error(err);
          }
        }

        currentY_photos += imgH + 12;
      }
    }

    // --- 11. SIGNATURE SECTION ---
    let currentY5 = 0;
    if (loadedPhotos.length > 0) {
      if (currentY_photos + 42 > 280) {
        doc.addPage();
        currentY5 = 18;
      } else {
        currentY5 = currentY_photos + 6;
      }
    } else {
      currentY5 = (doc as any).lastAutoTable.finalY + 15;
      if (currentY5 > 210) {
        doc.addPage();
        currentY5 = 42;
      }
    }

    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    
    const leftColX = 20;
    const rightColX = 130;
    
    doc.text("Mengetahui,", leftColX, currentY5);
    doc.text("Pandeglang, " + new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }), rightColX, currentY5);
    
    currentY5 += 6;
    doc.text("Orang Tua / Wali Santri,", leftColX, currentY5);
    doc.text("Wali Kelas,", rightColX, currentY5);
    
    currentY5 += 24; // space for physical signature
    doc.text("( _____________________ )", leftColX, currentY5);
    doc.text(`( ${user.nama_lengkap} )`, rightColX, currentY5);
  };

  // Export PDF for the currently selected student
  const handleExportPDF = async () => {
    if (!currentStudent) return;

    const doc = new jsPDF();
    await renderStudentReportOnDoc(doc, currentStudent, true);

    // --- Dynamic Multi-Page Footer Post-Processing Loop ---
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      if (i > 1) {
        drawKopSurat(doc);
      }
      drawFooter(doc, i, totalPages);
    }

    // Save PDF
    doc.save(`Rapor_Terpadu_${currentStudent.nama_siswa.replace(/\s+/g, '_')}_Kelas_${currentStudent.kelas}.pdf`);

    // Log Activity
    if (onLogActivity) {
      onLogActivity("Ekspor PDF Rapor", `Mengekspor Rapor Perkembangan Santri: ${currentStudent.nama_siswa} (Kelas ${currentStudent.kelas}) ke format PDF`);
    }
  };

  // Export PDF for ALL students in the class combined into a single file
  const handleExportClassPDF = async () => {
    if (classStudents.length === 0) return;

    try {
      const doc = new jsPDF();
      
      for (let sIdx = 0; sIdx < classStudents.length; sIdx++) {
        const student = classStudents[sIdx];
        setBulkProgress({ current: sIdx + 1, total: classStudents.length, name: student.nama_siswa });
        
        const isFirstSiswa = sIdx === 0;
        if (!isFirstSiswa) {
          doc.addPage();
        }

        await renderStudentReportOnDoc(doc, student, isFirstSiswa);
      }

      setBulkProgress({ current: classStudents.length, total: classStudents.length, name: "Memproses Halaman & Penomoran..." });

      // --- Dynamic Multi-Page Footer Post-Processing Loop ---
      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        if (i > 1) {
          drawKopSurat(doc);
        }
        drawFooter(doc, i, totalPages);
      }

      // Save Combined PDF
      doc.save(`Rapor_Terpadu_Satu_Kelas_${selectedClass}_TA_${activeTahunAjaran.replace(/\//g, '-')}.pdf`);

      // Log Activity
      if (onLogActivity) {
        onLogActivity(
          "Ekspor PDF Rapor Kelas", 
          `Mengekspor seluruh Rapor Perkembangan Rombel Kelas ${selectedClass} (${classStudents.length} Santri) ke format PDF Terpadu`
        );
      }
    } catch (err) {
      console.error("Gagal mengunduh rapor kelas:", err);
      alert("Terjadi kesalahan saat membuat dokumen PDF kelas. Silakan coba lagi.");
    } finally {
      setBulkProgress(null);
    }
  };

  // Export PDF for ALL students in the class, triggering multiple separate downloads sequentially
  const handleExportClassPDFSeparately = async () => {
    if (classStudents.length === 0) return;

    try {
      for (let sIdx = 0; sIdx < classStudents.length; sIdx++) {
        const student = classStudents[sIdx];
        setBulkProgress({ current: sIdx + 1, total: classStudents.length, name: student.nama_siswa });
        
        const doc = new jsPDF();
        await renderStudentReportOnDoc(doc, student, true);

        // --- Dynamic Multi-Page Footer Post-Processing Loop ---
        const totalPages = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          doc.setPage(i);
          if (i > 1) {
            drawKopSurat(doc);
          }
          drawFooter(doc, i, totalPages);
        }

        // Save individual student PDF
        doc.save(`Rapor_Terpadu_${student.nama_siswa.replace(/\s+/g, '_')}_Kelas_${student.kelas}.pdf`);
        
        // Wait 600ms between downloads to allow browser download queues to trigger reliably without popup block
        await new Promise(resolve => setTimeout(resolve, 600));
      }

      // Log Activity
      if (onLogActivity) {
        onLogActivity(
          "Ekspor PDF Rapor Terpisah", 
          `Mengekspor Rapor Perkembangan Rombel Kelas ${selectedClass} (${classStudents.length} Santri) ke format PDF Terpisah secara sekuensial`
        );
      }
    } catch (err) {
      console.error("Gagal mengunduh rapor kelas terpisah:", err);
      alert("Terjadi kesalahan saat membuat dokumen PDF. Silakan coba lagi.");
    } finally {
      setBulkProgress(null);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto" id="rapor_perkembangan_menu">
      {/* Top Title Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-5 gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
            <FileText className="text-teal-600 w-8 h-8" /> Rapor Perkembangan Santri
          </h2>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Portal rekapitulasi data perkembangan santri terpadu untuk Wali Kelas &amp; Admin.
          </p>
        </div>

        {(currentStudent || (['admin', 'pengawas', 'wali_kelas'].includes(user.role) && classStudents.length > 0)) && (
          <div className="flex flex-wrap gap-3 items-center">
            {['admin', 'pengawas', 'wali_kelas'].includes(user.role) && classStudents.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setIsBulkDropdownOpen(!isBulkDropdownOpen)}
                  className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-extrabold text-xs py-3.5 px-5 rounded-2xl shadow-md transition transform active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                  <Users className="w-4 h-4" /> UNDUH RAPOR KELAS ({classStudents.length} SANTRI)
                </button>
                {isBulkDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsBulkDropdownOpen(false)}></div>
                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-fade-in">
                      <button
                        onClick={() => {
                          setIsBulkDropdownOpen(false);
                          handleExportClassPDF();
                        }}
                        className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4 text-amber-500" /> Gabungkan Semua Rapor (1 File PDF)
                      </button>
                      <button
                        onClick={() => {
                          setIsBulkDropdownOpen(false);
                          handleExportClassPDFSeparately();
                        }}
                        className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-t border-slate-100"
                      >
                        <Download className="w-4 h-4 text-orange-500" /> Unduh Terpisah (Banyak File PDF)
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {currentStudent && (
              <>
                <button
                  onClick={() => setIsPreviewOpen(true)}
                  className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-extrabold text-xs py-3.5 px-5 rounded-2xl shadow-md transition transform active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                  <Eye className="w-4 h-4" /> LIHAT PRATINJAU RAPOR
                </button>
                <button
                  onClick={handleExportPDF}
                  className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-extrabold text-xs py-3.5 px-5 rounded-2xl shadow-md transition transform active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" /> CETAK RAPOR PDF
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Select Controls Box */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
        <div>
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Rombel Kelas</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full border border-slate-200 p-4 rounded-2xl text-sm font-bold bg-slate-50 text-slate-700 outline-none focus:ring-2 focus:ring-teal-400"
          >
            {authClasses.map(c => (
              <option key={c} value={c}>Kelas {c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Pilih Nama Santri</label>
          <select
            value={selectedSiswaId}
            onChange={(e) => setSelectedSiswaId(e.target.value)}
            className="w-full border border-slate-200 p-4 rounded-2xl text-sm font-bold bg-slate-50 text-slate-700 outline-none focus:ring-2 focus:ring-teal-400"
          >
            {classStudents.length === 0 ? (
              <option value="">-- Tidak ada santri --</option>
            ) : (
              classStudents.map(s => (
                <option key={s.id_siswa} value={s.id_siswa}>{s.nama_siswa} (Kelas {s.kelas})</option>
              ))
            )}
          </select>
        </div>

        <div>
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Pilih Bulan Rapor</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full border border-slate-200 p-4 rounded-2xl text-sm font-bold bg-slate-50 text-slate-700 outline-none focus:ring-2 focus:ring-teal-400"
          >
            <option value="all">Semua Bulan (Kumulatif)</option>
            {availableMonths.map(m => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Student Profile & Tabs */}
      {!currentStudent ? (
        <div className="bg-white rounded-[2.5rem] p-12 text-center border border-slate-100 shadow-sm flex flex-col items-center justify-center">
          <Users className="w-16 h-16 text-slate-200 mb-4" />
          <h3 className="text-lg font-black text-slate-700">Tidak Ada Santri Terpilih</h3>
          <p className="text-slate-400 text-sm mt-1">Silakan pilih kelas dan santri terlebih dahulu untuk memuat data perkembangan.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Side card - student brief & sections */}
          <div className="lg:col-span-1 space-y-4">
            {/* Brief card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-850 text-white rounded-[2rem] p-6 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-8 -mt-8"></div>
              
              <div className="w-14 h-14 rounded-2xl bg-teal-500/20 border border-teal-500/30 text-teal-400 flex items-center justify-center text-xl font-black mb-4">
                {currentStudent.nama_siswa.substring(0, 2).toUpperCase()}
              </div>

              <h3 className="text-xl font-black tracking-tight leading-tight mb-1 truncate" title={currentStudent.nama_siswa}>
                {currentStudent.nama_siswa}
              </h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                Kelas {currentStudent.kelas}
              </p>

              <div className="space-y-2.5 text-xs text-slate-300 pt-4 border-t border-slate-800">
                <div className="flex justify-between">
                  <span className="text-slate-500">Wali Santri:</span>
                  <span className="font-bold text-right truncate max-w-[120px]">{currentStudent.nama_wali || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Gender:</span>
                  <span className="font-bold">{currentStudent.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-slate-500">Kehadiran:</span>
                  <span className={`px-2 py-0.5 rounded-md font-extrabold text-[10px] ${
                    stats.attendanceRate >= 90 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                  }`}>
                    {stats.attendanceRate}%
                  </span>
                </div>
              </div>
            </div>

            {/* Menu Tabs Navigation */}
            <div className="bg-white p-3 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-1">
              <button
                onClick={() => setActiveTab('ringkasan')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-xs cursor-pointer transition ${
                  activeTab === 'ringkasan' ? 'bg-teal-50 text-teal-700 font-extrabold' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 shrink-0 text-teal-600" />
                  <span>Ringkasan Rapor</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>

              <button
                onClick={() => setActiveTab('presensi')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-xs cursor-pointer transition ${
                  activeTab === 'presensi' ? 'bg-teal-50 text-teal-700 font-extrabold' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 shrink-0 text-cyan-600" />
                  <span>Rekap Presensi</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>

              <button
                onClick={() => setActiveTab('akademik')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-xs cursor-pointer transition ${
                  activeTab === 'akademik' ? 'bg-teal-50 text-teal-700 font-extrabold' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 shrink-0 text-blue-600" />
                  <span>Evaluasi Akademik</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>

              <button
                onClick={() => setActiveTab('perilaku')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-xs cursor-pointer transition ${
                  activeTab === 'perilaku' ? 'bg-teal-50 text-teal-700 font-extrabold' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Smile className="w-4 h-4 shrink-0 text-pink-600" />
                  <span>Catatan Adab Perilaku</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>

              <button
                onClick={() => setActiveTab('homevisit')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-xs cursor-pointer transition ${
                  activeTab === 'homevisit' ? 'bg-teal-50 text-teal-700 font-extrabold' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Home className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>Kunjungan Rumah</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>

              <button
                onClick={() => setActiveTab('prestasi')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-xs cursor-pointer transition ${
                  activeTab === 'prestasi' ? 'bg-teal-50 text-teal-700 font-extrabold' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 shrink-0 text-amber-500" />
                  <span>Prestasi yang Diraih</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>
            </div>
          </div>

          {/* Right Area - Tab Detail View */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* 1. RINGKASAN RAPOR TAB */}
            {activeTab === 'ringkasan' && (
              <div className="space-y-6">
                {/* Statistics bento cards */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 col-span-2 sm:col-span-1">
                    <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-100 text-teal-600 flex items-center justify-center shrink-0">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Kepatuhan</span>
                      <p className="text-xl font-black text-slate-800">{stats.attendanceRate}%</p>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Evaluasi</span>
                      <p className="text-xl font-black text-slate-800">{studentPerkembangan.length} Log</p>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-pink-50 border border-pink-100 text-pink-600 flex items-center justify-center shrink-0">
                      <Smile className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Log Adab</span>
                      <p className="text-xl font-black text-slate-800">{studentPerilaku.length} Catatan</p>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                      <Award className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Prestasi</span>
                      <p className="text-xl font-black text-slate-800">{studentPrestasi.length} Raihan</p>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                      <Home className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Home Visit</span>
                      <p className="text-xl font-black text-slate-800">{studentHomeVisits.length} Kali</p>
                    </div>
                  </div>
                </div>

                {/* Grid of summaries */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Presensi brief */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-3">
                      <Calendar className="w-4 h-4 text-cyan-600" /> Presensi &amp; Ketidakhadiran
                    </h4>
                    <div className="flex justify-around py-2">
                      <div className="text-center">
                        <span className="text-2xl font-black text-amber-600">{stats.sakit}</span>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Sakit</p>
                      </div>
                      <div className="text-center border-x border-slate-100 px-8">
                        <span className="text-2xl font-black text-blue-600">{stats.izin}</span>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Izin</p>
                      </div>
                      <div className="text-center">
                        <span className="text-2xl font-black text-rose-600">{stats.alpa}</span>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Alpa</p>
                      </div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-[11px] font-bold text-slate-500 text-center">
                      Hadir sebanyak <span className="text-slate-800 font-extrabold">{stats.totalJurnal - stats.totalAbsen}</span> dari <span className="text-slate-800 font-extrabold">{stats.totalJurnal}</span> agenda KBM yang tercatat.
                    </div>
                  </div>

                  {/* Akhlak brief */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-3">
                      <Smile className="w-4 h-4 text-pink-600" /> Keseimbangan Adab &amp; Akhlak
                    </h4>
                    
                    {studentPerilaku.length === 0 ? (
                      <div className="text-center py-4 text-xs font-bold text-slate-400">Belum ada rekaman catatan adab</div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-emerald-600">Perilaku Positif:</span>
                          <span>{studentPerilaku.filter(p => p.jenis_perilaku === 'Positif').length} kali</span>
                        </div>
                        <div className="flex justify-between text-xs font-bold border-t border-slate-50 pt-2">
                          <span className="text-rose-500">Perlu Bimbingan:</span>
                          <span>{studentPerilaku.filter(p => p.jenis_perilaku === 'Negatif').length} kali</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div 
                            className="bg-emerald-500 h-2 rounded-full" 
                            style={{ 
                              width: `${(studentPerilaku.filter(p => p.jenis_perilaku === 'Positif').length / studentPerilaku.length) * 100}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Highlights of Akademik & Prestasi */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Highlight Log Akademik Terakhir */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-3">
                      <Award className="w-4 h-4 text-blue-600" /> Evaluasi Akademik Teranyar
                    </h4>

                    {studentPerkembangan.length === 0 ? (
                      <div className="text-center py-6 text-xs font-bold text-slate-400">Belum ada evaluasi kompetensi akademik</div>
                    ) : (
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100 uppercase truncate max-w-[180px]">
                            {studentPerkembangan[0].mata_pelajaran} - {studentPerkembangan[0].kategori}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold shrink-0">{formatDateID(studentPerkembangan[0].tanggal)}</span>
                        </div>
                        <p className="text-xs font-bold text-slate-700 leading-relaxed italic line-clamp-3">
                          "{studentPerkembangan[0].deskripsi_perkembangan}"
                        </p>
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase pt-1">
                          ✍ Pelapor: {studentPerkembangan[0].nama_guru}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Highlight Prestasi Terakhir */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-3">
                      <Award className="w-4 h-4 text-amber-500" /> Prestasi Gemilang Teranyar
                    </h4>

                    {studentPrestasi.length === 0 ? (
                      <div className="text-center py-6 text-xs font-bold text-slate-400">Belum ada prestasi tercatat</div>
                    ) : (
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100 uppercase truncate max-w-[180px]">
                            {studentPrestasi[0].kategori_juara} - {studentPrestasi[0].tingkat}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold shrink-0">{formatDateID(studentPrestasi[0].tanggal)}</span>
                        </div>
                        <p className="text-xs font-bold text-slate-800 leading-tight truncate">
                          {studentPrestasi[0].nama_kompetisi}
                        </p>
                        {studentPrestasi[0].deskripsi && (
                          <p className="text-xs font-medium text-slate-600 leading-relaxed italic line-clamp-2">
                            "{studentPrestasi[0].deskripsi}"
                          </p>
                        )}
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase pt-1">
                          🏆 Penyelenggara: {studentPrestasi[0].penyelenggara}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 2. TAB REKAP PRESENSI DETAIL */}
            {activeTab === 'presensi' && (
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-lg font-black text-slate-800">Detail Rekap Presensi</h3>
                  <p className="text-xs text-slate-400 font-medium">Log absen dan riwayat KBM yang terdeteksi absen.</p>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100/50">
                    <span className="text-3xl font-black text-amber-600">{stats.sakit}</span>
                    <p className="text-[10px] font-black text-slate-400 uppercase mt-1">Sakit (S)</p>
                  </div>
                  <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
                    <span className="text-3xl font-black text-blue-600">{stats.izin}</span>
                    <p className="text-[10px] font-black text-slate-400 uppercase mt-1">Izin (I)</p>
                  </div>
                  <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-100/50">
                    <span className="text-3xl font-black text-rose-600">{stats.alpa}</span>
                    <p className="text-[10px] font-black text-slate-400 uppercase mt-1">Alpa (A)</p>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">Daftar Absensi Tercatat</h4>
                  
                  {absentLogs.length === 0 ? (
                    <div className="text-center p-8 bg-slate-50 rounded-2xl text-xs font-bold text-slate-400">
                      👍 Alhamdulillah, santri hadir penuh pada semua agenda KBM.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
                      {absentLogs.map(j => {
                        const isSakit = j.siswa_sakit.includes(currentStudent.nama_siswa);
                        const isIzin = j.siswa_izin.includes(currentStudent.nama_siswa);
                        const status = isSakit ? 'Sakit' : isIzin ? 'Izin' : 'Alpa';
                        const colorClass = isSakit ? 'bg-amber-100 text-amber-700' : isIzin ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700';

                        return (
                          <div key={j.id_jurnal} className="py-3 flex justify-between items-center text-xs">
                            <div>
                              <p className="font-black text-slate-700">{j.mata_pelajaran}</p>
                              <p className="text-[10px] text-slate-400 font-medium">Jam {j.jam_ke || '-'} | Guru: {j.nama_guru}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] text-slate-400 font-bold">{formatDateID(j.tanggal)}</span>
                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${colorClass}`}>{status}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. TAB EVALUASI AKADEMIK DETAIL */}
            {activeTab === 'akademik' && (
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-lg font-black text-slate-800">Evaluasi Naratif Akademik</h3>
                  <p className="text-xs text-slate-400 font-medium">Laporan capaian kompetensi, materi ajar, dan keunggulan belajar.</p>
                </div>

                {studentPerkembangan.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Award className="w-12 h-12 mx-auto text-slate-200 mb-2" />
                    <p className="font-bold">Belum ada evaluasi akademik yang diinput untuk santri ini.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {studentPerkembangan.map(p => (
                      <div key={p.id_catatan} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 relative overflow-hidden transition hover:shadow-sm">
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500"></div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-black text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-lg uppercase text-[10px]">
                            {p.mata_pelajaran} - {p.kategori}
                          </span>
                          <span className="text-slate-400 font-bold flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" /> {formatDateID(p.tanggal)}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-700 leading-relaxed bg-white p-3.5 rounded-xl border border-slate-100/50">
                          {p.deskripsi_perkembangan}
                        </p>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">
                          ✍ Pelapor: {p.nama_guru}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 4. TAB CATATAN ADAB & PERILAKU */}
            {activeTab === 'perilaku' && (
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-lg font-black text-slate-800">Catatan Adab &amp; Perilaku</h3>
                  <p className="text-xs text-slate-400 font-medium">Pemantauan akhlak, kedisiplinan, ibadah harian, dan tindak lanjut guru.</p>
                </div>

                {studentPerilaku.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Smile className="w-12 h-12 mx-auto text-slate-200 mb-2" />
                    <p className="font-bold">Belum ada catatan perilaku yang direkam untuk santri ini.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {studentPerilaku.map(p => {
                      const isPos = p.jenis_perilaku === 'Positif';
                      const badgeColor = isPos ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100';
                      const sideColor = isPos ? 'bg-emerald-500' : 'bg-rose-500';

                      return (
                        <div key={p.id_catatan} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 relative overflow-hidden transition hover:shadow-sm">
                          <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${sideColor}`}></div>
                          
                          <div className="flex justify-between items-center text-xs">
                            <span className={`font-black border px-2.5 py-1 rounded-lg uppercase text-[10px] ${badgeColor}`}>
                              Perilaku {p.jenis_perilaku}
                            </span>
                            <span className="text-slate-400 font-bold flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" /> {formatDateID(p.tanggal)}
                            </span>
                          </div>

                          <p className="text-xs font-bold text-slate-800 leading-relaxed">
                            {p.deskripsi_perilaku}
                          </p>

                          {p.tindak_lanjut && (
                            <div className="bg-white p-3.5 rounded-xl border border-slate-100 text-xs text-slate-600 font-semibold">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Tindak Lanjut &amp; Solusi:</span>
                              {p.tindak_lanjut}
                            </div>
                          )}

                          <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-[10px]">
                            <span className="font-black text-slate-400 uppercase">✍ Pelapor: {p.nama_guru}</span>
                            <span className="font-extrabold text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase">{p.mata_pelajaran || 'Umum'}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 5. TAB KUNJUNGAN RUMAH DETAIL */}
            {activeTab === 'homevisit' && (
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-lg font-black text-slate-800">Log Kunjungan Rumah (Home Visit)</h3>
                  <p className="text-xs text-slate-400 font-medium">Dokumentasi kolaborasi madrasah dan orang tua santri dalam menyelesaikan hambatan belajar.</p>
                </div>

                {studentHomeVisits.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Home className="w-12 h-12 mx-auto text-slate-200 mb-2" />
                    <p className="font-bold">Belum ada catatan kunjungan rumah untuk santri ini.</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {studentHomeVisits.map(v => (
                      <div key={v.id_kunjungan} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-4 relative overflow-hidden transition hover:shadow-sm">
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-500"></div>
                        
                        <div className="flex justify-between items-center text-xs border-b border-slate-100 pb-2">
                          <span className="font-black text-slate-700 flex items-center gap-1">
                            🏠 Petugas: {v.nama_guru}
                          </span>
                          <span className="text-slate-400 font-bold flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" /> {formatDateID(v.tanggal)}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
                          <div className="space-y-1 bg-white p-3.5 rounded-xl border border-slate-100">
                            <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">Fokus Alasan Kunjungan:</span>
                            <p className="text-slate-800">{v.alasan_kunjungan}</p>
                          </div>

                          <div className="space-y-1 bg-white p-3.5 rounded-xl border border-slate-100">
                            <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">Hasil Diskusi &amp; Kepakatan:</span>
                            <p className="text-slate-800">{v.hasil_kunjungan}</p>
                          </div>
                        </div>

                        {v.tindak_lanjut && (
                          <div className="bg-amber-50/40 p-3.5 rounded-xl border border-amber-100/30 text-xs text-amber-900 font-semibold">
                            <span className="text-[9px] font-black text-amber-700/60 uppercase tracking-widest block mb-1">Rencana Tindak Lanjut Kolaborasi:</span>
                            {v.tindak_lanjut}
                          </div>
                        )}

                        {(v.foto_1 || v.foto_2) && (
                          <div className="flex gap-2 pt-2">
                            {v.foto_1 && (
                              <img src={v.foto_1} alt="Kunjungan 1" className="w-16 h-16 rounded-xl object-cover border border-slate-200" referrerPolicy="no-referrer" />
                            )}
                            {v.foto_2 && (
                              <img src={v.foto_2} alt="Kunjungan 2" className="w-16 h-16 rounded-xl object-cover border border-slate-200" referrerPolicy="no-referrer" />
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 6. TAB PRESTASI YANG DIRAIH */}
            {activeTab === 'prestasi' && (
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-lg font-black text-slate-800">Prestasi &amp; Penghargaan</h3>
                  <p className="text-xs text-slate-400 font-medium">Daftar kejuaraan, prestasi, dan apresiasi gemilang yang diraih oleh santri.</p>
                </div>

                {studentPrestasi.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Award className="w-12 h-12 mx-auto text-slate-200 mb-2" />
                    <p className="font-bold">Belum ada data prestasi yang tercatat untuk santri ini.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {studentPrestasi.map(p => (
                      <div key={p.id_prestasi} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 relative overflow-hidden transition hover:shadow-sm">
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-500"></div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-black text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-lg uppercase text-[10px]">
                            {p.kategori_juara} - Tingkat {p.tingkat}
                          </span>
                          <span className="text-slate-400 font-bold flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" /> {formatDateID(p.tanggal)}
                          </span>
                        </div>
                        
                        <div>
                          <h4 className="font-black text-slate-800 text-sm">{p.nama_kompetisi}</h4>
                          <p className="text-xs text-slate-500 font-semibold mt-0.5">Penyelenggara: {p.penyelenggara}</p>
                        </div>

                        {p.deskripsi && (
                          <p className="text-xs font-semibold text-slate-600 leading-relaxed bg-white p-3 rounded-xl border border-slate-100/50">
                            {p.deskripsi}
                          </p>
                        )}
                        
                        <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-[10px]">
                          <span className="font-black text-slate-400 uppercase">✍ Dicatat oleh: {p.created_by}</span>
                          <span className="font-extrabold text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase">{p.kategori}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}

      {/* 6. LIVE PREVIEW MODAL */}
      {isPreviewOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-6 overflow-y-auto">
          <div className="bg-slate-100 rounded-3xl shadow-2xl border border-slate-200 max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-white px-6 py-4 border-b border-slate-200 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
                  <Eye className="w-5 h-5 text-indigo-600" /> Pratinjau Formatted Rapor Perkembangan
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-bold">
                  Menampilkan layout cetak fisik A4 yang akan diterbitkan.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleExportPDF}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2 px-4 rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> CETAK RAPOR PDF
                </button>
                <button
                  onClick={() => setIsPreviewOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs py-2 px-4 rounded-xl border border-slate-200 transition cursor-pointer"
                >
                  TUTUP
                </button>
              </div>
            </div>

            {/* Modal Scrollable Workspace */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 flex justify-center bg-slate-500/10">
              {/* Virtual A4 Sheet Document */}
              <div className="bg-white w-full max-w-[210mm] min-h-[297mm] p-10 md:p-14 shadow-xl rounded-sm border border-slate-200 text-slate-800 select-none flex flex-col justify-between font-sans">
                <div>
                  {/* Document Title */}
                  <div className="text-center mb-8 border-b-2 border-slate-800 pb-4">
                    <h3 className="text-sm font-black text-slate-900 tracking-tight uppercase">Rapor Perkembangan Santri Terpadu</h3>
                    <h4 className="text-xs font-black text-slate-700 tracking-widest uppercase mt-1">MTs Ibad Ar Rahman</h4>
                    <p className="text-[11px] font-bold text-slate-500 mt-1 uppercase tracking-wide">Tahun Ajaran: {activeTahunAjaran}</p>
                  </div>

                  {/* Identitas Santri */}
                  <div className="mb-6 bg-slate-50/50 p-4 rounded-xl border border-slate-200/50">
                    <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2.5 pb-1 border-b border-slate-200/50">Identitas Santri</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-xs">
                      <div className="flex justify-between border-b border-slate-100 pb-1">
                        <span className="text-slate-400 font-bold">Nama Lengkap:</span>
                        <span className="text-slate-800 font-black text-right">{currentStudent?.nama_siswa}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1">
                        <span className="text-slate-400 font-bold">Tanggal Cetak:</span>
                        <span className="text-slate-800 font-black text-right">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1">
                        <span className="text-slate-400 font-bold">Kelas Rombel:</span>
                        <span className="text-slate-800 font-black text-right">Kelas {currentStudent?.kelas}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1">
                        <span className="text-slate-400 font-bold">Peran Pencetak:</span>
                        <span className="text-slate-800 font-black text-right capitalize">{user.nama_lengkap} ({user.role.replace('_', ' ')})</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1">
                        <span className="text-slate-400 font-bold">Nama Wali:</span>
                        <span className="text-slate-800 font-black text-right">{currentStudent?.nama_wali || '-'}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1">
                        <span className="text-slate-400 font-bold">Tahun Pelajaran:</span>
                        <span className="text-slate-800 font-black text-right">{activeTahunAjaran}</span>
                      </div>
                    </div>
                  </div>

                  {/* Section 1: REKAPITULASI KEHADIRAN */}
                  <div className="mb-6 space-y-4">
                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-wider border-b-2 border-slate-800 pb-1">1. Rekapitulasi Kehadiran &amp; Ringkasan Bulanan</h4>
                    
                    <div className="overflow-hidden rounded-lg border border-slate-200">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-teal-600 text-white font-black text-[10px] uppercase tracking-wider">
                            <th className="p-2 border-r border-teal-500 text-center">Total KBM</th>
                            <th className="p-2 border-r border-teal-500 text-center">Hadir</th>
                            <th className="p-2 border-r border-teal-500 text-center">Sakit (S)</th>
                            <th className="p-2 border-r border-teal-500 text-center">Izin (I)</th>
                            <th className="p-2 border-r border-teal-500 text-center">Alpa (A)</th>
                            <th className="p-2 text-center">Tingkat Kehadiran</th>
                          </tr>
                        </thead>
                        <tbody className="text-slate-700 font-bold text-center">
                          <tr className="bg-white">
                            <td className="p-2.5 border-t border-r border-slate-200">{stats.totalJurnal} sesi</td>
                            <td className="p-2.5 border-t border-r border-slate-200">{stats.totalJurnal - stats.totalAbsen} sesi</td>
                            <td className="p-2.5 border-t border-r border-slate-200 text-amber-600">{stats.sakit} kali</td>
                            <td className="p-2.5 border-t border-r border-slate-200 text-blue-600">{stats.izin} kali</td>
                            <td className="p-2.5 border-t border-r border-slate-200 text-rose-600">{stats.alpa} kali</td>
                            <td className="p-2.5 border-t bg-teal-50/50 text-teal-700 font-black">{stats.attendanceRate}%</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="space-y-1.5">
                      <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">1.2 Ringkasan Presensi Bulanan</h5>
                      <div className="overflow-hidden rounded-lg border border-slate-200">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-700 text-white font-black text-[10px] uppercase tracking-wider">
                              <th className="p-2 border-r border-slate-600">Bulan</th>
                              <th className="p-2 border-r border-slate-600 text-center">Total KBM</th>
                              <th className="p-2 border-r border-slate-600 text-center">Hadir</th>
                              <th className="p-2 border-r border-slate-600 text-center">Sakit</th>
                              <th className="p-2 border-r border-slate-600 text-center">Izin</th>
                              <th className="p-2 border-r border-slate-600 text-center">Alpa</th>
                              <th className="p-2 text-center">Kehadiran</th>
                            </tr>
                          </thead>
                          <tbody className="text-slate-700 text-center font-semibold">
                            {getMonthlyStats().length === 0 ? (
                              <tr>
                                <td colSpan={7} className="p-3 border-t h-9"></td>
                              </tr>
                            ) : (
                              getMonthlyStats().map((m, idx) => (
                                <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                                  <td className="p-2 border-t border-r border-slate-200 text-left font-bold">{m.monthName}</td>
                                  <td className="p-2 border-t border-r border-slate-200">{m.totalKBM} sesi</td>
                                  <td className="p-2 border-t border-r border-slate-200">{m.hadir} sesi</td>
                                  <td className="p-2 border-t border-r border-slate-200 text-amber-600">{m.sakit} kali</td>
                                  <td className="p-2 border-t border-r border-slate-200 text-blue-600">{m.izin} kali</td>
                                  <td className="p-2 border-t border-r border-slate-200 text-rose-600">{m.alpa} kali</td>
                                  <td className="p-2 border-t font-black text-slate-800">{m.attendanceRate}%</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: EVALUASI AKADEMIK */}
                  <div className="mb-6 space-y-2">
                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-wider border-b-2 border-slate-800 pb-1">2. Evaluasi Akademik &amp; Kompetensi</h4>
                    <div className="overflow-hidden rounded-lg border border-slate-200">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-teal-600 text-white font-black text-[10px] uppercase tracking-wider">
                            <th className="p-2 border-r border-teal-500 text-center w-8">No</th>
                            <th className="p-2 border-r border-teal-500 w-24">Tanggal</th>
                            <th className="p-2 border-r border-teal-500 w-32">Mata Pelajaran</th>
                            <th className="p-2 border-r border-teal-500 w-24">Kategori</th>
                            <th className="p-2 border-r border-teal-500">Deskripsi Capaian</th>
                            <th className="p-2 w-28">Guru</th>
                          </tr>
                        </thead>
                        <tbody className="text-slate-700">
                          {studentPerkembangan.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-3 border-t h-9"></td>
                            </tr>
                          ) : (
                            studentPerkembangan.map((p, idx) => (
                              <tr key={p.id_catatan} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                                <td className="p-2 border-t border-r border-slate-200 text-center font-bold">{idx + 1}</td>
                                <td className="p-2 border-t border-r border-slate-200 font-medium whitespace-nowrap">{formatDateID(p.tanggal)}</td>
                                <td className="p-2 border-t border-r border-slate-200 font-bold text-slate-800">{p.mata_pelajaran}</td>
                                <td className="p-2 border-t border-r border-slate-200"><span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 text-[9px] font-black uppercase">{p.kategori}</span></td>
                                <td className="p-2 border-t border-r border-slate-200 leading-relaxed text-slate-600 font-medium text-[11px]">{p.deskripsi_perkembangan}</td>
                                <td className="p-2 border-t font-bold text-slate-500 text-[10px] whitespace-nowrap truncate max-w-[112px]" title={p.nama_guru}>{p.nama_guru}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Section 3: CATATAN ADAB & PERILAKU */}
                  <div className="mb-6 space-y-2">
                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-wider border-b-2 border-slate-800 pb-1">3. Catatan Adab &amp; Perilaku (Akhlak)</h4>
                    <div className="overflow-hidden rounded-lg border border-slate-200">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-teal-600 text-white font-black text-[10px] uppercase tracking-wider">
                            <th className="p-2 border-r border-teal-500 text-center w-8">No</th>
                            <th className="p-2 border-r border-teal-500 w-24">Tanggal</th>
                            <th className="p-2 border-r border-teal-500 w-24">Jenis</th>
                            <th className="p-2 border-r border-teal-500">Uraian Perilaku</th>
                            <th className="p-2 border-r border-teal-500">Tindak Lanjut</th>
                            <th className="p-2 w-28">Guru</th>
                          </tr>
                        </thead>
                        <tbody className="text-slate-700">
                          {studentPerilaku.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-3 border-t h-9"></td>
                            </tr>
                          ) : (
                            studentPerilaku.map((p, idx) => (
                              <tr key={p.id_catatan} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                                <td className="p-2 border-t border-r border-slate-200 text-center font-bold">{idx + 1}</td>
                                <td className="p-2 border-t border-r border-slate-200 font-medium whitespace-nowrap">{formatDateID(p.tanggal)}</td>
                                <td className="p-2 border-t border-r border-slate-200">
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                                    p.jenis_perilaku === 'Positif' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                                  }`}>{p.jenis_perilaku}</span>
                                </td>
                                <td className="p-2 border-t border-r border-slate-200 leading-relaxed text-slate-600 font-medium text-[11px]">{p.deskripsi_perilaku}</td>
                                <td className="p-2 border-t border-r border-slate-200 leading-relaxed text-slate-600 font-medium text-[11px]">{p.tindak_lanjut || '-'}</td>
                                <td className="p-2 border-t font-bold text-slate-500 text-[10px] whitespace-nowrap truncate max-w-[112px]" title={p.nama_guru}>{p.nama_guru}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Section 4: PRESTASI & PENGHARGAAN SANTRI */}
                  <div className="mb-6 space-y-2">
                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-wider border-b-2 border-slate-800 pb-1">4. Prestasi &amp; Penghargaan Santri</h4>
                    <div className="overflow-hidden rounded-lg border border-slate-200">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-teal-600 text-white font-black text-[10px] uppercase tracking-wider">
                            <th className="p-2 border-r border-teal-500 text-center w-8">No</th>
                            <th className="p-2 border-r border-teal-500 w-24">Tanggal</th>
                            <th className="p-2 border-r border-teal-500">Nama Kompetisi / Prestasi</th>
                            <th className="p-2 border-r border-teal-500 w-24">Kategori</th>
                            <th className="p-2 border-r border-teal-500 w-44">Juara &amp; Tingkat</th>
                            <th className="p-2 w-32">Penyelenggara</th>
                          </tr>
                        </thead>
                        <tbody className="text-slate-700">
                          {studentPrestasi.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-3 border-t h-9"></td>
                            </tr>
                          ) : (
                            studentPrestasi.map((p, idx) => (
                              <tr key={p.id_prestasi} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                                <td className="p-2 border-t border-r border-slate-200 text-center font-bold">{idx + 1}</td>
                                <td className="p-2 border-t border-r border-slate-200 font-medium whitespace-nowrap">{formatDateID(p.tanggal)}</td>
                                <td className="p-2 border-t border-r border-slate-200 font-bold text-slate-800">{p.nama_kompetisi}</td>
                                <td className="p-2 border-t border-r border-slate-200 font-semibold">{p.kategori}</td>
                                <td className="p-2 border-t border-r border-slate-200"><span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100 text-[9px] font-black uppercase">{p.kategori_juara} ({p.tingkat})</span></td>
                                <td className="p-2 border-t font-bold text-slate-500 text-[10px]" title={p.penyelenggara}>{p.penyelenggara}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Section 5: KUNJUNGAN RUMAH */}
                  <div className="mb-6 space-y-2">
                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-wider border-b-2 border-slate-800 pb-1">5. Log Kunjungan Rumah (Home Visit)</h4>
                    <div className="overflow-hidden rounded-lg border border-slate-200">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-teal-600 text-white font-black text-[10px] uppercase tracking-wider">
                            <th className="p-2 border-r border-teal-500 text-center w-8">No</th>
                            <th className="p-2 border-r border-teal-500 w-24">Tanggal</th>
                            <th className="p-2 border-r border-teal-500">Alasan / Fokus Masalah</th>
                            <th className="p-2 border-r border-teal-500">Hasil Diskusi / Solusi</th>
                            <th className="p-2 border-r border-teal-500">Tindak Lanjut</th>
                            <th className="p-2 w-28">Petugas</th>
                          </tr>
                        </thead>
                        <tbody className="text-slate-700">
                          {studentHomeVisits.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-3 border-t h-9"></td>
                            </tr>
                          ) : (
                            studentHomeVisits.map((v, idx) => (
                              <tr key={v.id_kunjungan} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                                <td className="p-2 border-t border-r border-slate-200 text-center font-bold">{idx + 1}</td>
                                <td className="p-2 border-t border-r border-slate-200 font-medium whitespace-nowrap">{formatDateID(v.tanggal)}</td>
                                <td className="p-2 border-t border-r border-slate-200 leading-relaxed text-slate-600 font-medium text-[11px]">{v.alasan_kunjungan}</td>
                                <td className="p-2 border-t border-r border-slate-200 leading-relaxed text-slate-600 font-medium text-[11px]">{v.hasil_kunjungan}</td>
                                <td className="p-2 border-t border-r border-slate-200 leading-relaxed text-slate-600 font-medium text-[11px]">{v.tindak_lanjut || '-'}</td>
                                <td className="p-2 border-t font-bold text-slate-500 text-[10px] whitespace-nowrap truncate max-w-[112px]" title={v.nama_guru}>{v.nama_guru}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Section 6: LAMPIRAN DOKUMENTASI VISUAL */}
                  {studentHomeVisits.some(v => v.foto_1 || v.foto_2) && (
                    <div className="mb-6 space-y-3">
                      <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-wider border-b-2 border-slate-800 pb-1">6. Lampiran Dokumentasi Visual Kunjungan Rumah</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {studentHomeVisits.map(v => (
                          <React.Fragment key={v.id_kunjungan}>
                            {v.foto_1 && (
                              <div className="border border-slate-200 p-2 rounded-xl bg-slate-50 flex flex-col items-center">
                                <img src={v.foto_1} alt="Dokumentasi Kunjungan" className="w-full h-32 object-cover rounded-lg border border-slate-200" referrerPolicy="no-referrer" />
                                <p className="text-[9px] text-slate-500 font-extrabold mt-1.5 uppercase">Kunjungan - {formatDateID(v.tanggal)}</p>
                              </div>
                            )}
                            {v.foto_2 && (
                              <div className="border border-slate-200 p-2 rounded-xl bg-slate-50 flex flex-col items-center">
                                <img src={v.foto_2} alt="Dokumentasi Kunjungan" className="w-full h-32 object-cover rounded-lg border border-slate-200" referrerPolicy="no-referrer" />
                                <p className="text-[9px] text-slate-500 font-extrabold mt-1.5 uppercase">Kunjungan Tambahan - {formatDateID(v.tanggal)}</p>
                              </div>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Signature Section */}
                <div className="mt-12 grid grid-cols-2 text-[11px] font-semibold pt-6 border-t border-slate-200">
                  <div className="space-y-16">
                    <div>
                      <p className="text-slate-500">Mengetahui,</p>
                      <p className="text-slate-900 font-black mt-1">Orang Tua / Wali Santri,</p>
                    </div>
                    <p className="text-slate-500 font-bold">( ___________________________ )</p>
                  </div>
                  <div className="space-y-16 text-right">
                    <div>
                      <p className="text-slate-500">Pandeglang, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      <p className="text-slate-900 font-black mt-1">Wali Kelas,</p>
                    </div>
                    <p className="text-slate-900 font-black">( {user.nama_lengkap} )</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {bulkProgress && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[9999] flex flex-col items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-2xl max-w-md w-full text-center space-y-6 animate-scale-up">
            <div className="flex justify-center">
              <div className="relative flex items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-amber-500"></div>
                <Users className="w-6 h-6 text-amber-600 absolute" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-800">Menyiapkan Rapor Kelas {selectedClass}</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Mohon tunggu beberapa saat...</p>
            </div>
            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200/50">
                <div 
                  className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-wider">
                <span>Proses: {bulkProgress.current} / {bulkProgress.total} Santri</span>
                <span>{Math.round((bulkProgress.current / bulkProgress.total) * 100)}%</span>
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-100/50 p-3 rounded-2xl">
              <p className="text-[11px] font-bold text-slate-600">Sedang memproses:</p>
              <p className="text-xs font-black text-amber-700 mt-0.5">{bulkProgress.name}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
