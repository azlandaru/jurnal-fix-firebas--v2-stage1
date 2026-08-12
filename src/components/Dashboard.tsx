import React, { useState } from 'react';
import { User, Siswa, Jurnal, Administrasi, CatatanPerilaku, CatatanPerkembangan, HomeVisit, Jadwal, MadrasahEvent, Prestasi, SystemSettings, getTeacherClasses } from '../types';
import { MENU_CONFIG, MENU_CATEGORIES, isMenuVisibleForUser } from '../App';
import { 
  GraduationCap, Crown, ChevronRight, BookOpen, Settings, Save, 
  Calendar, Clock, AlertCircle, BarChart3, Bell, ClipboardCheck, 
  FileText, Activity, Users2, ShieldCheck, ArrowUpRight
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

interface DashboardProps {
  user: User;
  siswa: Siswa[];
  tahunAjaran: string;
  batasWaktuAdministrasi?: string;
  semester?: 'Ganjil' | 'Genap';
  namaKepalaMadrasah?: string;
  settings?: SystemSettings;
  onUpdateSettings?: (settings: SystemSettings) => void;
  onNavigate: (menuId: string) => void;
  jurnal?: Jurnal[];
  administrasi?: Administrasi[];
  perilaku?: CatatanPerilaku[];
  perkembangan?: CatatanPerkembangan[];
  homeVisit?: HomeVisit[];
  users?: User[];
  jadwal?: Jadwal[];
  events?: MadrasahEvent[];
  prestasi?: Prestasi[];
}

export const Dashboard: React.FC<DashboardProps> = ({
  user,
  siswa,
  tahunAjaran,
  batasWaktuAdministrasi,
  semester = 'Ganjil',
  namaKepalaMadrasah,
  settings,
  onUpdateSettings,
  onNavigate,
  jurnal = [],
  administrasi = [],
  perilaku = [],
  perkembangan = [],
  homeVisit = [],
  users = [],
  jadwal = [],
  events = [],
  prestasi = []
}) => {
  const [localTahunAjaran, setLocalTahunAjaran] = useState(tahunAjaran);
  const [localBatasWaktu, setLocalBatasWaktu] = useState(batasWaktuAdministrasi || '2026-06-30');
  const [localSemester, setLocalSemester] = useState<'Ganjil' | 'Genap'>(semester);
  const [localNamaKepala, setLocalNamaKepala] = useState(namaKepalaMadrasah || 'Ustadz H. Ahmad Hambali, Lc.');
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeRoleControlTab, setActiveRoleControlTab] = useState<'guru' | 'wali_kelas'>('guru');

  React.useEffect(() => {
    if (namaKepalaMadrasah) {
      setLocalNamaKepala(namaKepalaMadrasah);
    }
  }, [namaKepalaMadrasah]);

  // For Wali Santri dashboard monitoring
  const [selectedChildId, setSelectedChildId] = useState<string>(() => {
    const childIds = user.role === 'wali' && user.id_referensi 
      ? user.id_referensi.split(',').map(x => x.trim()) 
      : [];
    return childIds[0] || '';
  });
  const [waliTab, setWaliTab] = useState<'jadwal' | 'presensi'>('jadwal');
  const [dashboardLightbox, setDashboardLightbox] = useState<{ url: string; title: string } | null>(null);

  // Helpers to fetch Wali Kelas details or Class list
  const getWaliClass = () => {
    if (user.role === 'wali_kelas' && user.id_referensi) {
      const w = user.id_referensi.split('|').find(x => x.startsWith('WALI:'));
      if (w) return w.replace('WALI:', '');
    }
    return null;
  };

  const getAuthorizedClasses = () => {
    const activeSiswa = siswa.filter(s => s.kelas && !s.kelas.includes('Lulus') && !s.kelas.includes('Alumni'));
    const activeClassList = [...new Set(activeSiswa.map(s => s.kelas))].filter(Boolean).sort();
    if (['admin', 'pengawas'].includes(user.role)) {
      return activeClassList;
    }
    if (user.role === 'wali') {
      const childIds = user.id_referensi ? user.id_referensi.split(',').map(x => x.trim()) : [];
      const myChildren = activeSiswa.filter(s => childIds.includes(s.id_siswa));
      return [...new Set(myChildren.map(s => s.kelas))].filter(Boolean).sort();
    }
    if (['guru', 'wali_kelas'].includes(user.role)) {
      const teacherClasses = getTeacherClasses(user);
      const res = teacherClasses.filter(k => activeClassList.includes(k)).sort();
      if (res.length > 0) return res;
      return teacherClasses;
    }
    return activeClassList;
  };

  const wC = getWaliClass();
  const authClasses = getAuthorizedClasses();

  // Parse children if Wali role
  const childIds = user.role === 'wali' ? (user.id_referensi ? user.id_referensi.split(',').map(x => x.trim()) : []) : [];
  const myChildren = siswa.filter(s => childIds.includes(s.id_siswa));

  // Calculate teacher submission stats for Admin
  const getTeacherStats = () => {
    const teachersList = users.filter(u => u.role === 'guru' || u.role === 'wali_kelas');
    return teachersList.map(t => {
      const jCount = jurnal.filter(j => j.nama_guru === t.nama_lengkap).length;
      const aCount = administrasi.filter(a => a.nama_guru === t.nama_lengkap).length;
      const pCount = perilaku.filter(p => p.nama_guru === t.nama_lengkap).length;
      const hCount = homeVisit.filter(h => h.nama_guru === t.nama_lengkap).length;
      return {
        nama: t.nama_lengkap,
        username: t.username,
        role: t.role === 'wali_kelas' ? 'Wali Kelas' : 'Guru Pengampu',
        jurnalCount: jCount,
        administrasiCount: aCount,
        perilakuCount: pCount,
        homeVisitCount: hCount,
        totalCount: jCount + aCount + pCount + hCount
      };
    }).sort((a, b) => b.totalCount - a.totalCount);
  };

  const teacherStats = getTeacherStats();

  // Get upcoming events within the next 7 days
  const getUpcomingEvents = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(today.getDate() + 7);
    sevenDaysLater.setHours(23, 59, 59, 999);

    return events.filter(e => {
      if (!e.tanggal) return false;
      const eventDate = new Date(e.tanggal);
      eventDate.setHours(12, 0, 0, 0); // avoid timezone issues
      return eventDate >= today && eventDate <= sevenDaysLater;
    }).sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());
  };

  // Calculate teachers who are late submitting administration
  const getLateTeachers = () => {
    if (!batasWaktuAdministrasi) return [];
    const deadline = new Date(batasWaktuAdministrasi).getTime();
    const teachersList = users.filter(u => u.role === 'guru' || u.role === 'wali_kelas');
    
    return teachersList.filter(t => {
      const files = administrasi.filter(a => a.nama_guru === t.nama_lengkap);
      if (files.length === 0) return true; // Late, no submissions at all
      
      // Check if they have ANY submission BEFORE or ON deadline
      const hasOnTime = files.some(f => {
        const fileDate = new Date(f.tanggal).getTime();
        return fileDate <= deadline;
      });
      return !hasOnTime; // Late if they have no on-time submissions
    });
  };

  const lateTeachers = getLateTeachers();

  // Helper to parse student absence count from standard string formats (e.g. "2 (Ahmad, Budi)" -> 2)
  const getAbsenceCount = (val: string | undefined): number => {
    if (!val || val === '-') return 0;
    const num = parseInt(val, 10);
    return isNaN(num) ? 0 : num;
  };

  // Get attendance recap data for classes
  const getAttendanceRecapData = () => {
    const allClasses = [...new Set(siswa.filter(s => !s.kelas.includes('Lulus') && !s.kelas.includes('Alumni')).map(s => s.kelas))].filter(Boolean).sort();
    
    return allClasses.map(kelas => {
      const classJournals = jurnal.filter(j => j.kelas === kelas);
      let sakit = 0;
      let izin = 0;
      let alpa = 0;

      classJournals.forEach(j => {
        sakit += getAbsenceCount(j.siswa_sakit);
        izin += getAbsenceCount(j.siswa_izin);
        alpa += getAbsenceCount(j.siswa_alpa);
      });

      return {
        name: `Kelas ${kelas}`,
        Sakit: sakit,
        Izin: izin,
        Alpa: alpa,
        Total: sakit + izin + alpa
      };
    });
  };

  const attendanceRecapData = getAttendanceRecapData();
  const totalSakitAll = attendanceRecapData.reduce((sum, item) => sum + item.Sakit, 0);
  const totalIzinAll = attendanceRecapData.reduce((sum, item) => sum + item.Izin, 0);
  const totalAlpaAll = attendanceRecapData.reduce((sum, item) => sum + item.Alpa, 0);
  const grandTotalAbsen = totalSakitAll + totalIzinAll + totalAlpaAll;

  // Calculate total students per class for Recharts visualization
  const getStudentsPerClassData = () => {
    const activeStudents = siswa.filter(s => !s.kelas.includes('Lulus') && !s.kelas.includes('Alumni'));
    const counts: { [kelas: string]: number } = {};
    
    activeStudents.forEach(s => {
      const k = s.kelas ? s.kelas.trim() : 'Lainnya';
      if (k) {
        counts[k] = (counts[k] || 0) + 1;
      }
    });

    const sortedClasses = Object.keys(counts).sort((a, b) => 
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );

    return sortedClasses.map(k => ({
      name: `Kelas ${k}`,
      shortName: k,
      'Jumlah Santri': counts[k]
    }));
  };

  const studentsPerClassData = getStudentsPerClassData();

  // Get student achievements count by category
  const getPrestasiByCategoryData = () => {
    const categoriesList = ['Akademik', 'Tahfidz', 'Robotik', 'Agama', 'Sains', 'Teknologi', 'Bahasa', 'Design', 'Non Akademik'];
    const counts: { [key: string]: number } = {};
    categoriesList.forEach(c => counts[c] = 0);

    prestasi.forEach(p => {
      const cat = p.kategori || 'Lainnya';
      counts[cat] = (counts[cat] || 0) + 1;
    });

    return Object.entries(counts).map(([kategori, jumlah]) => ({
      name: kategori,
      'Jumlah Prestasi': jumlah,
    }));
  };

  const prestasiCategoryData = getPrestasiByCategoryData();

  // Get monthly student attendance trend data based on journals
  const getMonthlyAttendanceStats = () => {
    const monthlyGroups: { 
      [key: string]: { 
        monthName: string; 
        totalSakit: number;
        totalIzin: number;
        totalAlpa: number;
        totalHadir: number;
        totalSiswaSesi: number;
        timestamp: number; 
      } 
    } = {};
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    jurnal.forEach(j => {
      if (!j.tanggal) return;
      const date = new Date(j.tanggal);
      const year = date.getFullYear();
      const monthIdx = date.getMonth();
      const key = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
      const monthName = `${monthNames[monthIdx]} ${year}`;

      const classSize = siswa.filter(s => s.kelas === j.kelas).length || 20;
      const sakit = getAbsenceCount(j.siswa_sakit);
      const izin = getAbsenceCount(j.siswa_izin);
      const alpa = getAbsenceCount(j.siswa_alpa);
      const absent = sakit + izin + alpa;
      const hadir = Math.max(0, classSize - absent);

      if (!monthlyGroups[key]) {
        monthlyGroups[key] = {
          monthName,
          totalSakit: 0,
          totalIzin: 0,
          totalAlpa: 0,
          totalHadir: 0,
          totalSiswaSesi: 0,
          timestamp: date.getTime()
        };
      }

      monthlyGroups[key].totalSakit += sakit;
      monthlyGroups[key].totalIzin += izin;
      monthlyGroups[key].totalAlpa += alpa;
      monthlyGroups[key].totalHadir += hadir;
      monthlyGroups[key].totalSiswaSesi += classSize;
    });

    const sortedStats = Object.values(monthlyGroups)
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(g => {
        const attendanceRate = g.totalSiswaSesi > 0 
          ? Math.round((g.totalHadir / g.totalSiswaSesi) * 100) 
          : 100;
        return {
          month: g.monthName,
          'Kehadiran (%)': attendanceRate,
          'Sakit (S)': g.totalSakit,
          'Izin (I)': g.totalIzin,
          'Alpa (A)': g.totalAlpa,
          'Hadir (H)': g.totalHadir
        };
      });

    if (sortedStats.length === 0) {
      const now = new Date();
      const fallbackStats = [];
      for (let i = 3; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        fallbackStats.push({
          month: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
          'Kehadiran (%)': 95 - i,
          'Sakit (S)': 2,
          'Izin (I)': 1,
          'Alpa (A)': 0,
          'Hadir (H)': 100
        });
      }
      return fallbackStats;
    }

    return sortedStats;
  };

  const monthlyAttendanceData = getMonthlyAttendanceStats();

  // Get monthly student achievements trend data
  const getMonthlyPrestasiStats = () => {
    const monthlyGroups: { 
      [key: string]: { 
        monthName: string; 
        totalPrestasi: number;
        timestamp: number; 
      } 
    } = {};
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    prestasi.forEach(p => {
      if (!p.tanggal) return;
      const date = new Date(p.tanggal);
      const year = date.getFullYear();
      const monthIdx = date.getMonth();
      const key = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
      const monthName = `${monthNames[monthIdx]} ${year}`;

      if (!monthlyGroups[key]) {
        monthlyGroups[key] = {
          monthName,
          totalPrestasi: 0,
          timestamp: date.getTime()
        };
      }

      monthlyGroups[key].totalPrestasi += 1;
    });

    const sortedStats = Object.values(monthlyGroups)
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(g => ({
        month: g.monthName,
        'Jumlah Prestasi': g.totalPrestasi,
        timestamp: g.timestamp
      }));

    if (sortedStats.length === 0) {
      // Fallback for visual completeness if empty
      const now = new Date();
      const fallbackStats = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        fallbackStats.push({
          month: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
          'Jumlah Prestasi': 0,
          timestamp: d.getTime()
        });
      }
      return fallbackStats;
    }

    return sortedStats;
  };

  const monthlyPrestasiData = getMonthlyPrestasiStats();

  // Color options for PieChart slices
  const PIE_COLORS = ['#3b82f6', '#10b981', '#ec4899', '#f59e0b', '#8b5cf6', '#06b6d4', '#f97316'];

  // Get student achievements percentage data for PieChart
  const getPrestasiPieData = () => {
    const groups: { [key: string]: number } = {
      'Akademik & Sains': 0,
      'Tahfidz & Agama': 0,
      'Seni & Desain': 0,
      'Olahraga & Non-Akademik': 0,
      'Robotik & Teknologi': 0,
    };

    prestasi.forEach(p => {
      const cat = (p.kategori || 'Lainnya').toLowerCase();
      if (cat.includes('akademik') && !cat.includes('non')) {
        groups['Akademik & Sains'] += 1;
      } else if (cat.includes('sains') || cat.includes('bahasa')) {
        groups['Akademik & Sains'] += 1;
      } else if (cat.includes('tahfidz') || cat.includes('agama')) {
        groups['Tahfidz & Agama'] += 1;
      } else if (cat.includes('design') || cat.includes('seni') || cat.includes('desain')) {
        groups['Seni & Desain'] += 1;
      } else if (cat.includes('olahraga') || cat.includes('non akademik') || cat.includes('non-akademik')) {
        groups['Olahraga & Non-Akademik'] += 1;
      } else if (cat.includes('robotik') || cat.includes('teknologi')) {
        groups['Robotik & Teknologi'] += 1;
      } else {
        if (cat.includes('sport') || cat.includes('run')) {
          groups['Olahraga & Non-Akademik'] += 1;
        } else if (cat.includes('art') || cat.includes('music') || cat.includes('gambar')) {
          groups['Seni & Desain'] += 1;
        } else {
          groups['Akademik & Sains'] += 1;
        }
      }
    });

    const result = Object.entries(groups)
      .map(([name, value]) => ({ name, value }))
      .filter(g => g.value > 0);

    if (result.length === 0) {
      // Return beautiful fallback data matching Akademik vs Olahraga vs Seni
      return [
        { name: 'Akademik & Sains', value: 5 },
        { name: 'Tahfidz & Agama', value: 4 },
        { name: 'Seni & Desain', value: 3 },
        { name: 'Olahraga & Non-Akademik', value: 2 },
        { name: 'Robotik & Teknologi', value: 2 },
      ];
    }

    return result;
  };

  const prestasiPieData = getPrestasiPieData();

  // Get weekly attendance trend data for Recharts LineChart
  const getWeeklyAttendanceTrend = () => {
    if (jurnal.length === 0) return [];

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

    const weekGroups: { [key: string]: { Sakit: number; Izin: number; Alpa: number; timestamp: number } } = {};

    jurnal.forEach(j => {
      if (!j.tanggal) return;
      const weekStr = getWeekRangeString(j.tanggal);
      const sakit = getAbsenceCount(j.siswa_sakit);
      const izin = getAbsenceCount(j.siswa_izin);
      const alpa = getAbsenceCount(j.siswa_alpa);

      const timestamp = new Date(j.tanggal).getTime();

      if (!weekGroups[weekStr]) {
        weekGroups[weekStr] = { Sakit: 0, Izin: 0, Alpa: 0, timestamp };
      }
      weekGroups[weekStr].Sakit += sakit;
      weekGroups[weekStr].Izin += izin;
      weekGroups[weekStr].Alpa += alpa;
      if (timestamp < weekGroups[weekStr].timestamp) {
        weekGroups[weekStr].timestamp = timestamp;
      }
    });

    return Object.entries(weekGroups)
      .map(([week, vals]) => ({
        week,
        Sakit: vals.Sakit,
        Izin: vals.Izin,
        Alpa: vals.Alpa,
        Total: vals.Sakit + vals.Izin + vals.Alpa,
        timestamp: vals.timestamp
      }))
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-6);
  };

  const weeklyTrendData = getWeeklyAttendanceTrend();

  // Get overall weekly student attendance for Wali Kelas' class (wC)
  const getWeeklyAttendanceData = () => {
    if (!wC) return [];

    const classJurnals = jurnal.filter(j => j.kelas === wC);
    if (classJurnals.length === 0) return [];

    const getWeekRangeString = (dateStr: string): string => {
      const d = new Date(dateStr);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const startDay = monday.getDate();
      const startMonth = months[monday.getMonth()];
      return `${startDay} ${startMonth}`;
    };

    const weekGroups: { [key: string]: { Sakit: number; Izin: number; Alpa: number; totalJournals: number; timestamp: number } } = {};

    classJurnals.forEach(j => {
      if (!j.tanggal) return;
      const weekStr = getWeekRangeString(j.tanggal);
      const sakit = getAbsenceCount(j.siswa_sakit);
      const izin = getAbsenceCount(j.siswa_izin);
      const alpa = getAbsenceCount(j.siswa_alpa);
      const timestamp = new Date(j.tanggal).getTime();

      if (!weekGroups[weekStr]) {
        weekGroups[weekStr] = { Sakit: 0, Izin: 0, Alpa: 0, totalJournals: 0, timestamp };
      }
      weekGroups[weekStr].Sakit += sakit;
      weekGroups[weekStr].Izin += izin;
      weekGroups[weekStr].Alpa += alpa;
      weekGroups[weekStr].totalJournals += 1;
      if (timestamp < weekGroups[weekStr].timestamp) {
        weekGroups[weekStr].timestamp = timestamp;
      }
    });

    const classSiswa = siswa.filter(s => s.kelas === wC);
    const totalSiswaCount = classSiswa.length || 20;

    return Object.entries(weekGroups)
      .map(([week, vals]) => {
        // Average absent students per lesson
        const avgAbsent = (vals.Sakit + vals.Izin + vals.Alpa) / vals.totalJournals;
        const avgPresentPercent = Math.max(0, Math.min(100, Math.round(((totalSiswaCount - avgAbsent) / totalSiswaCount) * 100)));

        return {
          label: `Mng: ${week}`,
          'Persentase Hadir (%)': avgPresentPercent,
          'Sakit (S)': Math.round((vals.Sakit / vals.totalJournals) * 10) / 10,
          'Izin (I)': Math.round((vals.Izin / vals.totalJournals) * 10) / 10,
          'Alfa (A)': Math.round((vals.Alpa / vals.totalJournals) * 10) / 10,
          timestamp: vals.timestamp
        };
      })
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-6);
  };

  const weeklyAttendanceData = getWeeklyAttendanceData();

  // Aggregate teacher activity notifications for Admin and Wali Kelas
  interface ActivityNotification {
    id: string;
    type: 'jurnal' | 'administrasi' | 'perilaku' | 'perkembangan' | 'home_visit';
    guru: string;
    detail: string;
    tanggal: string;
    badgeColor: string;
    label: string;
  }

  const getRecentActivities = (): ActivityNotification[] => {
    const list: ActivityNotification[] = [];

    jurnal.forEach(j => {
      list.push({
        id: `jurnal-${j.id_jurnal}`,
        type: 'jurnal',
        guru: j.nama_guru,
        detail: `Mengisi Jurnal Pembelajaran Kelas ${j.kelas} - Mapel ${j.mata_pelajaran} (${j.materi})`,
        tanggal: j.tanggal,
        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        label: 'Jurnal'
      });
    });

    administrasi.forEach(a => {
      list.push({
        id: `admin-${a.id_file}`,
        type: 'administrasi',
        guru: a.nama_guru,
        detail: `Mengunggah berkas administrasi: ${a.nama_file}`,
        tanggal: a.tanggal,
        badgeColor: 'bg-orange-50 text-orange-700 border-orange-100',
        label: 'Administrasi'
      });
    });

    perilaku.forEach(p => {
      const sName = siswa.find(s => s.id_siswa === p.id_siswa)?.nama_siswa || 'Santri';
      list.push({
        id: `perilaku-${p.id_catatan}`,
        type: 'perilaku',
        guru: p.nama_guru,
        detail: `Mencatat Sikap/Adab ${p.jenis_perilaku} santri (${sName}): "${p.deskripsi_perilaku}"`,
        tanggal: p.tanggal,
        badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-100',
        label: 'Sikap & Adab'
      });
    });

    perkembangan.forEach(pk => {
      const sName = siswa.find(s => s.id_siswa === pk.id_siswa)?.nama_siswa || 'Santri';
      list.push({
        id: `perkembangan-${pk.id_catatan}`,
        type: 'perkembangan',
        guru: pk.nama_guru,
        detail: `Mencatat Perkembangan ${pk.kategori} santri (${sName}): "${pk.deskripsi_perkembangan}"`,
        tanggal: pk.tanggal,
        badgeColor: 'bg-teal-50 text-teal-700 border-teal-100',
        label: 'Rapor'
      });
    });

    homeVisit.forEach(hv => {
      const sName = siswa.find(s => s.id_siswa === hv.id_siswa)?.nama_siswa || 'Santri';
      list.push({
        id: `hv-${hv.id_kunjungan}`,
        type: 'home_visit',
        guru: hv.nama_guru,
        detail: `Melakukan Home Visit ke rumah santri (${sName}) - Alasan: ${hv.alasan_kunjungan}`,
        tanggal: hv.tanggal,
        badgeColor: 'bg-blue-50 text-blue-700 border-blue-100',
        label: 'Home Visit'
      });
    });

    // Sort by newest first
    return list.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  };

  const recentActivities = getRecentActivities().slice(0, 8); // Show top 8 recent

  // Monthly statistics for teaching vs target for the active teacher (or all teachers if admin)
  const getMonthlyTeachingStats = () => {
    // Filter journals for the logged-in teacher unless they are admin/pengawas (then show total)
    const isTeacher = ['guru', 'wali_kelas'].includes(user.role);
    const teacherJournals = isTeacher 
      ? jurnal.filter(j => j.nama_guru === user.nama_lengkap)
      : jurnal;

    const monthlyGroups: { [key: string]: { monthName: string; count: number; timestamp: number } } = {};
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    teacherJournals.forEach(j => {
      if (!j.tanggal) return;
      const date = new Date(j.tanggal);
      const year = date.getFullYear();
      const monthIdx = date.getMonth();
      const key = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
      const monthName = `${monthNames[monthIdx]} ${year}`;

      if (!monthlyGroups[key]) {
        monthlyGroups[key] = {
          monthName,
          count: 0,
          timestamp: date.getTime()
        };
      }
      monthlyGroups[key].count++;
    });

    const targetMengajar = 16; 

    const sortedStats = Object.values(monthlyGroups)
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(g => ({
        month: g.monthName,
        'Jurnal Terisi': g.count,
        'Target Mengajar': targetMengajar,
        Persentase: Math.round((g.count / targetMengajar) * 100)
      }));

    if (sortedStats.length === 0) {
      const now = new Date();
      const fallbackStats = [];
      for (let i = 3; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        fallbackStats.push({
          month: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
          'Jurnal Terisi': 0,
          'Target Mengajar': targetMengajar,
          Persentase: 0
        });
      }
      return fallbackStats;
    }

    return sortedStats;
  };

  const monthlyTeachingData = getMonthlyTeachingStats();

  // 1. Total Santri
  const totalSantri = siswa ? siswa.length : 0;

  // 2. Guru Aktif (users with role 'guru' or 'wali_kelas')
  const totalGuruAktif = users ? users.filter(u => u.role === 'guru' || u.role === 'wali_kelas').length : 0;

  // 3. Agenda Hari Ini
  const getTodayDateStr = () => {
    const localToday = new Date();
    const year = localToday.getFullYear();
    const month = String(localToday.getMonth() + 1).padStart(2, '0');
    const day = String(localToday.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getTodayDayName = () => {
    const d = new Date();
    const days = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return days[d.getDay()];
  };

  const isSameDayString = (date1: string, date2Str: string): boolean => {
    if (!date1) return false;
    try {
      const d1 = new Date(date1).toISOString().split('T')[0];
      return d1 === date2Str;
    } catch {
      return date1.split('T')[0] === date2Str;
    }
  };

  const todayDayName = getTodayDayName();
  const todayDateStr = getTodayDateStr();

  // Filter journals for currently logged-in teacher today
  const myJournalsToday = jurnal.filter(
    j => j.nama_guru === user.nama_lengkap && isSameDayString(j.tanggal, todayDateStr)
  );

  // Filter schedules for currently logged-in teacher today
  const mySchedulesToday = ['guru', 'wali_kelas'].includes(user.role)
    ? (jadwal || []).filter(
        sch => sch.nama_guru === user.nama_lengkap && sch.hari.toLowerCase() === todayDayName.toLowerCase()
      )
    : [];

  // Filter schedules that don't have matching journals filled today
  const missingJournalsToday = mySchedulesToday.filter(sch => {
    const hasJournal = myJournalsToday.some(
      jr => jr.kelas === sch.kelas && jr.mata_pelajaran.toLowerCase() === sch.mata_pelajaran.toLowerCase()
    );
    return !hasJournal;
  });

  // Calculate weekly journal inputs helper
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

  const getMonthlyJournalInputs = () => {
    const monthGroups: { [key: string]: { count: number; timestamp: number } } = {};
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    jurnal.forEach(j => {
      if (!j.tanggal) return;
      const dateObj = new Date(j.tanggal);
      if (isNaN(dateObj.getTime())) return;
      
      const year = dateObj.getFullYear();
      const monthIdx = dateObj.getMonth();
      const monthStr = `${months[monthIdx]} ${year}`;
      const firstDayOfMonthTimestamp = new Date(year, monthIdx, 1).getTime();

      if (!monthGroups[monthStr]) {
        monthGroups[monthStr] = { count: 0, timestamp: firstDayOfMonthTimestamp };
      }
      monthGroups[monthStr].count++;
    });

    return Object.entries(monthGroups)
      .map(([month, vals]) => ({
        month,
        'Jumlah Jurnal': vals.count,
        timestamp: vals.timestamp
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  };

  const agendaHariIni = events ? events.filter(e => {
    if (!e.tanggal) return false;
    return e.tanggal.split('T')[0] === getTodayDateStr();
  }) : [];
  const totalAgendaHariIni = agendaHariIni.length;

  // ----------------------------------------------------
  // WALI SANTRI DEDICATED PORTAL VIEW
  // ----------------------------------------------------
  if (user.role === 'wali') {
    const currentChild = siswa.find(s => s.id_siswa === selectedChildId);
    
    // Get schedule for the selected child's class
    const childClassSchedules = currentChild 
      ? jadwal.filter(j => j.kelas === currentChild.kelas)
      : [];
      
    // Group childClassSchedules by day of the week
    const listHariOrder = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Sabtu', 'Ahad'];
    const schedulesByDay = listHariOrder.reduce((acc, h) => {
      acc[h] = childClassSchedules
        .filter(j => j.hari.toLowerCase() === h.toLowerCase())
        .sort((a, b) => {
          const aFirst = a.jam_ke.split(',')[0] || '';
          const bFirst = b.jam_ke.split(',')[0] || '';
          return parseInt(aFirst, 10) - parseInt(bFirst, 10);
        });
      return acc;
    }, {} as Record<string, Jadwal[]>);

    return (
      <div className="space-y-8 animate-fade-in">
        {/* Banner Welcome Parent */}
        <div className="bg-gradient-to-br from-teal-600 via-emerald-600 to-green-800 text-white p-8 md:p-10 rounded-[2.5rem] shadow-xl relative overflow-hidden">
          <div className="absolute -right-8 -bottom-16 opacity-10 pointer-events-none transform -rotate-6">
            <GraduationCap className="w-72 h-72 text-white" />
          </div>
          <div className="relative z-10">
            <h2 className="text-2xl md:text-4xl font-black mb-3 tracking-tight drop-shadow-sm">
              Ahlan wa Sahlan, {user.nama_lengkap}
            </h2>
            <p className="text-teal-50 text-sm md:text-base font-semibold drop-shadow-sm max-w-2xl leading-relaxed">
              Selamat datang di portal monitoring wali santri MTs Ibad Ar Rahman. Di sini Anda dapat memantau jadwal kegiatan belajar mengajar ananda secara langsung dan realtime.
            </p>
          </div>
        </div>

        {/* Child Selector Tabs (Only if they have 2 or more children) */}
        {myChildren.length > 1 ? (
          <div className="border-b border-slate-200">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">PILIH TAB ANANDA SANTRI:</span>
            <div className="flex flex-wrap gap-2">
              {myChildren.map(a => {
                const isSelected = a.id_siswa === selectedChildId;
                return (
                  <button
                    key={a.id_siswa}
                    onClick={() => setSelectedChildId(a.id_siswa)}
                    className={`px-6 py-4 rounded-t-2xl border-t border-x transition-all duration-300 text-left flex items-center gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-white text-emerald-950 border-slate-200 -mb-[1px] font-black shadow-xs ring-2 ring-emerald-500/10'
                        : 'bg-slate-50 border-transparent text-slate-500 hover:bg-slate-100/80 hover:text-slate-800'
                    }`}
                  >
                    <GraduationCap className={`w-5 h-5 shrink-0 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <div>
                      <p className="font-extrabold text-sm leading-tight">{a.nama_siswa}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                        Kelas {a.kelas}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Selected Child Detail Panel */}
        {currentChild ? (
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <Calendar className="w-5 h-5 text-emerald-600" />
              <h3 className="font-extrabold text-lg text-slate-800">
                Jadwal Pelajaran: <span className="text-emerald-700">{currentChild.nama_siswa}</span> (Kelas {currentChild.kelas})
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listHariOrder.map(hariName => {
                const dayScheds = schedulesByDay[hariName] || [];
                return (
                  <div key={hariName} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4 hover:shadow-md transition">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <h4 className="font-black text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                        {hariName}
                      </h4>
                      <span className="text-[10px] bg-slate-50 text-slate-400 font-extrabold px-2.5 py-1 rounded-lg border border-slate-100">
                        {dayScheds.length} Sesi
                      </span>
                    </div>

                    {dayScheds.length === 0 ? (
                      <p className="text-[11px] text-slate-400 font-bold italic text-center py-6">
                        Tidak ada jadwal belajar terjadwal.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {dayScheds.map(sched => (
                          <div key={sched.id_jadwal} className="bg-slate-50/50 hover:bg-slate-50 p-3 rounded-2xl border border-slate-100 shadow-3xs flex flex-col justify-between gap-1 transition">
                            <div className="flex justify-between items-start gap-2">
                              <span className="font-extrabold text-xs text-slate-800 leading-snug">
                                {sched.mata_pelajaran}
                              </span>
                              <span className="text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded shrink-0">
                                Jam Ke-{sched.jam_ke}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                              ✍ {sched.nama_guru}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center p-12 bg-white rounded-3xl border border-slate-100 shadow-sm">
            <p className="text-slate-500 font-bold">Harap hubungi Admin untuk menghubungkan akun Anda dengan data ananda santri.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Alert Terlambat Administrasi untuk Admin */}
      {user.role === 'admin' && lateTeachers.length > 0 && (
        <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-2xl shadow-xs flex items-center justify-between gap-4 animate-bounce-subtle relative z-10">
          <div className="flex items-center gap-3">
            <div className="bg-rose-100 p-2 rounded-full text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-black text-rose-900 uppercase tracking-wider">
                Peringatan Batas Waktu Administrasi Guru ⚠️
              </p>
              <p className="text-[11px] text-rose-700 font-bold">
                Ada {lateTeachers.length} ustadz/ustadzah yang teridentifikasi terlambat atau belum lengkap mengunggah berkas administrasi sebelum {batasWaktuAdministrasi || 'batas waktu'}.
              </p>
            </div>
          </div>
          <button 
            onClick={() => {
              const el = document.getElementById('admin-late-submission-block');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black px-3.5 py-1.5 rounded-xl uppercase tracking-wide shadow-sm hover:shadow transition whitespace-nowrap cursor-pointer"
          >
            Lihat Detail 👇
          </button>
        </div>
      )}

      {/* Banner Welcome */}
      {['admin', 'guru', 'wali_kelas', 'pengawas'].includes(user.role) ? (
        <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-6 sm:p-8 rounded-[2rem] shadow-xl border border-emerald-500/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden text-white">
          <div className="absolute -right-8 -bottom-16 opacity-10 pointer-events-none transform -rotate-6">
            <BookOpen className="w-64 h-64 text-white" />
          </div>
          <div className="relative z-10 w-full">
            <h2 className="text-2xl md:text-3xl font-black mb-2 tracking-tight drop-shadow-sm flex items-center gap-2">
              Selamat Datang, {user.nama_lengkap}
            </h2>
            <p className="text-sm text-emerald-50 font-medium drop-shadow-sm">
              Sistem Informasi Terpadu EduSantri — Tahun Ajaran {tahunAjaran}
            </p>

            {user.id_referensi && user.role !== 'pengawas' && (
              <div className="mt-5 flex gap-2 flex-wrap">
                {wC && (
                  <span className="bg-white/20 backdrop-blur-md text-white text-[10px] sm:text-xs px-3 py-1.5 rounded-lg font-bold border border-white/30 shadow-sm flex items-center gap-1">
                    <Crown className="w-3.5 h-3.5 text-yellow-300" /> Wali Kelas: {wC}
                  </span>
                )}
                {user.id_referensi.includes('AJAR:') && (
                  <span className="bg-white/20 backdrop-blur-md text-white text-[10px] sm:text-xs px-3 py-1.5 rounded-lg font-bold border border-white/30 shadow-sm flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5 text-emerald-200" /> Mengajar Kelas: {authClasses.join(', ')}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-teal-600 via-emerald-600 to-green-800 text-white p-8 md:p-10 rounded-[2rem] shadow-xl relative overflow-hidden">
          <div className="absolute -right-8 -bottom-16 opacity-10 pointer-events-none transform -rotate-6">
            <GraduationCap className="w-72 h-72 text-white" />
          </div>
          <h2 className="text-2xl md:text-4xl font-black mb-3 relative z-10 tracking-tight drop-shadow-sm">
            Ahlan wa Sahlan, {user.nama_lengkap}
          </h2>
          <p className="text-teal-50 text-sm md:text-base relative z-10 mb-6 font-medium drop-shadow-sm">
            Memantau perkembangan akademis dan adab ananda tercinta secara real-time:
          </p>
          
          <div className="flex flex-wrap gap-4 relative z-10">
            {myChildren.map(a => (
              <div key={a.id_siswa} className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/20 shadow-inner flex flex-col justify-center">
                <p className="text-lg font-bold flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-emerald-300 shrink-0" />
                  <span>{a.nama_siswa}</span>
                </p>
                <p className="text-xs mt-1 text-teal-100 font-medium pl-7">
                  Kelas: <span className="bg-white/20 px-2 py-0.5 rounded font-bold ml-1">{a.kelas}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warning Notifikasi Input Jurnal untuk Guru */}
      {['guru', 'wali_kelas'].includes(user.role) && missingJournalsToday.length > 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-5 rounded-r-3xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden transition-all duration-300">
          <div className="flex items-start sm:items-center gap-4 z-10">
            <div className="p-3 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
              <AlertCircle className="w-6 h-6 animate-bounce" />
            </div>
            <div className="text-left">
              <h4 className="text-sm font-black uppercase tracking-wider text-amber-900 flex items-center gap-2">
                Peringatan Pengisian Jurnal Mengajar ⚠️
              </h4>
              <p className="text-xs font-bold mt-1 text-amber-800 leading-relaxed">
                Anda memiliki <span className="font-black text-rose-700">{missingJournalsToday.length} jadwal mengajar</span> hari ini ({getTodayDayName()}) yang <span className="font-black">belum dibuatkan jurnalnya</span>:
              </p>
              <ul className="list-disc pl-5 mt-1.5 text-xs font-bold text-amber-900 space-y-1">
                {missingJournalsToday.map((sch, index) => (
                  <li key={sch.id_jadwal || index}>
                    Kelas <span className="font-black">{sch.kelas}</span> - {sch.mata_pelajaran} (Jam Ke-{sch.jam_ke})
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <button
            onClick={() => onNavigate('jurnal')}
            className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-sm transition whitespace-nowrap cursor-pointer hover:scale-105 active:scale-95 z-10 shrink-0"
          >
            Isi Jurnal Sekarang ✍
          </button>
        </div>
      )}

      {/* Cards Statistik Ringkasan */}
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6 relative z-10">
        {/* Card 1: Total Santri */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm flex items-center justify-between hover:shadow-md transition-all duration-300 group">
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Total Santri Tercatat
            </p>
            <h4 className="text-3xl font-black text-slate-800 tracking-tight">
              {totalSantri} <span className="text-xs font-bold text-slate-400">anak</span>
            </h4>
            <p className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md inline-block">
              Aktif &amp; Terdata
            </p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center text-2xl shadow-md group-hover:scale-110 transition-transform duration-300 shrink-0">
            <GraduationCap className="w-7 h-7" />
          </div>
        </div>

        {/* Card 2: Guru Aktif */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm flex items-center justify-between hover:shadow-md transition-all duration-300 group">
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Ustadz &amp; Ustadzah Aktif
            </p>
            <h4 className="text-3xl font-black text-slate-800 tracking-tight">
              {totalGuruAktif} <span className="text-xs font-bold text-slate-400">orang</span>
            </h4>
            <p className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md inline-block">
              Pengajar &amp; Wali Kelas
            </p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center text-2xl shadow-md group-hover:scale-110 transition-transform duration-300 shrink-0">
            <Users2 className="w-7 h-7" />
          </div>
        </div>

        {/* Card 3: Agenda Hari Ini */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm flex items-center justify-between hover:shadow-md transition-all duration-300 group">
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Agenda Kegiatan Hari Ini
            </p>
            <h4 className="text-3xl font-black text-slate-800 tracking-tight">
              {totalAgendaHariIni} <span className="text-xs font-bold text-slate-400">kegiatan</span>
            </h4>
            <p className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md inline-block">
              {totalAgendaHariIni > 0 ? 'Ada agenda hari ini' : 'Tidak ada agenda hari ini'}
            </p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center text-2xl shadow-md group-hover:scale-110 transition-transform duration-300 shrink-0">
            <Calendar className="w-7 h-7" />
          </div>
        </div>

        {/* Card 4 (Conditional): Jurnal Hari Ini Saya */}
        {['guru', 'wali_kelas'].includes(user.role) && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm flex items-center justify-between hover:shadow-md transition-all duration-300 group">
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Jurnal Hari Ini Saya
              </p>
              <h4 className="text-3xl font-black text-slate-800 tracking-tight">
                {myJournalsToday.length} <span className="text-xs font-bold text-slate-400">jurnal</span>
              </h4>
              <p className="text-[10px] text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded-md inline-block">
                {myJournalsToday.length >= mySchedulesToday.length && mySchedulesToday.length > 0
                  ? '✓ Semua Jadwal Terisi'
                  : `${myJournalsToday.length}/${mySchedulesToday.length} Jadwal Terisi`}
              </p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center text-2xl shadow-md group-hover:scale-110 transition-transform duration-300 shrink-0">
              <ClipboardCheck className="w-7 h-7" />
            </div>
          </div>
        )}
      </div>

      {/* Chart: Ringkasan Jumlah Santri per Kelas (Recharts) */}
      <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-slate-200/50 shadow-sm space-y-6 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600 animate-pulse" />
              Ringkasan Jumlah Santri per Kelas
            </h3>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">
              Visualisasi sebaran populasi santri aktif berdasarkan kelas
            </p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 px-3.5 py-1.5 rounded-2xl flex items-center gap-2 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
            <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">
              Total: {siswa.filter(s => !s.kelas.includes('Lulus') && !s.kelas.includes('Alumni')).length} Santri Aktif
            </span>
          </div>
        </div>

        <div className="bg-slate-50/40 p-5 rounded-2xl border border-slate-100 min-h-[300px] flex flex-col justify-between">
          {studentsPerClassData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2 font-bold text-xs">
              <span>📊</span>
              <span>Belum ada data santri untuk dipetakan per kelas.</span>
            </div>
          ) : (
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={studentsPerClassData}
                  margin={{ top: 15, right: 15, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="shortName" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#475569', fontSize: 11, fontWeight: 'bold' }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} 
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(16, 185, 129, 0.04)' }}
                    contentStyle={{
                      background: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      fontSize: '11px',
                      fontWeight: 'bold',
                    }}
                    formatter={(value: any) => [`${value} Santri`, 'Jumlah Santri']}
                    labelFormatter={(label: any) => `Kelas ${label}`}
                  />
                  <Legend 
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} 
                  />
                  <Bar 
                    dataKey="Jumlah Santri" 
                    fill="#10b981" 
                    radius={[6, 6, 0, 0]} 
                    barSize={28} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>



      {/* Dynamic Admin/Teacher Deadline Warning Banner */}
      {(() => {
        if (!batasWaktuAdministrasi) return null;
        try {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const deadline = new Date(batasWaktuAdministrasi);
          deadline.setHours(0, 0, 0, 0);
          
          const diffTime = deadline.getTime() - today.getTime();
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays >= 0 && diffDays <= 3) {
            const dateStr = deadline.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
            const isUrgent = diffDays <= 1;
            return (
              <div className={`border-l-4 p-5 rounded-r-[1.5rem] shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden transition-all duration-300 ${
                isUrgent 
                  ? 'bg-rose-50 border-rose-500 text-rose-950' 
                  : 'bg-amber-50 border-amber-500 text-amber-950'
              }`}>
                <div className="flex items-start sm:items-center gap-4 z-10">
                  <div className={`p-3 rounded-2xl flex items-center justify-center shrink-0 ${
                    isUrgent ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                  }`}>
                    <Clock className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                      ⚠️ Peringatan Batas Waktu Administrasi
                    </h4>
                    <p className="text-xs font-bold mt-1 opacity-90 leading-relaxed">
                      Batas akhir pengumpulan berkas administrasi guru ({batasWaktuAdministrasi}) akan jatuh tempo dalam{' '}
                      <span className="font-black underline text-sm">
                        {diffDays === 0 ? 'Hari Ini' : `${diffDays} Hari Lagi`}
                      </span>. Harap segera melengkapi unggahan berkas sebelum tanggal{' '}
                      <span className="font-extrabold">{dateStr}</span>.
                    </p>
                  </div>
                </div>
                {['guru', 'wali_kelas'].includes(user.role) && (
                  <button
                    onClick={() => onNavigate('administrasi')}
                    className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-sm transition whitespace-nowrap cursor-pointer z-10 shrink-0 hover:scale-105 active:scale-95 ${
                      isUrgent 
                        ? 'bg-rose-600 hover:bg-rose-700 text-white' 
                        : 'bg-amber-600 hover:bg-amber-700 text-white'
                    }`}
                  >
                    Unggah Berkas 📤
                  </button>
                )}
              </div>
            );
          }
        } catch (e) {
          console.error(e);
        }
        return null;
      })()}

      {/* Admin Late Submission Alert Block */}
      {user.role === 'admin' && (
        <div id="admin-late-submission-block" className="bg-white p-6 sm:p-8 rounded-[2rem] border border-rose-100 shadow-sm space-y-4 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rose-50 pb-4">
            <div>
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-500 animate-pulse" />
                Notifikasi Pengumpulan Administrasi Guru
              </h3>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">
                Ustadz / Ustadzah yang belum mengunggah berkas administrasi sebelum tanggal batas waktu ({batasWaktuAdministrasi || 'Belum diatur'})
              </p>
            </div>
            <div className="bg-rose-50 border border-rose-100 px-3.5 py-1.5 rounded-2xl flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-600"></span>
              <span className="text-[10px] font-black text-rose-800 uppercase tracking-wider">
                {lateTeachers.length} Guru Terlambat
              </span>
            </div>
          </div>

          {lateTeachers.length === 0 ? (
            <div className="flex items-center gap-3 bg-emerald-50 text-emerald-800 p-4 rounded-xl text-xs font-bold border border-emerald-100">
              <span>✅</span>
              <span>Alhamdulillah! Semua ustadz/ustadzah telah mengumpulkan berkas administrasi tepat waktu.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {lateTeachers.map(t => {
                const submissions = administrasi.filter(a => a.nama_guru === t.nama_lengkap);
                return (
                  <div key={t.id_user} className="p-4 rounded-xl border border-rose-100/60 bg-rose-50/20 flex flex-col justify-between hover:shadow-md transition">
                    <div>
                      <div className="flex justify-between items-start">
                        <h4 className="font-extrabold text-xs text-slate-800">{t.nama_lengkap}</h4>
                        <span className="bg-rose-100 text-rose-800 text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                          Belum Lengkap
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold mt-1">Username: {t.username}</p>
                    </div>
                    <div className="mt-4 border-t border-rose-100/30 pt-3 flex justify-between items-center text-[10px]">
                      <span className="text-slate-500 font-medium">Submisi: {submissions.length} Berkas</span>
                      <span className="text-rose-600 font-black">Harap Hubungi 📞</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Progress Bar Ketercapaian Jurnal Harian */}
      {['guru', 'wali_kelas', 'admin', 'pengawas'].includes(user.role) && (
        <div id="progress-jurnal-harian" className="bg-white p-6 sm:p-8 rounded-[2rem] border border-slate-200/50 shadow-sm space-y-4 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-emerald-600" />
                Target Pengisian Jurnal Harian
              </h3>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">
                {user.role === 'admin' || user.role === 'pengawas'
                  ? 'Persentase akumulasi pengisian jurnal seluruh ustadz/ustadzah dibanding total jadwal yang terpetakan'
                  : 'Persentase ketercapaian pengisian jurnal Anda berdasarkan jadwal mengajar Anda yang telah dipetakan'}
              </p>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 px-3.5 py-1.5 rounded-2xl flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">
                Target: {user.role === 'admin' || user.role === 'pengawas' ? `${jadwal.length} Jadwal` : `${jadwal.filter(j => j.nama_guru === user.nama_lengkap).length || 8} Jadwal`}
              </span>
            </div>
          </div>

          {/* Calculate Progress */}
          {(() => {
            const isTeacher = ['guru', 'wali_kelas'].includes(user.role);
            const targetCount = isTeacher
              ? (jadwal.filter(j => j.nama_guru === user.nama_lengkap).length || 8)
              : (jadwal.length || 1);
            const filledCount = isTeacher
              ? jurnal.filter(j => j.nama_guru === user.nama_lengkap).length
              : jurnal.length;
            const percentage = Math.min(100, Math.round((filledCount / targetCount) * 100));

            return (
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                  <span>Progres Pengisian: {filledCount} dari {targetCount} Jurnal Terisi</span>
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-black">{percentage}%</span>
                </div>
                <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden relative border border-slate-200/20">
                  <div 
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 h-full rounded-full transition-all duration-500 relative"
                    style={{ width: `${percentage}%` }}
                  >
                    <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/20 animate-pulse"></div>
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                  * Indikator disinkronkan secara dinamis berdasarkan data mengajar di Menu Jadwal &amp; Jurnal Kelas.
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Categorized Menu Grid */}
      <div className="w-full relative z-10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-xs font-black text-emerald-600 tracking-[0.2em] uppercase flex items-center gap-2">
            ⚡ Akses Cepat &amp; Kategori Menu
          </h3>
          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200/60 self-start sm:self-auto">
            Pilih menu sesuai kategori untuk memudahkan pengisian data
          </span>
        </div>

        {MENU_CATEGORIES.map(cat => {
          const categoryItems = MENU_CONFIG.filter(
            m => m.id !== 'dashboard' && m.category === cat.key && isMenuVisibleForUser(m, user, settings)
          );
          if (categoryItems.length === 0) return null;

          return (
            <div key={cat.key} className="bg-slate-50/90 p-4 sm:p-5 rounded-3xl border border-slate-200/70 space-y-3 shadow-2xs">
              <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200/70">
                <span className="text-base">{cat.icon}</span>
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  {cat.label}
                </h4>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full ml-auto">
                  {categoryItems.length} Menu
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {categoryItems.map(menu => (
                  <div
                    key={menu.id}
                    onClick={() => onNavigate(menu.id)}
                    className="bg-white rounded-[1.25rem] p-3.5 cursor-pointer border border-slate-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group relative overflow-hidden flex flex-col justify-between h-full min-h-[130px]"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${menu.color} text-white flex items-center justify-center text-base shadow-xs group-hover:scale-105 transition-transform duration-200 shrink-0`}>
                        {menu.icon}
                      </div>
                      <div className="text-slate-300 group-hover:text-emerald-600 transition-colors bg-slate-50 group-hover:bg-emerald-50 w-6 h-6 rounded-full flex items-center justify-center border border-slate-100 group-hover:border-emerald-100 shrink-0">
                        <ChevronRight className="w-3 h-3" />
                      </div>
                    </div>
                    <div>
                      <h5 className="text-xs font-black text-slate-800 mb-1 leading-tight group-hover:text-emerald-600 transition-colors">
                        {menu.label}
                      </h5>
                      <p className="text-[10px] text-slate-500 font-medium leading-normal line-clamp-2">
                        {menu.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Admin Menu Visibility Control Section */}
      {user.role === 'admin' && (
        <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-800 flex items-center gap-2">
                <Settings className="w-5 h-5 text-emerald-600" />
                Pengaturan Visibilitas Menu (Guru &amp; Wali Kelas)
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Atur menu apa saja yang dapat diakses oleh akun Guru dan Wali Kelas dengan menekan tombol ON/OFF. Menu yang di-OFF akan otomatis tersembunyi.
              </p>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl self-start sm:self-auto shrink-0 border border-slate-200/60">
              <button
                onClick={() => setActiveRoleControlTab('guru')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 ${
                  activeRoleControlTab === 'guru' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>👨‍🏫</span> Akun Guru
              </button>
              <button
                onClick={() => setActiveRoleControlTab('wali_kelas')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 ${
                  activeRoleControlTab === 'wali_kelas' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>👨‍🏫</span> Akun Wali Kelas
              </button>
            </div>
          </div>

          {/* Menu Toggle Items Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {MENU_CONFIG.filter(m => m.id !== 'dashboard' && m.roles.includes(activeRoleControlTab)).map(m => {
              const disabledList = activeRoleControlTab === 'guru' 
                ? (settings?.disabledMenusGuru || [])
                : (settings?.disabledMenusWaliKelas || []);
              const isEnabled = !disabledList.includes(m.id);

              const handleToggle = () => {
                if (!onUpdateSettings || !settings) return;
                let newDisabled: string[];
                if (isEnabled) {
                  newDisabled = [...disabledList, m.id];
                } else {
                  newDisabled = disabledList.filter(id => id !== m.id);
                }

                if (activeRoleControlTab === 'guru') {
                  onUpdateSettings({ ...settings, disabledMenusGuru: newDisabled });
                } else {
                  onUpdateSettings({ ...settings, disabledMenusWaliKelas: newDisabled });
                }
              };

              return (
                <div
                  key={m.id}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    isEnabled 
                      ? 'bg-emerald-50/50 border-emerald-200/80 shadow-2xs' 
                      : 'bg-slate-50 border-slate-200/80 opacity-75'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${m.color} text-white flex items-center justify-center text-sm shrink-0 shadow-2xs`}>
                      {m.icon}
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-xs font-black text-slate-800 truncate">{m.label}</h5>
                      <p className="text-[10px] text-slate-500 font-medium truncate">{m.category}</p>
                    </div>
                  </div>

                  <button
                    onClick={handleToggle}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                      isEnabled
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                        : 'bg-slate-200 hover:bg-slate-300 text-slate-600'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${isEnabled ? 'bg-emerald-300 animate-pulse' : 'bg-slate-400'}`}></span>
                    {isEnabled ? 'ON' : 'OFF'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Admin Submission Statistics Dashboard */}
      {user.role === 'admin' && (
        <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-slate-200/50 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              Dashboard Statistik Pengisian Guru
            </h3>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">
              Rekapitulasi total entri data & performa pengisian ustadz/ustadzah
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100/50 px-2 py-0.5 rounded">
                  Jurnal Kelas
                </span>
                <span className="text-xl">📖</span>
              </div>
              <div className="mt-4">
                <span className="text-2xl font-black text-slate-800">{jurnal.length}</span>
                <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">Entri Terisi</p>
              </div>
            </div>

            <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-black uppercase tracking-wider text-orange-800 bg-orange-100/50 px-2 py-0.5 rounded">
                  Administrasi
                </span>
                <span className="text-xl">📂</span>
              </div>
              <div className="mt-4">
                <span className="text-2xl font-black text-slate-800">{administrasi.length}</span>
                <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">Berkas Unggah</p>
              </div>
            </div>

            <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-800 bg-indigo-100/50 px-2 py-0.5 rounded">
                  Sikap &amp; Adab
                </span>
                <span className="text-xl">🌱</span>
              </div>
              <div className="mt-4">
                <span className="text-2xl font-black text-slate-800">{perilaku.length}</span>
                <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">Catatan Sikap</p>
              </div>
            </div>

            <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-800 bg-blue-100/50 px-2 py-0.5 rounded">
                  Home Visit
                </span>
                <span className="text-xl">🏠</span>
              </div>
              <div className="mt-4">
                <span className="text-2xl font-black text-slate-800">{homeVisit.length}</span>
                <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">Kunjungan Rumah</p>
              </div>
            </div>
          </div>

          {/* Teacher Stats Table */}
          <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-xs">
            <div className="bg-slate-50 p-4 border-b border-slate-100 text-[10px] font-black tracking-wider uppercase text-slate-400 grid grid-cols-12 gap-2">
              <div className="col-span-4">Nama Lengkap Guru</div>
              <div className="col-span-2 text-center">Jurnal</div>
              <div className="col-span-2 text-center">Administrasi</div>
              <div className="col-span-2 text-center">Sikap &amp; Adab</div>
              <div className="col-span-2 text-center font-black text-slate-700">Total Entri</div>
            </div>
            
            <div className="divide-y divide-slate-100">
              {teacherStats.length === 0 ? (
                <div className="p-6 text-center text-xs font-bold text-slate-400">
                  Belum ada data pengisian guru yang terdaftar.
                </div>
              ) : (
                teacherStats.map((t) => (
                  <div key={t.username} className="p-4 grid grid-cols-12 gap-2 text-xs font-bold items-center hover:bg-slate-50/40 transition">
                    <div className="col-span-4 text-left">
                      <p className="text-slate-800 font-black flex items-center gap-1.5 flex-wrap">
                        <span>{t.nama}</span>
                        {lateTeachers.some(lt => lt.nama_lengkap === t.nama) && (
                          <span className="bg-rose-100 text-rose-800 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider animate-pulse flex items-center gap-0.5">
                            ⚠️ Terlambat
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-slate-400">@{t.username} • {t.role}</p>
                    </div>
                    <div className="col-span-2 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${t.jurnalCount > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-50 text-slate-400'}`}>
                        {t.jurnalCount}
                      </span>
                    </div>
                    <div className="col-span-2 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${t.administrasiCount > 0 ? 'bg-orange-50 text-orange-700 border border-orange-100' : 'bg-slate-50 text-slate-400'}`}>
                        {t.administrasiCount}
                      </span>
                    </div>
                    <div className="col-span-2 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${t.perilakuCount > 0 ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-slate-50 text-slate-400'}`}>
                        {t.perilakuCount}
                      </span>
                    </div>
                    <div className="col-span-2 text-center">
                      <span className="bg-slate-900 text-white px-3 py-1 rounded-xl text-[10px] font-black">
                        {t.totalCount} entri
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chart: Tren Bulanan Jurnal Harian (untuk Admin, Pengawas, Guru, & Wali Kelas) */}
      {['admin', 'pengawas', 'guru', 'wali_kelas'].includes(user.role) && (
        <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-slate-200/50 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Activity className="w-5 h-5 text-teal-600 animate-pulse" />
                Tren Bulanan Pengisian Jurnal Ustadz/Ustadzah
              </h3>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">
                Visualisasi tren produktivitas akumulasi jurnal harian guru per bulan
              </p>
            </div>
            <div className="bg-teal-50 border border-teal-100 px-3.5 py-1.5 rounded-2xl flex items-center gap-2 shrink-0">
              <span className="w-2 h-2 rounded-full bg-teal-600 animate-pulse"></span>
              <span className="text-[10px] font-black text-teal-800 uppercase tracking-wider">
                Total Jurnal Terdata: {jurnal.length}
              </span>
            </div>
          </div>

          <div className="bg-slate-50/40 p-5 rounded-2xl border border-slate-100 min-h-[320px] flex flex-col justify-between">
            {getMonthlyJournalInputs().length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2 font-bold text-xs">
                <span>📊</span>
                <span>Belum ada data jurnal untuk dipetakan secara bulanan.</span>
              </div>
            ) : (
              <div className="w-full h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={getMonthlyJournalInputs()}
                    margin={{ top: 15, right: 15, left: -20, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="colorJurnal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0d9488" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="month" 
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
                      cursor={{ stroke: '#0d9488', strokeWidth: 1, strokeDasharray: '4 4' }}
                      contentStyle={{
                        background: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        fontSize: '11px',
                        fontWeight: 'bold',
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="Jumlah Jurnal" 
                      stroke="#0d9488" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorJurnal)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chart: Jumlah Input Jurnal per Minggu (untuk Admin & Pengawas) */}
      {['admin', 'pengawas'].includes(user.role) && (
        <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-slate-200/50 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600 animate-pulse" />
                Grafik Batang Input Jurnal per Minggu (Audit Pengawas)
              </h3>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">
                Memantau kedisiplinan guru berdasarkan frekuensi pengisian jurnal harian setiap minggu (8 minggu terakhir)
              </p>
            </div>
            <div className="bg-indigo-50 border border-indigo-100 px-3.5 py-1.5 rounded-2xl flex items-center gap-2 shrink-0">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
              <span className="text-[10px] font-black text-indigo-800 uppercase tracking-wider">
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
                      cursor={{ fill: 'rgba(79, 70, 229, 0.04)' }}
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
                      fill="#4f46e5" 
                      radius={[4, 4, 0, 0]} 
                      barSize={30} 
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Admin Attendance Recap Chart */}
      {user.role === 'admin' && (
        <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-slate-200/50 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              Monitoring Kehadiran Santri per Kelas
            </h3>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">
              Grafik rekapitulasi ketidakhadiran santri (Sakit, Izin, Alpa) berdasarkan entri jurnal kelas
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart Area */}
            <div className="lg:col-span-2 bg-slate-50/40 p-5 rounded-2xl border border-slate-100 min-h-[320px] flex flex-col justify-between">
              {attendanceRecapData.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2 font-bold text-xs">
                  <span>📊</span>
                  <span>Belum ada data absensi untuk ditampilkan.</span>
                </div>
              ) : (
                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={attendanceRecapData}
                      margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
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
                        cursor={{ fill: 'rgba(16, 185, 129, 0.04)' }}
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
                      <Bar dataKey="Sakit" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={20} />
                      <Bar dataKey="Izin" fill="#a855f7" radius={[4, 4, 0, 0]} barSize={20} />
                      <Bar dataKey="Alpa" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Insight Area */}
            <div className="bg-slate-50/40 p-5 rounded-2xl border border-slate-100 flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <span className="text-[10px] uppercase font-black tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100/50">
                  Ringkasan Presensi Global
                </span>
                
                <div className="space-y-3.5 pt-2">
                  <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-3xs">
                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                      Total Sakit (S)
                    </span>
                    <span className="text-sm font-black text-slate-800">{totalSakitAll} kali</span>
                  </div>

                  <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-3xs">
                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                      Total Izin (I)
                    </span>
                    <span className="text-sm font-black text-slate-800">{totalIzinAll} kali</span>
                  </div>

                  <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-3xs">
                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                      Total Alpa (A)
                    </span>
                    <span className="text-sm font-black text-red-600">{totalAlpaAll} kali</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200/50 pt-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Absen Akumulatif</p>
                    <p className="text-lg font-black text-slate-800 mt-0.5">{grandTotalAbsen} Ketidakhadiran</p>
                  </div>
                  <span className="text-2xl">📋</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* Chart: Grafik Prestasi Santri berdasarkan Kategori (untuk Admin) */}
      {user.role === 'admin' && (
        <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-slate-200/50 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-500" />
                Grafik Prestasi Santri berdasarkan Kategori
              </h3>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">
                Visualisasi rekapitulasi jumlah piala, piagam, dan medali yang diraih santri berdasarkan kategori bidang kompetisi
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-100 px-3.5 py-1.5 rounded-2xl flex items-center gap-2 shrink-0">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider">
                Total: {prestasi.length} Prestasi
              </span>
            </div>
          </div>

          <div className="bg-slate-50/40 p-5 rounded-2xl border border-slate-100 min-h-[320px] flex flex-col justify-between">
            {prestasi.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2 font-bold text-xs">
                <span>🏆</span>
                <span>Belum ada data prestasi santri untuk dipetakan.</span>
              </div>
            ) : (
              <div className="w-full h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={prestasiCategoryData}
                    margin={{ top: 15, right: 15, left: -20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} 
                      allowDecimals={false}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(245, 158, 11, 0.04)' }}
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
                      dataKey="Jumlah Prestasi" 
                      fill="#f59e0b" 
                      radius={[4, 4, 0, 0]} 
                      barSize={30} 
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Monthly Achievements Trend & PieChart Grid */}
      {['admin', 'guru', 'wali_kelas', 'pengawas'].includes(user.role) && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: LineChart */}
          <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-[2rem] border border-slate-200/50 shadow-sm space-y-6 animate-fade-in flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                    <Crown className="w-5 h-5 text-amber-500 animate-pulse" />
                    Tren Prestasi Santri Bulanan
                  </h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">
                    Grafik perkembangan aktivitas kejuaraan sepanjang tahun ajaran (bulan ke bulan)
                  </p>
                </div>
              </div>

              <div className="bg-slate-50/40 p-5 rounded-2xl border border-slate-100 min-h-[320px] flex flex-col justify-between mt-6">
                <div className="w-full h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={monthlyPrestasiData}
                      margin={{ top: 15, right: 15, left: -20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="month" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} 
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} 
                        allowDecimals={false}
                      />
                      <Tooltip
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
                        iconType="plainline"
                        iconSize={12}
                        wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="Jumlah Prestasi" 
                        stroke="#f59e0b" 
                        strokeWidth={3}
                        activeDot={{ r: 6 }}
                        dot={{ stroke: '#f59e0b', strokeWidth: 2, r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: PieChart */}
          <div className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-[2rem] border border-slate-200/50 shadow-sm space-y-6 animate-fade-in flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-indigo-500 animate-pulse" />
                    Distribusi Jenis Prestasi
                  </h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">
                    Persentase bidang capaian unggul santri (Akademik, Olahraga, Keagamaan, Seni, dll)
                  </p>
                </div>
              </div>

              <div className="bg-slate-50/40 p-5 rounded-2xl border border-slate-100 min-h-[320px] flex flex-col justify-center items-center mt-6">
                {prestasi.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2 font-bold text-xs">
                    <span>📊</span>
                    <span>Belum ada data prestasi untuk dipetakan.</span>
                  </div>
                ) : (
                  <div className="w-full h-72 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={prestasiPieData}
                          cx="50%"
                          cy="45%"
                          innerRadius={60}
                          outerRadius={85}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {prestasiPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value, name) => [`${value} Prestasi (${((Number(value) / (prestasi.length || 1)) * 100).toFixed(1)}%)`, name]}
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
                          layout="horizontal"
                          verticalAlign="bottom"
                          align="center"
                          wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} 
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Teacher/Wali Kelas/Admin - Monthly Teaching vs Target Chart */}
      {['guru', 'wali_kelas', 'admin'].includes(user.role) && (
        <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-slate-200/50 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-teal-600 animate-pulse" />
                Statistik &amp; Target Mengajar Bulanan (Dashboard Guru)
              </h3>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">
                {user.role === 'admin' 
                  ? 'Komparasi akumulasi seluruh jurnal mengajar guru dengan target bulanan sekolah'
                  : 'Komparasi jumlah jurnal mengajar Anda yang telah terisi dengan target mengajar bulanan'}
              </p>
            </div>
            <div className="bg-teal-50 border border-teal-100 px-3.5 py-1.5 rounded-2xl flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-600"></span>
              <span className="text-[10px] font-black text-teal-800 uppercase tracking-wider">Target: 16 Jurnal / Bulan</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recharts Bar Chart Area */}
            <div className="lg:col-span-2 bg-slate-50/40 p-5 rounded-2xl border border-slate-100 min-h-[320px] flex flex-col justify-between">
              <div className="w-full h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlyTeachingData}
                    margin={{ top: 15, right: 10, left: -25, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="month" 
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
                    <Bar dataKey="Jurnal Terisi" fill="#0d9488" radius={[4, 4, 0, 0]} barSize={25} />
                    <Bar dataKey="Target Mengajar" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={25} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Teaching performance cards */}
            <div className="bg-slate-50/40 p-5 rounded-2xl border border-slate-100 flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <span className="text-[10px] uppercase font-black tracking-widest text-teal-600 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-100/50">
                  Performa Ketercapaian KBM
                </span>

                {monthlyTeachingData.length > 0 ? (
                  (() => {
                    const latestMonthData = monthlyTeachingData[monthlyTeachingData.length - 1];
                    const rate = latestMonthData.Persentase;
                    let feedbackText = "Semangat! Isi jurnal harian secara rutin.";
                    let colorClass = "text-amber-600 bg-amber-50 border-amber-100";
                    if (rate >= 100) {
                      feedbackText = "Luar biasa! Target mengajar bulan ini tercapai dengan sempurna.";
                      colorClass = "text-emerald-600 bg-emerald-50 border-emerald-100";
                    } else if (rate >= 75) {
                      feedbackText = "Sangat bagus! Hampir memenuhi target bulanan.";
                      colorClass = "text-teal-600 bg-teal-50 border-teal-100";
                    }

                    return (
                      <div className="space-y-4 pt-2">
                        <div className="p-4 rounded-xl bg-white border border-slate-100 shadow-3xs">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Bulan Terbaru</p>
                          <p className="text-xl font-black text-slate-800 mt-1">{latestMonthData.month}</p>
                        </div>

                        <div className="p-4 rounded-xl bg-white border border-slate-100 shadow-3xs flex justify-between items-center">
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Persentase Target</p>
                            <p className="text-2xl font-black text-slate-800 mt-1">{rate}%</p>
                          </div>
                          <div className="w-12 h-12 rounded-full border-4 border-teal-500/30 border-t-teal-500 flex items-center justify-center text-xs font-black text-teal-700 animate-spin" style={{ animationDuration: '4s' }}>
                            {rate}%
                          </div>
                        </div>

                        <div className={`p-4 rounded-xl border text-xs font-semibold leading-relaxed ${colorClass}`}>
                          {feedbackText}
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="text-center py-8 text-slate-400 text-xs font-bold">
                    Belum ada data bulan ini.
                  </div>
                )}
              </div>

              <div className="text-[10px] text-slate-400 font-bold leading-relaxed border-t border-slate-100 pt-3">
                Target bulanan (16 sesi) disesuaikan dengan kurikulum kepondokan santri MTs Ibad Ar Rahman.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Wali Kelas Weekly Attendance Chart */}
      {user.role === 'wali_kelas' && wC && (
        <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-slate-200/50 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600 animate-pulse" />
                Grafik Kehadiran Santri Kelas {wC} Mingguan (Keseluruhan)
              </h3>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">
                Persentase kehadiran santri per minggu secara keseluruhan berdasarkan pengisian jurnal kelas {wC}
              </p>
            </div>
            <div className="bg-indigo-50 border border-indigo-100 px-3.5 py-1.5 rounded-2xl flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
              <span className="text-[10px] font-black text-indigo-800 uppercase tracking-wider">
                Kelas Binaan: {wC}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recharts Line/Bar Chart Area */}
            <div className="lg:col-span-2 bg-slate-50/40 p-5 rounded-2xl border border-slate-100 min-h-[320px] flex flex-col justify-between">
              {weeklyAttendanceData.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2 font-bold text-xs">
                  <span>📈</span>
                  <span>Belum ada data jurnal mingguan untuk Kelas {wC}.</span>
                </div>
              ) : (
                <div className="w-full h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={weeklyAttendanceData}
                      margin={{ top: 15, right: 10, left: -20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="label" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} 
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        domain={[0, 100]}
                        tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} 
                      />
                      <Tooltip
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
                      <Line 
                        type="monotone" 
                        dataKey="Persentase Hadir (%)" 
                        stroke="#4f46e5" 
                        strokeWidth={3} 
                        dot={{ r: 4, fill: '#4f46e5' }}
                        activeDot={{ r: 6 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Attendance statistics brief */}
            <div className="bg-indigo-50/10 p-5 rounded-2xl border border-indigo-100/50 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-black tracking-widest text-indigo-700 bg-indigo-50 px-2 py-1 rounded">
                  REKAP ABSENSI KELAS BINAAN
                </span>
                <p className="text-xs text-slate-500 font-medium">
                  Rata-rata ketidakhadiran santri per minggu dari seluruh sesi pelajaran yang terdokumentasi di kelas Anda:
                </p>
                
                {weeklyAttendanceData.length > 0 ? (
                  <div className="space-y-2 pt-2">
                    {weeklyAttendanceData.map((d, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm">
                        <span className="font-extrabold text-slate-700">{d.label.replace('Mng: ', '')}</span>
                        <div className="flex gap-2">
                          <span className="text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded font-black text-[10px]">A: {d['Alfa (A)']}</span>
                          <span className="text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded font-black text-[10px]">I: {d['Izin (I)']}</span>
                          <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-black text-[10px]">S: {d['Sakit (S)']}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 font-bold py-6 text-center">
                    Belum ada rekap mingguan.
                  </div>
                )}
              </div>

              <div className="bg-indigo-950 text-white p-4 rounded-xl shadow-inner text-xs">
                <p className="font-bold mb-1">💡 Tips Wali Kelas:</p>
                <p className="opacity-80 leading-relaxed font-medium text-[11px]">
                  Santri dengan ketidakhadiran tinggi disarankan untuk dikoordinasikan dengan wali santri atau dibuatkan Catatan Perkembangan.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* Live Activity Notifications Feed */}
      {['admin', 'wali_kelas'].includes(user.role) && (
        <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-slate-200/50 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-500 animate-bounce" style={{ animationDuration: '3s' }} />
                Pemberitahuan Pengisian Guru (Live)
              </h3>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">
                Aktivitas input &amp; unggahan berkas ustadz di madrasah secara real-time
              </p>
            </div>
            <span className="bg-amber-50 border border-amber-100 text-amber-800 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
              {recentActivities.length} Aktivitas Terbaru
            </span>
          </div>

          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-2 scrollbar-thin">
            {recentActivities.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400 font-bold flex flex-col items-center gap-2">
                <span>🔔</span>
                <span>Belum ada aktivitas pengisian guru hari ini.</span>
              </div>
            ) : (
              recentActivities.map((act) => (
                <div key={act.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/40 hover:bg-slate-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-start gap-3">
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border shrink-0 ${act.badgeColor}`}>
                      {act.label}
                    </span>
                    <div className="text-left col-span-8">
                      <p className="text-slate-800 text-xs font-black">
                        {act.guru} <span className="text-slate-400 font-medium font-mono text-[10px] ml-1">menginput data</span>
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">{act.detail}</p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right shrink-0">
                    <span className="text-[10px] font-bold text-slate-400 bg-white border border-slate-100 px-2 py-1 rounded-lg shadow-3xs">
                      📅 {new Date(act.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Admin & Wali Kelas Settings Section */}
      {(user.role === 'admin' || user.role === 'wali_kelas') && onUpdateSettings && (
        <div className="bg-slate-100/70 p-6 sm:p-8 rounded-[2rem] border border-slate-200/50 mt-10 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4 mb-6">
            <div>
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Settings className="w-5 h-5 text-emerald-600 animate-spin" style={{ animationDuration: '6s' }} />
                Pengaturan Sistem EduSantri
              </h3>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">
                Kelola parameter akademik MTs Ibad Ar Rahman secara dinamis
              </p>
            </div>
            {!isEditingSettings ? (
              <button
                onClick={() => setIsEditingSettings(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-black transition cursor-pointer"
              >
                Ubah Pengaturan
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setLocalTahunAjaran(tahunAjaran);
                    setLocalBatasWaktu(batasWaktuAdministrasi || '2026-06-30');
                    setLocalSemester(semester);
                    setLocalNamaKepala(namaKepalaMadrasah || 'Ustadz H. Ahmad Hambali, Lc.');
                    setIsEditingSettings(false);
                  }}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={async () => {
                    setIsSaving(true);
                    try {
                      await onUpdateSettings({
                        tahun_ajaran: localTahunAjaran,
                        batas_waktu_administrasi: localBatasWaktu,
                        semester: localSemester,
                        nama_kepala_madrasah: localNamaKepala
                      });
                      setIsEditingSettings(false);
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  disabled={isSaving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSaving ? 'Menyimpan...' : 'Simpan Setelan'}
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Tahun Ajaran */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/50 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                  TAHUN AJARAN AKTIF
                </span>
                <p className="text-xs text-slate-400 mt-2 font-bold uppercase tracking-wider">
                  Mempengaruhi penandaan T.A di header & penarikan rekap rapor.
                </p>
              </div>
              <div className="mt-4">
                {!isEditingSettings ? (
                  <div className="text-2xl font-black text-slate-800 flex items-center gap-2">
                    <Calendar className="w-6 h-6 text-emerald-600" />
                    <span>{tahunAjaran}</span>
                  </div>
                ) : (
                  <select
                    className="w-full border border-slate-200 p-3.5 rounded-xl font-black text-slate-700 bg-slate-50 focus:ring-2 focus:ring-emerald-400 outline-none text-sm"
                    value={localTahunAjaran}
                    onChange={(e) => setLocalTahunAjaran(e.target.value)}
                  >
                    <option value="2025/2026">T.A 2025/2026</option>
                    <option value="2026/2027">T.A 2026/2027</option>
                    <option value="2027/2028">T.A 2027/2028</option>
                    <option value="2028/2029">T.A 2028/2029</option>
                    <option value="2029/2030">T.A 2029/2030</option>
                  </select>
                )}
              </div>
            </div>

            {/* Semester */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/50 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                  SEMESTER AKTIF
                </span>
                <p className="text-xs text-slate-400 mt-2 font-bold uppercase tracking-wider">
                  Menentukan semester aktif (Ganjil / Genap) untuk evaluasi dan rekap.
                </p>
              </div>
              <div className="mt-4">
                {!isEditingSettings ? (
                  <div className="text-2xl font-black text-slate-800 flex items-center gap-2">
                    <BookOpen className="w-6 h-6 text-indigo-600" />
                    <span>Semester {semester}</span>
                  </div>
                ) : (
                  <select
                    className="w-full border border-slate-200 p-3.5 rounded-xl font-black text-slate-700 bg-slate-50 focus:ring-2 focus:ring-indigo-400 outline-none text-sm"
                    value={localSemester}
                    onChange={(e) => setLocalSemester(e.target.value as 'Ganjil' | 'Genap')}
                  >
                    <option value="Ganjil">Semester Ganjil</option>
                    <option value="Genap">Semester Genap</option>
                  </select>
                )}
              </div>
            </div>

            {/* Batas Administrasi */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/50 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-orange-600 bg-orange-50 px-2 py-1 rounded">
                  DEADLINE BERKAS GURU
                </span>
                <p className="text-xs text-slate-400 mt-2 font-bold uppercase tracking-wider">
                  Batas waktu unggah berkas (RPP, silabus). Unggahan setelah tanggal ini diberi label terlambat.
                </p>
              </div>
              <div className="mt-4">
                {!isEditingSettings ? (
                  <div className="text-2xl font-black text-slate-800 flex items-center gap-2">
                    <Clock className="w-6 h-6 text-orange-500" />
                    <span>{batasWaktuAdministrasi || 'Belum Diatur'}</span>
                  </div>
                ) : (
                  <input
                    type="date"
                    className="w-full border border-slate-200 p-3.5 rounded-xl font-bold bg-slate-50 text-slate-700 outline-none focus:ring-2 focus:ring-emerald-400 text-sm"
                    value={localBatasWaktu}
                    onChange={(e) => setLocalBatasWaktu(e.target.value)}
                  />
                )}
              </div>
            </div>

            {/* Kepala Madrasah */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/50 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  KEPALA MADRASAH
                </span>
                <p className="text-xs text-slate-400 mt-2 font-bold uppercase tracking-wider">
                  Nama Kepala Madrasah untuk tanda tangan berkas & piagam penghargaan.
                </p>
              </div>
              <div className="mt-4">
                {!isEditingSettings ? (
                  <div className="text-lg font-black text-slate-800 flex flex-col justify-center">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Nama Aktif:</span>
                    <span className="truncate" title={localNamaKepala}>{localNamaKepala}</span>
                  </div>
                ) : (
                  <input
                    type="text"
                    className="w-full border border-slate-200 p-3 rounded-xl font-bold bg-slate-50 text-slate-700 outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                    value={localNamaKepala}
                    onChange={(e) => setLocalNamaKepala(e.target.value)}
                    placeholder="Contoh: Ustadz H. Ahmad Hambali, Lc."
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal for parent viewing full documentation photo */}
      {dashboardLightbox && (
        <div 
          className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[9999] flex flex-col items-center justify-center p-4 cursor-pointer" 
          onClick={() => setDashboardLightbox(null)}
        >
          <button 
            className="absolute top-6 right-6 text-white hover:text-red-400 font-extrabold text-2xl transition cursor-pointer bg-black/40 p-3 rounded-full"
            onClick={() => setDashboardLightbox(null)}
          >
            ✕
          </button>
          <div className="max-w-4xl max-h-[80vh] w-full flex items-center justify-center p-2" onClick={(e) => e.stopPropagation()}>
            <img 
              src={dashboardLightbox.url} 
              alt={dashboardLightbox.title} 
              className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-slate-800" 
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="text-center mt-6 text-white max-w-xl px-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-extrabold text-lg">{dashboardLightbox.title}</h3>
            <p className="text-slate-400 text-xs mt-1">Pratinjau Dokumentasi Kegiatan</p>
          </div>
        </div>
      )}
    </div>
  );
};
