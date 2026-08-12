import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User, Siswa, Jurnal, CatatanPerkembangan, CatatanPerilaku,
  HomeVisit, Dokumentasi, Administrasi, Jadwal, SystemSettings, ActivityLog, MadrasahEvent, Prestasi
} from './types';
import {
  generateSiswaFromCSV, initialDummyUsers, initialDummySettings,
  initialDummyJurnal, initialDummyPerkembangan, initialDummyPerilaku,
  initialDummyHomeVisit, initialDummyDokumentasi, initialDummyAdministrasi,
  initialDummyJadwal, initialDummyActivityLogs, initialDummyPrestasi
} from './data/dummy';

// Icons for navigation
import {
  LayoutDashboard, UserCircle, Users, BookOpen, CalendarDays,
  FileSpreadsheet, Award, Smile, Home, Image, FolderOpen,
  CalendarRange, ShieldAlert, LogOut, Lock, KeyRound, Check, FileText,
  Sparkles, HeartHandshake, ArrowRight, ShieldCheck, ChevronRight, Clock, Trophy, AlertCircle, Menu, X
} from 'lucide-react';

// Components
import { Dashboard } from './components/Dashboard';
import { ProfileMenu } from './components/ProfileMenu';
import { SiswaMenu } from './components/SiswaMenu';
import { JurnalMenu } from './components/JurnalMenu';
import { RekapPresensiMenu } from './components/RekapPresensiMenu';
import { EvaluasiMenu } from './components/EvaluasiMenu';
import { LaporanWali } from './components/LaporanWali';
import { HomeVisitMenu } from './components/HomeVisitMenu';
import { DokumentasiMenu } from './components/DokumentasiMenu';
import { AdministrasiMenu } from './components/AdministrasiMenu';
import { JadwalMenu } from './components/JadwalMenu';
import { UsersMenu } from './components/UsersMenu';
import { NotificationModal } from './components/NotificationModal';
import { RaporPerkembanganMenu } from './components/RaporPerkembanganMenu';
import { GoogleSheetsMenu } from './components/GoogleSheetsMenu';
import { OfflineNotice } from './components/OfflineNotice';
import { RiwayatAktivitasMenu } from './components/RiwayatAktivitasMenu';
import { PrestasiMenu } from './components/PrestasiMenu';
import { syncToGoogleSheets } from './utils/googleAuth';

export type MenuCategory = 'Utama' | 'KBM & Akademik' | 'Data Santri & Presensi' | 'Bimbingan & Rapor' | 'Sistem & Administrasi';

export interface MenuConfigItem {
  id: string;
  label: string;
  desc: string;
  icon: React.ReactNode;
  roles: string[];
  color: string;
  category: MenuCategory;
}

export const MENU_CATEGORIES: { key: MenuCategory; label: string; icon: string }[] = [
  { key: 'Utama', label: 'Ringkasan & Utama', icon: '📌' },
  { key: 'KBM & Akademik', label: 'Pembelajaran & KBM', icon: '📖' },
  { key: 'Data Santri & Presensi', label: 'Data Santri & Presensi', icon: '👥' },
  { key: 'Bimbingan & Rapor', label: 'Bimbingan & Rapor', icon: '🎯' },
  { key: 'Sistem & Administrasi', label: 'Sistem & Pengaturan', icon: '⚙️' }
];

export const MENU_CONFIG: MenuConfigItem[] = [
  // Utama
  {
    id: 'dashboard',
    label: 'Dashboard',
    desc: 'Halaman ringkasan informasi terpadu',
    icon: <LayoutDashboard className="w-5 h-5" />,
    roles: ['admin', 'guru', 'wali_kelas', 'pengawas', 'wali'],
    color: 'from-emerald-500 to-teal-600',
    category: 'Utama'
  },
  {
    id: 'riwayat_aktivitas',
    label: 'Riwayat & Kepatuhan',
    desc: 'Audit tindakan & kedisiplinan guru',
    icon: <Clock className="w-5 h-5" />,
    roles: ['admin', 'pengawas'],
    color: 'from-cyan-600 to-teal-700',
    category: 'Utama'
  },

  // KBM & Akademik
  {
    id: 'jurnal',
    label: 'Jurnal Harian Guru',
    desc: 'Catat agenda pembelajaran harian',
    icon: <BookOpen className="w-5 h-5" />,
    roles: ['admin', 'guru', 'wali_kelas', 'pengawas'],
    color: 'from-emerald-600 to-teal-500',
    category: 'KBM & Akademik'
  },
  {
    id: 'jadwal',
    label: 'Jadwal Mengajar',
    desc: 'Plotting jadwal mengajar & reminder',
    icon: <CalendarRange className="w-5 h-5" />,
    roles: ['admin'],
    color: 'from-indigo-600 to-blue-700',
    category: 'KBM & Akademik'
  },
  {
    id: 'administrasi',
    label: 'Administrasi Guru',
    desc: 'Unggah file RPP, silabus, & modul',
    icon: <FolderOpen className="w-5 h-5" />,
    roles: ['admin', 'guru', 'wali_kelas', 'pengawas'],
    color: 'from-sky-500 to-blue-600',
    category: 'KBM & Akademik'
  },

  // Data Santri & Presensi
  {
    id: 'siswa',
    label: 'Data Santri',
    desc: 'Daftar biodata & data santri aktif',
    icon: <Users className="w-5 h-5" />,
    roles: ['admin', 'guru', 'wali_kelas', 'pengawas', 'wali'],
    color: 'from-slate-600 to-slate-800',
    category: 'Data Santri & Presensi'
  },
  {
    id: 'rekap',
    label: 'Rekap Presensi',
    desc: 'Statistik kumulatif kehadiran santri',
    icon: <FileSpreadsheet className="w-5 h-5" />,
    roles: ['admin', 'guru', 'wali_kelas', 'pengawas', 'wali'],
    color: 'from-teal-500 to-cyan-600',
    category: 'Data Santri & Presensi'
  },

  // Bimbingan & Rapor
  {
    id: 'evaluasi_akademik',
    label: 'Evaluasi Akademik',
    desc: 'Laporan naratif capaian & kompetensi',
    icon: <Award className="w-5 h-5" />,
    roles: ['admin', 'guru', 'wali_kelas', 'pengawas', 'wali'],
    color: 'from-blue-500 to-indigo-600',
    category: 'Bimbingan & Rapor'
  },
  {
    id: 'evaluasi_perilaku',
    label: 'Catatan Adab & Perilaku',
    desc: 'Catat sikap dan akhlak harian santri',
    icon: <Smile className="w-5 h-5" />,
    roles: ['admin', 'guru', 'wali_kelas', 'pengawas', 'wali'],
    color: 'from-pink-500 to-rose-600',
    category: 'Bimbingan & Rapor'
  },
  {
    id: 'prestasi',
    label: 'Prestasi Santri',
    desc: 'Catat dan pantau prestasi/kejuaraan santri',
    icon: <Trophy className="w-5 h-5" />,
    roles: ['admin', 'wali_kelas', 'wali'],
    color: 'from-amber-500 to-indigo-600',
    category: 'Bimbingan & Rapor'
  },
  {
    id: 'home_visit',
    label: 'Kunjungan Rumah',
    desc: 'Log penanganan kolaborasi orang tua',
    icon: <Home className="w-5 h-5" />,
    roles: ['admin', 'wali_kelas', 'pengawas'],
    color: 'from-amber-500 to-orange-600',
    category: 'Bimbingan & Rapor'
  },
  {
    id: 'rapor_perkembangan',
    label: 'Rapor Perkembangan',
    desc: 'Laporan perkembangan terpadu santri',
    icon: <FileText className="w-5 h-5" />,
    roles: ['admin', 'wali_kelas', 'wali'],
    color: 'from-amber-600 to-rose-600',
    category: 'Bimbingan & Rapor'
  },
  {
    id: 'dokumentasi',
    label: 'Galeri Dokumentasi',
    desc: 'Bukti foto agenda pengajaran',
    icon: <Image className="w-5 h-5" />,
    roles: ['admin', 'pengawas', 'wali', 'wali_kelas'],
    color: 'from-violet-500 to-fuchsia-600',
    category: 'Bimbingan & Rapor'
  },

  // Sistem & Administrasi
  {
    id: 'users',
    label: 'Kelola Hak Akses',
    desc: 'Manajemen akun login & generator',
    icon: <KeyRound className="w-5 h-5" />,
    roles: ['admin', 'wali_kelas'],
    color: 'from-slate-700 to-slate-900',
    category: 'Sistem & Administrasi'
  },
  {
    id: 'google_sheets',
    label: 'Integrasi Google Sheets',
    desc: 'Ekspor & Impor data via Google Sheets',
    icon: <FileSpreadsheet className="w-5 h-5" />,
    roles: ['admin'],
    color: 'from-emerald-600 to-green-700',
    category: 'Sistem & Administrasi'
  },
  {
    id: 'profile',
    label: 'Akun & Profil',
    desc: 'Ubah password & setelan personal',
    icon: <UserCircle className="w-5 h-5" />,
    roles: ['admin', 'guru', 'wali_kelas', 'pengawas', 'wali'],
    color: 'from-teal-600 to-emerald-700',
    category: 'Sistem & Administrasi'
  }
];

export function isMenuVisibleForUser(menu: MenuConfigItem, user: User, settings?: SystemSettings): boolean {
  if (!menu.roles.includes(user.role)) return false;
  if (!settings) return true;

  if (user.role === 'guru') {
    const disabled = settings.disabledMenusGuru || [];
    if (disabled.includes(menu.id)) return false;
  }

  if (user.role === 'wali_kelas') {
    const disabled = settings.disabledMenusWaliKelas || [];
    if (disabled.includes(menu.id)) return false;
  }

  return true;
}

const initialDummyEvents: MadrasahEvent[] = [
  { id_event: 'evt-1', tanggal: '2026-07-16', nama_kegiatan: 'Tahun Baru Islam 1448 H', jenis: 'Libur Nasional', deskripsi: 'Hari Libur Nasional memperingati Tahun Baru Hijriah' },
  { id_event: 'evt-2', tanggal: '2026-08-17', nama_kegiatan: 'Hari Kemerdekaan RI', jenis: 'Libur Nasional', deskripsi: 'Upacara bendera HUT Kemerdekaan RI ke-81' },
  { id_event: 'evt-3', tanggal: '2026-07-20', nama_kegiatan: 'Masa Ta\'aruf Siswa Madrasah (MATSAMA)', jenis: 'Kegiatan Madrasah', deskripsi: 'Orientasi santri baru MTs Ibad Ar Rahman' },
  { id_event: 'evt-4', tanggal: '2026-07-21', nama_kegiatan: 'Masa Ta\'aruf Siswa Madrasah (MATSAMA)', jenis: 'Kegiatan Madrasah', deskripsi: 'Orientasi santri baru MTs Ibad Ar Rahman' },
  { id_event: 'evt-5', tanggal: '2026-07-22', nama_kegiatan: 'Masa Ta\'aruf Siswa Madrasah (MATSAMA)', jenis: 'Kegiatan Madrasah', deskripsi: 'Orientasi santri baru MTs Ibad Ar Rahman' },
  { id_event: 'evt-6', tanggal: '2026-09-15', nama_kegiatan: 'Maulid Nabi Muhammad SAW', jenis: 'Libur Nasional', deskripsi: 'Libur Nasional memperingati Kelahiran Nabi SAW' },
  { id_event: 'evt-7', tanggal: '2026-10-22', nama_kegiatan: 'Hari Santri Nasional', jenis: 'Kegiatan Madrasah', deskripsi: 'Upacara dan Gebyar Hari Santri Nasional di Madrasah' },
];

export default function App() {
  // Authentication states
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [selectedLoginRole, setSelectedLoginRole] = useState<'admin' | 'wali_kelas' | 'guru' | 'wali'>('admin');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Registration states
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [regRole, setRegRole] = useState<'guru' | 'wali_kelas' | 'wali'>('guru');
  const [regNama, setRegNama] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regMapel, setRegMapel] = useState('');
  const [regKelasWali, setRegKelasWali] = useState('');
  const [regKelasAjar, setRegKelasAjar] = useState<string[]>([]);
  const [regSelectedAnakIds, setRegSelectedAnakIds] = useState<string[]>([]);
  const [regKelasAnak, setRegKelasAnak] = useState('7A');
  const [regError, setRegError] = useState('');

  // Active navigation menu state
  const [activeMenu, setActiveMenu] = useState('dashboard');

  // Database core states
  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [jurnalList, setJurnalList] = useState<Jurnal[]>([]);
  const [perkembanganList, setPerkembanganList] = useState<CatatanPerkembangan[]>([]);
  const [perilakuList, setPerilakuList] = useState<CatatanPerilaku[]>([]);
  const [homeVisitList, setHomeVisitList] = useState<HomeVisit[]>([]);
  const [dokumentasiList, setDokumentasiList] = useState<Dokumentasi[]>([]);
  const [administrasiList, setAdministrasiList] = useState<Administrasi[]>([]);
  const [jadwalList, setJadwalList] = useState<Jadwal[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(initialDummySettings);
  const [activityLogList, setActivityLogList] = useState<ActivityLog[]>([]);
  const [eventsList, setEventsList] = useState<MadrasahEvent[]>([]);
  const [prestasiList, setPrestasiList] = useState<Prestasi[]>([]);

  // General Notification state
  const [notif, setNotif] = useState({ isOpen: false, title: '', message: '', isError: false });

  // Google Sheets sync status state
  const [syncStatus, setSyncStatus] = useState<'online' | 'offline' | 'error'>(() => {
    const hasSheetsToken = !!localStorage.getItem('edu_google_access_token');
    return hasSheetsToken ? 'online' : 'offline';
  });

  // Load from local storage or fallback to preloaded dummy data
  useEffect(() => {
    // 1. Siswa
    const storedSiswa = localStorage.getItem('edu_siswa');
    const initialSiswa = generateSiswaFromCSV();
    if (storedSiswa) {
      try {
        const parsed: Siswa[] = JSON.parse(storedSiswa);
        // Ensure new dataset (including Grade 9) is loaded
        const hasNewGrade9 = parsed.some(s => s.nama_siswa === "Abdullah" || s.nama_siswa === "Afif Romeita Hamdi");
        const hasGrade7 = parsed.some(s => s.nama_siswa === "Ahmadinezad Reza Firdaus");
        if (!hasNewGrade9 || !hasGrade7) {
          setSiswaList(initialSiswa);
          localStorage.setItem('edu_siswa', JSON.stringify(initialSiswa));
        } else {
          setSiswaList(parsed);
        }
      } catch {
        setSiswaList(initialSiswa);
        localStorage.setItem('edu_siswa', JSON.stringify(initialSiswa));
      }
    } else {
      setSiswaList(initialSiswa);
      localStorage.setItem('edu_siswa', JSON.stringify(initialSiswa));
    }

    // 2. Users
    const storedUsers = localStorage.getItem('edu_users');
    if (storedUsers) {
      setUsersList(JSON.parse(storedUsers));
    } else {
      setUsersList(initialDummyUsers);
      localStorage.setItem('edu_users', JSON.stringify(initialDummyUsers));
    }

    // 3. Jurnal
    const storedJurnal = localStorage.getItem('edu_jurnal');
    if (storedJurnal) {
      setJurnalList(JSON.parse(storedJurnal));
    } else {
      setJurnalList(initialDummyJurnal);
      localStorage.setItem('edu_jurnal', JSON.stringify(initialDummyJurnal));
    }

    // 4. Perkembangan
    const storedPerkembangan = localStorage.getItem('edu_perkembangan');
    if (storedPerkembangan) {
      setPerkembanganList(JSON.parse(storedPerkembangan));
    } else {
      setPerkembanganList(initialDummyPerkembangan);
      localStorage.setItem('edu_perkembangan', JSON.stringify(initialDummyPerkembangan));
    }

    // 5. Perilaku
    const storedPerilaku = localStorage.getItem('edu_perilaku');
    if (storedPerilaku) {
      setPerilakuList(JSON.parse(storedPerilaku));
    } else {
      setPerilakuList(initialDummyPerilaku);
      localStorage.setItem('edu_perilaku', JSON.stringify(initialDummyPerilaku));
    }

    // 6. Home Visit
    const storedHomeVisit = localStorage.getItem('edu_home_visit');
    if (storedHomeVisit) {
      setHomeVisitList(JSON.parse(storedHomeVisit));
    } else {
      setHomeVisitList(initialDummyHomeVisit);
      localStorage.setItem('edu_home_visit', JSON.stringify(initialDummyHomeVisit));
    }

    // 7. Dokumentasi
    const storedDokumentasi = localStorage.getItem('edu_dokumentasi');
    if (storedDokumentasi) {
      const parsed = JSON.parse(storedDokumentasi) as Dokumentasi[];
      const cleaned = parsed.filter(d => d.id_dokumentasi !== 'GAL01' && ((d.foto && d.foto.length > 10) || (d.fotos && d.fotos.length > 0)));
      setDokumentasiList(cleaned);
      localStorage.setItem('edu_dokumentasi', JSON.stringify(cleaned));
    } else {
      setDokumentasiList(initialDummyDokumentasi);
      localStorage.setItem('edu_dokumentasi', JSON.stringify(initialDummyDokumentasi));
    }

    // 8. Administrasi
    const storedAdministrasi = localStorage.getItem('edu_administrasi');
    if (storedAdministrasi) {
      setAdministrasiList(JSON.parse(storedAdministrasi));
    } else {
      setAdministrasiList(initialDummyAdministrasi);
      localStorage.setItem('edu_administrasi', JSON.stringify(initialDummyAdministrasi));
    }

    // 9. Jadwal
    const storedJadwal = localStorage.getItem('edu_jadwal');
    if (storedJadwal) {
      setJadwalList(JSON.parse(storedJadwal));
    } else {
      setJadwalList(initialDummyJadwal);
      localStorage.setItem('edu_jadwal', JSON.stringify(initialDummyJadwal));
    }

    // 10. Settings
    const storedSettings = localStorage.getItem('edu_settings');
    if (storedSettings) {
      setSettings(JSON.parse(storedSettings));
    } else {
      setSettings(initialDummySettings);
      localStorage.setItem('edu_settings', JSON.stringify(initialDummySettings));
    }

    // 11. Activity Logs
    const storedActivityLogs = localStorage.getItem('edu_activity_logs');
    if (storedActivityLogs) {
      setActivityLogList(JSON.parse(storedActivityLogs));
    } else {
      setActivityLogList(initialDummyActivityLogs);
      localStorage.setItem('edu_activity_logs', JSON.stringify(initialDummyActivityLogs));
    }

    // 11b. Madrasah Events & Holidays
    const storedEvents = localStorage.getItem('edu_events');
    if (storedEvents) {
      setEventsList(JSON.parse(storedEvents));
    } else {
      setEventsList(initialDummyEvents);
      localStorage.setItem('edu_events', JSON.stringify(initialDummyEvents));
    }

    // 11c. Prestasi Santri
    const storedPrestasi = localStorage.getItem('edu_prestasi');
    if (storedPrestasi) {
      setPrestasiList(JSON.parse(storedPrestasi));
    } else {
      setPrestasiList(initialDummyPrestasi);
      localStorage.setItem('edu_prestasi', JSON.stringify(initialDummyPrestasi));
    }

    // 12. Auth session
    const activeSession = localStorage.getItem('edu_active_session');
    if (activeSession) {
      setCurrentUser(JSON.parse(activeSession));
    }
  }, []);

  // Sync / Auth events from Google Sheets API and state tracking
  useEffect(() => {
    const handleSyncSuccess = () => {
      setSyncStatus('online');
    };

    const handleSyncFailed = (e: Event) => {
      setSyncStatus('error');
      const detail = (e as CustomEvent).detail || {};
      const tabTitle = detail.title || 'Data';
      showNotification(
        'Sinkronisasi Google Sheets Gagal',
        `Gagal menulis ke tab "${tabTitle}" di Google Spreadsheet Anda. Ini biasanya terjadi jika Anda masih menggunakan ID Spreadsheet default (Hanya Baca) atau koneksi Anda terputus. Silakan buka menu "Integrasi Google Sheets" lalu klik tombol "Buat Spreadsheet Baru" untuk membuat salinan pribadi milik Anda sendiri di Google Drive Anda.`,
        true
      );
    };

    const handleAuthExpired = () => {
      setSyncStatus('error');
      showNotification(
        'Sesi Google Kedaluwarsa',
        'Koneksi akun Google Anda telah kedaluwarsa atau memerlukan otorisasi ulang. Silakan buka menu "Integrasi Google Sheets" dan masuk kembali untuk melanjutkan sinkronisasi otomatis.',
        true
      );
    };

    const handleStorageChange = () => {
      const hasSheetsToken = !!localStorage.getItem('edu_google_access_token');
      setSyncStatus(prev => {
        // If we previously had an error, stay on error unless we got a new valid token
        if (prev === 'error' && !hasSheetsToken) return 'error';
        return hasSheetsToken ? 'online' : 'offline';
      });
    };

    window.addEventListener('google-sheet-sync-success', handleSyncSuccess);
    window.addEventListener('google-sheet-sync-failed', handleSyncFailed);
    window.addEventListener('google-auth-expired', handleAuthExpired);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('google-auth-updated', handleStorageChange);

    return () => {
      window.removeEventListener('google-sheet-sync-success', handleSyncSuccess);
      window.removeEventListener('google-sheet-sync-failed', handleSyncFailed);
      window.removeEventListener('google-auth-expired', handleAuthExpired);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('google-auth-updated', handleStorageChange);
    };
  }, []);

  // Sync state mutations helper to local storage
  const syncState = (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e: any) {
      console.warn(`LocalStorage write failed for key "${key}":`, e);
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        console.warn('LocalStorage quota exceeded. Attempting to clear old activity logs to free space.');
        try {
          // Keep only the last 10 logs
          const storedLogs = localStorage.getItem('edu_activity_logs');
          if (storedLogs) {
            const parsed = JSON.parse(storedLogs);
            if (parsed.length > 10) {
              localStorage.setItem('edu_activity_logs', JSON.stringify(parsed.slice(0, 10)));
            }
          }
          // Retry the save
          localStorage.setItem(key, JSON.stringify(data));
        } catch (retryError) {
          console.error('Failed to resolve QuotaExceededError even after log truncation:', retryError);
        }
      }
    }
  };

  const logActivity = (
    aksi: string,
    rincian: string,
    initialSyncStatus?: 'Berhasil' | 'Gagal' | 'Tidak Aktif' | 'Proses'
  ): string => {
    const activeSession = localStorage.getItem('edu_active_session');
    const u: User | null = activeSession ? JSON.parse(activeSession) : currentUser;
    if (!u) return '';

    const id_log = 'LOG_' + Date.now() + Math.floor(Math.random() * 100);
    const hasSheetsToken = !!localStorage.getItem('edu_google_access_token');
    const sync_status = initialSyncStatus !== undefined
      ? initialSyncStatus
      : (hasSheetsToken ? 'Proses' : 'Tidak Aktif');

    const newLog: ActivityLog = {
      id_log,
      timestamp: new Date().toISOString(),
      id_user: u.id_user,
      nama_user: u.nama_lengkap,
      role: u.role,
      aksi,
      rincian,
      sync_status
    };

    setActivityLogList(prev => {
      const updated = [newLog, ...prev];
      localStorage.setItem('edu_activity_logs', JSON.stringify(updated));
      return updated;
    });

    return id_log;
  };

  const updateLogSyncStatus = (id_log: string, sync_status: 'Berhasil' | 'Gagal' | 'Tidak Aktif') => {
    if (!id_log) return;
    setActivityLogList(prev => {
      const updated = prev.map(log => {
        if (log.id_log === id_log) {
          return { ...log, sync_status };
        }
        return log;
      });
      localStorage.setItem('edu_activity_logs', JSON.stringify(updated));
      return updated;
    });
  };

  const handleClearLogs = () => {
    setActivityLogList([]);
    localStorage.setItem('edu_activity_logs', JSON.stringify([]));
    showNotification("Log Dibersihkan", "Seluruh riwayat audit aktivitas sistem telah dikosongkan.");
  };

  const showNotification = (title: string, message: string, isError = false) => {
    setNotif({ isOpen: true, title, message, isError });
  };

  // --- ACTIONS HANDLERS ---

  // Auth Submit
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setLoginError("Mohon lengkapi username dan password!");
      return;
    }

    let allowedRoles: string[] = [];
    if (selectedLoginRole === 'admin') {
      allowedRoles = ['admin', 'pengawas'];
    } else if (selectedLoginRole === 'wali_kelas') {
      allowedRoles = ['wali_kelas'];
    } else if (selectedLoginRole === 'guru') {
      allowedRoles = ['guru'];
    } else if (selectedLoginRole === 'wali') {
      allowedRoles = ['wali'];
    }

    const matchedUser = usersList.find(
      u => u.username.toLowerCase() === username.toLowerCase().trim() && u.password === password
    );

    if (!matchedUser) {
      setLoginError("Kombinasi Username & Password tidak terdaftar!");
      return;
    }

    if (!allowedRoles.includes(matchedUser.role)) {
      setLoginError(`Akun ditemukan, tetapi peran tidak cocok dengan pilihan login Anda (${selectedLoginRole === 'admin' ? 'ADMIN/PENGAWAS' : selectedLoginRole.toUpperCase().replace('_', ' ')})!`);
      return;
    }

    if (matchedUser.status === 'Nonaktif') {
      setLoginError("Akses akun Anda dinonaktifkan oleh administrator!");
      return;
    }

    setCurrentUser(matchedUser);
    localStorage.setItem('edu_active_session', JSON.stringify(matchedUser));
    setLoginError('');
    setActiveMenu('dashboard');
    showNotification("Login Berhasil", `Selamat datang kembali, ${matchedUser.nama_lengkap}!`);
    // Log the login activity
    setTimeout(() => {
      logActivity("Login Berhasil", `Masuk ke aplikasi sebagai ${matchedUser.role.toUpperCase()}`);
    }, 100);
  };

  // Auth Register Submit
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (!regNama || !regUsername || !regPassword) {
      setRegError("Semua kolom wajib diisi!");
      return;
    }

    const trimmedUsername = regUsername.trim().toLowerCase();
    
    // Check duplicate username
    const exists = usersList.some(u => u.username.toLowerCase() === trimmedUsername);
    if (exists) {
      setRegError("Username ini sudah terdaftar! Gunakan username lain.");
      return;
    }

    let refStr = '';
    if (regRole === 'wali_kelas') {
      if (!regKelasWali) {
        setRegError("Pilih Kelas Asuhan Anda sebagai Wali Kelas!");
        return;
      }
      if (!regMapel) {
        setRegError("Isi Mata Pelajaran Utama Anda!");
        return;
      }
      if (regKelasAjar.length === 0) {
        setRegError("Pilih setidaknya satu Kelas yang Anda ajar!");
        return;
      }
      refStr = `WALI:${regKelasWali}|AJAR:${regKelasAjar.join(',')}|MAPEL:${regMapel}`;
    } else if (regRole === 'guru') {
      if (!regMapel) {
        setRegError("Isi Mata Pelajaran Utama Anda!");
        return;
      }
      if (regKelasAjar.length === 0) {
        setRegError("Pilih setidaknya satu Kelas yang Anda ajar!");
        return;
      }
      refStr = `AJAR:${regKelasAjar.join(',')}|MAPEL:${regMapel}`;
    } else if (regRole === 'wali') {
      if (regSelectedAnakIds.length === 0) {
        setRegError("Pilih setidaknya satu Santri (anak Anda)!");
        return;
      }
      refStr = regSelectedAnakIds.join(',');
    }

    const newUser: User = {
      id_user: 'U' + Date.now(),
      username: trimmedUsername,
      password: regPassword,
      role: regRole,
      nama_lengkap: regNama.trim(),
      id_referensi: refStr,
      status: 'Aktif'
    };

    // Update usersList and save to local storage
    const updatedUsers = [...usersList, newUser];
    setUsersList(updatedUsers);
    syncState('edu_users', updatedUsers);

    // INTEGRATION: If Wali Santri, update selected student's nama_wali in siswaList
    let updatedSiswa = siswaList;
    if (regRole === 'wali') {
      updatedSiswa = siswaList.map(s => {
        if (regSelectedAnakIds.includes(s.id_siswa)) {
          return { ...s, nama_wali: regNama.trim() };
        }
        return s;
      });
      setSiswaList(updatedSiswa);
      syncState('edu_siswa', updatedSiswa);
    }

    // Reset reg fields and switch back to login mode
    setRegNama('');
    setRegUsername('');
    setRegPassword('');
    setRegMapel('');
    setRegKelasWali('');
    setRegKelasAjar([]);
    setRegSelectedAnakIds([]);
    setIsRegisterMode(false);

    showNotification("Pendaftaran Berhasil", `Akun ${newUser.nama_lengkap} sebagai ${regRole === 'wali' ? 'Wali Santri' : regRole === 'wali_kelas' ? 'Wali Kelas' : 'Guru'} berhasil dibuat. Silakan login.`);

    // Sync to Google Sheets
    (async () => {
      const syncedUsers = await syncToGoogleSheets('users', updatedUsers);
      let syncedSiswa = true;
      if (regRole === 'wali') {
        syncedSiswa = await syncToGoogleSheets('siswa', updatedSiswa);
      }
      if (syncedUsers && syncedSiswa) {
        showNotification("Sinkronisasi Berhasil", "Data pendaftaran akun baru otomatis tersimpan di Google Spreadsheet.");
      }
    })();
  };

  // Sign out
  const handleSignOut = () => {
    setCurrentUser(null);
    localStorage.removeItem('edu_active_session');
    setActiveMenu('dashboard');
  };

  // Profile update
  const handleUpdateProfile = async (data: Partial<User>) => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, ...data };
    
    // Update active state
    setCurrentUser(updatedUser);
    localStorage.setItem('edu_active_session', JSON.stringify(updatedUser));

    // Update inside list
    const updatedList = usersList.map(u => u.id_user === currentUser.id_user ? { ...u, ...data } : u);
    setUsersList(updatedList);
    syncState('edu_users', updatedList);

    showNotification("Profil Diperbarui", "Kredensial login Anda berhasil disimpan.");
    const idLog = logActivity("Ubah Profil", `Memperbarui kredensial akun / kata sandi`);

    const synced = await syncToGoogleSheets('users', updatedList);
    updateLogSyncStatus(idLog, synced ? 'Berhasil' : 'Gagal');
    if (synced) {
      showNotification("Sinkronisasi Berhasil", "Perubahan profil otomatis tersimpan di Google Spreadsheet.");
    }
  };
  
  // Settings Actions
  const handleUpdateSettings = async (newSettings: SystemSettings) => {
    setSettings(newSettings);
    syncState('edu_settings', newSettings);
    showNotification("Konfigurasi Diperbarui", `Tahun Ajaran diatur ke ${newSettings.tahun_ajaran} & Batas Administrasi diatur ke ${newSettings.batas_waktu_administrasi}.`);
    const idLog = logActivity("Ubah Setelan", `Mengubah setelan sistem tahun ajaran/batas waktu`);

    const synced = await syncToGoogleSheets('settings', [newSettings]);
    updateLogSyncStatus(idLog, synced ? 'Berhasil' : 'Gagal');
    if (synced) {
      showNotification("Sinkronisasi Berhasil", "Konfigurasi otomatis tersimpan di Google Spreadsheet.");
    }
  };

  // Siswa Actions
  const handleAddSiswa = async (s: Siswa) => {
    const updated = [...siswaList, s];
    setSiswaList(updated);
    syncState('edu_siswa', updated);
    showNotification("Santri Ditambahkan", `${s.nama_siswa} berhasil terdaftar di rombel Kelas ${s.kelas}.`);
    const idLog = logActivity("Tambah Santri", `Mendaftarkan santri baru ${s.nama_siswa} di kelas ${s.kelas}`);

    const synced = await syncToGoogleSheets('siswa', updated);
    updateLogSyncStatus(idLog, synced ? 'Berhasil' : 'Gagal');
    if (synced) {
      showNotification("Sinkronisasi Berhasil", "Data santri otomatis tersimpan di Google Spreadsheet.");
    }
  };

  const handleDeleteSiswa = async (id: string) => {
    const target = siswaList.find(s => s.id_siswa === id);
    const updated = siswaList.filter(s => s.id_siswa !== id);
    setSiswaList(updated);
    syncState('edu_siswa', updated);
    showNotification("Santri Dihapus", "Data santri berhasil dikeluarkan dari database.");
    const idLog = logActivity("Hapus Santri", `Mengeluarkan santri ${target?.nama_siswa || id} dari rombel Kelas ${target?.kelas}`);

    const synced = await syncToGoogleSheets('siswa', updated);
    updateLogSyncStatus(idLog, synced ? 'Berhasil' : 'Gagal');
    if (synced) {
      showNotification("Sinkronisasi Berhasil", "Google Spreadsheet telah diperbarui.");
    }
  };

  const handleUpdateSiswaClass = async (id_siswa: string, new_kelas: string) => {
    const target = siswaList.find(s => s.id_siswa === id_siswa);
    const currentYr = new Date().getFullYear();
    const academicYearStr = `${currentYr}/${currentYr + 1}`;
    const updated = siswaList.map(s => s.id_siswa === id_siswa ? {
      ...s,
      kelas_asal: s.kelas_asal || s.kelas,
      kelas: new_kelas,
      tahun_kenaikan: academicYearStr
    } : s);
    setSiswaList(updated);
    syncState('edu_siswa', updated);
    showNotification("Penempatan Kelas Diperbarui", `Santri ${target?.nama_siswa || id_siswa} dipindahkan ke Kelas ${new_kelas}.`);
    const idLog = logActivity("Ubah Kelas Santri", `Memindahkan santri ${target?.nama_siswa || id_siswa} ke Kelas ${new_kelas}`);

    const synced = await syncToGoogleSheets('siswa', updated);
    updateLogSyncStatus(idLog, synced ? 'Berhasil' : 'Gagal');
    if (synced) {
      showNotification("Sinkronisasi Berhasil", "Perubahan rombel santri otomatis tersimpan di Google Spreadsheet.");
    }
  };

  const handleAddBulkSiswa = async (newStudents: Siswa[]) => {
    const existingIds = new Set(siswaList.map(s => s.id_siswa));
    const uniqueNew = newStudents.filter(s => !existingIds.has(s.id_siswa));
    const updated = [...siswaList, ...uniqueNew];

    setSiswaList(updated);
    syncState('edu_siswa', updated);
    showNotification("Import Santri Berhasil", `Berhasil menambahkan ${uniqueNew.length} santri baru ke database.`);
    const idLog = logActivity("Import Massal Santri", `Menambahkan ${uniqueNew.length} santri baru via file template CSV/Excel`);

    const synced = await syncToGoogleSheets('siswa', updated);
    updateLogSyncStatus(idLog, synced ? 'Berhasil' : 'Gagal');
    if (synced) {
      showNotification("Sinkronisasi Berhasil", "Data santri baru otomatis tersimpan di Google Spreadsheet.");
    }
  };

  const updateTeacherClassReference = (
    idRef: string,
    classTransitionMap: Map<string, string>
  ): string => {
    if (!idRef) return idRef;
    const parts = idRef.split('|');
    const updatedParts = parts.map(part => {
      if (part.startsWith('WALI:')) {
        const cls = part.replace('WALI:', '').trim();
        const newCls = classTransitionMap.get(cls) || cls;
        return `WALI:${newCls}`;
      }
      if (part.startsWith('AJAR:')) {
        const classes = part.replace('AJAR:', '').split(',');
        const newClasses = classes.map(c => classTransitionMap.get(c.trim()) || c.trim());
        const uniqueNew = [...new Set(newClasses)];
        return `AJAR:${uniqueNew.join(',')}`;
      }
      // Simple comma-separated class list (e.g., "7A,7B" or "7A")
      const classes = part.split(',');
      const newClasses = classes.map(c => classTransitionMap.get(c.trim()) || c.trim());
      const uniqueNew = [...new Set(newClasses)];
      return uniqueNew.join(',');
    });
    return updatedParts.join('|');
  };

  const handleBulkPromoteSiswa = async (
    promotions: { id_siswa: string; new_kelas: string }[],
    logMsg?: string,
    updateTeacherClasses: boolean = true
  ) => {
    const promoMap = new Map(promotions.map(p => [p.id_siswa, p.new_kelas]));

    // Build class transition map (e.g., 7A => 8A)
    const classTransitionMap = new Map<string, string>();
    siswaList.forEach(s => {
      if (promoMap.has(s.id_siswa)) {
        const newKls = promoMap.get(s.id_siswa)!;
        if (s.kelas && newKls && s.kelas !== newKls) {
          classTransitionMap.set(s.kelas, newKls);
        }
      }
    });

    const currentYr = new Date().getFullYear();
    const academicYearStr = `${currentYr}/${currentYr + 1}`;

    const updatedSiswa = siswaList.map(s => {
      if (promoMap.has(s.id_siswa)) {
        const targetKls = promoMap.get(s.id_siswa)!;
        return {
          ...s,
          kelas_asal: s.kelas_asal || s.kelas,
          kelas: targetKls,
          tahun_kenaikan: academicYearStr
        };
      }
      return s;
    });
    setSiswaList(updatedSiswa);
    syncState('edu_siswa', updatedSiswa);

    // Update teacher & wali_kelas assignments if enabled
    let updatedUsers = usersList;
    if (updateTeacherClasses && classTransitionMap.size > 0) {
      updatedUsers = usersList.map(u => {
        if ((u.role === 'guru' || u.role === 'wali_kelas') && u.id_referensi) {
          const newRef = updateTeacherClassReference(u.id_referensi, classTransitionMap);
          return { ...u, id_referensi: newRef };
        }
        return u;
      });
      setUsersList(updatedUsers);
      syncState('edu_users', updatedUsers);

      if (currentUser && (currentUser.role === 'guru' || currentUser.role === 'wali_kelas') && currentUser.id_referensi) {
        const newRef = updateTeacherClassReference(currentUser.id_referensi, classTransitionMap);
        const newCurrentUser = { ...currentUser, id_referensi: newRef };
        setCurrentUser(newCurrentUser);
        localStorage.setItem('edu_current_user', JSON.stringify(newCurrentUser));
      }
    }

    showNotification("Kenaikan Kelas Berhasil", `Berhasil memproses kenaikan kelas untuk ${promotions.length} santri.`);
    const idLog = logActivity("Kenaikan Kelas Massal", logMsg || `Memproses kenaikan kelas untuk ${promotions.length} santri`);

    const syncedSiswa = await syncToGoogleSheets('siswa', updatedSiswa);
    if (updateTeacherClasses && classTransitionMap.size > 0) {
      await syncToGoogleSheets('users', updatedUsers);
    }
    updateLogSyncStatus(idLog, syncedSiswa ? 'Berhasil' : 'Gagal');
    if (syncedSiswa) {
      showNotification("Sinkronisasi Berhasil", "Data kenaikan kelas santri & penyesuaian kelas guru otomatis tersimpan di Google Spreadsheet.");
    }
  };

  const handleResetSiswaToInitial = async () => {
    const initialSiswa = generateSiswaFromCSV();
    setSiswaList(initialSiswa);
    syncState('edu_siswa', initialSiswa);

    setUsersList(initialDummyUsers);
    syncState('edu_users', initialDummyUsers);

    if (currentUser && currentUser.role !== 'admin') {
      const resetUser = initialDummyUsers.find(u => u.username === currentUser.username) || currentUser;
      setCurrentUser(resetUser);
      localStorage.setItem('edu_current_user', JSON.stringify(resetUser));
    }

    showNotification("Reset Data Santri Berhasil", "Seluruh data santri telah dikembalikan ke data semula sebelum kenaikan kelas.");
    logActivity("Reset Data Santri", "Mengembalikan seluruh data santri ke data awal dari master CSV.");
    await syncToGoogleSheets('siswa', initialSiswa);
    await syncToGoogleSheets('users', initialDummyUsers);
  };

  // Jurnal Actions
  const handleAddJurnal = async (j: Jurnal) => {
    const updated = [...jurnalList, j];
    setJurnalList(updated);
    syncState('edu_jurnal', updated);
    showNotification("Jurnal Mengajar Tersimpan", "Agenda agenda pembelajaran dan presensi santri berhasil direkam.");
    const idLog = logActivity("Mengisi Jurnal", `Mengisi jurnal KBM Kelas ${j.kelas} - ${j.mata_pelajaran}`);
    const synced = await syncToGoogleSheets('jurnal', updated);
    updateLogSyncStatus(idLog, synced ? 'Berhasil' : 'Gagal');
    if (synced) {
      showNotification("Sinkronisasi Berhasil", "Data jurnal harian terbaru otomatis tersimpan di Google Spreadsheet.");
    }
  };

  const handleEditJurnal = async (j: Jurnal) => {
    const updated = jurnalList.map(item => item.id_jurnal === j.id_jurnal ? j : item);
    setJurnalList(updated);
    syncState('edu_jurnal', updated);
    showNotification("Jurnal Mengajar Diperbarui", "Perubahan agenda harian mengajar berhasil disimpan.");
    const idLog = logActivity("Mengubah Jurnal", `Mengubah rincian jurnal KBM Kelas ${j.kelas} - ${j.mata_pelajaran}`);
    const synced = await syncToGoogleSheets('jurnal', updated);
    updateLogSyncStatus(idLog, synced ? 'Berhasil' : 'Gagal');
    if (synced) {
      showNotification("Sinkronisasi Berhasil", "Perubahan jurnal harian otomatis diperbarui di Google Spreadsheet.");
    }
  };

  const handleDeleteJurnal = async (id: string) => {
    const target = jurnalList.find(item => item.id_jurnal === id);
    const updated = jurnalList.filter(item => item.id_jurnal !== id);
    setJurnalList(updated);
    syncState('edu_jurnal', updated);
    showNotification("Jurnal Dihapus", "Dokumen jurnal mengajar berhasil dimusnahkan.");
    const idLog = logActivity("Hapus Jurnal", `Menghapus jurnal KBM Kelas ${target?.kelas} - ${target?.mata_pelajaran} tanggal ${target?.tanggal}`);
    const synced = await syncToGoogleSheets('jurnal', updated);
    updateLogSyncStatus(idLog, synced ? 'Berhasil' : 'Gagal');
    if (synced) {
      showNotification("Sinkronisasi Berhasil", "Google Spreadsheet telah diperbarui.");
    }
  };

  // Catatan Perkembangan Actions
  const handleAddPerkembangan = async (p: CatatanPerkembangan) => {
    const updated = [...perkembanganList, p];
    setPerkembanganList(updated);
    syncState('edu_perkembangan', updated);
    showNotification("Evaluasi Akademik Direkam", "Laporan naratif capaian kompetensi santri berhasil disimpan.");
    const idLog = logActivity("Mencatat Perkembangan", `Mencatat evaluasi ${p.kategori} untuk Santri ID ${p.id_siswa}`);
    const synced = await syncToGoogleSheets('perkembangan', updated);
    updateLogSyncStatus(idLog, synced ? 'Berhasil' : 'Gagal');
    if (synced) {
      showNotification("Sinkronisasi Berhasil", "Evaluasi akademik otomatis tersimpan di Google Spreadsheet.");
    }
  };

  const handleEditPerkembangan = async (p: CatatanPerkembangan) => {
    const updated = perkembanganList.map(item => item.id_catatan === p.id_catatan ? p : item);
    setPerkembanganList(updated);
    syncState('edu_perkembangan', updated);
    showNotification("Evaluasi Diperbarui", "Perubahan laporan naratif kompetensi santri berhasil disimpan.");
    const idLog = logActivity("Mengubah Perkembangan", `Mengubah evaluasi ${p.kategori} untuk Santri ID ${p.id_siswa}`);
    const synced = await syncToGoogleSheets('perkembangan', updated);
    updateLogSyncStatus(idLog, synced ? 'Berhasil' : 'Gagal');
    if (synced) {
      showNotification("Sinkronisasi Berhasil", "Google Spreadsheet telah diperbarui.");
    }
  };

  const handleDeletePerkembangan = async (id: string) => {
    const target = perkembanganList.find(item => item.id_catatan === id);
    const updated = perkembanganList.filter(item => item.id_catatan !== id);
    setPerkembanganList(updated);
    syncState('edu_perkembangan', updated);
    showNotification("Evaluasi Dihapus", "Catatan evaluasi akademik berhasil dihapus.");
    const idLog = logActivity("Hapus Perkembangan", `Menghapus evaluasi akademik untuk Santri ID ${target?.id_siswa}`);
    const synced = await syncToGoogleSheets('perkembangan', updated);
    updateLogSyncStatus(idLog, synced ? 'Berhasil' : 'Gagal');
    if (synced) {
      showNotification("Sinkronisasi Berhasil", "Google Spreadsheet telah diperbarui.");
    }
  };

  // Catatan Perilaku Actions
  const handleAddPerilaku = async (p: CatatanPerilaku) => {
    const updated = [...perilakuList, p];
    setPerilakuList(updated);
    syncState('edu_perilaku', updated);
    showNotification("Catatan Adab Direkam", "Log pemantauan perilaku/akhlak santri berhasil disimpan.");
    const idLog = logActivity("Mencatat Perilaku", `Mencatat adab ${p.jenis_perilaku} untuk Santri ID ${p.id_siswa}`);
    const synced = await syncToGoogleSheets('perilaku', updated);
    updateLogSyncStatus(idLog, synced ? 'Berhasil' : 'Gagal');
    if (synced) {
      showNotification("Sinkronisasi Berhasil", "Log adab otomatis tersimpan di Google Spreadsheet.");
    }
  };

  const handleEditPerilaku = async (p: CatatanPerilaku) => {
    const updated = perilakuList.map(item => item.id_catatan === p.id_catatan ? p : item);
    setPerilakuList(updated);
    syncState('edu_perilaku', updated);
    showNotification("Catatan Adab Diperbarui", "Perubahan log perilaku berhasil disimpan.");
    const idLog = logActivity("Mengubah Perilaku", `Mengubah adab ${p.jenis_perilaku} untuk Santri ID ${p.id_siswa}`);
    const synced = await syncToGoogleSheets('perilaku', updated);
    updateLogSyncStatus(idLog, synced ? 'Berhasil' : 'Gagal');
    if (synced) {
      showNotification("Sinkronisasi Berhasil", "Google Spreadsheet telah diperbarui.");
    }
  };

  const handleDeletePerilaku = async (id: string) => {
    const target = perilakuList.find(item => item.id_catatan === id);
    const updated = perilakuList.filter(item => item.id_catatan !== id);
    setPerilakuList(updated);
    syncState('edu_perilaku', updated);
    showNotification("Catatan Adab Dihapus", "Catatan laporan adab berhasil dihapus.");
    const idLog = logActivity("Hapus Perilaku", `Menghapus adab ${target?.jenis_perilaku} untuk Santri ID ${target?.id_siswa}`);
    const synced = await syncToGoogleSheets('perilaku', updated);
    updateLogSyncStatus(idLog, synced ? 'Berhasil' : 'Gagal');
    if (synced) {
      showNotification("Sinkronisasi Berhasil", "Google Spreadsheet telah diperbarui.");
    }
  };

  // Home Visit Actions
  const handleAddHomeVisit = async (h: HomeVisit) => {
    const updated = [...homeVisitList, h];
    setHomeVisitList(updated);
    syncState('edu_home_visit', updated);
    showNotification("Log Kunjungan Disimpan", "Laporan kunjungan rumah berhasil didokumentasikan.");
    const idLog = logActivity("Mencatat Home Visit", `Mencatat kunjungan rumah untuk Santri ID ${h.id_siswa}`);
    const synced = await syncToGoogleSheets('home_visit', updated);
    updateLogSyncStatus(idLog, synced ? 'Berhasil' : 'Gagal');
    if (synced) {
      showNotification("Sinkronisasi Berhasil", "Log kunjungan otomatis tersimpan di Google Spreadsheet.");
    }
  };

  const handleDeleteHomeVisit = async (id: string) => {
    const target = homeVisitList.find(item => item.id_kunjungan === id);
    const updated = homeVisitList.filter(item => item.id_kunjungan !== id);
    setHomeVisitList(updated);
    syncState('edu_home_visit', updated);
    showNotification("Log Kunjungan Dihapus", "Log riwayat kunjungan rumah berhasil dihapus.");
    const idLog = logActivity("Hapus Home Visit", `Menghapus kunjungan rumah untuk Santri ID ${target?.id_siswa}`);
    const synced = await syncToGoogleSheets('home_visit', updated);
    updateLogSyncStatus(idLog, synced ? 'Berhasil' : 'Gagal');
    if (synced) {
      showNotification("Sinkronisasi Berhasil", "Google Spreadsheet telah diperbarui.");
    }
  };

  // Dokumentasi Actions
  const handleAddDokumentasi = async (d: Dokumentasi) => {
    const updated = [...dokumentasiList, d];
    setDokumentasiList(updated);
    syncState('edu_dokumentasi', updated);
    showNotification("Galeri Dokumentasi Ditambahkan", "Foto bukti mengajar berhasil dimasukkan dalam folder galeri kelas.");
    const idLog = logActivity("Unggah Dokumentasi", `Mengunggah dokumentasi Kelas ${d.kelas} - ${d.nama_kegiatan}`);
    const synced = await syncToGoogleSheets('dokumentasi', updated);
    updateLogSyncStatus(idLog, synced ? 'Berhasil' : 'Gagal');
    if (synced) {
      showNotification("Sinkronisasi Berhasil", "Galeri dokumentasi otomatis tersimpan di Google Spreadsheet.");
    }
  };

  const handleDeleteDokumentasi = async (id: string) => {
    const target = dokumentasiList.find(item => item.id_dokumentasi === id);
    const updated = dokumentasiList.filter(item => item.id_dokumentasi !== id);
    setDokumentasiList(updated);
    syncState('edu_dokumentasi', updated);
    showNotification("Galeri Dihapus", "Foto berhasil dihapus dari galeri kelas.");
    const idLog = logActivity("Hapus Dokumentasi", `Menghapus dokumentasi ${target?.nama_kegiatan} Kelas ${target?.kelas}`);
    const synced = await syncToGoogleSheets('dokumentasi', updated);
    updateLogSyncStatus(idLog, synced ? 'Berhasil' : 'Gagal');
    if (synced) {
      showNotification("Sinkronisasi Berhasil", "Google Spreadsheet telah diperbarui.");
    }
  };

  // Administrasi Actions
  const handleAddAdministrasi = async (a: Administrasi) => {
    const updated = [...administrasiList, a];
    setAdministrasiList(updated);
    syncState('edu_administrasi', updated);
    showNotification("Administrasi Diunggah", `Berkas ${a.nama_file} berhasil diserahkan.`);
    logActivity("Mengunggah Administrasi", `Mengunggah berkas administrasi '${a.nama_file}'`);
    const synced = await syncToGoogleSheets('administrasi', updated);
    if (synced) {
      showNotification("Sinkronisasi Berhasil", "Berkas administrasi otomatis tersimpan di Google Spreadsheet.");
    }
  };

  const handleDeleteAdministrasi = async (id: string) => {
    const updated = administrasiList.filter(item => item.id_file !== id);
    setAdministrasiList(updated);
    syncState('edu_administrasi', updated);
    showNotification("Berkas Dihapus", "Berkas administrasi guru telah ditarik kembali.");
    const synced = await syncToGoogleSheets('administrasi', updated);
    if (synced) {
      showNotification("Sinkronisasi Berhasil", "Google Spreadsheet telah diperbarui.");
    }
  };

  // Prestasi Actions
  const handleAddPrestasi = async (p: Prestasi) => {
    const updated = [...prestasiList, p];
    setPrestasiList(updated);
    syncState('edu_prestasi', updated);
    showNotification("Prestasi Disimpan", "Data prestasi/kejuaraan santri berhasil didokumentasikan.");
    logActivity("Mencatat Prestasi", `Mencatat prestasi '${p.nama_kompetisi}' untuk Santri ${p.nama_siswa}`);
  };

  const handleEditPrestasi = async (p: Prestasi) => {
    const updated = prestasiList.map(item => item.id_prestasi === p.id_prestasi ? p : item);
    setPrestasiList(updated);
    syncState('edu_prestasi', updated);
    showNotification("Prestasi Diperbarui", "Data prestasi/kejuaraan santri berhasil diperbarui.");
    logActivity("Mengubah Prestasi", `Mengubah prestasi '${p.nama_kompetisi}' untuk Santri ${p.nama_siswa}`);
  };

  const handleDeletePrestasi = async (id: string) => {
    const target = prestasiList.find(item => item.id_prestasi === id);
    const updated = prestasiList.filter(item => item.id_prestasi !== id);
    setPrestasiList(updated);
    syncState('edu_prestasi', updated);
    showNotification("Prestasi Dihapus", "Data prestasi santri berhasil dihapus.");
    if (target) {
      logActivity("Menghapus Prestasi", `Menghapus prestasi '${target.nama_kompetisi}' untuk Santri ${target.nama_siswa}`);
    }
  };

  // Jadwal Actions
  const handleAddJadwal = async (j: Jadwal) => {
    const updated = [...jadwalList, j];
    setJadwalList(updated);
    syncState('edu_jadwal', updated);
    showNotification("Plot Jadwal Disimpan", "Waktu dan plotting mata pelajaran guru berhasil ditetapkan.");
    const synced = await syncToGoogleSheets('jadwal', updated);
    if (synced) {
      showNotification("Sinkronisasi Berhasil", "Plot jadwal otomatis tersimpan di Google Spreadsheet.");
    }
  };

  const handleDeleteJadwal = async (id: string) => {
    const updated = jadwalList.filter(item => item.id_jadwal !== id);
    setJadwalList(updated);
    syncState('edu_jadwal', updated);
    showNotification("Plot Jadwal Dihapus", "Penugasan jam pelajaran dibatalkan.");
    const synced = await syncToGoogleSheets('jadwal', updated);
    if (synced) {
      showNotification("Sinkronisasi Berhasil", "Google Spreadsheet telah diperbarui.");
    }
  };

  const handleToggleReminder = async (id: string, status: 'Aktif' | 'Nonaktif') => {
    const updated = jadwalList.map(item => item.id_jadwal === id ? { ...item, status_reminder: status } : item);
    setJadwalList(updated);
    syncState('edu_jadwal', updated);
    showNotification("Alarm Pengingat Diubah", `Peringatan otomatis kini berstatus ${status}.`);
    const synced = await syncToGoogleSheets('jadwal', updated);
    if (synced) {
      showNotification("Sinkronisasi Berhasil", "Google Spreadsheet telah diperbarui.");
    }
  };

  const handleEditJadwal = async (j: Jadwal) => {
    const updated = jadwalList.map(item => item.id_jadwal === j.id_jadwal ? j : item);
    setJadwalList(updated);
    syncState('edu_jadwal', updated);
    showNotification("Plot Jadwal Diubah", "Plotting waktu mengajar guru berhasil diperbarui.");
    const synced = await syncToGoogleSheets('jadwal', updated);
    if (synced) {
      showNotification("Sinkronisasi Berhasil", "Google Spreadsheet telah diperbarui.");
    }
  };

  const handleAddEvent = async (evt: MadrasahEvent) => {
    const updated = [evt, ...eventsList];
    setEventsList(updated);
    syncState('edu_events', updated);
    logActivity('Tambah Kegiatan/Libur', `Menambahkan ${evt.jenis}: ${evt.nama_kegiatan} pada ${evt.tanggal}`);
    showNotification("Kegiatan Ditambahkan", `Berhasil mendaftarkan ${evt.jenis}.`);
  };

  const handleDeleteEvent = async (id: string) => {
    const target = eventsList.find(e => e.id_event === id);
    if (!target) return;
    const updated = eventsList.filter(e => e.id_event !== id);
    setEventsList(updated);
    syncState('edu_events', updated);
    logActivity('Hapus Kegiatan/Libur', `Menghapus ${target.jenis}: ${target.nama_kegiatan}`);
    showNotification("Kegiatan Dihapus", `Berhasil menghapus ${target.jenis}.`);
  };

  // Users Actions
  const handleAddUser = async (u: User) => {
    const updated = [...usersList, u];
    setUsersList(updated);
    syncState('edu_users', updated);
    showNotification("Akun Dibuat", `Hak akses login untuk ${u.nama_lengkap} berhasil diaktifkan.`);
    const synced = await syncToGoogleSheets('users', updated);
    if (synced) {
      showNotification("Sinkronisasi Berhasil", "Akun pengguna baru otomatis tersimpan di Google Spreadsheet.");
    }
  };

  const handleEditUser = async (u: User) => {
    const updated = usersList.map(item => item.id_user === u.id_user ? u : item);
    setUsersList(updated);
    syncState('edu_users', updated);
    showNotification("Akun Diperbarui", "Perubahan setelan konfigurasi akun berhasil disimpan.");
    const synced = await syncToGoogleSheets('users', updated);
    if (synced) {
      showNotification("Sinkronisasi Berhasil", "Data pengguna otomatis terperbarui di Google Spreadsheet.");
    }
  };

  const handleDeleteUser = async (id: string) => {
    const updated = usersList.filter(item => item.id_user !== id);
    setUsersList(updated);
    syncState('edu_users', updated);
    showNotification("Akun Dihapus", "Kredensial penargetan berhasil dicabut.");
    const synced = await syncToGoogleSheets('users', updated);
    if (synced) {
      showNotification("Sinkronisasi Berhasil", "Google Spreadsheet telah diperbarui.");
    }
  };

  const handleToggleUserStatus = async (id: string, status: 'Aktif' | 'Nonaktif') => {
    const updated = usersList.map(item => item.id_user === id ? { ...item, status } : item);
    setUsersList(updated);
    syncState('edu_users', updated);
    showNotification("Akses Berubah", `Status akun telah dialihkan menjadi ${status}.`);
    const synced = await syncToGoogleSheets('users', updated);
    if (synced) {
      showNotification("Sinkronisasi Berhasil", "Google Spreadsheet telah diperbarui.");
    }
  };

  // Single Parent Generator for Wali Kelas / Admin
  const handleSingleGenerateWali = async (idSiswa: string, namaSiswa: string) => {
    if (!currentUser) return;
    
    const exists = usersList.some(u => u.role === 'wali' && u.id_referensi && u.id_referensi.split(',').includes(idSiswa));
    if (exists) {
      showNotification("Informasi", `Wali santri dari ${namaSiswa} sudah memiliki akun.`);
      return;
    }

    const newWali: User = {
      id_user: 'U' + Date.now() + Math.floor(Math.random() * 1000),
      username: `wali_${idSiswa.toLowerCase().replace('-', '')}`,
      password: `wali${idSiswa.replace('-', '')}`,
      role: 'wali',
      nama_lengkap: `Wali dari ${namaSiswa}`,
      id_referensi: idSiswa,
      status: 'Aktif'
    };

    const updated = [...usersList, newWali];
    setUsersList(updated);
    syncState('edu_users', updated);
    showNotification("Generator Berhasil", `Akun wali santri untuk ${namaSiswa} berhasil dibuat.`);
    const synced = await syncToGoogleSheets('users', updated);
    if (synced) {
      showNotification("Sinkronisasi Berhasil", "Akun wali baru berhasil disinkronkan ke Google Spreadsheet.");
    }
  };

  // Batch Parent Generator for Wali Kelas
  const handleBatchGenerateWali = async () => {
    if (!currentUser || currentUser.role !== 'wali_kelas') return;
    const wClass = currentUser.id_referensi?.split('|').find(x => x.startsWith('WALI:'))?.replace('WALI:', '');
    if (!wClass) return;

    const classStudents = siswaList.filter(s => s.kelas === wClass);
    if (classStudents.length === 0) {
      showNotification("Kesalahan", "Tidak ada santri yang terdaftar di kelas Anda!", true);
      return;
    }

    const currentWaliAccounts = usersList.filter(u => u.role === 'wali');
    let generatedCount = 0;
    const newAccounts: User[] = [];

    classStudents.forEach(s => {
      // Check if wali already has account (fully safe check against list or single ID)
      const exists = currentWaliAccounts.some(u => u.id_referensi && u.id_referensi.split(',').includes(s.id_siswa));
      if (!exists) {
        newAccounts.push({
          id_user: 'U' + Date.now() + Math.floor(Math.random() * 1000),
          username: `wali_${s.id_siswa.toLowerCase().replace('-', '')}`,
          password: `wali${s.id_siswa.replace('-', '')}`,
          role: 'wali',
          nama_lengkap: `Wali dari ${s.nama_siswa}`,
          id_referensi: s.id_siswa,
          status: 'Aktif'
        });
        generatedCount++;
      }
    });

    if (generatedCount === 0) {
      showNotification("Informasi", "Seluruh santri di kelas Anda telah memiliki akun wali masing-masing.");
      return;
    }

    const updated = [...usersList, ...newAccounts];
    setUsersList(updated);
    syncState('edu_users', updated);
    showNotification("Batch Generator Berhasil", `${generatedCount} akun wali santri baru berhasil dibuat massal.`);
    const synced = await syncToGoogleSheets('users', updated);
    if (synced) {
      showNotification("Sinkronisasi Berhasil", "Akun wali massal berhasil disinkronkan ke Google Spreadsheet.");
    }
  };

  // Render correct component based on active menu state
  const renderActiveMenu = () => {
    if (!currentUser) return null;

    if (currentUser.role === 'wali') {
      // Parent special simplified panels
      if (activeMenu === 'evaluasi_akademik') {
        return (
          <LaporanWali
            user={currentUser}
            siswa={siswaList}
            perkembangan={perkembanganList}
            perilaku={perilakuList}
            type="perkembangan"
          />
        );
      }
      if (activeMenu === 'evaluasi_perilaku') {
        return (
          <LaporanWali
            user={currentUser}
            siswa={siswaList}
            perkembangan={perkembanganList}
            perilaku={perilakuList}
            type="perilaku"
          />
        );
      }
      if (activeMenu === 'rekap') {
        return <RekapPresensiMenu user={currentUser} siswa={siswaList} jurnal={jurnalList} />;
      }
      if (activeMenu === 'dokumentasi') {
        return (
          <DokumentasiMenu
            user={currentUser}
            siswa={siswaList}
            dokumentasi={dokumentasiList}
            onAddDokumentasi={handleAddDokumentasi}
            onDeleteDokumentasi={handleDeleteDokumentasi}
            jurnal={jurnalList}
            homeVisit={homeVisitList}
          />
        );
      }
      if (activeMenu === 'siswa') {
        return (
          <SiswaMenu
            user={currentUser}
            siswa={siswaList}
            onAddSiswa={handleAddSiswa}
            onAddBulkSiswa={handleAddBulkSiswa}
            onDeleteSiswa={handleDeleteSiswa}
            onUpdateSiswaClass={handleUpdateSiswaClass}
            onBulkPromoteSiswa={handleBulkPromoteSiswa}
            onResetSiswaToInitial={handleResetSiswaToInitial}
            jurnal={jurnalList}
            settings={settings}
          />
        );
      }
      if (activeMenu === 'rapor_perkembangan') {
        return (
          <RaporPerkembanganMenu
            user={currentUser}
            siswa={siswaList}
            jurnal={jurnalList}
            perkembangan={perkembanganList}
            perilaku={perilakuList}
            homeVisits={homeVisitList}
            onLogActivity={logActivity}
          />
        );
      }
      if (activeMenu === 'prestasi') {
        return (
          <PrestasiMenu
            user={currentUser}
            siswa={siswaList}
            prestasi={prestasiList}
            onAddPrestasi={handleAddPrestasi}
            onEditPrestasi={handleEditPrestasi}
            onDeletePrestasi={handleDeletePrestasi}
            settings={settings}
          />
        );
      }
      if (activeMenu === 'profile') {
        return <ProfileMenu user={currentUser} siswa={siswaList} onUpdateProfile={handleUpdateProfile} />;
      }
      return (
        <Dashboard
          user={currentUser}
          siswa={siswaList}
          tahunAjaran={settings.tahun_ajaran}
          batasWaktuAdministrasi={settings.batas_waktu_administrasi}
          semester={settings.semester || 'Ganjil'}
          namaKepalaMadrasah={settings.nama_kepala_madrasah}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onNavigate={(m) => setActiveMenu(m)}
          jurnal={jurnalList}
          administrasi={administrasiList}
          perilaku={perilakuList}
          perkembangan={perkembanganList}
          homeVisit={homeVisitList}
          users={usersList}
          jadwal={jadwalList}
          events={eventsList}
          prestasi={prestasiList}
        />
      );
    }

    // Check if current menu is disabled for user role
    if (activeMenu !== 'dashboard' && activeMenu !== 'profile') {
      const targetMenuConfig = MENU_CONFIG.find(m => m.id === activeMenu);
      if (targetMenuConfig && !isMenuVisibleForUser(targetMenuConfig, currentUser, settings)) {
        return (
          <div className="bg-white p-8 sm:p-12 rounded-[2rem] border border-slate-200/80 text-center space-y-4 max-w-xl mx-auto my-12 shadow-sm">
            <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-200/60">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-slate-800">Akses Menu Dinonaktifkan</h3>
            <p className="text-sm text-slate-500 font-medium">
              Menu <strong>{targetMenuConfig.label}</strong> saat ini dinonaktifkan oleh Administrator Madrasah.
            </p>
            <button
              onClick={() => setActiveMenu('dashboard')}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-xs inline-flex items-center gap-2"
            >
              Kembali ke Beranda
            </button>
          </div>
        );
      }
    }

    // Standard user views
    switch (activeMenu) {
      case 'dashboard':
        return (
          <Dashboard
            user={currentUser}
            siswa={siswaList}
            tahunAjaran={settings.tahun_ajaran}
            batasWaktuAdministrasi={settings.batas_waktu_administrasi}
            semester={settings.semester || 'Ganjil'}
            namaKepalaMadrasah={settings.nama_kepala_madrasah}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onNavigate={(m) => setActiveMenu(m)}
            jurnal={jurnalList}
            administrasi={administrasiList}
            perilaku={perilakuList}
            perkembangan={perkembanganList}
            homeVisit={homeVisitList}
            users={usersList}
            jadwal={jadwalList}
            events={eventsList}
            prestasi={prestasiList}
          />
        );
      case 'profile':
        return <ProfileMenu user={currentUser} siswa={siswaList} onUpdateProfile={handleUpdateProfile} />;
      case 'siswa':
        return (
          <SiswaMenu
            user={currentUser!}
            siswa={siswaList}
            onAddSiswa={handleAddSiswa}
            onAddBulkSiswa={handleAddBulkSiswa}
            onDeleteSiswa={handleDeleteSiswa}
            onUpdateSiswaClass={handleUpdateSiswaClass}
            onBulkPromoteSiswa={handleBulkPromoteSiswa}
            jurnal={jurnalList}
            settings={settings}
          />
        );
      case 'jurnal':
        return (
          <JurnalMenu
            user={currentUser}
            siswa={siswaList}
            jurnal={jurnalList}
            jadwal={jadwalList}
            onEditJadwal={handleEditJadwal}
            onDeleteJurnal={handleDeleteJurnal}
            onAddJurnal={handleAddJurnal}
            onEditJurnal={handleEditJurnal}
          />
        );
      case 'rekap':
        return <RekapPresensiMenu user={currentUser} siswa={siswaList} jurnal={jurnalList} />;
      case 'evaluasi_akademik':
        return (
          <EvaluasiMenu
            user={currentUser}
            siswa={siswaList}
            perkembangan={perkembanganList}
            perilaku={perilakuList}
            type="perkembangan"
            onAddPerkembangan={handleAddPerkembangan}
            onEditPerkembangan={handleEditPerkembangan}
            onDeletePerkembangan={handleDeletePerkembangan}
            onAddPerilaku={handleAddPerilaku}
            onEditPerilaku={handleEditPerilaku}
            onDeletePerilaku={handleDeletePerilaku}
          />
        );
      case 'evaluasi_perilaku':
        return (
          <EvaluasiMenu
            user={currentUser}
            siswa={siswaList}
            perkembangan={perkembanganList}
            perilaku={perilakuList}
            type="perilaku"
            onAddPerkembangan={handleAddPerkembangan}
            onEditPerkembangan={handleEditPerkembangan}
            onDeletePerkembangan={handleDeletePerkembangan}
            onAddPerilaku={handleAddPerilaku}
            onEditPerilaku={handleEditPerilaku}
            onDeletePerilaku={handleDeletePerilaku}
          />
        );
      case 'prestasi':
        return (
          <PrestasiMenu
            user={currentUser}
            siswa={siswaList}
            prestasi={prestasiList}
            onAddPrestasi={handleAddPrestasi}
            onEditPrestasi={handleEditPrestasi}
            onDeletePrestasi={handleDeletePrestasi}
            settings={settings}
          />
        );
      case 'rapor_perkembangan':
        return (
          <RaporPerkembanganMenu
            user={currentUser}
            siswa={siswaList}
            jurnal={jurnalList}
            perkembangan={perkembanganList}
            perilaku={perilakuList}
            homeVisits={homeVisitList}
            onLogActivity={logActivity}
          />
        );
      case 'home_visit':
        return (
          <HomeVisitMenu
            user={currentUser}
            siswa={siswaList}
            homeVisits={homeVisitList}
            onAddHomeVisit={handleAddHomeVisit}
            onDeleteHomeVisit={handleDeleteHomeVisit}
          />
        );
      case 'dokumentasi':
        return (
          <DokumentasiMenu
            user={currentUser}
            siswa={siswaList}
            dokumentasi={dokumentasiList}
            onAddDokumentasi={handleAddDokumentasi}
            onDeleteDokumentasi={handleDeleteDokumentasi}
            jurnal={jurnalList}
            homeVisit={homeVisitList}
          />
        );
      case 'administrasi':
        return (
          <AdministrasiMenu
            user={currentUser}
            siswa={siswaList}
            administrasi={administrasiList}
            batasWaktu={settings.batas_waktu_administrasi}
            onAddAdministrasi={handleAddAdministrasi}
            onDeleteAdministrasi={handleDeleteAdministrasi}
          />
        );
      case 'jadwal':
        return (
          <JadwalMenu
            user={currentUser!}
            siswa={siswaList}
            jurnal={jurnalList}
            jadwal={jadwalList}
            users={usersList}
            events={eventsList}
            onAddJadwal={handleAddJadwal}
            onEditJadwal={handleEditJadwal}
            onDeleteJadwal={handleDeleteJadwal}
            onToggleReminder={handleToggleReminder}
            onAddEvent={handleAddEvent}
            onDeleteEvent={handleDeleteEvent}
          />
        );
      case 'users':
        return (
          <UsersMenu
            user={currentUser}
            siswa={siswaList}
            users={usersList}
            onAddUser={handleAddUser}
            onEditUser={handleEditUser}
            onDeleteUser={handleDeleteUser}
            onToggleUserStatus={handleToggleUserStatus}
            onBatchGenerateWali={handleBatchGenerateWali}
            onSingleGenerateWali={handleSingleGenerateWali}
          />
        );
      case 'riwayat_aktivitas':
        return (
          <RiwayatAktivitasMenu
            user={currentUser}
            users={usersList}
            jurnal={jurnalList}
            administrasi={administrasiList}
            activityLogs={activityLogList}
            onClearLogs={handleClearLogs}
          />
        );
      case 'google_sheets':
        return (
          <GoogleSheetsMenu
            user={currentUser!}
            siswa={siswaList}
            jurnal={jurnalList}
            perkembangan={perkembanganList}
            perilaku={perilakuList}
            homeVisit={homeVisitList}
            users={usersList}
            settings={settings}
            dokumentasi={dokumentasiList}
            administrasi={administrasiList}
            jadwal={jadwalList}
            onUpdateSiswa={(newList) => {
              setSiswaList(newList);
              syncState('edu_siswa', newList);
            }}
            onUpdateJurnal={(newList) => {
              setJurnalList(newList);
              syncState('edu_jurnal', newList);
            }}
            onUpdatePerkembangan={(newList) => {
              setPerkembanganList(newList);
              syncState('edu_perkembangan', newList);
            }}
            onUpdatePerilaku={(newList) => {
              setPerilakuList(newList);
              syncState('edu_perilaku', newList);
            }}
            onUpdateHomeVisit={(newList) => {
              setHomeVisitList(newList);
              syncState('edu_home_visit', newList);
            }}
            onUpdateUsers={(newList) => {
              setUsersList(newList);
              syncState('edu_users', newList);
            }}
            onUpdateSettings={(newSettings) => {
              setSettings(newSettings);
              syncState('edu_settings', newSettings);
            }}
            onUpdateDokumentasi={(newList) => {
              setDokumentasiList(newList);
              syncState('edu_dokumentasi', newList);
            }}
            onUpdateAdministrasi={(newList) => {
              setAdministrasiList(newList);
              syncState('edu_administrasi', newList);
            }}
            onUpdateJadwal={(newList) => {
              setJadwalList(newList);
              syncState('edu_jadwal', newList);
            }}
          />
        );
      default:
        return (
          <Dashboard
            user={currentUser}
            siswa={siswaList}
            tahunAjaran={settings.tahun_ajaran}
            batasWaktuAdministrasi={settings.batas_waktu_administrasi}
            semester={settings.semester || 'Ganjil'}
            namaKepalaMadrasah={settings.nama_kepala_madrasah}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onNavigate={(m) => setActiveMenu(m)}
            jurnal={jurnalList}
            administrasi={administrasiList}
            perilaku={perilakuList}
            perkembangan={perkembanganList}
            homeVisit={homeVisitList}
            users={usersList}
            jadwal={jadwalList}
            events={eventsList}
          />
        );
    }
  };

  // IF NOT LOGGED IN
  if (!currentUser) {
    if (isRegisterMode) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans antialiased selection:bg-emerald-500 selection:text-white">
          <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center">
            <div className="inline-flex w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white items-center justify-center shadow-xl mb-4">
              <BookOpen className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              Daftar Akun EduSantri
            </h2>
            <p className="mt-2 text-sm text-slate-500 font-bold uppercase tracking-wider">
              Gabung Rantai Terintegrasi MTs Ibad Ar Rahman
            </p>
          </div>

          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
            <div className="bg-white py-8 px-6 sm:px-10 rounded-[2.5rem] shadow-xl border border-slate-100">
              
              {/* Peran Tab Selector */}
              <div className="mb-8">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-3 text-center">
                  Pilih Peran Keanggotaan
                </label>
                <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1.5 rounded-2xl">
                  {(['guru', 'wali_kelas', 'wali'] as const).map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => {
                        setRegRole(role);
                        setRegError('');
                        setRegKelasAjar([]);
                        setRegSelectedAnakIds([]);
                      }}
                      className={`py-3 px-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                        regRole === role
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md scale-[1.02]'
                          : 'text-slate-600 hover:bg-slate-200/60'
                      }`}
                    >
                      {role === 'guru' ? 'Guru' : role === 'wali_kelas' ? 'Wali Kelas' : 'Wali Santri'}
                    </button>
                  ))}
                </div>
                <p className="text-center text-[11px] text-slate-400 mt-3 font-semibold italic">
                  {regRole === 'guru' && "Akses mengajar harian, jurnal, unggah administrasi, & dokumentasi."}
                  {regRole === 'wali_kelas' && "Kelola rekap presensi, evaluasi capaian/adab, bimbingan, & rapor terpadu."}
                  {regRole === 'wali' && "Pantau jurnal, catatan adab, akademik, kunjungan, & unduh rapor perkembangan."}
                </p>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-6">
                
                {/* Nama Lengkap */}
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">
                    Nama Lengkap (Beserta Gelar)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Ahmad Fauzi, S.Pd. atau H. Budiono"
                    className="w-full px-4 py-3.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-400 outline-none font-bold text-slate-700 bg-slate-50 transition"
                    value={regNama}
                    onChange={(e) => setRegNama(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Username */}
                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">
                      Username Baru
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 pointer-events-none font-bold">
                        @
                      </span>
                      <input
                        type="text"
                        required
                        placeholder="guru_baru"
                        className="w-full pl-9 pr-4 py-3.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-400 outline-none font-bold text-slate-700 bg-slate-50 transition"
                        value={regUsername}
                        onChange={(e) => setRegUsername(e.target.value.replace(/\s+/g, ''))}
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">
                      Sandi Keamanan
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 pointer-events-none">
                        <Lock className="w-4 h-4" />
                      </span>
                      <input
                        type="password"
                        required
                        placeholder="Sandi minimal 6 karakter..."
                        className="w-full pl-10 pr-4 py-3.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-400 outline-none font-bold text-slate-700 bg-slate-50 transition"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* --- DINAMIS SPESIFIK GURU ATAU WALI KELAS --- */}
                {(regRole === 'guru' || regRole === 'wali_kelas') && (
                  <div className="space-y-4 p-5 bg-slate-50 rounded-3xl border border-slate-100">
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest border-b border-slate-200/80 pb-2">
                      Atribut Akademik & Pengajaran
                    </h4>

                    {/* Mata Pelajaran */}
                    <div>
                      <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                        Mata Pelajaran Utama
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: Matematika, Al-Qur'an Hadits, Fiqih..."
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none font-bold text-slate-700 bg-white transition text-sm"
                        value={regMapel}
                        onChange={(e) => setRegMapel(e.target.value)}
                      />
                    </div>

                    {/* Kelas Rombel Asuhan (Khusus Wali Kelas) */}
                    {regRole === 'wali_kelas' && (
                      <div>
                        <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                          Rombel Asuhan (Sebagai Wali Kelas)
                        </label>
                        <select
                          required
                          className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none font-bold text-slate-700 bg-white transition text-sm"
                          value={regKelasWali}
                          onChange={(e) => setRegKelasWali(e.target.value)}
                        >
                          <option value="">-- Pilih Kelas --</option>
                          {['7A', '7B', '7C', '7D', '7E', '8A', '8B', '8C', '8D', '8E', '9A', '9B', '9C', '9D', '9E'].map(c => (
                            <option key={c} value={c}>Kelas {c}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Kelas yang Diajar (Multi-select) */}
                    <div>
                      <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-2">
                        Plotting Kelas Mengajar (Dapat pilih beberapa)
                      </label>
                      <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-white border border-slate-200 rounded-xl">
                        {['7A', '7B', '7C', '7D', '7E', '8A', '8B', '8C', '8D', '8E', '9A', '9B', '9C', '9D', '9E'].map((c) => {
                          const isSelected = regKelasAjar.includes(c);
                          return (
                            <button
                              key={c}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setRegKelasAjar(regKelasAjar.filter(x => x !== c));
                                } else {
                                  setRegKelasAjar([...regKelasAjar, c]);
                                }
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-600 text-white shadow-sm font-black'
                                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/50'
                              }`}
                            >
                              {c}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* --- DINAMIS SPESIFIK WALI SANTRI (INTEGRASI ANAK) --- */}
                {regRole === 'wali' && (
                  <div className="space-y-4 p-5 bg-slate-50 rounded-3xl border border-slate-100">
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest border-b border-slate-200/80 pb-2 flex items-center justify-between">
                      <span>🔗 Hubungkan Data Santri (Anak)</span>
                      {regSelectedAnakIds.length > 0 && (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2.5 py-0.5 rounded-full font-black">
                          {regSelectedAnakIds.length} Anak Terhubung
                        </span>
                      )}
                    </h4>

                    {/* Tampilkan Anak yang Terpilih */}
                    {regSelectedAnakIds.length > 0 && (
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                          Santri Terpilih:
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {regSelectedAnakIds.map(id => {
                            const student = siswaList.find(s => s.id_siswa === id);
                            return (
                              <div
                                key={id}
                                className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 text-xs font-black pl-3 pr-2 py-1 rounded-full border border-emerald-100 shadow-xs"
                              >
                                <span>{student?.nama_siswa} ({student?.kelas})</span>
                                <button
                                  type="button"
                                  onClick={() => setRegSelectedAnakIds(regSelectedAnakIds.filter(x => x !== id))}
                                  className="w-4 h-4 hover:bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold text-xs cursor-pointer"
                                >
                                  ×
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Filter Kelas Rombel Anak */}
                    <div className="grid grid-cols-2 gap-3 items-end">
                      <div>
                        <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                          Pilih Rombel Anak
                        </label>
                        <select
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-400 outline-none font-bold text-slate-700 bg-white transition text-sm"
                          value={regKelasAnak}
                          onChange={(e) => setRegKelasAnak(e.target.value)}
                        >
                          {['7A', '7B', '7C', '7D', '7E', '8A', '8B', '8C', '8D', '8E', '9A', '9B', '9C', '9D', '9E'].map(c => (
                            <option key={c} value={c}>Kelas {c}</option>
                          ))}
                        </select>
                      </div>
                      <div className="text-slate-400 text-[11px] leading-snug font-semibold pb-1.5">
                        Pilih rombel untuk mencari nama anak Anda di tabel bawah.
                      </div>
                    </div>

                    {/* Daftar Nama Siswa di Kelas tersebut */}
                    <div>
                      <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                        Cari &amp; Klik Nama Anak Anda:
                      </label>
                      <div className="max-h-48 overflow-y-auto p-2 bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
                        {siswaList.filter(s => s.kelas === regKelasAnak).map(student => {
                          const isSelected = regSelectedAnakIds.includes(student.id_siswa);
                          return (
                            <button
                              key={student.id_siswa}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setRegSelectedAnakIds(regSelectedAnakIds.filter(x => x !== student.id_siswa));
                                } else {
                                  setRegSelectedAnakIds([...regSelectedAnakIds, student.id_siswa]);
                                }
                              }}
                              className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between text-xs font-bold transition cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-50 hover:bg-emerald-100/80 text-emerald-900 border border-emerald-100 font-black'
                                  : 'hover:bg-slate-50 text-slate-600'
                              }`}
                            >
                              <span>{student.nama_siswa}</span>
                              <span className="text-[10px] font-semibold text-slate-400">
                                {isSelected ? '✓ Terpilih' : '+ Tambah'}
                              </span>
                            </button>
                          );
                        })}
                        {siswaList.filter(s => s.kelas === regKelasAnak).length === 0 && (
                          <div className="text-center py-4 text-slate-400 text-xs font-bold">
                            Tidak ada siswa terdaftar di Kelas {regKelasAnak}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Banner */}
                {regError && (
                  <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl text-xs text-rose-700 font-bold flex items-center gap-2 animate-pulse">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>{regError}</span>
                  </div>
                )}

                {/* Action Buttons */}
                <button
                  type="submit"
                  className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-base rounded-2xl shadow-xl hover:from-emerald-700 hover:to-teal-700 transition transform active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  DAFTAR AKUN BARU <Check className="w-5 h-5" />
                </button>
              </form>

              {/* Back to Login & Beranda */}
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-100 text-xs">
                <button
                  type="button"
                  onClick={() => { setIsRegisterMode(false); setIsLoginMode(false); setRegError(''); }}
                  className="font-black text-slate-500 hover:text-emerald-600 tracking-wider uppercase cursor-pointer"
                >
                  ← Ke Beranda
                </button>
                <button
                  type="button"
                  onClick={() => { setIsRegisterMode(false); setIsLoginMode(true); setRegError(''); }}
                  className="font-black text-emerald-600 hover:text-emerald-700 tracking-wider uppercase cursor-pointer"
                >
                  Masuk Portal →
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (isLoginMode) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans antialiased selection:bg-emerald-500 selection:text-white relative">
          <div className="absolute top-4 left-4">
            <button
              onClick={() => { setIsLoginMode(false); setLoginError(''); }}
              className="flex items-center gap-1.5 text-xs font-black text-slate-500 hover:text-emerald-600 uppercase tracking-wider bg-white px-4 py-2 rounded-xl border border-slate-200/60 shadow-xs cursor-pointer"
            >
              ← Kembali ke Beranda
            </button>
          </div>

          <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
            <div className="inline-flex w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white items-center justify-center shadow-xl mb-6">
              <BookOpen className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              EduSantri Portal
            </h2>
            <p className="mt-2 text-sm text-slate-500 font-bold uppercase tracking-wider">
              MTs Ibad Ar Rahman
            </p>
          </div>

          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-10 px-6 sm:px-10 rounded-[2.5rem] shadow-xl border border-slate-100">
              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">
                    Masuk Sebagai
                  </label>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {[
                      { id: 'admin', label: 'Admin / Pengawas', icon: '👑' },
                      { id: 'wali_kelas', label: 'Wali Kelas', icon: '🏫' },
                      { id: 'guru', label: 'Guru Pengampu', icon: '📝' },
                      { id: 'wali', label: 'Wali Santri', icon: '👨‍👩‍👦' }
                    ].map((roleOpt) => (
                      <button
                        key={roleOpt.id}
                        type="button"
                        onClick={() => {
                          setSelectedLoginRole(roleOpt.id as any);
                          setLoginError('');
                        }}
                        className={`py-3 px-2 rounded-xl text-xs font-black border transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                          selectedLoginRole === roleOpt.id
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs'
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <span className="text-base">{roleOpt.icon}</span>
                        <span>{roleOpt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">
                    Username Akun
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 pointer-events-none font-bold">
                      @
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: guru_ahmad"
                      className="w-full pl-10 pr-4 py-4 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-400 outline-none font-bold text-slate-700 bg-slate-50"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">
                    Password Valid
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 pointer-events-none">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type="password"
                      required
                      placeholder="Masukkan sandi..."
                      className="w-full pl-10 pr-4 py-4 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-400 outline-none font-bold text-slate-700 bg-slate-50"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>

                {loginError && (
                  <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl text-xs text-rose-700 font-bold flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-base rounded-2xl shadow-xl hover:from-emerald-700 hover:to-teal-700 transition transform active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  MASUK PORTAL <Check className="w-5 h-5" />
                </button>
              </form>

              <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-100 text-xs font-black uppercase tracking-wider">
                <button
                  type="button"
                  onClick={() => { setIsLoginMode(false); setIsRegisterMode(false); setLoginError(''); }}
                  className="text-slate-500 hover:text-emerald-600 cursor-pointer"
                >
                  ← Beranda
                </button>
                <button
                  type="button"
                  onClick={() => { setIsRegisterMode(true); setIsLoginMode(false); setLoginError(''); }}
                  className="text-emerald-600 hover:text-emerald-700 cursor-pointer"
                >
                  Daftar Baru
                </button>
              </div>

            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased selection:bg-emerald-500 selection:text-white flex flex-col justify-between">
        {/* Navbar */}
        <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-100 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-black shadow-md">
                ES
              </div>
              <div className="text-left">
                <span className="font-black text-base text-slate-900 tracking-tight block leading-none">EduSantri</span>
                <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mt-1 block">MTs Ibad Ar Rahman</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setIsLoginMode(true); setIsRegisterMode(false); }}
                className="text-xs font-black text-slate-600 hover:text-emerald-600 uppercase tracking-wider px-3 py-2.5 transition cursor-pointer"
              >
                Masuk
              </button>
              <button
                onClick={() => { setIsRegisterMode(true); setIsLoginMode(false); }}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-xl shadow-md hover:from-emerald-700 hover:to-teal-700 transition transform hover:-translate-y-0.5 cursor-pointer"
              >
                Daftar Akun
              </button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Left Column */}
              <div className="lg:col-span-7 space-y-6 text-left">
                <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-800 text-xs font-black px-4 py-2 rounded-full border border-emerald-100/50 shadow-xs uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                  Era Baru Integrasi Pesantren
                </div>
                
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 leading-tight tracking-tight">
                  Sinergi Karakter &amp; <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600">Akademik Santri</span>
                </h1>
                
                <p className="text-slate-500 text-sm sm:text-base leading-relaxed font-medium">
                  EduSantri menghubungkan seluruh elemen madrasah MTs Ibad Ar Rahman: guru, wali kelas, pengawas, dan wali santri dalam satu platform terpadu. Pantau jurnal harian mengajar, ketepatan administrasi berkas guru, evaluasi perkembangan adab, home visit, hingga rekapitulasi rapor digital secara real-time.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <button
                    onClick={() => { setIsLoginMode(true); setIsRegisterMode(false); }}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs uppercase tracking-wider px-8 py-4 rounded-2xl shadow-xl hover:from-emerald-700 hover:to-teal-700 transition transform hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Masuk Portal <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => { setIsRegisterMode(true); setIsLoginMode(false); }}
                    className="bg-white hover:bg-slate-50 text-slate-700 font-black text-xs uppercase tracking-wider px-8 py-4 rounded-2xl border border-slate-200 shadow-sm transition transform hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Daftar Baru
                  </button>
                </div>

                {/* Akses Demo Cepat dinonaktifkan untuk produksi */}
              </div>
              
              {/* Right Column (Visual Grid) */}
              <div className="lg:col-span-5 grid grid-cols-1 gap-4 relative">
                <div className="absolute -left-12 -top-12 w-48 h-48 bg-emerald-200/20 rounded-full blur-2xl pointer-events-none"></div>
                <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-teal-200/20 rounded-full blur-2xl pointer-events-none"></div>
                
                {/* 3 Pillars Visual cards */}
                <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-100 flex gap-4 hover:translate-x-2 transition duration-300 text-left">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center text-xl shrink-0 font-black">
                    📝
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-800">Bagi Guru Pengampu</h3>
                    <p className="text-xs text-slate-500 mt-1 font-semibold leading-relaxed">
                      Catat Jurnal Pembelajaran harian secara instan, unggah berkas RPP sebelum deadline, dan pantau status kepatuhan jadwal mengajar secara real-time.
                    </p>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-100 flex gap-4 hover:translate-x-2 transition duration-300 text-left">
                  <div className="w-12 h-12 bg-teal-100 text-teal-800 rounded-2xl flex items-center justify-center text-xl shrink-0 font-black">
                    ⚖️
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-800">Bagi Wali Kelas</h3>
                    <p className="text-xs text-slate-500 mt-1 font-semibold leading-relaxed">
                      Kelola statistik kehadiran kumulatif, evaluasi adab santri, log bimbingan, home visit, hingga rekapitulasi Rapor Perkembangan pdf.
                    </p>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-100 flex gap-4 hover:translate-x-2 transition duration-300 text-left">
                  <div className="w-12 h-12 bg-cyan-100 text-cyan-800 rounded-2xl flex items-center justify-center text-xl shrink-0 font-black">
                    🤝
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-800">Bagi Orang Tua (Wali)</h3>
                    <p className="text-xs text-slate-500 mt-1 font-semibold leading-relaxed">
                      Pantau pencapaian akademik harian &amp; catatan adab ananda, verifikasi home visit, serta akses laporan perkembangan digital secara berkala.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Interactive Feature Cards Grid */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
            <h2 className="text-xs font-black text-emerald-600 tracking-[0.2em] uppercase mb-3">
              🎯 INTEGRASI FITUR UNGGULAN
            </h2>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-12">
              Satu Portal Untuk Seluruh Aktivitas Akademik &amp; Karakter
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="bg-white p-8 rounded-[2rem] shadow-sm hover:shadow-lg transition-all border border-slate-100 text-left space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-lg shadow-sm font-black">
                  📖
                </div>
                <h4 className="text-lg font-black text-slate-800">Jurnal Pengajaran</h4>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  Pencatatan materi harian guru, ketidakhadiran siswa (sakit/izin/alpa), serta upload dokumentasi kegiatan kelas secara dinamis.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-white p-8 rounded-[2rem] shadow-sm hover:shadow-lg transition-all border border-slate-100 text-left space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center text-lg shadow-sm font-black">
                  🌱
                </div>
                <h4 className="text-lg font-black text-slate-800">Evaluasi Sikap &amp; Adab</h4>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  Pemantauan adab harian santri melalui poin perilaku positif/negatif, catatan tindak lanjut bimbingan konseling, serta masukan pembina.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-white p-8 rounded-[2rem] shadow-sm hover:shadow-lg transition-all border border-slate-100 text-left space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-cyan-100 text-cyan-800 flex items-center justify-center text-lg shadow-sm font-black">
                  📂
                </div>
                <h4 className="text-lg font-black text-slate-800">Administrasi Mandiri</h4>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  Unggah silabus dan RPP secara mandiri dengan verifikasi batas waktu pengumpulan dinamis yang dikontrol langsung oleh Admin Sekolah.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="bg-white p-8 rounded-[2rem] shadow-sm hover:shadow-lg transition-all border border-slate-100 text-left space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center text-lg shadow-sm font-black">
                  🗂️
                </div>
                <h4 className="text-lg font-black text-slate-800">Rapor Perkembangan</h4>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  Ekstraksi rekap presensi, adab santri, evaluasi akademis, &amp; home visit ke dalam PDF Rapor Perkembangan terpadu yang siap diunduh.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="bg-white p-8 rounded-[2rem] shadow-sm hover:shadow-lg transition-all border border-slate-100 text-left space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-800 flex items-center justify-center text-lg shadow-sm font-black">
                  🏠
                </div>
                <h4 className="text-lg font-black text-slate-800">Kunjungan Rumah</h4>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  Dokumentasi program "Home Visit" wali kelas ke wali santri lengkap dengan tanggal kunjungan, alasan, kesepakatan tindak lanjut, &amp; foto.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="bg-white p-8 rounded-[2rem] shadow-sm hover:shadow-lg transition-all border border-slate-100 text-left space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center text-lg shadow-sm font-black">
                  👥
                </div>
                <h4 className="text-lg font-black text-slate-800">Pendaftaran &amp; Integrasi</h4>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  Sistem registrasi cerdas yang mengaitkan guru ke mapelnya, wali kelas ke kelasnya, &amp; orang tua ke data siswa asuhannya secara instan.
                </p>
              </div>
            </div>
          </div>
          
          {/* Quote Section */}
          <div className="bg-emerald-50 py-16 text-center border-t border-b border-emerald-100">
            <div className="max-w-3xl mx-auto px-4 font-serif italic text-emerald-950 text-base sm:text-lg md:text-xl leading-relaxed">
              "Kunci kesuksesan pendidikan santri terletak pada keselarasan arah bimbingan antara guru di madrasah dan orang tua di rumah. Ketika keduanya saling bersinergi dalam doa dan keteladanan, di situlah berkah ilmu akan terpancar."
              <span className="block mt-4 font-sans not-italic text-[10px] font-black tracking-widest text-emerald-700 uppercase">
                — MTs Ibad Ar Rahman
              </span>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-slate-900 text-slate-500 py-10 text-xs border-t border-slate-800 text-center">
          <p className="font-bold text-slate-400">EduSantri MTs Ibad Ar Rahman</p>
          <p className="mt-2 text-slate-500">© 2026 MTs Ibad Ar Rahman. All rights reserved. Persistent Local Data Sync.</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans antialiased selection:bg-emerald-500 selection:text-white max-w-full overflow-x-hidden relative">
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[95] lg:hidden cursor-pointer"
          />
        )}
      </AnimatePresence>

      {/* Sidebar navigation */}
      <aside
        className={`bg-slate-900 text-slate-400 shrink-0 h-screen flex flex-col justify-between transition-all duration-300 z-[100] 
          fixed lg:sticky top-0 bottom-0 left-0
          ${isMobileMenuOpen ? 'translate-x-0 w-80 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
          ${isSidebarOpen ? 'lg:w-80' : 'lg:w-20'}
        `}
      >
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Header brand */}
          <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center text-xl shrink-0 font-black shadow-lg">
                ES
              </div>
              {(isSidebarOpen || isMobileMenuOpen) && (
                <div className="flex flex-col">
                  <span className="font-black text-sm text-white tracking-tight leading-none">EduSantri</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Ibad Ar Rahman</span>
                </div>
              )}
            </div>

            {/* Mobile close button / Desktop collapse button */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="lg:hidden text-slate-400 hover:text-white p-2 rounded-lg bg-slate-800 cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
                title="Tutup Menu"
              >
                <X className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="hidden lg:flex text-slate-500 hover:text-white cursor-pointer text-xs font-black p-2 rounded-lg hover:bg-slate-800 transition"
                title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
              >
                {isSidebarOpen ? '◀' : '▶'}
              </button>
            </div>
          </div>

          {/* Nav list items grouped by category */}
          <nav className="p-3 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
            {MENU_CATEGORIES.map(cat => {
              const categoryItems = MENU_CONFIG.filter(
                m => m.category === cat.key && isMenuVisibleForUser(m, currentUser, settings)
              );
              if (categoryItems.length === 0) return null;

              return (
                <div key={cat.key} className="space-y-1.5">
                  {(isSidebarOpen || isMobileMenuOpen) ? (
                    <div className="px-3 py-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500">
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </div>
                  ) : (
                    <div className="h-px bg-slate-800 my-2 mx-1" title={cat.label} />
                  )}
                  {categoryItems.map(menu => {
                    const isActive = activeMenu === menu.id;
                    const displayLabel = (menu.id === 'siswa' && ['guru', 'wali_kelas'].includes(currentUser.role))
                      ? 'Data Santri Aktif'
                      : menu.label;
                    return (
                      <button
                        key={menu.id}
                        onClick={() => {
                          setActiveMenu(menu.id);
                          setIsMobileMenuOpen(false);
                        }}
                        title={(!isSidebarOpen && !isMobileMenuOpen) ? displayLabel : undefined}
                        className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-200 font-bold text-xs cursor-pointer min-h-[44px] group ${
                          isActive
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                            : 'hover:bg-slate-800 text-slate-300 hover:text-white'
                        }`}
                      >
                        <div className={`shrink-0 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                          {menu.icon}
                        </div>
                        {(isSidebarOpen || isMobileMenuOpen) && <span className="truncate tracking-wide text-left">{displayLabel}</span>}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          {(isSidebarOpen || isMobileMenuOpen) && (
            <div className="bg-slate-850 p-3.5 rounded-xl flex items-center gap-3 border border-slate-800/40 bg-slate-800/40">
              <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-sm font-black text-white shrink-0 uppercase">
                {currentUser.nama_lengkap.substring(0, 2)}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-black text-white truncate leading-none mb-1">
                  {currentUser.nama_lengkap}
                </p>
                <span className="text-[9px] uppercase tracking-wider font-bold text-slate-500">
                  Peran: {currentUser.role.replace('_', ' ')}
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleSignOut}
              className={`flex items-center justify-center bg-rose-500/15 hover:bg-rose-500 border border-rose-500/20 hover:border-rose-500 text-rose-500 hover:text-white rounded-xl transition cursor-pointer min-h-[44px] ${
                (isSidebarOpen || isMobileMenuOpen) ? 'w-full py-3 px-4 gap-2 text-xs font-black' : 'w-12 h-12 shrink-0'
              }`}
              title="Keluar Portal"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {(isSidebarOpen || isMobileMenuOpen) && <span className="uppercase tracking-wider">Keluar</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto max-w-full overflow-x-hidden">
        {/* Top Header navbar (Sticky at top) */}
        <header className="bg-white border-b border-slate-100 py-3 px-3 sm:px-6 lg:px-8 sticky top-0 flex justify-between items-center z-40 shadow-xs shrink-0 min-h-[60px] max-w-full">
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Hamburger button for mobile */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden flex items-center justify-center w-11 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer shrink-0 min-w-[44px] min-h-[44px]"
              aria-label="Buka Navigation Menu"
              title="Buka Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-black text-xs shadow-xs lg:hidden shrink-0">
                ES
              </div>
              <span className="text-sm sm:text-base lg:text-lg font-black text-slate-800 uppercase tracking-wider truncate max-w-[150px] xs:max-w-[220px] sm:max-w-none">
                EduSantri <span className="hidden xs:inline">MTs Ibad Ar Rahman</span>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3 text-xs font-bold text-slate-400">
            <span className="hidden md:flex bg-emerald-50 border border-emerald-100 text-emerald-700 px-3 py-2 rounded-xl font-black items-center gap-1 shadow-xs uppercase text-[10px] min-h-[36px]">
              ✓ Local Sync
            </span>

            {/* Visual Google Sheets sync status indicator */}
            <span className={`border px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl font-black flex items-center gap-1.5 shadow-xs uppercase text-[10px] min-h-[36px] transition-all duration-300 ${
              syncStatus === 'online'
                ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                : syncStatus === 'error'
                ? 'bg-rose-50 border-rose-100 text-rose-700 shadow-rose-100/40'
                : 'bg-slate-50 border-slate-200 text-slate-600'
            }`} title={syncStatus === 'online' ? 'Google Sheets Terkoneksi' : syncStatus === 'error' ? 'Google Sheets Sinkronisasi Gagal' : 'Google Sheets Tidak Terhubung'}>
              <span className={`w-2 h-2 rounded-full relative flex shrink-0 ${
                syncStatus === 'online'
                  ? 'bg-emerald-500'
                  : syncStatus === 'error'
                  ? 'bg-rose-500'
                  : 'bg-slate-400'
              }`}>
                {syncStatus === 'online' && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                {syncStatus === 'error' && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                )}
              </span>
              <span className="whitespace-nowrap">
                Sheets: {syncStatus === 'online' ? 'Tersambung' : syncStatus === 'error' ? 'Error' : 'Offline'}
              </span>
            </span>

            <span className="bg-slate-100 border border-slate-200 text-slate-600 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl font-black uppercase text-[10px] min-h-[36px] whitespace-nowrap">
              T.A {settings.tahun_ajaran}
            </span>
          </div>
        </header>

        {/* Content Section */}
        <div className="flex-1 p-3 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-20 overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeMenu}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="max-w-full overflow-x-hidden"
            >
              {renderActiveMenu()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Offline Status & Notice Banner */}
      <OfflineNotice />

      {/* Shared Overlays Modal */}
      <NotificationModal
        isOpen={notif.isOpen}
        title={notif.title}
        message={notif.message}
        isError={notif.isError}
        onConfirm={() => setNotif(prev => ({ ...prev, isOpen: false }))}
        onClose={() => setNotif(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
