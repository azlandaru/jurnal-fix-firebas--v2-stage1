import React, { useState } from 'react';
import { Jurnal, User, Siswa, Jadwal, getTeacherClasses } from '../types';
import { Search, Plus, Trash2, Camera, Download, FileText, CheckCircle2, AlertTriangle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { generateJurnalPDF, formatDateID } from '../utils/pdfGenerator';
import { LazyImage } from './LazyImage';

const getTodayString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getIndonesianDayName = (dateStr: string): string => {
  if (!dateStr) return '';
  const days = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const date = new Date(dateStr);
  const dayIndex = date.getDay();
  return days[dayIndex];
};

const getHourKeys = (jamKeStr: string): string[] => {
  if (!jamKeStr) return [];
  const parts = jamKeStr.split(',').map(p => p.trim());
  const hours: string[] = [];
  parts.forEach(part => {
    const match = part.match(/^(\d+)/);
    if (match) {
      hours.push(match[1]);
    }
  });
  return hours;
};

const getJurnalConflicts = (
  selectedDate: string,
  selKelas: string,
  selJamKe: string[],
  teacherName: string,
  allJadwal: Jadwal[]
) => {
  const day = getIndonesianDayName(selectedDate);
  const conflicts: { type: 'guru' | 'kelas'; msg: string; offending: Jadwal }[] = [];

  allJadwal.forEach(j => {
    if (j.hari !== day) return;
    const jHours = getHourKeys(j.jam_ke);
    const overlap = selJamKe.filter(h => jHours.includes(h));

    if (overlap.length > 0) {
      if (j.nama_guru === teacherName && j.kelas !== selKelas) {
        conflicts.push({
          type: 'guru',
          msg: `Anda terplot mengajar di Kelas ${j.kelas} (Mapel: ${j.mata_pelajaran}) pada Jam Ke-${overlap.join(', ')}`,
          offending: j
        });
      }
      if (j.kelas === selKelas && j.nama_guru !== teacherName) {
        conflicts.push({
          type: 'kelas',
          msg: `Kelas ${selKelas} sedang dijadwalkan untuk ${j.nama_guru} (Mapel: ${j.mata_pelajaran}) pada Jam Ke-${overlap.join(', ')}`,
          offending: j
        });
      }
    }
  });

  return conflicts;
};

const getAvailableHoursForJurnal = (
  selectedDate: string,
  selKelas: string,
  teacherName: string,
  allJadwal: Jadwal[]
): string[] => {
  const day = getIndonesianDayName(selectedDate);
  const teacherBusy: string[] = [];
  const classBusy: string[] = [];

  allJadwal.forEach(j => {
    if (j.hari !== day) return;
    const jHours = getHourKeys(j.jam_ke);
    if (j.nama_guru === teacherName) {
      teacherBusy.push(...jHours);
    }
    if (j.kelas === selKelas) {
      classBusy.push(...jHours);
    }
  });

  const allHours = ['1', '2', '3', '4', '5', '6', '7', '8'];
  return allHours.filter(h => !teacherBusy.includes(h) && !classBusy.includes(h));
};

const parseSiswaStringToArray = (str: string): string[] => {
  if (!str || str === '-') return [];
  // check if it is of form "X (Name1, Name2, ...)"
  const m = str.match(/^\d+\s*\((.*?)\)/);
  if (m && m[1]) {
    return m[1].split(',').map(x => x.trim()).filter(x => x);
  }
  // otherwise, just split by comma
  return str.split(',').map(x => x.trim()).filter(x => x);
};

const JAM_TIMINGS: Record<string, string> = {
  '1': '07.30 - 08.10',
  '2': '08.10 - 08.50',
  '3': '08.50 - 09.30',
  '4': '10.00 - 10.40',
  '5': '10.40 - 11.20',
  '6': '11.20 - 12.00',
  '7': '13.15 - 13.55',
  '8': '13.55 - 14.35'
};

const compileJamKeRange = (start: string, end: string): string => {
  const startNum = parseInt(start, 10);
  const endNum = parseInt(end, 10);
  if (isNaN(startNum) || isNaN(endNum)) return start;

  const actualStart = Math.min(startNum, endNum);
  const actualEnd = Math.max(startNum, endNum);

  const rangeSegments: string[] = [];
  for (let i = actualStart; i <= actualEnd; i++) {
    const key = i.toString();
    if (JAM_TIMINGS[key]) {
      rangeSegments.push(`${key} (${JAM_TIMINGS[key]})`);
    } else {
      rangeSegments.push(key);
    }
  }
  return rangeSegments.join(', ');
};

const parseJamKeRange = (str: string): { start: string; end: string } => {
  if (!str) return { start: '1', end: '1' };
  const matches = str.match(/\d+/g);
  if (matches && matches.length > 0) {
    const start = matches[0];
    const parts = str.split(',').map(x => x.trim()).filter(x => x);
    if (parts.length > 1) {
      const lastPartMatches = parts[parts.length - 1].match(/\d+/);
      if (lastPartMatches) {
        return { start, end: lastPartMatches[0] };
      }
    }
    return { start, end: start };
  }
  return { start: '1', end: '1' };
};

interface JurnalMenuProps {
  user: User;
  siswa: Siswa[];
  jurnal: Jurnal[];
  jadwal?: Jadwal[];
  onEditJadwal?: (j: Jadwal) => Promise<void>;
  onDeleteJurnal: (id: string) => Promise<void>;
  onAddJurnal: (j: Jurnal) => Promise<void>;
  onEditJurnal: (j: Jurnal) => Promise<void>;
}

export const JurnalMenu: React.FC<JurnalMenuProps> = ({
  user,
  siswa,
  jurnal,
  jadwal = [],
  onEditJadwal,
  onDeleteJurnal,
  onAddJurnal,
  onEditJurnal
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [savedJurnalTitle, setSavedJurnalTitle] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const getClassPresenceStats = (selectedKelas: string) => {
    if (!selectedKelas) return null;
    const studentsInClass = siswa.filter(s => s.kelas === selectedKelas && !s.kelas.includes('Lulus') && !s.kelas.includes('Alumni'));
    const classJournals = jurnal.filter(j => j.kelas === selectedKelas);
    
    let totalSakit = 0;
    let totalIzin = 0;
    let totalAlpa = 0;

    classJournals.forEach(j => {
      const sakitList = parseSiswaStringToArray(j.siswa_sakit);
      const izinList = parseSiswaStringToArray(j.siswa_izin);
      const alpaList = parseSiswaStringToArray(j.siswa_alpa);

      studentsInClass.forEach(s => {
        if (sakitList.includes(s.nama_siswa)) totalSakit++;
        if (izinList.includes(s.nama_siswa)) totalIzin++;
        if (alpaList.includes(s.nama_siswa)) totalAlpa++;
      });
    });

    const totalSiswa = studentsInClass.length;
    const totalSesi = classJournals.length;
    const totalPossible = totalSiswa * totalSesi;
    const totalAbsen = totalSakit + totalIzin + totalAlpa;
    const presenceRate = totalPossible > 0 ? ((totalPossible - totalAbsen) / totalPossible) * 100 : 100;

    // Get top absent students
    const studentAbsenceList = studentsInClass.map(s => {
      let sSakit = 0;
      let sIzin = 0;
      let sAlpa = 0;
      classJournals.forEach(j => {
        if (parseSiswaStringToArray(j.siswa_sakit).includes(s.nama_siswa)) sSakit++;
        if (parseSiswaStringToArray(j.siswa_izin).includes(s.nama_siswa)) sIzin++;
        if (parseSiswaStringToArray(j.siswa_alpa).includes(s.nama_siswa)) sAlpa++;
      });
      return {
        nama: s.nama_siswa,
        sakit: sSakit,
        izin: sIzin,
        alpa: sAlpa,
        totalAbsen: sSakit + sIzin + sAlpa
      };
    }).filter(st => st.totalAbsen > 0)
      .sort((a, b) => b.totalAbsen - a.totalAbsen);

    return {
      totalSiswa,
      totalSesi,
      totalSakit,
      totalIzin,
      totalAlpa,
      presenceRate: Math.round(presenceRate * 10) / 10,
      studentAbsenceList
    };
  };

  // Form states mapped from database
  const [tanggal, setTanggal] = useState(getTodayString());
  const [kelas, setKelas] = useState('');
  const [jamKe, setJamKe] = useState('');
  const [jamKeMulai, setJamKeMulai] = useState('1');
  const [jamKeSelesai, setJamKeSelesai] = useState('1');
  const [selectedJamKe, setSelectedJamKe] = useState<string[]>(['1']);
  const [isCustomJam, setIsCustomJam] = useState(false);
  const [customJamMulai, setCustomJamMulai] = useState('07:30');
  const [customJamSelesai, setCustomJamSelesai] = useState('08:50');
  const [mapel, setMapel] = useState('');
  const [indikatorPembelajaran, setIndikatorPembelajaran] = useState('');
  const [materiAjar, setMateriAjar] = useState('');
  const [uraianPembelajaran, setUraianPembelajaran] = useState('');
  const [siswaSakit, setSiswaSakit] = useState<string[]>([]);
  const [siswaIzin, setSiswaIzin] = useState<string[]>([]);
  const [siswaAlpa, setSiswaAlpa] = useState<string[]>([]);
  const [catatan, setCatatan] = useState('');
  const [foto1, setFoto1] = useState<string>('');
  const [foto2, setFoto2] = useState<string>('');
  const [fotoKehadiran, setFotoKehadiran] = useState<string>('');
  const [lightbox, setLightbox] = useState<{ url: string; title: string } | null>(null);

  // Camera Modal States
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [activeCameraField, setActiveCameraField] = useState<1 | 2 | 3>(1);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  const isReadOnly = user.role === 'pengawas';

  const getAuthorizedClasses = () => {
    const activeClasses = [...new Set(siswa.filter(s => s.kelas && !s.kelas.includes('Lulus') && !s.kelas.includes('Alumni')).map(s => s.kelas))].filter(Boolean).sort();
    if (['admin', 'pengawas'].includes(user.role)) {
      return activeClasses;
    }
    if (['guru', 'wali_kelas'].includes(user.role)) {
      const teacherClasses = getTeacherClasses(user);
      const res = teacherClasses.filter(k => activeClasses.includes(k)).sort();
      if (res.length > 0) return res;
      return teacherClasses;
    }
    return activeClasses;
  };

  const authClasses = getAuthorizedClasses();

  const modalConflicts = (tanggal && kelas && selectedJamKe.length > 0 && user.nama_lengkap)
    ? getJurnalConflicts(tanggal, kelas, selectedJamKe, user.nama_lengkap, jadwal)
    : [];

  const modalSuggestions = (tanggal && kelas && user.nama_lengkap)
    ? getAvailableHoursForJurnal(tanggal, kelas, user.nama_lengkap, jadwal)
    : [];

  const getTeacherMapelList = () => {
    if (user.id_referensi) {
      const m = user.id_referensi.split('|').find(x => x.startsWith('MAPEL:'));
      if (m) return m.replace('MAPEL:', '').split(',').map(x => x.trim()).filter(x => x);
    }
    return [];
  };

  const teacherMapelList = getTeacherMapelList();

  // Get today's schedules for quick-select
  const getTodaySchedules = () => {
    if (!tanggal) return [];
    const day = getIndonesianDayName(tanggal);
    return jadwal.filter(j => 
      j.hari.toLowerCase() === day.toLowerCase() && 
      (user.role === 'admin' || j.nama_guru === user.nama_lengkap)
    );
  };
  const todaySchedules = getTodaySchedules();

  // Auto-populate mapel and hours if a single unique schedule matches selected class and date
  React.useEffect(() => {
    if (editingId) return; // Don't auto-fill when editing existing journal
    if (!kelas || !tanggal) return;
    
    const day = getIndonesianDayName(tanggal);
    const matches = jadwal.filter(j => 
      j.hari.toLowerCase() === day.toLowerCase() &&
      j.kelas === kelas &&
      (user.role === 'admin' || j.nama_guru === user.nama_lengkap)
    );
    
    if (matches.length === 1) {
      const match = matches[0];
      setMapel(match.mata_pelajaran);
      const hours = getHourKeys(match.jam_ke);
      if (hours.length > 0) {
        setSelectedJamKe(hours);
        setJamKeMulai(hours[0]);
        setJamKeSelesai(hours[hours.length - 1] || hours[0]);
        setIsCustomJam(false);
      }
    }
  }, [kelas, tanggal, jadwal, user.nama_lengkap, editingId]);

  const getFilteredJurnal = () => {
    let list = jurnal || [];
    if (user.role !== 'admin' && user.role !== 'pengawas') {
      list = list.filter(j => authClasses.includes(j.kelas) || j.nama_guru === user.nama_lengkap);
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return list.filter(j =>
        j.kelas.toLowerCase().includes(q) ||
        j.mata_pelajaran.toLowerCase().includes(q) ||
        j.nama_guru.toLowerCase().includes(q) ||
        j.materi.toLowerCase().includes(q)
      );
    }
    return list;
  };

  const filteredJurnal = getFilteredJurnal();

  // Paginated Jurnal Logic
  const totalItems = filteredJurnal.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const safeCurrentPage = Math.min(currentPage, Math.max(1, totalPages));
  
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedJurnal = filteredJurnal.slice(startIndex, endIndex);

  const handleOpenAdd = () => {
    setEditingId(null);
    setTanggal(getTodayString());
    setKelas(authClasses[0] || '');
    setJamKe('1');
    setJamKeMulai('1');
    setJamKeSelesai('1');
    setSelectedJamKe(['1']);
    setIsCustomJam(false);
    setCustomJamMulai('07:30');
    setCustomJamSelesai('08:50');
    setMapel(teacherMapelList[0] || '');
    setIndikatorPembelajaran('');
    setMateriAjar('');
    setUraianPembelajaran('');
    setSiswaSakit([]);
    setSiswaIzin([]);
    setSiswaAlpa([]);
    setCatatan('');
    setFoto1('');
    setFoto2('');
    setFotoKehadiran('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (j: Jurnal) => {
    setEditingId(j.id_jurnal);
    setTanggal(j.tanggal.substring(0, 10));
    setKelas(j.kelas);
    setJamKe(j.jam_ke);
    
    // Check if it is a custom jam format e.g. "07:30 - 08:50" or doesn't have parenthesised timings
    const isCustom = !j.jam_ke.includes('(') && j.jam_ke.includes('-');
    setIsCustomJam(isCustom);
    if (isCustom) {
      const parts = j.jam_ke.split('-').map(x => x.trim());
      setCustomJamMulai(parts[0] || '07:30');
      setCustomJamSelesai(parts[1] || '08:50');
      setSelectedJamKe([]);
    } else {
      const range = parseJamKeRange(j.jam_ke);
      setJamKeMulai(range.start);
      setJamKeSelesai(range.end);

      const parts = j.jam_ke.split(',').map(x => x.trim());
      const selected = parts.map(p => p.split('(')[0].trim()).filter(p => JAM_TIMINGS[p]);
      setSelectedJamKe(selected.length > 0 ? selected : [range.start]);
    }
    setMapel(j.mata_pelajaran);

    // Parse materi
    const matVal = j.materi || '';
    let ajar = matVal;
    let indikator = '';
    if (matVal.includes('[Ajar]') && (matVal.includes('| [Murojaah]') || matVal.includes('| [Indikator]'))) {
      const splitToken = matVal.includes('| [Indikator]') ? '| [Indikator]' : '| [Murojaah]';
      const parts = matVal.split(splitToken);
      ajar = parts[0].replace('[Ajar] ', '').trim();
      indikator = parts[1]?.trim() || '';
    }
    setMateriAjar(ajar);
    setIndikatorPembelajaran(indikator);

    setUraianPembelajaran(j.uraian_pembelajaran || '');
    setSiswaSakit(parseSiswaStringToArray(j.siswa_sakit));
    setSiswaIzin(parseSiswaStringToArray(j.siswa_izin));
    setSiswaAlpa(parseSiswaStringToArray(j.siswa_alpa));
    setCatatan(j.catatan || '');
    setFoto1(j.foto_1 || '');
    setFoto2(j.foto_2 || '');
    setFotoKehadiran(j.foto_kehadiran || '');
    setIsModalOpen(true);
  };

  const compressImage = (base64Str: string, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          try {
            const webp = canvas.toDataURL('image/webp', 0.75);
            if (webp.startsWith('data:image/webp')) {
              resolve(webp);
            } else {
              resolve(canvas.toDataURL('image/jpeg', 0.75));
            }
          } catch {
            resolve(canvas.toDataURL('image/jpeg', 0.75));
          }
        } else {
          resolve(base64Str);
        }
      };
      img.onerror = () => {
        resolve(base64Str);
      };
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 1 | 2 | 3) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      const compressed = await compressImage(base64String);
      if (field === 1) {
        setFoto1(compressed);
      } else if (field === 2) {
        setFoto2(compressed);
      } else {
        setFotoKehadiran(compressed);
      }
    };
    reader.readAsDataURL(file);
  };

  // HTML5 Web Camera Functions
  const startCamera = async (field: 1 | 2 | 3) => {
    setActiveCameraField(field);
    setIsCameraActive(true);
    setCameraError(null);
    try {
      // First try rear camera, then any video input
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      }).catch(() => {
        return navigator.mediaDevices.getUserMedia({ video: true });
      });
      
      setCameraStream(stream);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.error("Error playing video:", e));
        }
      }, 100);
    } catch (err) {
      console.error("Gagal mengakses kamera:", err);
      setCameraError("Kamera tidak dapat diakses atau izin ditolak. Silakan coba kembali atau gunakan pilihan Galeri.");
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
    setCameraError(null);
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64Str = canvas.toDataURL('image/jpeg');
        const compressed = await compressImage(base64Str);
        if (activeCameraField === 1) {
          setFoto1(compressed);
        } else if (activeCameraField === 2) {
          setFoto2(compressed);
        } else {
          setFotoKehadiran(compressed);
        }
      }
    } catch (e) {
      console.error("Error capturing photo:", e);
    } finally {
      stopCamera();
    }
  };

  const handleToggleAbsen = (name: string, type: 'hadir' | 'sakit' | 'izin' | 'alpa', checked: boolean) => {
    if (type === 'hadir') {
      if (checked) {
        setSiswaSakit(prev => prev.filter(x => x !== name));
        setSiswaIzin(prev => prev.filter(x => x !== name));
        setSiswaAlpa(prev => prev.filter(x => x !== name));
      }
    } else if (type === 'sakit') {
      if (checked) {
        setSiswaSakit(prev => [...prev, name]);
        setSiswaIzin(prev => prev.filter(x => x !== name));
        setSiswaAlpa(prev => prev.filter(x => x !== name));
      } else {
        setSiswaSakit(prev => prev.filter(x => x !== name));
      }
    } else if (type === 'izin') {
      if (checked) {
        setSiswaIzin(prev => [...prev, name]);
        setSiswaSakit(prev => prev.filter(x => x !== name));
        setSiswaAlpa(prev => prev.filter(x => x !== name));
      } else {
        setSiswaIzin(prev => prev.filter(x => x !== name));
      }
    } else if (type === 'alpa') {
      if (checked) {
        setSiswaAlpa(prev => [...prev, name]);
        setSiswaSakit(prev => prev.filter(x => x !== name));
        setSiswaIzin(prev => prev.filter(x => x !== name));
      } else {
        setSiswaAlpa(prev => prev.filter(x => x !== name));
      }
    }
  };

  const handleJamKeCheckboxChange = (key: string, checked: boolean) => {
    if (checked) {
      setSelectedJamKe(prev => [...prev, key]);
    } else {
      setSelectedJamKe(prev => prev.filter(x => x !== key));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const todayStr = getTodayString();
    if (tanggal > todayStr) {
      alert("Maaf, tidak dapat menginput atau menyimpan jurnal untuk tanggal masa depan (melebihi hari ini).");
      return;
    }
    setLoading(true);
    try {
      // Compose materi string nicely
      const compiledMateri = `[Ajar] ${materiAjar.trim()} | [Indikator] ${indikatorPembelajaran.trim() || '-'}`;
      const compiledJamKe = isCustomJam 
        ? `${customJamMulai} - ${customJamSelesai}`
        : selectedJamKe.length > 0
          ? selectedJamKe
              .map(x => parseInt(x, 10))
              .sort((a, b) => a - b)
              .map(x => `${x} (${JAM_TIMINGS[x.toString()]})`)
              .join(', ')
          : '1 (07.30 - 08.10)';

      const payload: Jurnal = {
        id_jurnal: editingId || 'JRN' + Date.now(),
        tanggal: new Date(tanggal).toISOString(),
        kelas,
        jam_ke: compiledJamKe,
        mata_pelajaran: mapel.trim(),
        nama_guru: editingId ? (jurnal.find(x => x.id_jurnal === editingId)?.nama_guru || user.nama_lengkap) : user.nama_lengkap,
        materi: compiledMateri,
        uraian_pembelajaran: uraianPembelajaran.trim(),
        siswa_sakit: siswaSakit.length > 0 ? `${siswaSakit.length} (${siswaSakit.join(', ')})` : '-',
        siswa_izin: siswaIzin.length > 0 ? `${siswaIzin.length} (${siswaIzin.join(', ')})` : '-',
        siswa_alpa: siswaAlpa.length > 0 ? `${siswaAlpa.length} (${siswaAlpa.join(', ')})` : '-',
        catatan: catatan.trim(),
        foto_1: foto1,
        foto_2: foto2,
        foto_kehadiran: fotoKehadiran
      };

      if (editingId) {
        await onEditJurnal(payload);
        setSavedJurnalTitle("Perubahan Jurnal Disimpan");
      } else {
        await onAddJurnal(payload);
        setSavedJurnalTitle("Jurnal Mengajar Berhasil Direkam");
      }
      setShowSuccessPopup(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSuccessPopup = () => {
    setShowSuccessPopup(false);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 mb-1 flex items-center gap-2">
            🗒️ Jurnal Harian Dewan Guru
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            Dokumentasi rekap harian agenda mengajar, absensi santri, murojaah, dan kejadian penting.
          </p>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Cari Jurnal Guru..."
              className="pl-11 pr-4 py-3.5 border border-slate-200 rounded-xl text-sm w-full focus:ring-2 focus:ring-emerald-400 outline-none shadow-sm font-medium bg-white text-slate-700"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {!isReadOnly && (
            <button
              onClick={handleOpenAdd}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3.5 rounded-xl font-black shadow-md transition transform hover:-translate-y-0.5 flex items-center gap-2 text-sm cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" /> Isi Jurnal Baru
            </button>
          )}
        </div>
      </div>

      {/* Grid Table */}
      <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-slate-100">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-black border-b border-slate-100">
            <tr>
              <th className="px-6 py-5 uppercase tracking-wider text-[11px]">Hari / Tanggal</th>
              <th className="px-6 py-5 uppercase tracking-wider text-[11px]">Rombel / Jam</th>
              <th className="px-6 py-5 uppercase tracking-wider text-[11px]">Guru / Mapel</th>
              <th className="px-6 py-5 uppercase tracking-wider text-[11px]">Uraian Agenda</th>
              <th className="px-6 py-5 uppercase tracking-wider text-[11px]">Absensi Santri</th>
              <th className="px-6 py-5 uppercase tracking-wider text-[11px] text-center">Ekspor &amp; PDF</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredJurnal.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-400 font-medium italic">
                  Belum ada pengisian jurnal mengajar.
                </td>
              </tr>
            ) : (
              paginatedJurnal.map((j) => {
                const isAuthor = user.role === 'admin' || j.nama_guru === user.nama_lengkap;
                return (
                  <tr key={j.id_jurnal} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-bold text-slate-700">{formatDateID(j.tanggal)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-[10px] text-emerald-700 font-black uppercase tracking-wider bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">
                        KELAS {j.kelas}
                      </span>
                      <br />
                      <span className="text-[10px] text-slate-400 font-bold block mt-1">
                        Jam Ke-{j.jam_ke}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-black text-slate-800 text-xs block">{j.nama_guru}</span>
                      <span className="text-[10px] text-slate-400 font-semibold">{j.mata_pelajaran}</span>
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const matVal = j.materi || '';
                        let ajar = matVal;
                        let indikator = '';
                        if (matVal.includes('[Ajar]') && (matVal.includes('| [Murojaah]') || matVal.includes('| [Indikator]'))) {
                          const splitToken = matVal.includes('| [Indikator]') ? '| [Indikator]' : '| [Murojaah]';
                          const parts = matVal.split(splitToken);
                          ajar = parts[0].replace('[Ajar] ', '').trim();
                          indikator = parts[1]?.trim() || '';
                        }
                        return (
                          <div className="w-64 space-y-1">
                            <div className="text-xs font-bold text-slate-800" title={ajar}>
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-black mr-1 uppercase">Materi</span>
                              {ajar}
                            </div>
                            {indikator && indikator !== '-' && (
                              <div className="text-xs text-slate-600 font-medium" title={indikator}>
                                <span className="text-[10px] bg-teal-50 text-teal-700 border border-teal-100 px-1.5 py-0.5 rounded font-black mr-1 uppercase">Indikator</span>
                                {indikator}
                              </div>
                            )}
                            <div className="text-[10px] text-slate-400 font-medium italic truncate" title={j.uraian_pembelajaran}>
                              {j.uraian_pembelajaran}
                            </div>
                            {((j.foto_1 && j.foto_1.length > 10) || (j.foto_2 && j.foto_2.length > 10) || (j.foto_kehadiran && j.foto_kehadiran.length > 10)) && (
                              <div className="flex gap-1.5 pt-1">
                                {j.foto_1 && j.foto_1.length > 10 && (
                                  <LazyImage
                                    src={j.foto_1}
                                    alt="Foto 1"
                                    onClick={() => setLightbox({ url: j.foto_1!, title: `Dokumentasi 1 - ${j.mata_pelajaran} (Kelas ${j.kelas})` })}
                                    className="w-10 h-10 rounded-lg border border-slate-200 shadow-xs cursor-zoom-in hover:opacity-85 transition-all"
                                    title="Klik untuk memperbesar foto 📸"
                                  />
                                )}
                                {j.foto_2 && j.foto_2.length > 10 && (
                                  <LazyImage
                                    src={j.foto_2}
                                    alt="Foto 2"
                                    onClick={() => setLightbox({ url: j.foto_2!, title: `Dokumentasi 2 - ${j.mata_pelajaran} (Kelas ${j.kelas})` })}
                                    className="w-10 h-10 rounded-lg border border-slate-200 shadow-xs cursor-zoom-in hover:opacity-85 transition-all"
                                    title="Klik untuk memperbesar foto 📸"
                                  />
                                )}
                                {j.foto_kehadiran && j.foto_kehadiran.length > 10 && (
                                  <LazyImage
                                    src={j.foto_kehadiran}
                                    alt="Foto Kehadiran"
                                    onClick={() => setLightbox({ url: j.foto_kehadiran!, title: `Kehadiran Santri - ${j.mata_pelajaran} (Kelas ${j.kelas})` })}
                                    className="w-10 h-10 rounded-lg border border-emerald-300 shadow-xs cursor-zoom-in hover:opacity-85 transition-all"
                                    title="Klik untuk memperbesar foto Kehadiran Santri 📸"
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5 text-[11px] font-bold">
                        {j.siswa_sakit && j.siswa_sakit !== '-' && <span className="text-amber-600">S: {j.siswa_sakit}</span>}
                        {j.siswa_izin && j.siswa_izin !== '-' && <span className="text-purple-600">I: {j.siswa_izin}</span>}
                        {j.siswa_alpa && j.siswa_alpa !== '-' && <span className="text-red-600">A: {j.siswa_alpa}</span>}
                        {(!j.siswa_sakit || j.siswa_sakit === '-') && 
                         (!j.siswa_izin || j.siswa_izin === '-') && 
                         (!j.siswa_alpa || j.siswa_alpa === '-') && (
                          <span className="text-emerald-600 font-bold">✓ Hadir Semua</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={async (e) => {
                            const btn = e.currentTarget;
                            const originalText = btn.innerHTML;
                            try {
                              btn.disabled = true;
                              btn.innerHTML = '⌛ Memuat...';
                              await generateJurnalPDF(j);
                            } catch (err) {
                              console.error(err);
                              alert('Gagal mengekspor PDF.');
                            } finally {
                              btn.disabled = false;
                              btn.innerHTML = originalText;
                            }
                          }}
                          className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1"
                        >
                          <FileText className="w-3.5 h-3.5" /> Cetak PDF
                        </button>
                        {!isReadOnly && isAuthor && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOpenEdit(j)}
                              className="text-emerald-500 hover:text-emerald-700 transition p-1 cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(j.id_jurnal)}
                              className="text-slate-300 hover:text-red-500 transition p-1 cursor-pointer"
                            >
                              Hapus
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {filteredJurnal.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-bold">
            <span>Tampilkan</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border border-slate-200 bg-slate-50 rounded-lg py-1.5 px-2.5 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20"
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
              <span className="text-emerald-600 font-black">{totalItems}</span> jurnal
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              disabled={safeCurrentPage === 1}
              className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer text-slate-600"
              title="Halaman Pertama"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={safeCurrentPage === 1}
              className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer text-slate-600"
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
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer border
                      ${isCurrent
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
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
              className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer text-slate-600"
              title="Halaman Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage(totalPages)}
              disabled={safeCurrentPage === totalPages}
              className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer text-slate-600"
              title="Halaman Terakhir"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Write Jurnal Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9990] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-3xl flex flex-col p-6 max-h-[90vh] overflow-y-auto animate-fade-in my-auto">
            <h3 className="font-extrabold text-2xl text-slate-800 mb-6 border-b border-slate-100 pb-4">
              {editingId ? 'Edit Jurnal Mengajar' : 'Isi Jurnal Pembelajaran Baru'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Quick Select Today's Schedule */}
              {!editingId && todaySchedules.length > 0 && (
                <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100/60 space-y-3">
                  <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest block">
                    📌 Pilih dari Jadwal Mengajar Anda Hari Ini ({getIndonesianDayName(tanggal)}):
                  </span>
                  <div className="flex flex-wrap gap-2.5">
                    {todaySchedules.map((sched) => (
                      <button
                        key={sched.id_jadwal}
                        type="button"
                        onClick={() => {
                          setKelas(sched.kelas);
                          setMapel(sched.mata_pelajaran);
                          
                          // Parse hours
                          const hours = getHourKeys(sched.jam_ke);
                          if (hours.length > 0) {
                            setSelectedJamKe(hours);
                            setJamKeMulai(hours[0]);
                            setJamKeSelesai(hours[hours.length - 1] || hours[0]);
                            setIsCustomJam(false);
                          }
                        }}
                        className="px-3.5 py-2.5 bg-white border border-emerald-200/80 hover:bg-emerald-50 text-slate-800 text-xs font-bold rounded-xl transition shadow-3xs hover:border-emerald-400 cursor-pointer flex flex-col items-start gap-0.5 text-left"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">Kelas {sched.kelas}</span>
                          <span className="text-slate-400 text-[10px]">Jam {sched.jam_ke}</span>
                        </div>
                        <span className="font-extrabold text-slate-800 mt-1">{sched.mata_pelajaran}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-black text-slate-500 block mb-2 uppercase">Tanggal Kegiatan</label>
                  <input
                    type="date"
                    required
                    max={getTodayString()}
                    className="w-full border border-slate-200 p-4 rounded-xl font-bold bg-slate-50 text-slate-700 outline-none focus:ring-2 focus:ring-emerald-400"
                    value={tanggal}
                    onChange={(e) => {
                      const selectedVal = e.target.value;
                      const todayStr = getTodayString();
                      if (selectedVal > todayStr) {
                        alert("Maaf, Anda tidak dapat memilih tanggal masa depan!");
                        setTanggal(todayStr);
                      } else {
                        setTanggal(selectedVal);
                      }
                    }}
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-500 block mb-2 uppercase">Rombel Kelas</label>
                  <select
                    required
                    className="w-full border border-slate-200 p-4 rounded-xl font-bold bg-white text-slate-700 outline-none focus:ring-2 focus:ring-emerald-400"
                    value={kelas}
                    onChange={(e) => {
                      setKelas(e.target.value);
                      setSiswaSakit([]);
                      setSiswaIzin([]);
                      setSiswaAlpa([]);
                    }}
                  >
                    <option value="">-- Pilih Kelas --</option>
                    {authClasses.map(c => (
                      <option key={c} value={c}>Kelas {c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Real-time Student Attendance Statistics */}
              {kelas && (() => {
                const stats = getClassPresenceStats(kelas);
                if (!stats) return null;

                // Color based on presence rate
                let progressColor = 'bg-emerald-500';
                let textColor = 'text-emerald-700';
                let bgColor = 'bg-emerald-50/50 border-emerald-100/60';
                if (stats.presenceRate < 75) {
                  progressColor = 'bg-rose-500';
                  textColor = 'text-rose-700';
                  bgColor = 'bg-rose-50/50 border-rose-100/60';
                } else if (stats.presenceRate < 90) {
                  progressColor = 'bg-amber-500';
                  textColor = 'text-amber-700';
                  bgColor = 'bg-amber-50/50 border-amber-100/60';
                }

                return (
                  <div className={`p-5 rounded-3xl border ${bgColor} space-y-4 transition-all duration-300`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <span>📊</span> Analisis Absensi Real-Time - Kelas {kelas}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                          Berdasarkan {stats.totalSesi} sesi jurnal pembelajaran yang telah diinput sebelumnya
                        </p>
                      </div>
                      <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-100 shadow-3xs shrink-0">
                        <span className="text-[10px] font-black text-slate-400 uppercase">Rasio Hadir</span>
                        <span className={`text-sm font-black ${textColor}`}>{stats.presenceRate}%</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200/60 h-2 rounded-full overflow-hidden">
                      <div className={`h-full ${progressColor} rounded-full transition-all duration-500`} style={{ width: `${stats.presenceRate}%` }} />
                    </div>

                    {/* Grid Info */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-white/70 p-3 rounded-xl border border-slate-100 shadow-3xs">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Total Santri</span>
                        <div className="text-sm font-black text-slate-800 mt-0.5">{stats.totalSiswa} anak</div>
                      </div>
                      <div className="bg-white/70 p-3 rounded-xl border border-slate-100 shadow-3xs">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Sakit (S)</span>
                        <div className="text-sm font-black text-amber-600 mt-0.5">{stats.totalSakit} <span className="text-[9px] font-bold text-slate-400">kali</span></div>
                      </div>
                      <div className="bg-white/70 p-3 rounded-xl border border-slate-100 shadow-3xs">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Izin (I)</span>
                        <div className="text-sm font-black text-blue-600 mt-0.5">{stats.totalIzin} <span className="text-[9px] font-bold text-slate-400">kali</span></div>
                      </div>
                      <div className="bg-white/70 p-3 rounded-xl border border-slate-100 shadow-3xs">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Alfa (A)</span>
                        <div className="text-sm font-black text-rose-600 mt-0.5">{stats.totalAlpa} <span className="text-[9px] font-bold text-slate-400">kali</span></div>
                      </div>
                    </div>

                    {/* List Santri Sering Absen */}
                    {stats.studentAbsenceList.length > 0 && (
                      <div className="bg-white/60 p-3.5 rounded-xl border border-slate-100/80 space-y-2">
                        <span className="text-[9.5px] font-black text-slate-500 uppercase tracking-wide block">
                          Santri dengan Rekam Jejak Ketidakhadiran (Absensi):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                          {stats.studentAbsenceList.slice(0, 8).map((st) => (
                            <div key={st.nama} className="flex items-center justify-between text-[11px] bg-white p-2 rounded-lg border border-slate-100">
                              <span className="font-extrabold text-slate-700 truncate max-w-[130px]">{st.nama}</span>
                              <div className="flex gap-1.5 text-[9px] font-black shrink-0">
                                {st.sakit > 0 && <span className="text-amber-700 bg-amber-50 px-1 py-0.5 rounded">S:{st.sakit}</span>}
                                {st.izin > 0 && <span className="text-blue-700 bg-blue-50 px-1 py-0.5 rounded">I:{st.izin}</span>}
                                {st.alpa > 0 && <span className="text-rose-700 bg-rose-50 px-1 py-0.5 rounded">A:{st.alpa}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Jam Ke Selector Block */}
              <div className="flex flex-col">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-xs font-black text-slate-500 block uppercase tracking-wide">Jam Ke</label>
                  <button
                    type="button"
                    onClick={() => setIsCustomJam(!isCustomJam)}
                    className="text-[9px] font-extrabold text-emerald-600 hover:underline bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded cursor-pointer transition active:scale-95"
                    title="Klik untuk beralih antara Jam Pelajaran Sistem atau Jam Waktu Kustom"
                  >
                    {isCustomJam ? 'Sistem Jam Ke' : 'Waktu Kustom'}
                  </button>
                </div>

                {isCustomJam ? (
                  <div className="grid grid-cols-2 gap-4 border border-slate-100 rounded-2xl p-4 bg-slate-50">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Mulai Jam</span>
                      <input
                        type="time"
                        required
                        className="w-full border border-slate-200 p-2.5 rounded-xl font-bold bg-white text-slate-700 outline-none focus:ring-2 focus:ring-emerald-400 text-xs shadow-sm"
                        value={customJamMulai}
                        onChange={(e) => setCustomJamMulai(e.target.value)}
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Selesai Jam</span>
                      <input
                        type="time"
                        required
                        className="w-full border border-slate-200 p-2.5 rounded-xl font-bold bg-white text-slate-700 outline-none focus:ring-2 focus:ring-emerald-400 text-xs shadow-sm"
                        value={customJamSelesai}
                        onChange={(e) => setCustomJamSelesai(e.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {['1', '2', '3', '4', '5', '6', '7', '8'].map((key) => {
                      const isChecked = selectedJamKe.includes(key);
                      return (
                        <label
                          key={key}
                          className={`flex items-center gap-3 p-3.5 border rounded-xl cursor-pointer transition-all ${
                            isChecked
                              ? 'border-emerald-500 bg-emerald-50/40 text-slate-800 shadow-sm'
                              : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => handleJamKeCheckboxChange(key, e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-500"
                          />
                          <span className="text-xs font-bold text-slate-700">
                            {key} ({JAM_TIMINGS[key]})
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {modalConflicts.length > 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-800 space-y-2 shadow-sm">
                  <div className="font-black flex items-center gap-1.5 text-xs text-amber-950 uppercase tracking-wide">
                    <span>⚠️ Deteksi Tabrakan Jadwal:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 font-semibold">
                    {modalConflicts.map((c, i) => (
                      <li key={i} className="text-amber-950">
                        {c.msg}
                      </li>
                    ))}
                  </ul>
                  {modalSuggestions.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-amber-100">
                      <p className="font-bold text-slate-700 mb-1">Alihkan Jurnal ke Jam Kosong (Bebas Tabrakan):</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {modalSuggestions.map(h => (
                          <button
                            key={h}
                            type="button"
                            onClick={() => {
                              setSelectedJamKe([h]);
                              setCatatan(prev => {
                                const suffix = `(Dialihkan dari Jam Ke-${selectedJamKe.join(', ')} karena bentrok)`;
                                if (prev.includes(suffix)) return prev;
                                return prev ? `${prev} ${suffix}` : suffix;
                              });
                            }}
                            className="px-2.5 py-1 bg-white border border-amber-200 hover:bg-amber-100 text-amber-700 font-extrabold rounded-lg transition text-[10px] cursor-pointer"
                          >
                            Pindahkan ke Jam Ke-{h}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="text-xs font-black text-slate-500 block mb-2 uppercase">Mata Pelajaran</label>
                {teacherMapelList.length > 0 ? (
                  <select
                    className="w-full border border-slate-200 p-4 rounded-xl bg-white font-bold text-slate-700 outline-none"
                    value={mapel}
                    onChange={(e) => setMapel(e.target.value)}
                    required
                  >
                    <option value="">-- Pilih Mapel --</option>
                    {teacherMapelList.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    className="w-full border border-slate-200 p-4 rounded-xl font-bold text-slate-700 outline-none"
                    placeholder="Contoh: Matematika, Bahasa Arab"
                    value={mapel}
                    onChange={(e) => setMapel(e.target.value)}
                  />
                )}
              </div>

              <div className="border-t border-slate-100 pt-5 space-y-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  📚 Agenda &amp; Materi Pembelajaran
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-2">Indikator Pembelajaran</label>
                    <input
                      type="text"
                      className="w-full border border-slate-200 p-4 rounded-xl text-sm"
                      placeholder="Contoh: Menyebutkan rukun sholat, membaca dengan tartil..."
                      value={indikatorPembelajaran}
                      onChange={(e) => setIndikatorPembelajaran(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-2">Pokok Bahasan Materi</label>
                    <input
                      type="text"
                      required
                      className="w-full border border-slate-200 p-4 rounded-xl text-sm font-bold"
                      placeholder="Contoh: Sholat Berjamaah, Bab Thoharah..."
                      value={materiAjar}
                      onChange={(e) => setMateriAjar(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-2">Uraian Detil Kegiatan Pembelajaran</label>
                  <textarea
                    rows={3}
                    className="w-full border border-slate-200 p-4 rounded-xl text-sm font-medium text-slate-700 outline-none"
                    placeholder="Guru menerangkan tata cara tayamum lalu santri melakukan praktik satu per satu..."
                    value={uraianPembelajaran}
                    onChange={(e) => setUraianPembelajaran(e.target.value)}
                  />
                </div>
              </div>

              {/* Absensi Santri Section */}
              <div className="border-t border-slate-100 pt-5 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    🚨 Presensi &amp; Ketidakhadiran Santri Kelas {kelas || '...'}
                  </h4>
                  {kelas && (
                    <button
                      type="button"
                      onClick={() => {
                        setSiswaSakit([]);
                        setSiswaIzin([]);
                        setSiswaAlpa([]);
                      }}
                      className="text-[10px] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-extrabold px-2.5 py-1.5 rounded-lg border border-emerald-100 uppercase tracking-wider transition cursor-pointer"
                    >
                      Hadirkan Semua Siswa ✓
                    </button>
                  )}
                </div>

                {!kelas ? (
                  <p className="text-xs text-slate-400 italic text-center p-4">
                    Silakan pilih kelas terlebih dahulu untuk melihat daftar santri...
                  </p>
                ) : (
                  <div className="h-44 overflow-y-auto border border-slate-100 rounded-2xl bg-slate-50 p-3 pr-1">
                    <div className="space-y-2">
                      {siswa
                        .filter(s => s.kelas === kelas && !s.kelas.includes('Lulus') && !s.kelas.includes('Alumni'))
                        .map(s => {
                          const name = s.nama_siswa;
                          const isSakit = siswaSakit.includes(name);
                          const isIzin = siswaIzin.includes(name);
                          const isAlpa = siswaAlpa.includes(name);
                          const isHadir = !isSakit && !isIzin && !isAlpa;

                          return (
                            <div key={s.id_siswa} className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center text-xs">
                              <span className="font-extrabold text-slate-700">
                                {name} <span className="text-[10px] text-slate-400 font-medium">(Kelas {s.kelas})</span>
                              </span>
                              <div className="flex gap-4 font-black">
                                <label className="flex items-center gap-1 text-emerald-600 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`absen-${s.id_siswa}`}
                                    checked={isHadir}
                                    onChange={(e) => handleToggleAbsen(name, 'hadir', e.target.checked)}
                                    className="cursor-pointer accent-emerald-500 w-3.5 h-3.5"
                                  />
                                  H
                                </label>
                                <label className="flex items-center gap-1 text-amber-600 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`absen-${s.id_siswa}`}
                                    checked={isSakit}
                                    onChange={(e) => handleToggleAbsen(name, 'sakit', e.target.checked)}
                                    className="cursor-pointer accent-amber-500 w-3.5 h-3.5"
                                  />
                                  S
                                </label>
                                <label className="flex items-center gap-1 text-purple-600 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`absen-${s.id_siswa}`}
                                    checked={isIzin}
                                    onChange={(e) => handleToggleAbsen(name, 'izin', e.target.checked)}
                                    className="cursor-pointer accent-purple-500 w-3.5 h-3.5"
                                  />
                                  I
                                </label>
                                <label className="flex items-center gap-1 text-red-600 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`absen-${s.id_siswa}`}
                                    checked={isAlpa}
                                    onChange={(e) => handleToggleAbsen(name, 'alpa', e.target.checked)}
                                    className="cursor-pointer accent-red-500 w-3.5 h-3.5"
                                  />
                                  A
                                </label>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
                {kelas && (
                  <div className="mt-3 bg-emerald-50/35 border border-emerald-100/50 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                    <div className="text-left">
                      <span className="text-xs font-black text-slate-700 block mb-1">📸 Foto Kehadiran Santri</span>
                      <p className="text-[10px] text-slate-500 font-medium">Ambil foto kehadiran santri langsung menggunakan kamera perangkat.</p>
                    </div>
                    {fotoKehadiran ? (
                      <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white p-1 self-start sm:self-auto flex items-center">
                        <img 
                          src={fotoKehadiran} 
                          alt="Foto Kehadiran" 
                          className="w-24 h-16 object-cover rounded-lg cursor-zoom-in hover:opacity-85 transition-all" 
                          referrerPolicy="no-referrer"
                          onClick={() => setLightbox({ url: fotoKehadiran, title: `Foto Kehadiran Santri - Kelas ${kelas}` })}
                        />
                        <button
                          type="button"
                          onClick={() => setFotoKehadiran('')}
                          className="absolute right-1.5 top-1.5 bg-red-600 hover:bg-red-700 text-white text-[9px] font-black px-1.5 py-0.5 rounded cursor-pointer transition shadow"
                          title="Hapus foto kehadiran"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2 shrink-0">
                        <input
                          id="foto-kehadiran-gallery"
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, 3)}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => document.getElementById('foto-kehadiran-gallery')?.click()}
                          className="py-1.5 px-3 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          📁 Galeri
                        </button>
                        <button
                          type="button"
                          onClick={() => startCamera(3)}
                          className="py-1.5 px-3 bg-emerald-600 border border-emerald-500 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1 cursor-pointer animate-pulse"
                        >
                          📷 Kamera
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Kejadian penting & Photos */}
              <div className="border-t border-slate-100 pt-5 space-y-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  📸 Dokumentasi Kejadian Penting
                </h4>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-2">Kejadian Penting di Kelas (Opsional)</label>
                  <textarea
                    rows={2}
                    className="w-full border border-slate-200 p-4 rounded-xl text-sm"
                    placeholder="Catatan kejadian penting lainnya..."
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="border border-slate-200 p-4 rounded-2xl bg-slate-50 flex flex-col justify-between">
                    <div>
                      <label className="text-xs font-black text-slate-700 block mb-1">Foto Dokumentasi Kegiatan 1</label>
                      <p className="text-[10px] text-slate-400 font-medium mb-3">Foto bukti kegiatan belajar.</p>
                    </div>
                    {foto1 ? (
                      <div className="relative rounded-xl overflow-hidden max-h-40 border border-slate-200 shadow bg-white p-1">
                        <img src={foto1} alt="Dokumentasi 1" className="w-full h-32 object-cover rounded-lg" referrerPolicy="no-referrer" />
                        <button
                          type="button"
                          onClick={() => setFoto1('')}
                          className="absolute right-2 top-2 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow cursor-pointer"
                        >
                          Hapus
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2 mt-2">
                        <input
                          id="foto-gallery-1"
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, 1)}
                          className="hidden"
                        />
                        <input
                          id="foto-camera-1"
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => handleImageUpload(e, 1)}
                          className="hidden"
                        />
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button
                            type="button"
                            onClick={() => document.getElementById('foto-gallery-1')?.click()}
                            className="flex-1 py-2 px-3 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            📁 Galeri
                          </button>
                          <button
                            type="button"
                            onClick={() => startCamera(1)}
                            className="flex-1 py-2 px-3 bg-emerald-600 border border-emerald-500 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer animate-pulse"
                          >
                            📷 Ambil Foto
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border border-slate-200 p-4 rounded-2xl bg-slate-50 flex flex-col justify-between">
                    <div>
                      <label className="text-xs font-black text-slate-700 block mb-1">Foto Dokumentasi Kegiatan 2 (Opsional)</label>
                      <p className="text-[10px] text-slate-400 font-medium mb-3">Tambahan bukti pendukung agenda.</p>
                    </div>
                    {foto2 ? (
                      <div className="relative rounded-xl overflow-hidden max-h-40 border border-slate-200 shadow bg-white p-1">
                        <img src={foto2} alt="Dokumentasi 2" className="w-full h-32 object-cover rounded-lg" referrerPolicy="no-referrer" />
                        <button
                          type="button"
                          onClick={() => setFoto2('')}
                          className="absolute right-2 top-2 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow cursor-pointer"
                        >
                          Hapus
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2 mt-2">
                        <input
                          id="foto-gallery-2"
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, 2)}
                          className="hidden"
                        />
                        <input
                          id="foto-camera-2"
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => handleImageUpload(e, 2)}
                          className="hidden"
                        />
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button
                            type="button"
                            onClick={() => document.getElementById('foto-gallery-2')?.click()}
                            className="flex-1 py-2 px-3 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            📁 Galeri
                          </button>
                          <button
                            type="button"
                            onClick={() => startCamera(2)}
                            className="flex-1 py-2 px-3 bg-emerald-600 border border-emerald-500 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer animate-pulse"
                          >
                            📷 Ambil Foto
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

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
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base py-4 rounded-xl shadow-xl transition transform active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Menyimpan...' : (editingId ? 'SIMPAN PERUBAHAN' : 'REKAM JURNAL GURU')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Local Double-Submission Prevention Success Popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden flex flex-col p-8 text-center border border-slate-100 animate-fade-in">
            <div className="mx-auto mb-6">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-md animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
            </div>

            <h3 className="text-2xl font-black mb-3 text-slate-800 tracking-tight">
              {savedJurnalTitle}
            </h3>
            
            <p className="text-slate-500 mb-8 text-sm leading-relaxed font-semibold">
              Agenda harian, pokok bahasan materi, indikator pembelajaran, dan presensi kehadiran santri berhasil disimpan dengan aman ke sistem.
            </p>

            <button
              onClick={handleCloseSuccessPopup}
              className="w-full bg-emerald-600 text-white font-black text-base py-4.5 rounded-2xl hover:bg-emerald-700 shadow-xl transition transform active:scale-95 cursor-pointer"
            >
              OK, SAYA MENGERTI
            </button>
          </div>
        </div>
      )}

      {/* HTML5 Video Capture Modal */}
      {isCameraActive && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100000] flex flex-col justify-between p-4">
          <div className="flex justify-between items-center bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/10 max-w-lg mx-auto w-full">
            <div className="text-left">
              <p className="text-white text-sm font-black">📷 Ambil Foto Dokumentasi Kegiatan {activeCameraField}</p>
              <p className="text-slate-400 text-[10px] mt-0.5 font-semibold">Arahkan kamera ke berkas fisik/dokumen kegiatan KBM</p>
            </div>
            <button
              onClick={stopCamera}
              className="text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
            >
              Batal
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center max-w-lg mx-auto w-full my-4 relative overflow-hidden rounded-3xl border border-white/10 bg-black shadow-inner">
            {cameraError ? (
              <div className="p-6 text-center text-rose-400 text-xs font-semibold max-w-xs leading-relaxed space-y-4">
                <p>⚠️ {cameraError}</p>
                <button
                  onClick={() => startCamera(activeCameraField)}
                  className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-bold transition"
                >
                  Coba Lagi
                </button>
              </div>
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover max-h-[60vh] rounded-2xl"
              />
            )}
          </div>

          <div className="bg-black/40 backdrop-blur-md p-6 rounded-[2rem] border border-white/10 max-w-lg mx-auto w-full text-center space-y-4">
            {!cameraError && (
              <button
                onClick={capturePhoto}
                className="w-20 h-20 bg-white hover:bg-slate-100 text-slate-900 rounded-full flex items-center justify-center mx-auto shadow-2xl transition transform active:scale-90 cursor-pointer"
                title="Ambil Foto"
              >
                <div className="w-16 h-16 rounded-full border-4 border-slate-900 bg-white"></div>
              </button>
            )}
            
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
              MTs Ibad Ar Rahman KBM Tracker
            </p>
          </div>
        </div>
      )}

      {/* Confirmation Dialog before Deleting Jurnal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md flex flex-col p-6 animate-fade-in border border-slate-100">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="font-extrabold text-lg text-slate-800">Konfirmasi Hapus Jurnal</h3>
            </div>
            
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              Apakah Anda yakin ingin menghapus jurnal kelas ini? Data kehadiran santri untuk sesi KBM ini akan terhapus secara permanen dari sistem.
            </p>
            
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (deleteConfirmId) {
                    await onDeleteJurnal(deleteConfirmId);
                    setDeleteConfirmId(null);
                  }
                }}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs transition cursor-pointer shadow-md shadow-red-500/10"
              >
                Ya, Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Lightbox Modal for Viewing Full Documentation Photo */}
      {lightbox && (
        <div 
          className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[9999] flex flex-col items-center justify-center p-4 cursor-pointer" 
          onClick={() => setLightbox(null)}
        >
          <button 
            className="absolute top-6 right-6 text-white hover:text-red-400 font-extrabold text-2xl transition cursor-pointer bg-black/40 p-3 rounded-full"
            onClick={() => setLightbox(null)}
          >
            ✕
          </button>
          <div className="max-w-4xl max-h-[80vh] w-full flex items-center justify-center p-2" onClick={(e) => e.stopPropagation()}>
            <img 
              src={lightbox.url} 
              alt={lightbox.title} 
              className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-slate-800" 
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="text-center mt-6 text-white max-w-xl px-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-extrabold text-lg">{lightbox.title}</h3>
            <p className="text-slate-400 text-xs mt-1">Pratinjau Dokumentasi Pembelajaran</p>
          </div>
        </div>
      )}
    </div>
  );
};
