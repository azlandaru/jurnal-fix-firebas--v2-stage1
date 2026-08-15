import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  FileSpreadsheet, LogIn, LogOut, CheckCircle2, AlertTriangle, 
  HelpCircle, RefreshCw, ArrowUpRight, Download, Upload, PlusCircle,
  FileText, Link2, Settings, Users, BookOpen, Smile, Award, Home, HelpCircle as HelpIcon,
  Calendar, Camera
} from 'lucide-react';
import { initAuth, googleSignIn, logoutGoogle, getAccessToken, auth, uploadImageToDrive } from '../utils/googleAuth';
import firebaseConfig from '../../firebase-applet-config.json';
import { User, Siswa, Jurnal, CatatanPerkembangan, CatatanPerilaku, HomeVisit, Dokumentasi, Administrasi, Jadwal, SystemSettings } from '../types';

interface GoogleSheetsMenuProps {
  user: User;
  siswa: Siswa[];
  jurnal: Jurnal[];
  perkembangan: CatatanPerkembangan[];
  perilaku: CatatanPerilaku[];
  homeVisit: HomeVisit[];
  users: User[];
  settings: SystemSettings;
  dokumentasi: Dokumentasi[];
  administrasi: Administrasi[];
  jadwal: Jadwal[];
  onUpdateSiswa: (newList: Siswa[]) => void;
  onUpdateJurnal: (newList: Jurnal[]) => void;
  onUpdatePerkembangan: (newList: CatatanPerkembangan[]) => void;
  onUpdatePerilaku: (newList: CatatanPerilaku[]) => void;
  onUpdateHomeVisit: (newList: HomeVisit[]) => void;
  onUpdateUsers: (newList: User[]) => void;
  onUpdateSettings: (newSettings: SystemSettings) => void;
  onUpdateDokumentasi: (newList: Dokumentasi[]) => void;
  onUpdateAdministrasi: (newList: Administrasi[]) => void;
  onUpdateJadwal: (newList: Jadwal[]) => void;
}

export const GoogleSheetsMenu: React.FC<GoogleSheetsMenuProps> = ({
  user,
  siswa,
  jurnal,
  perkembangan,
  perilaku,
  homeVisit,
  users,
  settings,
  dokumentasi,
  administrasi,
  jadwal,
  onUpdateSiswa,
  onUpdateJurnal,
  onUpdatePerkembangan,
  onUpdatePerilaku,
  onUpdateHomeVisit,
  onUpdateUsers,
  onUpdateSettings,
  onUpdateDokumentasi,
  onUpdateAdministrasi,
  onUpdateJadwal
}) => {
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState<string>('');
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<Record<string, boolean>>({});
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [showInstructions, setShowInstructions] = useState<boolean>(false);
  const [diagnosticSteps, setDiagnosticSteps] = useState<any[]>([]);
  const [isDiagnosing, setIsDiagnosing] = useState<boolean>(false);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);

  // Load saved Spreadsheet ID from LocalStorage on mount
  useEffect(() => {
    const savedId = localStorage.getItem('edu_google_spreadsheet_id');
    if (savedId) {
      setSpreadsheetId(savedId);
    } else {
      const defaultId = '14NHsOMokx_ngS-SlrRAXQkGGiBSQbXnO2AD9Tzj9gow';
      setSpreadsheetId(defaultId);
      localStorage.setItem('edu_google_spreadsheet_id', defaultId);
    }

    // Initialize Auth state listener
    const unsubscribe = initAuth(
      (u, token) => {
        setGoogleUser(u);
        setAccessToken(token);
      },
      () => {
        setGoogleUser(null);
        setAccessToken(null);
      }
    );

    return () => unsubscribe();
  }, []);

  const showStatus = (text: string, isError: boolean = false, timeoutMs: number = 6000) => {
    setStatusMessage({ text, isError });
    setTimeout(() => {
      setStatusMessage(null);
    }, timeoutMs);
  };

  const getGoogleErrorMessage = async (res: Response, defaultMsg: string): Promise<string> => {
    try {
      const clone = res.clone();
      const errData = await clone.json();
      if (errData?.error?.message) {
        return `${defaultMsg} (Detail Google: ${errData.error.message})`;
      }
    } catch (_) {}
    return defaultMsg;
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setAccessToken(result.accessToken);
        showStatus('Berhasil menghubungkan dengan Google Account!', false);
      }
    } catch (err: any) {
      console.error(err);
      const errStr = err?.code || err?.message || String(err);
      if (errStr.includes('auth/unauthorized-domain')) {
        const hostname = typeof window !== 'undefined' ? window.location.hostname : 'iribs.sch.id';
        showStatus(
          `Domain "${hostname}" belum diizinkan (Authorized Domain) di Firebase Console.\n\n` +
          `Langkah Penyelesaian:\n` +
          `1. Buka Firebase Console (https://console.firebase.google.com)\n` +
          `2. Pilih project Firebase: jurnal-iribs-v3\n` +
          `3. Buka menu Authentication -> Settings (Setelan) -> Authorized domains (Domain Otorisasi)\n` +
          `4. Klik "Add domain" (Tambah domain) dan tambahkan: ${hostname} (serta "iribs.sch.id")\n` +
          `5. Klik Simpan, lalu coba klik Hubungkan Google kembali.`,
          true,
          20000
        );
      } else {
        showStatus('Gagal masuk dengan Google: ' + (err.message || err), true);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm('Apakah Anda yakin ingin memutuskan koneksi Google Sheets?')) {
      await logoutGoogle();
      setGoogleUser(null);
      setAccessToken(null);
      showStatus('Koneksi Google Sheets diputuskan.', false);
    }
  };

  const saveSpreadsheetId = (id: string) => {
    const cleanId = id.trim();
    let finalId = cleanId;
    
    // Extract ID from full URL if the user pastes a complete Google Sheets link
    if (cleanId.includes('docs.google.com/spreadsheets/d/')) {
      const parts = cleanId.split('/d/');
      if (parts[1]) {
        finalId = parts[1].split('/')[0];
      }
    }

    setSpreadsheetId(finalId);
    localStorage.setItem('edu_google_spreadsheet_id', finalId);
    showStatus('ID Spreadsheet berhasil disimpan!', false);
  };

  // Helper: Perform API batch updates to pre-create missing tabs
  const ensureSheetsExist = async (token: string, sId: string, sheetTitles: string[]) => {
    try {
      // First try to check existing sheets to avoid conflicts
      const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sId}?fields=sheets.properties.title`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        if (res.status === 401) {
          setGoogleUser(null);
          setAccessToken(null);
          localStorage.removeItem('edu_google_access_token');
          throw new Error('Sesi Google kedaluwarsa atau tidak valid. Silakan hubungkan kembali akun Google Anda dengan menekan tombol "Hubungkan Google".');
        } else if (res.status === 403) {
          const detailMsg = await getGoogleErrorMessage(res, 'Akun Google Anda tidak memiliki hak akses (baca/tulis) ke spreadsheet ini. Pastikan Anda telah mencentang semua izin akses Google Sheets saat masuk.');
          throw new Error(`Izin ditolak (403). ${detailMsg}`);
        }
        const fallbackMsg = await getGoogleErrorMessage(res, `Spreadsheet tidak ditemukan atau tidak dapat diakses (Status: ${res.status}).`);
        throw new Error(fallbackMsg);
      }
      
      const data = await res.json();
      const existingTitles = data.sheets?.map((s: any) => s.properties.title) || [];
      
      const sheetsToAdd = sheetTitles.filter(t => !existingTitles.includes(t));
      if (sheetsToAdd.length === 0) return;

      const requests = sheetsToAdd.map(t => ({
        addSheet: { properties: { title: t } }
      }));

      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ requests })
      });
    } catch (e) {
      console.warn('Silent notice: ensureSheetsExist encountered ', e);
    }
  };

  // Create a fresh Spreadsheet on Google Drive
  const handleCreateNewSpreadsheet = async () => {
    if (!accessToken) {
      showStatus('Hubungkan ke Google terlebih dahulu.', true);
      return;
    }

    setIsSyncing(prev => ({ ...prev, create: true }));
    try {
      const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          properties: {
            title: `EduSantri MTs Ibad Ar Rahman - Backup & Sync`
          }
        })
      });

      if (!response.ok) {
        if (response.status === 401) {
          setGoogleUser(null);
          setAccessToken(null);
          localStorage.removeItem('edu_google_access_token');
          throw new Error('Sesi Google kedaluwarsa atau tidak valid. Silakan hubungkan kembali akun Google Anda dengan menekan tombol "Hubungkan Google".');
        } else if (response.status === 403) {
          const detailMsg = await getGoogleErrorMessage(response, 'Izin ditolak oleh Google API. Pastikan Anda telah mencentang semua kotak izin akses Google Sheets & Google Drive saat masuk.');
          throw new Error(`Izin ditolak (403). ${detailMsg}`);
        }
        const fallbackMsg = await getGoogleErrorMessage(response, `Gagal membuat Spreadsheet baru di Drive Anda (Status: ${response.status}).`);
        throw new Error(fallbackMsg);
      }

      const data = await response.json();
      const newId = data.spreadsheetId;
      
      // Save ID
      setSpreadsheetId(newId);
      localStorage.setItem('edu_google_spreadsheet_id', newId);

      // Pre-create all required tabs
      await ensureSheetsExist(accessToken, newId, [
        'Users',
        'Siswa',
        'Settings',
        'Catatan_Perkembangan',
        'Catatan_Perilaku',
        'Jurnal_Guru',
        'Home_Visit',
        'Dokumentasi_Kelas',
        'Administrasi_Guru',
        'Jadwal_Guru'
      ]);

      showStatus('Spreadsheet "EduSantri MTs Ibad Ar Rahman - Backup & Sync" berhasil dibuat di Google Drive Anda!', false);
    } catch (err: any) {
      console.error(err);
      showStatus(err.message || 'Gagal membuat Spreadsheet baru.', true);
    } finally {
      setIsSyncing(prev => ({ ...prev, create: false }));
    }
  };

  const runConnectionDiagnostics = async () => {
    setIsDiagnosing(true);
    setShowDiagnostics(true);
    
    const steps = [
      { id: 'auth', name: 'Autentikasi Google (OAuth)', status: 'running', message: 'Memeriksa status login...', details: '' },
      { id: 'scopes', name: 'Scope Izin API (Drive & Sheets)', status: 'idle', message: 'Menunggu langkah sebelumnya...', details: '' },
      { id: 'id', name: 'Pemeriksaan ID Spreadsheet', status: 'idle', message: 'Menunggu langkah sebelumnya...', details: '' },
      { id: 'read', name: 'Uji Akses Baca (Read Test)', status: 'idle', message: 'Menunggu langkah sebelumnya...', details: '' },
      { id: 'write', name: 'Uji Akses Tulis (Write Capability)', status: 'idle', message: 'Menunggu langkah sebelumnya...', details: '' },
    ];
    setDiagnosticSteps([...steps]);

    // Step 1: Auth check
    const currentToken = accessToken || getAccessToken();
    if (!googleUser || !currentToken) {
      steps[0] = {
        id: 'auth',
        name: 'Autentikasi Google (OAuth)',
        status: 'error',
        message: 'Tidak Terhubung',
        details: 'Kesalahan: Akun Google Anda belum terhubung.\n\nAnalisis: Aplikasi ini menggunakan Google Client-side OAuth secara langsung. Ini berarti tidak ada "Service Account" di backend, melainkan browser Anda yang langsung berkomunikasi dengan Google API atas nama Anda sendiri. Silakan klik tombol "Hubungkan Google" terlebih dahulu.'
      };
      setDiagnosticSteps([...steps]);
      setIsDiagnosing(false);
      return;
    }

    steps[0] = {
      id: 'auth',
      name: 'Autentikasi Google (OAuth)',
      status: 'success',
      message: `Terhubung sebagai ${googleUser.email}`,
      details: `Nama Profil: ${googleUser.displayName || 'Tidak ada'}\nGoogle UID: ${googleUser.uid}\nAccess Token: Terdeteksi (${currentToken.substring(0, 10)}...)`
    };
    
    steps[1].status = 'running';
    steps[1].message = 'Memverifikasi scope izin API...';
    setDiagnosticSteps([...steps]);

    // Step 2: Scopes check
    try {
      const resToken = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${currentToken}`);
      if (!resToken.ok) {
        steps[1] = {
          id: 'scopes',
          name: 'Scope Izin API (Drive & Sheets)',
          status: 'warning',
          message: 'Bypass Verifikasi Scope',
          details: `Respon API Info Token mengembalikan HTTP ${resToken.status}. Kami akan melewatinya dan melakukan pengujian langsung pada spreadsheet.`
        };
      } else {
        const tokenInfo = await resToken.json();
        const scopeStr = tokenInfo.scope || '';
        const scopes = scopeStr.split(' ');
        
        const required = [
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/drive'
        ];
        
        const missing = required.filter(s => {
          // Check if token has the scope or a broader/sub-scope
          return !scopes.some((approvedScope: string) => approvedScope === s || approvedScope.startsWith(s));
        });

        if (missing.length > 0) {
          steps[1] = {
            id: 'scopes',
            name: 'Scope Izin API (Drive & Sheets)',
            status: 'error',
            message: 'Izin Tidak Lengkap',
            details: `Scope yang hilang:\n${missing.map(m => `• ${m}`).join('\n')}\n\nAnalisis: Akun Google Anda terhubung, tetapi Anda tidak mencentang izin akses untuk mengedit file Google Sheets atau Google Drive Anda saat login.\n\nSolusi:\n1. Klik tombol "Putuskan Koneksi Google".\n2. Klik "Hubungkan Google" kembali.\n3. Ketika halaman persetujuan Google muncul, PASTIKAN Anda mencentang SEMUA kotak izin akses (melihat, mengedit, membuat Google Sheets dan Google Drive Anda).`
          };
          setDiagnosticSteps([...steps]);
          setIsDiagnosing(false);
          return;
        } else {
          steps[1] = {
            id: 'scopes',
            name: 'Scope Izin API (Drive & Sheets)',
            status: 'success',
            message: 'Izin Lengkap Disetujui',
            details: `Scope yang disetujui:\n${scopes.map((s: string) => `• ${s}`).join('\n')}`
          };
        }
      }
    } catch (err: any) {
      steps[1] = {
        id: 'scopes',
        name: 'Scope Izin API (Drive & Sheets)',
        status: 'warning',
        message: 'Gagal Membaca Info Token',
        details: `Kesalahan Jaringan: ${err.message || err}. Melanjutkan pengujian langsung.`
      };
    }

    steps[2].status = 'running';
    steps[2].message = 'Mengekstrak ID Spreadsheet...';
    setDiagnosticSteps([...steps]);

    // Step 3: Spreadsheet ID check
    let cleanId = spreadsheetId.trim();
    if (cleanId.includes('docs.google.com/spreadsheets/d/')) {
      const parts = cleanId.split('/d/');
      if (parts[1]) {
        cleanId = parts[1].split('/')[0];
      }
    }

    if (!cleanId) {
      steps[2] = {
        id: 'id',
        name: 'Pemeriksaan ID Spreadsheet',
        status: 'error',
        message: 'ID Spreadsheet Kosong',
        details: 'ID Spreadsheet tidak ditemukan. Silakan masukkan ID atau salin URL lengkap Google Sheets Anda di kotak input terlebih dahulu.'
      };
      setDiagnosticSteps([...steps]);
      setIsDiagnosing(false);
      return;
    }

    const isDefault = cleanId === '14NHsOMokx_ngS-SlrRAXQkGGiBSQbXnO2AD9Tzj9gow';
    steps[2] = {
      id: 'id',
      name: 'Pemeriksaan ID Spreadsheet',
      status: isDefault ? 'warning' : 'success',
      message: isDefault ? 'ID Default (Template Bersama / Hanya Baca)' : 'ID Kustom Terdeteksi',
      details: `ID yang diproses: ${cleanId}\n\n${isDefault ? 'PERINGATAN: Anda menggunakan ID Spreadsheet default bawaan. Spreadsheet ini bersifat publik dan Hanya Baca (Read-Only) bagi pengguna luar. Anda TIDAK AKAN PERNAH bisa melakukan ekspor data ke file ini karena Anda bukan pemiliknya.\n\nSolusi: Klik tombol "Buat Spreadsheet Baru" agar sistem menyalin template ini ke Google Drive pribadi Anda sendiri!' : 'Analisis: Ini adalah Spreadsheet kustom Anda. Kita akan menguji akses baca dan tulis pada file ini.'}`
    };

    steps[3].status = 'running';
    steps[3].message = 'Melakukan uji baca ke API Google Sheets...';
    setDiagnosticSteps([...steps]);

    // Step 4: Read Access Check
    let canRead = false;
    try {
      const resRead = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${cleanId}?fields=properties.title`, {
        headers: { Authorization: `Bearer ${currentToken}` }
      });

      if (resRead.ok) {
        const data = await resRead.json();
        steps[3] = {
          id: 'read',
          name: 'Uji Akses Baca (Read Test)',
          status: 'success',
          message: 'Sukses Membaca Metadata',
          details: `Judul Spreadsheet: "${data.properties?.title || 'Tanpa Judul'}"\nHTTP Status: 200 OK\n\nAnalisis: Akun Google Anda sukses melakukan otentikasi dan memiliki izin untuk melihat spreadsheet ini.`
        };
        canRead = true;
      } else {
        const status = resRead.status;
        const statusText = resRead.statusText;
        let details = `HTTP Status: ${status} ${statusText}\n`;
        
        try {
          const errJson = await resRead.json();
          details += `Respon Kesalahan API: ${JSON.stringify(errJson.error || errJson, null, 2)}\n\n`;
        } catch {
          const text = await resRead.text();
          details += `Respon Mentah API: ${text}\n\n`;
        }

        if (status === 401) {
          details += `Analisis (401 Unauthorized):\nSesi login Google Anda telah kedaluwarsa atau token tidak valid.\n\nSolusi: Hubungkan ulang akun Google Anda dengan menekan tombol "Putuskan Koneksi Google" lalu "Hubungkan Google" kembali.`;
        } else if (status === 403) {
          details += `Analisis (403 Forbidden):\nIzin ditolak. Akun Google yang Anda gunakan tidak memiliki hak akses (baca/edit) ke file spreadsheet dengan ID ini.\n\nSolusi:\n1. Buka spreadsheet tersebut langsung di browser Google Sheets Anda.\n2. Pastikan akun Google yang Anda gunakan untuk masuk ke aplikasi ini adalah akun yang sama yang memiliki akses ke spreadsheet tersebut.\n3. Jika itu file milik orang lain, pastikan pemiliknya telah memberikan izin akses "Pelihat" atau "Editor" ke email Google Anda.`;
        } else if (status === 404) {
          details += `Analisis (404 Not Found):\nFile Spreadsheet tidak ditemukan oleh Google API.\n\nSolusi: Periksa kembali ID Spreadsheet Anda. Pastikan ID tersebut tepat, atau URL Google Sheets yang Anda paste tidak rusak atau terpotong.`;
        } else {
          details += `Analisis:\nTerjadi kesalahan tidak terduga pada server Google. Silakan periksa kembali konfigurasi API key Firebase atau coba lagi nanti.`;
        }

        steps[3] = {
          id: 'read',
          name: 'Uji Akses Baca (Read Test)',
          status: 'error',
          message: `Gagal Membaca (HTTP ${status})`,
          details
        };
      }
    } catch (err: any) {
      steps[3] = {
        id: 'read',
        name: 'Uji Akses Baca (Read Test)',
        status: 'error',
        message: 'Gagal Membaca (Koneksi Terputus)',
        details: `Kesalahan Jaringan: ${err.message || err}\n\nAnalisis: Tidak dapat mengirim permintaan HTTP ke API Google Sheets. Pastikan koneksi internet Anda stabil.`
      };
    }

    setDiagnosticSteps([...steps]);

    if (!canRead) {
      steps[4] = {
        id: 'write',
        name: 'Uji Akses Tulis (Write Capability)',
        status: 'error',
        message: 'Uji Tulis Diabaikan',
        details: 'Analisis: Uji akses tulis tidak dapat dilakukan karena uji akses baca ke file spreadsheet gagal.'
      };
      setDiagnosticSteps([...steps]);
      setIsDiagnosing(false);
      return;
    }

    steps[4].status = 'running';
    steps[4].message = 'Melakukan uji tulis (analisis Drive capabilities)...';
    setDiagnosticSteps([...steps]);

    // Step 5: Write Access Check
    try {
      const resDrive = await fetch(`https://www.googleapis.com/drive/v3/files/${cleanId}?fields=capabilities`, {
        headers: { Authorization: `Bearer ${currentToken}` }
      });

      if (resDrive.ok) {
        const driveData = await resDrive.json();
        const canEdit = driveData.capabilities?.canEdit;
        
        if (canEdit) {
          steps[4] = {
            id: 'write',
            name: 'Uji Akses Tulis (Write Capability)',
            status: 'success',
            message: 'Akses Tulis Tersedia (Editor)',
            details: `Analisis:\nAkun Google Anda terdeteksi memiliki hak akses EDIT (tulis) pada file Spreadsheet ini.\n\nKesimpulan: Anda siap mengekspor dan mengimpor semua data tanpa masalah!`
          };
        } else {
          steps[4] = {
            id: 'write',
            name: 'Uji Akses Tulis (Write Capability)',
            status: 'error',
            message: 'Hanya Baca (Viewer)',
            details: `Analisis:\nAkun Google Anda sukses membaca file, tetapi Anda hanya memiliki hak akses sebagai LIHAT SAJA (Viewer) di Google Drive Anda untuk file ini.\n\nSolusi: Buka file spreadsheet Anda langsung di Google Sheets, bagikan file tersebut ke diri Anda sendiri, dan ubah status hak akses akun Anda dari "Pelihat/Viewer" menjadi "Editor". Jika ini file template bersama, klik "Buat Spreadsheet Baru" untuk menduplikatnya.`
          };
        }
      } else {
        const status = resDrive.status;
        let details = `HTTP Status dari Drive API: ${status}\n`;
        try {
          const errJson = await resDrive.json();
          details += `Respon API: ${JSON.stringify(errJson.error || errJson, null, 2)}\n\n`;
        } catch {
          const text = await resDrive.text();
          details += `Respon Mentah API: ${text}\n\n`;
        }

        details += `Tip: Kami tidak bisa memvalidasi kapabilitas edit via Google Drive API secara resmi, tetapi Anda bisa mengujinya dengan melakukan ekspor satu tab data secara langsung.`;

        steps[4] = {
          id: 'write',
          name: 'Uji Akses Tulis (Write Capability)',
          status: 'warning',
          message: 'Melewati Validasi Hak Tulis',
          details
        };
      }
    } catch (err: any) {
      steps[4] = {
        id: 'write',
        name: 'Uji Akses Tulis (Write Capability)',
        status: 'warning',
        message: 'Gagal Membaca Hak Tulis',
        details: `Kesalahan Jaringan: ${err.message || err}\n\nTip: Silakan coba lakukan ekspor data secara langsung untuk menguji akses tulis.`
      };
    }

    setDiagnosticSteps([...steps]);
    setIsDiagnosing(false);
  };

  // --- EXPORT FUNCTIONS ---
  
  const exportData = async (key: string, title: string, headers: string[][], rowMapper: () => Promise<string[][]> | string[][]) => {
    if (!accessToken) {
      showStatus('Hubungkan ke Google terlebih dahulu.', true);
      return;
    }
    if (!spreadsheetId) {
      showStatus('Masukkan ID Spreadsheet atau buat Spreadsheet baru.', true);
      return;
    }

    setIsSyncing(prev => ({ ...prev, [key]: true }));
    try {
      // 1. Ensure the tab exists
      await ensureSheetsExist(accessToken, spreadsheetId, [title]);

      // 2. Prepare grid data
      const mappedRows = await rowMapper();
      const values = [...headers, ...mappedRows];

      // 3. Clear existing values to prevent overlap of shorter datasets
      const clearRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(title)}!A1:Z1000:clear`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!clearRes.ok) {
        if (clearRes.status === 401) {
          setGoogleUser(null);
          setAccessToken(null);
          localStorage.removeItem('edu_google_access_token');
          throw new Error('Sesi Google kedaluwarsa atau tidak valid. Silakan hubungkan kembali akun Google Anda dengan menekan tombol "Hubungkan Google".');
        } else if (clearRes.status === 403) {
          const detailMsg = await getGoogleErrorMessage(clearRes, 'Akun Google Anda tidak memiliki hak akses edit (tulis) ke spreadsheet ini. Pastikan Anda telah memberikan izin penuh untuk Google Sheets saat masuk.');
          throw new Error(`Izin ditolak (403). ${detailMsg}`);
        }
        const fallbackMsg = await getGoogleErrorMessage(clearRes, `Gagal mengosongkan data lama di spreadsheet (Status: ${clearRes.status}).`);
        throw new Error(fallbackMsg);
      }

      // 4. Overwrite values
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(title)}!A1?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ values })
        }
      );

      if (!response.ok) {
        const errorText = await getGoogleErrorMessage(response, response.statusText || 'Gagal menulis data');
        throw new Error(`Gagal menulis data ke tab ${title}: ${errorText}`);
      }

      showStatus(`Berhasil mengekspor data ${title} ke Google Sheets!`, false);
    } catch (err: any) {
      console.error(err);
      showStatus(`Gagal Ekspor ${title}: ${err.message || err}`, true);
    } finally {
      setIsSyncing(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleExportSiswa = () => {
    const headers = [['id_siswa', 'nama_siswa', 'kelas', 'jenis_kelamin', 'nama_wali']];
    const mapper = () => siswa.map(s => [
      s.id_siswa || '',
      s.nama_siswa || '',
      s.kelas || '',
      s.jenis_kelamin || '-',
      s.nama_wali || '-'
    ]);
    return exportData('siswa', 'Siswa', headers, mapper);
  };

  const handleExportJurnal = () => {
    const headers = [
      ['id_jurnal', 'tanggal', 'nama_guru', 'mata_pelajaran', 'kelas', 'jam_ke', 'materi', 'uraian_pembelajaran', 'siswa_sakit', 'siswa_izin', 'siswa_alpa', 'catatan', 'foto_1', 'foto_2']
    ];
    const mapper = async () => {
      const processed = await Promise.all(
        jurnal.map(async (j) => {
          let foto_1 = j.foto_1 || '';
          let foto_2 = j.foto_2 || '';

          const dateStr = j.tanggal ? j.tanggal.substring(0, 10) : new Date().toISOString().substring(0, 10);
          const formattedDate = dateStr.split('-').reverse().join('-');

          const safeGuru = (j.nama_guru || 'Guru').trim().replace(/[/\\?%*:|"<>]/g, '-');
          const safeMapel = (j.mata_pelajaran || 'Mapel').trim().replace(/[/\\?%*:|"<>]/g, '-');

          if (foto_1 && foto_1.startsWith('data:image/')) {
            const filename1 = `${safeGuru}_${safeMapel}_${formattedDate}_Foto1`;
            foto_1 = await uploadImageToDrive(foto_1, filename1, accessToken || '');
          }

          if (foto_2 && foto_2.startsWith('data:image/')) {
            const filename2 = `${safeGuru}_${safeMapel}_${formattedDate}_Foto2`;
            foto_2 = await uploadImageToDrive(foto_2, filename2, accessToken || '');
          }

          return { ...j, foto_1, foto_2 };
        })
      );

      // Save back to local state to replace base64 with web URLs
      let hasChanges = false;
      const updatedList = jurnal.map((orig, idx) => {
        const proc = processed[idx];
        if (orig.foto_1 !== proc.foto_1 || orig.foto_2 !== proc.foto_2) {
          hasChanges = true;
          return proc;
        }
        return orig;
      });

      if (hasChanges) {
        onUpdateJurnal(updatedList);
      }

      return processed.map(j => [
        j.id_jurnal || '',
        j.tanggal || '',
        j.nama_guru || '',
        j.mata_pelajaran || '',
        j.kelas || '',
        j.jam_ke || '',
        j.materi || '',
        j.uraian_pembelajaran || '',
        j.siswa_sakit || '',
        j.siswa_izin || '',
        j.siswa_alpa || '',
        j.catatan || '',
        j.foto_1 || '',
        j.foto_2 || ''
      ]);
    };
    return exportData('jurnal', 'Jurnal_Guru', headers, mapper);
  };

  const handleExportPerkembangan = () => {
    const headers = [
      ['id_catatan', 'tanggal', 'id_siswa', 'nama_guru', 'mata_pelajaran', 'kategori', 'deskripsi_perkembangan']
    ];
    const mapper = () => perkembangan.map(p => [
      p.id_catatan || '',
      p.tanggal || '',
      p.id_siswa || '',
      p.nama_guru || '',
      p.mata_pelajaran || '',
      p.kategori || '',
      p.deskripsi_perkembangan || ''
    ]);
    return exportData('perkembangan', 'Catatan_Perkembangan', headers, mapper);
  };

  const handleExportPerilaku = () => {
    const headers = [
      ['id_catatan', 'tanggal', 'id_siswa', 'nama_guru', 'mata_pelajaran', 'jenis_perilaku', 'deskripsi_perilaku', 'tindak_lanjut']
    ];
    const mapper = () => perilaku.map(p => [
      p.id_catatan || '',
      p.tanggal || '',
      p.id_siswa || '',
      p.nama_guru || '',
      p.mata_pelajaran || '',
      p.jenis_perilaku || '',
      p.deskripsi_perilaku || '',
      p.tindak_lanjut || ''
    ]);
    return exportData('perilaku', 'Catatan_Perilaku', headers, mapper);
  };

  const handleExportHomeVisit = () => {
    const headers = [
      ['id_kunjungan', 'tanggal', 'id_siswa', 'nama_guru', 'alasan_kunjungan', 'hasil_kunjungan', 'tindak_lanjut', 'foto_1', 'foto_2']
    ];
    const mapper = async () => {
      const processed = await Promise.all(
        homeVisit.map(async (h) => {
          let foto_1 = h.foto_1 || '';
          let foto_2 = h.foto_2 || '';

          const dateStr = h.tanggal ? h.tanggal.substring(0, 10) : new Date().toISOString().substring(0, 10);
          const formattedDate = dateStr.split('-').reverse().join('-');

          const safeGuru = (h.nama_guru || 'Guru').trim().replace(/[/\\?%*:|"<>]/g, '-');

          if (foto_1 && foto_1.startsWith('data:image/')) {
            const filename1 = `${safeGuru}_HomeVisit_${formattedDate}_Foto1`;
            foto_1 = await uploadImageToDrive(foto_1, filename1, accessToken || '');
          }

          if (foto_2 && foto_2.startsWith('data:image/')) {
            const filename2 = `${safeGuru}_HomeVisit_${formattedDate}_Foto2`;
            foto_2 = await uploadImageToDrive(foto_2, filename2, accessToken || '');
          }

          return { ...h, foto_1, foto_2 };
        })
      );

      let hasChanges = false;
      const updatedList = homeVisit.map((orig, idx) => {
        const proc = processed[idx];
        if (orig.foto_1 !== proc.foto_1 || orig.foto_2 !== proc.foto_2) {
          hasChanges = true;
          return proc;
        }
        return orig;
      });

      if (hasChanges) {
        onUpdateHomeVisit(updatedList);
      }

      return processed.map(h => [
        h.id_kunjungan || '',
        h.tanggal || '',
        h.id_siswa || '',
        h.nama_guru || '',
        h.alasan_kunjungan || '',
        h.hasil_kunjungan || '',
        h.tindak_lanjut || '',
        h.foto_1 || '',
        h.foto_2 || ''
      ]);
    };
    return exportData('homeVisit', 'Home_Visit', headers, mapper);
  };

  const handleExportUsers = () => {
    const headers = [
      ['id_user', 'username', 'password', 'role', 'nama_lengkap', 'id_referensi', 'status']
    ];
    const mapper = () => users.map(u => [
      u.id_user || '',
      u.username || '',
      u.password || '',
      u.role || '',
      u.nama_lengkap || '',
      u.id_referensi || '',
      u.status || ''
    ]);
    return exportData('users', 'Users', headers, mapper);
  };

  const handleExportSettings = () => {
    const headers = [['key', 'value']];
    const mapper = () => [
      ['tahun_ajaran', settings.tahun_ajaran || ''],
      ['batas_waktu_administrasi', settings.batas_waktu_administrasi || ''],
      ['semester', settings.semester || 'Ganjil']
    ];
    return exportData('settings', 'Settings', headers, mapper);
  };

  const handleExportDokumentasi = () => {
    const headers = [
      ['id_dokumentasi', 'tanggal', 'kelas', 'nama_kegiatan', 'foto', 'nama_guru']
    ];
    const mapper = async () => {
      const processed = await Promise.all(
        dokumentasi.map(async (d) => {
          let foto = d.foto || '';

          const dateStr = d.tanggal ? d.tanggal.substring(0, 10) : new Date().toISOString().substring(0, 10);
          const formattedDate = dateStr.split('-').reverse().join('-');

          const safeGuru = (d.nama_guru || 'Guru').trim().replace(/[/\\?%*:|"<>]/g, '-');
          const safeKegiatan = (d.nama_kegiatan || 'Kegiatan').trim().replace(/[/\\?%*:|"<>]/g, '-');

          if (foto && foto.startsWith('data:image/')) {
            const filename = `${safeGuru}_${safeKegiatan}_${formattedDate}_Foto`;
            foto = await uploadImageToDrive(foto, filename, accessToken || '');
          }

          return { ...d, foto };
        })
      );

      let hasChanges = false;
      const updatedList = dokumentasi.map((orig, idx) => {
        const proc = processed[idx];
        if (orig.foto !== proc.foto) {
          hasChanges = true;
          return proc;
        }
        return orig;
      });

      if (hasChanges) {
        onUpdateDokumentasi(updatedList);
      }

      return processed.map(d => [
        d.id_dokumentasi || '',
        d.tanggal || '',
        d.kelas || '',
        d.nama_kegiatan || '',
        d.foto || '',
        d.nama_guru || ''
      ]);
    };
    return exportData('dokumentasi', 'Dokumentasi_Kelas', headers, mapper);
  };

  const handleExportAdministrasi = () => {
    const headers = [
      ['id_file', 'tanggal', 'nama_guru', 'nama_file', 'jenis_file', 'url_file']
    ];
    const mapper = () => administrasi.map(a => [
      a.id_file || '',
      a.tanggal || '',
      a.nama_guru || '',
      a.nama_file || '',
      a.jenis_file || '',
      a.url_file || ''
    ]);
    return exportData('administrasi', 'Administrasi_Guru', headers, mapper);
  };

  const handleExportJadwal = () => {
    const headers = [
      ['id_jadwal', 'nama_guru', 'hari', 'jam_ke', 'mata_pelajaran', 'kelas', 'status_reminder']
    ];
    const mapper = () => jadwal.map(j => [
      j.id_jadwal || '',
      j.nama_guru || '',
      j.hari || '',
      j.jam_ke || '',
      j.mata_pelajaran || '',
      j.kelas || '',
      j.status_reminder || ''
    ]);
    return exportData('jadwal', 'Jadwal_Guru', headers, mapper);
  };

  const handleExportAll = async () => {
    if (!accessToken || !spreadsheetId) {
      showStatus('Hubungkan ke Google dan atur ID Spreadsheet terlebih dahulu.', true);
      return;
    }
    setIsSyncing(prev => ({ ...prev, all: true }));
    try {
      showStatus('Mengekspor seluruh 10 database ke tab-tab spreadsheet...', false);
      
      await handleExportUsers();
      await handleExportSiswa();
      await handleExportSettings();
      await handleExportPerkembangan();
      await handleExportPerilaku();
      await handleExportJurnal();
      await handleExportHomeVisit();
      await handleExportDokumentasi();
      await handleExportAdministrasi();
      await handleExportJadwal();

      showStatus('Ekspor global seluruh 10 database berhasil diselesaikan!', false);
    } catch (e: any) {
      showStatus('Gagal ekspor semua data: ' + e.message, true);
    } finally {
      setIsSyncing(prev => ({ ...prev, all: false }));
    }
  };

  // --- IMPORT FUNCTIONS ---

  const importData = async (
    key: string,
    title: string,
    columnHeaders: string[],
    handleParsedRows: (rows: string[][]) => void,
    localCount: number = 0,
    onAutoExport?: () => Promise<any> | void
  ) => {
    if (!accessToken) {
      showStatus('Hubungkan ke Google terlebih dahulu.', true);
      return;
    }
    if (!spreadsheetId) {
      showStatus('Masukkan ID Spreadsheet.', true);
      return;
    }

    const confirmed = window.confirm(`Apakah Anda yakin ingin memuat data dari Tab "${title}"? Langkah ini akan memproses baris data di spreadsheet.`);
    if (!confirmed) return;

    setIsSyncing(prev => ({ ...prev, [`import_${key}`]: true }));
    try {
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(title)}!A1:Z1000`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          setGoogleUser(null);
          setAccessToken(null);
          localStorage.removeItem('edu_google_access_token');
          throw new Error('Sesi Google kedaluwarsa atau tidak valid. Silakan hubungkan kembali akun Google Anda dengan menekan tombol "Hubungkan Google".');
        } else if (response.status === 403) {
          const detailMsg = await getGoogleErrorMessage(response, 'Akun Google Anda tidak memiliki akses membaca ke spreadsheet ini. Pastikan Anda telah memberikan izin penuh untuk Google Sheets saat masuk.');
          throw new Error(`Izin ditolak (403). ${detailMsg}`);
        }
        const fallbackMsg = await getGoogleErrorMessage(response, `Gagal membaca tab "${title}" (Status: ${response.status}). Pastikan tab tersebut ada di Google Spreadsheet.`);
        throw new Error(fallbackMsg);
      }

      const data = await response.json();
      const values: string[][] = data.values || [];

      if (values.length < 2) {
        if (localCount > 0 && onAutoExport) {
          const autoExportDecision = window.confirm(
            `Data di tab "${title}" Google Sheets saat ini kosong / kurang dari 2 baris.\n\nAplikasi lokal Anda saat ini memiliki ${localCount} data "${title}". Apakah Anda ingin MENGEKSPOR (mengunggah) data lokal ini ke Google Sheets sekarang agar tab terisi?`
          );
          if (autoExportDecision) {
            await onAutoExport();
            return;
          }
        }
        throw new Error(
          `Data di tab "${title}" kosong atau kurang dari 2 baris (butuh baris header & minimal 1 baris data).\n\nPetunjuk Solusi:\n1. Jika ingin mengisi Google Sheets dari aplikasi, klik tombol "Ekspor ${title}".\n2. Jika ingin mengisi lewat Google Sheets, buka file spreadsheet dan tambahkan baris data di bawah header.`
        );
      }

      // Flexible header normalization & alias matching
      const normalize = (str: string) => str.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const normalizedFileHeaders = values[0].map(h => normalize(h));

      const findColIdx = (colKey: string) => {
        const normKey = normalize(colKey);
        let idx = normalizedFileHeaders.indexOf(normKey);
        if (idx !== -1) return idx;

        // Common aliases matching
        if (colKey === 'mata_pelajaran') {
          idx = normalizedFileHeaders.findIndex(h => h.includes('mapel') || h.includes('matapelajaran') || h.includes('pelajaran'));
        } else if (colKey.startsWith('id_')) {
          idx = normalizedFileHeaders.findIndex(h => h === 'id' || h.startsWith('id'));
        }
        return idx;
      };

      const missingCols = columnHeaders.filter(col => findColIdx(col) === -1);
      if (missingCols.length > 0) {
        throw new Error(`Format kolom tab "${title}" tidak sesuai. Kolom hilang: ${missingCols.join(', ')}. Silakan lakukan 'Ekspor ${title}' terlebih dahulu untuk membuat ulang header yang sesuai.`);
      }

      // Pass the remaining data rows to the individual parser
      const dataRows = values.slice(1);
      const headerIndices = columnHeaders.map(col => findColIdx(col));

      // Maps values to standardized columns
      const mappedRows = dataRows.map(row => {
        return headerIndices.map(idx => (idx !== -1 && row[idx] !== undefined ? row[idx].toString() : ''));
      });

      handleParsedRows(mappedRows);
    } catch (err: any) {
      console.error(err);
      showStatus(`Gagal Impor ${title}: ${err.message || err}`, true);
    } finally {
      setIsSyncing(prev => ({ ...prev, [`import_${key}`]: false }));
    }
  };

  const handleImportSiswa = () => {
    const cols = ['id_siswa', 'nama_siswa', 'kelas', 'jenis_kelamin', 'nama_wali'];
    importData(
      'siswa',
      'Siswa',
      cols,
      (rows) => {
        const newList: Siswa[] = rows
          .map((r, idx) => ({
            id_siswa: r[0] || `S_${Date.now()}_${idx}`,
            nama_siswa: r[1],
            kelas: r[2] || '7A',
            jenis_kelamin: r[3] || 'Laki-laki',
            nama_wali: r[4] || '-'
          }))
          .filter(s => s.nama_siswa && s.nama_siswa.trim() !== '');

        if (newList.length === 0) {
          showStatus(`Tidak ada baris data Santri valid yang ditemukan di tab "Siswa". Pastikan kolom nama_siswa terisi.`, true);
          return;
        }

        const decision = window.confirm(`Berhasil membaca ${newList.length} data Santri dari Google Sheets. Tekan OK untuk MENIMPA semua data lokal, atau CANCEL untuk MENGGABUNGKAN.`);
        if (decision) {
          onUpdateSiswa(newList);
          showStatus(`Data Santri berhasil ditimpa dengan ${newList.length} santri baru dari Google Sheets!`, false);
        } else {
          const merged = [...siswa];
          newList.forEach(n => {
            const idx = merged.findIndex(m => m.id_siswa === n.id_siswa || m.nama_siswa.toLowerCase() === n.nama_siswa.toLowerCase());
            if (idx > -1) {
              merged[idx] = n;
            } else {
              merged.push(n);
            }
          });
          onUpdateSiswa(merged);
          showStatus(`Data Santri digabungkan! Total sekarang: ${merged.length} santri.`, false);
        }
      },
      siswa.length,
      handleExportSiswa
    );
  };

  const handleImportJurnal = () => {
    const cols = ['id_jurnal', 'tanggal', 'nama_guru', 'mata_pelajaran', 'kelas', 'jam_ke', 'materi', 'uraian_pembelajaran', 'siswa_sakit', 'siswa_izin', 'siswa_alpa', 'catatan', 'foto_1', 'foto_2'];
    importData(
      'jurnal',
      'Jurnal_Guru',
      cols,
      (rows) => {
        const newList: Jurnal[] = rows
          .map((r, idx) => ({
            id_jurnal: r[0] || `jurnal_${Date.now()}_${idx}`,
            tanggal: r[1] || new Date().toISOString().substring(0, 10),
            nama_guru: r[2] || 'Guru',
            mata_pelajaran: r[3] || 'Mapel',
            kelas: r[4] || '7A',
            jam_ke: r[5] || '1',
            materi: r[6] || '-',
            uraian_pembelajaran: r[7] || '-',
            siswa_sakit: r[8] || '-',
            siswa_izin: r[9] || '-',
            siswa_alpa: r[10] || '-',
            catatan: r[11] || '-',
            foto_1: r[12] || '',
            foto_2: r[13] || ''
          }))
          .filter(j => j.id_jurnal && (j.nama_guru || j.materi || j.uraian_pembelajaran));

        if (newList.length === 0) {
          showStatus(`Tidak ada baris data valid yang ditemukan di tab "Jurnal_Guru". Pastikan kolom nama_guru / materi terisi.`, true);
          return;
        }

        const decision = window.confirm(`Berhasil membaca ${newList.length} Jurnal dari Google Sheets. Tekan OK untuk MENIMPA semua data lokal, atau CANCEL untuk MENGGABUNGKAN.`);
        if (decision) {
          onUpdateJurnal(newList);
          showStatus(`Jurnal berhasil ditimpa dengan ${newList.length} entri baru dari Google Sheets!`, false);
        } else {
          const merged = [...jurnal];
          newList.forEach(n => {
            const idx = merged.findIndex(m => m.id_jurnal === n.id_jurnal);
            if (idx > -1) {
              merged[idx] = n;
            } else {
              merged.push(n);
            }
          });
          onUpdateJurnal(merged);
          showStatus(`Jurnal digabungkan! Total sekarang: ${merged.length} entri.`, false);
        }
      },
      jurnal.length,
      handleExportJurnal
    );
  };

  const handleImportPerkembangan = () => {
    const cols = ['id_catatan', 'tanggal', 'id_siswa', 'nama_guru', 'mata_pelajaran', 'kategori', 'deskripsi_perkembangan'];
    importData(
      'perkembangan',
      'Catatan_Perkembangan',
      cols,
      (rows) => {
        const newList: CatatanPerkembangan[] = rows
          .map((r, idx) => ({
            id_catatan: r[0] || `perkembangan_${Date.now()}_${idx}`,
            tanggal: r[1] || new Date().toISOString().substring(0, 10),
            id_siswa: r[2] || '',
            nama_guru: r[3] || 'Guru',
            mata_pelajaran: r[4] || 'Umum',
            kategori: (r[5] as any) || 'Akademik',
            deskripsi_perkembangan: r[6] || '-'
          }))
          .filter(p => p.deskripsi_perkembangan && p.deskripsi_perkembangan !== '-');

        if (newList.length === 0) {
          showStatus(`Tidak ada Catatan Akademik valid yang dapat diimpor dari Google Sheets.`, true);
          return;
        }

        const decision = window.confirm(`Berhasil membaca ${newList.length} Catatan Akademik. Tekan OK untuk MENIMPA data lokal, atau CANCEL untuk MENGGABUNGKAN.`);
        if (decision) {
          onUpdatePerkembangan(newList);
          showStatus(`Catatan Akademik berhasil ditimpa!`, false);
        } else {
          const merged = [...perkembangan];
          newList.forEach(n => {
            const idx = merged.findIndex(m => m.id_catatan === n.id_catatan);
            if (idx > -1) merged[idx] = n;
            else merged.push(n);
          });
          onUpdatePerkembangan(merged);
          showStatus(`Catatan Akademik digabungkan! Total: ${merged.length} entri.`, false);
        }
      },
      perkembangan.length,
      handleExportPerkembangan
    );
  };

  const handleImportPerilaku = () => {
    const cols = ['id_catatan', 'tanggal', 'id_siswa', 'nama_guru', 'mata_pelajaran', 'jenis_perilaku', 'deskripsi_perilaku', 'tindak_lanjut'];
    importData(
      'perilaku',
      'Catatan_Perilaku',
      cols,
      (rows) => {
        const newList: CatatanPerilaku[] = rows
          .map((r, idx) => ({
            id_catatan: r[0] || `perilaku_${Date.now()}_${idx}`,
            tanggal: r[1] || new Date().toISOString().substring(0, 10),
            id_siswa: r[2] || '',
            nama_guru: r[3] || 'Guru',
            mata_pelajaran: r[4] || 'Umum',
            jenis_perilaku: (r[5] as any) || 'Positif',
            deskripsi_perilaku: r[6] || '-',
            tindak_lanjut: r[7] || '-'
          }))
          .filter(p => p.deskripsi_perilaku && p.deskripsi_perilaku !== '-');

        if (newList.length === 0) {
          showStatus(`Tidak ada Catatan Adab valid yang dapat diimpor dari Google Sheets.`, true);
          return;
        }

        const decision = window.confirm(`Berhasil membaca ${newList.length} Catatan Adab. Tekan OK untuk MENIMPA data lokal, atau CANCEL untuk MENGGABUNGKAN.`);
        if (decision) {
          onUpdatePerilaku(newList);
          showStatus(`Catatan Adab berhasil ditimpa!`, false);
        } else {
          const merged = [...perilaku];
          newList.forEach(n => {
            const idx = merged.findIndex(m => m.id_catatan === n.id_catatan);
            if (idx > -1) merged[idx] = n;
            else merged.push(n);
          });
          onUpdatePerilaku(merged);
          showStatus(`Catatan Adab digabungkan! Total: ${merged.length} entri.`, false);
        }
      },
      perilaku.length,
      handleExportPerilaku
    );
  };

  const handleImportHomeVisit = () => {
    const cols = ['id_kunjungan', 'tanggal', 'id_siswa', 'nama_guru', 'alasan_kunjungan', 'hasil_kunjungan', 'tindak_lanjut', 'foto_1', 'foto_2'];
    importData(
      'homeVisit',
      'Home_Visit',
      cols,
      (rows) => {
        const newList: HomeVisit[] = rows
          .map((r, idx) => ({
            id_kunjungan: r[0] || `visit_${Date.now()}_${idx}`,
            tanggal: r[1] || new Date().toISOString().substring(0, 10),
            id_siswa: r[2] || '',
            nama_guru: r[3] || 'Guru',
            alasan_kunjungan: r[4] || '-',
            hasil_kunjungan: r[5] || '-',
            tindak_lanjut: r[6] || '-',
            foto_1: r[7] || '',
            foto_2: r[8] || ''
          }))
          .filter(h => h.alasan_kunjungan && h.alasan_kunjungan !== '-');

        if (newList.length === 0) {
          showStatus(`Tidak ada Catatan Home Visit valid yang dapat diimpor dari Google Sheets.`, true);
          return;
        }

        const decision = window.confirm(`Berhasil membaca ${newList.length} Home Visit. Tekan OK untuk MENIMPA, atau CANCEL untuk MENGGABUNGKAN.`);
        if (decision) {
          onUpdateHomeVisit(newList);
          showStatus(`Catatan Home Visit berhasil ditimpa!`, false);
        } else {
          const merged = [...homeVisit];
          newList.forEach(n => {
            const idx = merged.findIndex(m => m.id_kunjungan === n.id_kunjungan);
            if (idx > -1) merged[idx] = n;
            else merged.push(n);
          });
          onUpdateHomeVisit(merged);
          showStatus(`Data Home Visit digabungkan!`, false);
        }
      },
      homeVisit.length,
      handleExportHomeVisit
    );
  };

  const handleImportUsers = () => {
    const cols = ['id_user', 'username', 'password', 'role', 'nama_lengkap', 'id_referensi', 'status'];
    importData(
      'users',
      'Users',
      cols,
      (rows) => {
        const newList: User[] = rows
          .map((r, idx) => ({
            id_user: r[0] || `usr_${Date.now()}_${idx}`,
            username: r[1],
            password: r[2] || '',
            role: (r[3] as any) || 'guru',
            nama_lengkap: r[4] || r[1],
            id_referensi: r[5] || '',
            status: (r[6] as any) || 'Aktif'
          }))
          .filter(u => u.username && u.username.trim() !== '');

        if (newList.length === 0) {
          showStatus(`Tidak ada data Pengguna valid yang dapat diimpor dari Google Sheets.`, true);
          return;
        }

        const decision = window.confirm(`Berhasil membaca ${newList.length} data Pengguna. Tekan OK untuk MENIMPA semua data lokal, atau CANCEL untuk MENGGABUNGKAN.`);
        if (decision) {
          onUpdateUsers(newList);
          showStatus(`Data Pengguna berhasil ditimpa!`, false);
        } else {
          const merged = [...users];
          newList.forEach(n => {
            const idx = merged.findIndex(m => m.id_user === n.id_user || m.username.toLowerCase() === n.username.toLowerCase());
            if (idx > -1) merged[idx] = n;
            else merged.push(n);
          });
          onUpdateUsers(merged);
          showStatus(`Data Pengguna digabungkan!`, false);
        }
      },
      users.length,
      handleExportUsers
    );
  };

  const handleImportSettings = () => {
    const cols = ['key', 'value'];
    importData(
      'settings',
      'Settings',
      cols,
      (rows) => {
        const newSettings = { ...settings };
        rows.forEach(r => {
          const key = r[0];
          const val = r[1];
          if (key === 'tahun_ajaran') newSettings.tahun_ajaran = val;
          if (key === 'batas_waktu_administrasi') newSettings.batas_waktu_administrasi = val;
          if (key === 'semester') {
            newSettings.semester = (val === 'Genap' ? 'Genap' : 'Ganjil') as 'Ganjil' | 'Genap';
          }
        });

        onUpdateSettings(newSettings);
        showStatus(`Pengaturan sistem berhasil diperbarui dari Google Sheets!`, false);
      },
      1,
      handleExportSettings
    );
  };

  const handleImportDokumentasi = () => {
    const cols = ['id_dokumentasi', 'tanggal', 'kelas', 'nama_kegiatan', 'foto', 'nama_guru'];
    importData(
      'dokumentasi',
      'Dokumentasi_Kelas',
      cols,
      (rows) => {
        const newList: Dokumentasi[] = rows
          .map((r, idx) => ({
            id_dokumentasi: r[0] || `doc_${Date.now()}_${idx}`,
            tanggal: r[1] || new Date().toISOString().substring(0, 10),
            kelas: r[2] || '7A',
            nama_kegiatan: r[3] || 'Kegiatan',
            foto: r[4] || '',
            nama_guru: r[5] || 'Guru'
          }))
          .filter(d => d.nama_kegiatan && d.nama_kegiatan.trim() !== '');

        if (newList.length === 0) {
          showStatus(`Tidak ada Dokumentasi Kelas valid yang dapat diimpor dari Google Sheets.`, true);
          return;
        }

        const decision = window.confirm(`Berhasil membaca ${newList.length} data Dokumentasi. Tekan OK untuk MENIMPA, atau CANCEL untuk MENGGABUNGKAN.`);
        if (decision) {
          onUpdateDokumentasi(newList);
          showStatus(`Dokumentasi Kelas berhasil ditimpa!`, false);
        } else {
          const merged = [...dokumentasi];
          newList.forEach(n => {
            const idx = merged.findIndex(m => m.id_dokumentasi === n.id_dokumentasi);
            if (idx > -1) merged[idx] = n;
            else merged.push(n);
          });
          onUpdateDokumentasi(merged);
          showStatus(`Data Dokumentasi digabungkan!`, false);
        }
      },
      dokumentasi.length,
      handleExportDokumentasi
    );
  };

  const handleImportAdministrasi = () => {
    const cols = ['id_file', 'tanggal', 'nama_guru', 'nama_file', 'jenis_file', 'url_file'];
    importData(
      'administrasi',
      'Administrasi_Guru',
      cols,
      (rows) => {
        const newList: Administrasi[] = rows
          .map((r, idx) => ({
            id_file: r[0] || `file_${Date.now()}_${idx}`,
            tanggal: r[1] || new Date().toISOString().substring(0, 10),
            nama_guru: r[2] || 'Guru',
            nama_file: r[3] || 'File',
            jenis_file: (r[4] as any) || 'pdf',
            url_file: r[5] || ''
          }))
          .filter(a => a.nama_file && a.nama_file.trim() !== '');

        if (newList.length === 0) {
          showStatus(`Tidak ada file Administrasi valid yang dapat diimpor dari Google Sheets.`, true);
          return;
        }

        const decision = window.confirm(`Berhasil membaca ${newList.length} file Administrasi. Tekan OK untuk MENIMPA, atau CANCEL untuk MENGGABUNGKAN.`);
        if (decision) {
          onUpdateAdministrasi(newList);
          showStatus(`Administrasi Guru berhasil ditimpa!`, false);
        } else {
          const merged = [...administrasi];
          newList.forEach(n => {
            const idx = merged.findIndex(m => m.id_file === n.id_file);
            if (idx > -1) merged[idx] = n;
            else merged.push(n);
          });
          onUpdateAdministrasi(merged);
          showStatus(`Data Administrasi digabungkan!`, false);
        }
      },
      administrasi.length,
      handleExportAdministrasi
    );
  };

  const handleImportJadwal = () => {
    const cols = ['id_jadwal', 'nama_guru', 'hari', 'jam_ke', 'mata_pelajaran', 'kelas', 'status_reminder'];
    importData(
      'jadwal',
      'Jadwal_Guru',
      cols,
      (rows) => {
        const newList: Jadwal[] = rows
          .map((r, idx) => ({
            id_jadwal: r[0] || `jdw_${Date.now()}_${idx}`,
            nama_guru: r[1] || 'Guru',
            hari: r[2] || 'Senin',
            jam_ke: r[3] || '1',
            mata_pelajaran: r[4] || 'Mapel',
            kelas: r[5] || '7A',
            status_reminder: (r[6] as any) || 'Aktif'
          }))
          .filter(j => j.nama_guru && j.mata_pelajaran);

        if (newList.length === 0) {
          showStatus(`Tidak ada Jadwal Guru valid yang dapat diimpor dari Google Sheets.`, true);
          return;
        }

        const decision = window.confirm(`Berhasil membaca ${newList.length} entri Jadwal Guru. Tekan OK untuk MENIMPA, atau CANCEL untuk MENGGABUNGKAN.`);
        if (decision) {
          onUpdateJadwal(newList);
          showStatus(`Jadwal Guru berhasil ditimpa!`, false);
        } else {
          const merged = [...jadwal];
          newList.forEach(n => {
            const idx = merged.findIndex(m => m.id_jadwal === n.id_jadwal);
            if (idx > -1) merged[idx] = n;
            else merged.push(n);
          });
          onUpdateJadwal(merged);
          showStatus(`Jadwal Guru digabungkan!`, false);
        }
      },
      jadwal.length,
      handleExportJadwal
    );
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto">
      {/* Header Panel */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 rounded-[2rem] p-6 sm:p-10 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/10 rounded-full blur-2xl -ml-20 -mb-20"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="bg-emerald-500/20 text-emerald-100 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest inline-flex items-center gap-1.5 border border-emerald-400/20">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-300" />
              GOOGLE CLOUD INTEGRATION
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-none text-white">
              Integrasi Google Sheets
            </h1>
            <p className="text-sm font-medium text-emerald-100 max-w-2xl">
              Hubungkan database madrasah Anda langsung dengan Google Sheets untuk melakukan backup data berkala, batch-import siswa, maupun rekap laporan guru secara instan.
            </p>
          </div>
          
          <div>
            {!googleUser ? (
              <button
                onClick={handleLogin}
                disabled={isLoggingIn}
                className="gsi-material-button bg-white hover:bg-slate-50 text-slate-800 font-bold px-6 py-3.5 rounded-2xl shadow-md border border-slate-200 transition flex items-center gap-3 active:scale-98 cursor-pointer disabled:opacity-50"
              >
                <LogIn className="w-5 h-5 text-emerald-600" />
                <span>{isLoggingIn ? 'Menghubungkan...' : 'Hubungkan Akun Google'}</span>
              </button>
            ) : (
              <div className="bg-white/10 backdrop-blur-md border border-white/15 p-4 rounded-3xl flex items-center gap-4">
                {googleUser.photoURL ? (
                  <img src={googleUser.photoURL} alt="Google Profile" className="w-10 h-10 rounded-full border-2 border-emerald-400 shrink-0" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black">
                    {googleUser.displayName?.charAt(0) || 'G'}
                  </div>
                )}
                <div className="text-left">
                  <p className="text-xs font-black text-white leading-tight">{googleUser.displayName}</p>
                  <p className="text-[10px] text-emerald-100/80 leading-none mt-1 font-mono">{googleUser.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-red-500/20 hover:bg-red-500 text-red-100 hover:text-white p-2.5 rounded-xl transition cursor-pointer"
                  title="Putuskan Koneksi"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Connection warning or status message */}
      {statusMessage && (
        <div className={`p-4 sm:p-5 rounded-2xl border flex items-start gap-3.5 animate-bounce ${statusMessage.isError ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
          {statusMessage.isError ? <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" /> : <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
          <div className="text-xs font-bold leading-relaxed whitespace-pre-line">{statusMessage.text}</div>
        </div>
      )}

      {/* Spreadsheet Setup Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Spreadsheet ID Configuration */}
        <div className="bg-white rounded-[2rem] p-6 sm:p-8 border border-slate-200/50 shadow-xs space-y-6 lg:col-span-1">
          <div>
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
              <Settings className="w-5 h-5 text-emerald-600" />
              Setelan Spreadsheet
            </h3>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-1">
              Hubungkan ke file spreadsheet target
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
                ID atau Link Google Spreadsheet
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Paste ID atau URL Spreadsheet disini..."
                  value={spreadsheetId}
                  onChange={(e) => setSpreadsheetId(e.target.value)}
                  disabled={!googleUser}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-xl px-3 py-3 text-xs font-mono font-bold text-slate-700 transition outline-none disabled:opacity-50"
                />
                <Link2 className="absolute right-3 top-3.5 w-4 h-4 text-slate-400" />
              </div>
            </div>

            <button
              onClick={() => saveSpreadsheetId(spreadsheetId)}
              disabled={!googleUser || !spreadsheetId}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-xs py-3 rounded-xl transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-xs"
            >
              Simpan ID Spreadsheet
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-100"></div>
              <span className="flex-shrink mx-4 text-[10px] text-slate-400 font-black uppercase tracking-wider">ATAU</span>
              <div className="flex-grow border-t border-slate-100"></div>
            </div>

            <button
              onClick={handleCreateNewSpreadsheet}
              disabled={!googleUser || isSyncing.create}
              className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-black text-xs py-3 rounded-xl transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSyncing.create ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <PlusCircle className="w-4 h-4" />
              )}
              Buat Spreadsheet Baru di Drive
            </button>

            {/* Diagnostic Connection Tool */}
            <div className="pt-2">
              <button
                onClick={runConnectionDiagnostics}
                disabled={isDiagnosing}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs py-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 border border-slate-200/60"
              >
                {isDiagnosing ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-600" />
                ) : (
                  <span className="text-sm">🛠️</span>
                )}
                <span>{isDiagnosing ? 'Sedang Mendiagnosis...' : 'Uji Koneksi & Diagnostik'}</span>
              </button>
            </div>

            {showDiagnostics && (
              <div className="bg-slate-900 text-slate-100 rounded-2xl p-4 border border-slate-800 space-y-4 text-left shadow-lg overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500 animate-pulse font-mono text-xs">●</span>
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-300">Hasil Diagnostik Google Sheets</h4>
                  </div>
                  <button 
                    onClick={() => setShowDiagnostics(false)}
                    className="text-slate-400 hover:text-white text-[10px] font-bold font-mono"
                  >
                    Tutup
                  </button>
                </div>
                
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {diagnosticSteps.map((step) => (
                    <div key={step.id} className="border-b border-slate-800/60 pb-3 last:border-none last:pb-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-bold text-slate-200">{step.name}</p>
                          <p className={`text-[10px] font-medium leading-tight ${
                            step.status === 'success' ? 'text-emerald-400 font-semibold' : 
                            step.status === 'error' ? 'text-red-400 font-bold' : 
                            step.status === 'warning' ? 'text-amber-400 font-semibold' : 
                            step.status === 'running' ? 'text-blue-400 animate-pulse' : 'text-slate-500'
                          }`}>
                            {step.status === 'success' && '✓ '}{step.status === 'error' && '✗ '}{step.status === 'warning' && '⚠ '}{step.message}
                          </p>
                        </div>
                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-sm ${
                          step.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' :
                          step.status === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          step.status === 'warning' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                          step.status === 'running' ? 'bg-blue-500/10 text-blue-400 animate-pulse' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {step.status}
                        </span>
                      </div>
                      {step.details && (
                        <pre className="mt-1.5 bg-black/60 p-2 rounded-lg text-[9px] font-mono text-slate-300 whitespace-pre-wrap break-all leading-normal border border-slate-800/40 max-h-36 overflow-y-auto">
                          {step.details}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="bg-slate-850/60 p-2.5 rounded-xl text-[9px] text-slate-400 leading-normal border border-slate-800/40">
                  ⚠️ <strong>Info Teknis:</strong> Jika Anda mendapatkan <strong>403 Forbidden</strong> pada uji akses baca/tulis, ini berarti akun Google Anda tidak memiliki izin akses ke file ini, atau Anda mencoba mengekspor ke file milik bersama. Klik <strong>"Buat Spreadsheet Baru"</strong> di atas untuk membuat file pribadi Anda sendiri.
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3.5 text-xs text-slate-600 font-medium">
            <div className="flex gap-2 items-start">
              <HelpIcon className="w-4 h-4 text-slate-400 shrink-0" />
              <p className="font-bold text-slate-700">Panduan Sinkronisasi:</p>
            </div>
            <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-500 font-bold leading-relaxed">
              <li>Pastikan akun Google Anda memiliki akses edit ke spreadsheet.</li>
              <li>Sistem akan membuat Tab otomatis: <strong>Siswa</strong>, <strong>Jurnal</strong>, <strong>Perkembangan</strong>, <strong>Periaku</strong>, dan <strong>Home Visit</strong>.</li>
              <li>Format Header kolom harus tetap asli agar proses impor tidak gagal.</li>
            </ul>
          </div>
        </div>

        {/* Right Column: Sync Center & Action Grid */}
        <div className="bg-white rounded-[2rem] p-6 sm:p-8 border border-slate-200/50 shadow-xs lg:col-span-2 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                Pusat Sinkronisasi Data (Export/Import)
              </h3>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                Kirim data ke Sheets atau Muat kembali data dari Sheets
              </p>
            </div>

            <button
              onClick={handleExportAll}
              disabled={!googleUser || !spreadsheetId || isSyncing.all}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-black text-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-xs shrink-0 self-start sm:self-auto"
            >
              {isSyncing.all ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Ekspor Semua Tab Sekaligus
            </button>
          </div>

          {!googleUser ? (
            <div className="p-10 text-center border-2 border-dashed border-slate-200 rounded-3xl space-y-4 flex flex-col items-center">
              <span className="text-4xl text-slate-300">🔒</span>
              <p className="text-xs font-black text-slate-500 uppercase tracking-wider leading-relaxed max-w-sm">
                Hubungkan Akun Google Terlebih Dahulu Untuk Memulai Sinkronisasi Google Sheets
              </p>
              <button
                onClick={handleLogin}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition"
              >
                Aktifkan Integrasi
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Spreadsheet Status Box */}
              <div className="bg-slate-50/50 rounded-2xl p-4 sm:p-5 border border-slate-200/60 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div className="space-y-1 text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black text-slate-700 uppercase tracking-wider">File Terhubung:</span>
                    {spreadsheetId === '14NHsOMokx_ngS-SlrRAXQkGGiBSQbXnO2AD9Tzj9gow' ? (
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Template Default (Hanya Baca)
                      </span>
                    ) : (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Spreadsheet Pribadi (Baca & Tulis)
                      </span>
                    )}
                  </div>
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-mono font-bold text-emerald-600 hover:text-emerald-700 underline break-all flex items-center gap-1 mt-1"
                  >
                    <span>https://docs.google.com/spreadsheets/d/{spreadsheetId}</span>
                    <Link2 className="w-3 h-3 shrink-0" />
                  </a>
                </div>
                
                {spreadsheetId === '14NHsOMokx_ngS-SlrRAXQkGGiBSQbXnO2AD9Tzj9gow' && (
                  <div className="bg-amber-500/10 text-amber-800 border border-amber-200/40 p-3 rounded-xl text-[10px] font-bold leading-normal max-w-md text-left">
                    💡 <strong>Pemberitahuan:</strong> Spreadsheet di atas adalah milik bersama / template demo. Akun Google Anda tidak memiliki akses untuk <strong>Ekspor (menulis)</strong> ke file ini. Silakan klik tombol <strong>"Buat Spreadsheet Baru"</strong> di sebelah kiri untuk menyalin ke Google Drive Anda sendiri agar bisa bebas melakukan ekspor-impor!
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Card 1: Users */}
              <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50/20 hover:border-emerald-200 hover:bg-emerald-50/5 transition space-y-4 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div className="flex gap-3 items-center">
                    <span className="bg-slate-100 p-2 rounded-lg text-slate-700">
                      <Users className="w-4 h-4" />
                    </span>
                    <div className="text-left">
                      <p className="text-xs font-black text-slate-800">Daftar Pengguna / Users</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tab: Users • {users.length} data</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleExportUsers}
                    disabled={isSyncing.users}
                    className="bg-white border border-slate-200 hover:bg-slate-50 font-black text-[10px] py-2 rounded-lg text-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isSyncing.users ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3 text-emerald-600" />}
                    Ekspor
                  </button>
                  <button
                    onClick={handleImportUsers}
                    disabled={isSyncing.import_users}
                    className="bg-slate-900 text-white hover:bg-slate-800 font-black text-[10px] py-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isSyncing.import_users ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3 text-emerald-400" />}
                    Impor
                  </button>
                </div>
              </div>

              {/* Card 2: Siswa */}
              <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50/20 hover:border-emerald-200 hover:bg-emerald-50/5 transition space-y-4 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div className="flex gap-3 items-center">
                    <span className="bg-slate-100 p-2 rounded-lg text-slate-700">
                      <Users className="w-4 h-4" />
                    </span>
                    <div className="text-left">
                      <p className="text-xs font-black text-slate-800">Daftar Santri / Siswa</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tab: Siswa • {siswa.length} data</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleExportSiswa}
                    disabled={isSyncing.siswa}
                    className="bg-white border border-slate-200 hover:bg-slate-50 font-black text-[10px] py-2 rounded-lg text-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isSyncing.siswa ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3 text-emerald-600" />}
                    Ekspor
                  </button>
                  <button
                    onClick={handleImportSiswa}
                    disabled={isSyncing.import_siswa}
                    className="bg-slate-900 text-white hover:bg-slate-800 font-black text-[10px] py-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isSyncing.import_siswa ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3 text-emerald-400" />}
                    Impor
                  </button>
                </div>
              </div>

              {/* Card 3: Settings */}
              <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50/20 hover:border-emerald-200 hover:bg-emerald-50/5 transition space-y-4 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div className="flex gap-3 items-center">
                    <span className="bg-slate-100 p-2 rounded-lg text-slate-700">
                      <Settings className="w-4 h-4" />
                    </span>
                    <div className="text-left">
                      <p className="text-xs font-black text-slate-800">Setelan Sistem / Settings</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tab: Settings • Konfigurasi Aktif</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleExportSettings}
                    disabled={isSyncing.settings}
                    className="bg-white border border-slate-200 hover:bg-slate-50 font-black text-[10px] py-2 rounded-lg text-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isSyncing.settings ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3 text-emerald-600" />}
                    Ekspor
                  </button>
                  <button
                    onClick={handleImportSettings}
                    disabled={isSyncing.import_settings}
                    className="bg-slate-900 text-white hover:bg-slate-800 font-black text-[10px] py-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isSyncing.import_settings ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3 text-emerald-400" />}
                    Impor
                  </button>
                </div>
              </div>

              {/* Card 4: Catatan Perkembangan */}
              <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50/20 hover:border-emerald-200 hover:bg-emerald-50/5 transition space-y-4 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div className="flex gap-3 items-center">
                    <span className="bg-slate-100 p-2 rounded-lg text-slate-700">
                      <Award className="w-4 h-4" />
                    </span>
                    <div className="text-left">
                      <p className="text-xs font-black text-slate-800">Evaluasi Akademik (Perkembangan)</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tab: Catatan_Perkembangan • {perkembangan.length} data</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleExportPerkembangan}
                    disabled={isSyncing.perkembangan}
                    className="bg-white border border-slate-200 hover:bg-slate-50 font-black text-[10px] py-2 rounded-lg text-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isSyncing.perkembangan ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3 text-emerald-600" />}
                    Ekspor
                  </button>
                  <button
                    onClick={handleImportPerkembangan}
                    disabled={isSyncing.import_perkembangan}
                    className="bg-slate-900 text-white hover:bg-slate-800 font-black text-[10px] py-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isSyncing.import_perkembangan ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3 text-emerald-400" />}
                    Impor
                  </button>
                </div>
              </div>

              {/* Card 5: Catatan Perilaku */}
              <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50/20 hover:border-emerald-200 hover:bg-emerald-50/5 transition space-y-4 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div className="flex gap-3 items-center">
                    <span className="bg-slate-100 p-2 rounded-lg text-slate-700">
                      <Smile className="w-4 h-4" />
                    </span>
                    <div className="text-left">
                      <p className="text-xs font-black text-slate-800">Catatan Adab &amp; Perilaku</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tab: Catatan_Perilaku • {perilaku.length} data</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleExportPerilaku}
                    disabled={isSyncing.perilaku}
                    className="bg-white border border-slate-200 hover:bg-slate-50 font-black text-[10px] py-2 rounded-lg text-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isSyncing.perilaku ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3 text-emerald-600" />}
                    Ekspor
                  </button>
                  <button
                    onClick={handleImportPerilaku}
                    disabled={isSyncing.import_perilaku}
                    className="bg-slate-900 text-white hover:bg-slate-800 font-black text-[10px] py-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isSyncing.import_perilaku ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3 text-emerald-400" />}
                    Impor
                  </button>
                </div>
              </div>

              {/* Card 6: Jurnal Guru */}
              <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50/20 hover:border-emerald-200 hover:bg-emerald-50/5 transition space-y-4 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div className="flex gap-3 items-center">
                    <span className="bg-slate-100 p-2 rounded-lg text-slate-700">
                      <BookOpen className="w-4 h-4" />
                    </span>
                    <div className="text-left">
                      <p className="text-xs font-black text-slate-800">Jurnal Pembelajaran Guru</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tab: Jurnal_Guru • {jurnal.length} data</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleExportJurnal}
                    disabled={isSyncing.jurnal}
                    className="bg-white border border-slate-200 hover:bg-slate-50 font-black text-[10px] py-2 rounded-lg text-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isSyncing.jurnal ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3 text-emerald-600" />}
                    Ekspor
                  </button>
                  <button
                    onClick={handleImportJurnal}
                    disabled={isSyncing.import_jurnal}
                    className="bg-slate-900 text-white hover:bg-slate-800 font-black text-[10px] py-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isSyncing.import_jurnal ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3 text-emerald-400" />}
                    Impor
                  </button>
                </div>
              </div>

              {/* Card 7: Home Visit */}
              <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50/20 hover:border-emerald-200 hover:bg-emerald-50/5 transition space-y-4 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div className="flex gap-3 items-center">
                    <span className="bg-slate-100 p-2 rounded-lg text-slate-700">
                      <Home className="w-4 h-4" />
                    </span>
                    <div className="text-left">
                      <p className="text-xs font-black text-slate-800">Kunjungan Rumah / Home Visit</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tab: Home_Visit • {homeVisit.length} data</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleExportHomeVisit}
                    disabled={isSyncing.homeVisit}
                    className="bg-white border border-slate-200 hover:bg-slate-50 font-black text-[10px] py-2 rounded-lg text-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isSyncing.homeVisit ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3 text-emerald-600" />}
                    Ekspor
                  </button>
                  <button
                    onClick={handleImportHomeVisit}
                    disabled={isSyncing.import_homeVisit}
                    className="bg-slate-900 text-white hover:bg-slate-800 font-black text-[10px] py-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isSyncing.import_homeVisit ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3 text-emerald-400" />}
                    Impor
                  </button>
                </div>
              </div>

              {/* Card 8: Dokumentasi Kelas */}
              <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50/20 hover:border-emerald-200 hover:bg-emerald-50/5 transition space-y-4 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div className="flex gap-3 items-center">
                    <span className="bg-slate-100 p-2 rounded-lg text-slate-700">
                      <Camera className="w-4 h-4" />
                    </span>
                    <div className="text-left">
                      <p className="text-xs font-black text-slate-800">Dokumentasi Kelas &amp; Kegiatan</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tab: Dokumentasi_Kelas • {dokumentasi.length} data</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleExportDokumentasi}
                    disabled={isSyncing.dokumentasi}
                    className="bg-white border border-slate-200 hover:bg-slate-50 font-black text-[10px] py-2 rounded-lg text-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isSyncing.dokumentasi ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3 text-emerald-600" />}
                    Ekspor
                  </button>
                  <button
                    onClick={handleImportDokumentasi}
                    disabled={isSyncing.import_dokumentasi}
                    className="bg-slate-900 text-white hover:bg-slate-800 font-black text-[10px] py-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isSyncing.import_dokumentasi ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3 text-emerald-400" />}
                    Impor
                  </button>
                </div>
              </div>

              {/* Card 9: Administrasi Guru */}
              <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50/20 hover:border-emerald-200 hover:bg-emerald-50/5 transition space-y-4 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div className="flex gap-3 items-center">
                    <span className="bg-slate-100 p-2 rounded-lg text-slate-700">
                      <FileText className="w-4 h-4" />
                    </span>
                    <div className="text-left">
                      <p className="text-xs font-black text-slate-800">Administrasi &amp; Perangkat Guru</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tab: Administrasi_Guru • {administrasi.length} data</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleExportAdministrasi}
                    disabled={isSyncing.administrasi}
                    className="bg-white border border-slate-200 hover:bg-slate-50 font-black text-[10px] py-2 rounded-lg text-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isSyncing.administrasi ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3 text-emerald-600" />}
                    Ekspor
                  </button>
                  <button
                    onClick={handleImportAdministrasi}
                    disabled={isSyncing.import_administrasi}
                    className="bg-slate-900 text-white hover:bg-slate-800 font-black text-[10px] py-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isSyncing.import_administrasi ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3 text-emerald-400" />}
                    Impor
                  </button>
                </div>
              </div>

              {/* Card 10: Jadwal Guru */}
              <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50/20 hover:border-emerald-200 hover:bg-emerald-50/5 transition space-y-4 flex flex-col justify-between md:col-span-2">
                <div className="flex justify-between items-start">
                  <div className="flex gap-3 items-center">
                    <span className="bg-slate-100 p-2 rounded-lg text-slate-700">
                      <Calendar className="w-4 h-4" />
                    </span>
                    <div className="text-left">
                      <p className="text-xs font-black text-slate-800">Jadwal &amp; Reminder Mengajar</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tab: Jadwal_Guru • {jadwal.length} data</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleExportJadwal}
                    disabled={isSyncing.jadwal}
                    className="bg-white border border-slate-200 hover:bg-slate-50 font-black text-[10px] py-2 rounded-lg text-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isSyncing.jadwal ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3 text-emerald-600" />}
                    Ekspor Jadwal
                  </button>
                  <button
                    onClick={handleImportJadwal}
                    disabled={isSyncing.import_jadwal}
                    className="bg-slate-900 text-white hover:bg-slate-800 font-black text-[10px] py-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isSyncing.import_jadwal ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3 text-emerald-400" />}
                    Impor Jadwal
                  </button>
                </div>
              </div>

            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
};
