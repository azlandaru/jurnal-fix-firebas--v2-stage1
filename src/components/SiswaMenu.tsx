import React, { useState, useRef } from 'react';
import { Siswa, User, Jurnal, SystemSettings, getTeacherClasses } from '../types';
import { 
  Search, UserPlus, Trash2, CheckCircle2, FileText, AlertTriangle, 
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, 
  Sparkles, RefreshCw, Edit3, Filter,
  Download, Upload, FileSpreadsheet, Wand2, Calendar, Award, Users
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface SiswaMenuProps {
  user: User;
  siswa: Siswa[];
  onAddSiswa: (s: Siswa) => Promise<void>;
  onAddBulkSiswa?: (newStudents: Siswa[]) => Promise<void>;
  onDeleteSiswa: (id: string) => Promise<void>;
  onUpdateSiswaClass?: (id_siswa: string, new_kelas: string) => Promise<void>;
  onBulkPromoteSiswa?: (promotions: { id_siswa: string; new_kelas: string }[], logMsg?: string, updateTeacherClasses?: boolean) => Promise<void>;
  onResetSiswaToInitial?: () => void;
  jurnal?: Jurnal[];
  settings?: SystemSettings;
}

export const SiswaMenu: React.FC<SiswaMenuProps> = ({
  user,
  siswa,
  onAddSiswa,
  onAddBulkSiswa,
  onDeleteSiswa,
  onUpdateSiswaClass,
  onResetSiswaToInitial,
  jurnal = [],
  settings
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKelas, setFilterKelas] = useState('Semua');
  
  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Reset page to 1 when search term or filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterKelas]);

  // Modal & Single Edit States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Siswa | null>(null);
  const [editNewClass, setEditNewClass] = useState('');
  
  const [newId, setNewId] = useState('');
  const [newNama, setNewNama] = useState('');
  const [newKelas, setNewKelas] = useState('7A');
  const [newGender, setNewGender] = useState('Laki-laki');
  const [newNamaWali, setNewNamaWali] = useState('');

  const [loading, setLoading] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [savedSiswaTitle, setSavedSiswaTitle] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Import CSV / Excel States
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importedPreview, setImportedPreview] = useState<Siswa[] | null>(null);
  const [importFallbackClass, setImportFallbackClass] = useState('7A');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Auto-generate ID suggestion e.g. 7A-01, 7A-02 based on selected class
  const handleGenerateAutoId = (targetKls: string) => {
    const classPrefix = targetKls || '7A';
    const sameClassStudents = siswa.filter(s => s.kelas === classPrefix);
    const nextNum = sameClassStudents.length + 1;
    const formattedNum = nextNum < 10 ? `0${nextNum}` : `${nextNum}`;
    setNewId(`${classPrefix}-${formattedNum}`);
  };

  // Download CSV/Excel Template for Class 7 (or new students)
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'ID Santri (id_siswa)': '7A-01',
        'Nama Lengkap Santri (nama_siswa)': 'Ahmad Fauzi',
        'Penempatan Kelas (kelas)': '7A',
        'Jenis Kelamin (jenis_kelamin)': 'Laki-laki',
        'Nama Wali / Orang Tua (nama_wali)': 'Bpk. Ridwan'
      },
      {
        'ID Santri (id_siswa)': '7A-02',
        'Nama Lengkap Santri (nama_siswa)': 'Aisyah Nur Syafiqah',
        'Penempatan Kelas (kelas)': '7A',
        'Jenis Kelamin (jenis_kelamin)': 'Perempuan',
        'Nama Wali / Orang Tua (nama_wali)': 'Ibu Khadijah'
      },
      {
        'ID Santri (id_siswa)': '7B-01',
        'Nama Lengkap Santri (nama_siswa)': 'Muhammad Rizky Pratama',
        'Penempatan Kelas (kelas)': '7B',
        'Jenis Kelamin (jenis_kelamin)': 'Laki-laki',
        'Nama Wali / Orang Tua (nama_wali)': 'Bpk. Usman'
      },
      {
        'ID Santri (id_siswa)': '7C-01',
        'Nama Lengkap Santri (nama_siswa)': 'Fatimah Az-Zahra',
        'Penempatan Kelas (kelas)': '7C',
        'Jenis Kelamin (jenis_kelamin)': 'Perempuan',
        'Nama Wali / Orang Tua (nama_wali)': 'Ibu Maryam'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Santri');
    XLSX.writeFile(workbook, `Template_Import_Santri.xlsx`);
  };

  // Handle CSV/Excel File Import
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bstr = event.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (rawJson.length === 0) {
          alert("File kosong atau format tidak sesuai.");
          return;
        }

        const existingIds = new Set(siswa.map(s => s.id_siswa));
        const parsed: Siswa[] = [];

        rawJson.forEach((row, index) => {
          const keys = Object.keys(row);
          const getKey = (possibleNames: string[]) => {
            const found = keys.find(k => possibleNames.some(p => k.toLowerCase().trim().includes(p.toLowerCase())));
            return found ? String(row[found]).trim() : '';
          };

          const idVal = getKey(['id_siswa', 'id santri', 'id', 'nis', 'nisn']);
          const namaVal = getKey(['nama_siswa', 'nama lengkap', 'nama', 'santri']);
          const kelasVal = getKey(['kelas', 'rombel', 'penempatan']);
          const genderVal = getKey(['jenis_kelamin', 'jk', 'gender', 'jenis kelamin']);
          const waliVal = getKey(['nama_wali', 'wali', 'orang tua', 'nama ortu']);

          const finalId = idVal || `7A-${(siswa.length + parsed.length + 1).toString().padStart(2, '0')}`;
          const finalNama = namaVal || `Santri Baru ${index + 1}`;
          const finalKelas = kelasVal || importFallbackClass || '7A';

          if (!existingIds.has(finalId)) {
            parsed.push({
              id_siswa: finalId,
              nama_siswa: finalNama,
              kelas: finalKelas,
              jenis_kelamin: genderVal || 'Laki-laki',
              nama_wali: waliVal || ''
            });
          }
        });

        if (parsed.length === 0) {
          alert("Tidak ada data santri baru yang valid atau seluruh ID dalam file sudah ada di database.");
          return;
        }

        setImportedPreview(parsed);
        setIsImportModalOpen(true);
      } catch (err) {
        console.error("Gagal membaca file:", err);
        alert("Gagal membaca file Excel/CSV. Pastikan format file sesuai.");
      }
    };
    reader.readAsBinaryString(file);

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmImport = async () => {
    if (!importedPreview || importedPreview.length === 0 || !onAddBulkSiswa) return;
    setLoading(true);
    try {
      await onAddBulkSiswa(importedPreview);
      setIsImportModalOpen(false);
      setImportedPreview(null);
      setSavedSiswaTitle(`Berhasil Mengimpor ${importedPreview.length} Santri!`);
      setShowSuccessPopup(true);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintProfilePDF = (s: Siswa) => {
    const doc = new jsPDF();
    
    // Draw header
    doc.setFillColor(124, 58, 237);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('MADRASAH TSANAWIYAH IBAD AR RAHMAN', 105, 18, { align: 'center' });
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Sistem Informasi Terpadu EduSantri • Dokumen Portofolio Resmi', 105, 26, { align: 'center' });
    
    // Main title
    doc.setTextColor(30, 41, 59);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('KARTU PROFIL & REKAP PRESENSI SANTRI', 15, 55);
    
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(1);
    doc.line(15, 58, 195, 58);
    
    const gender = s.jenis_kelamin || 'Laki-laki';
    const wali = s.nama_wali || 'Orang Tua Santri';
    
    let sakit = 0;
    let izin = 0;
    let alpa = 0;
    let totalSesi = 0;
    let hadir = 0;
    let percentage = 100;
    
    if (jurnal && jurnal.length > 0) {
      const classJournals = jurnal.filter(j => j.kelas === s.kelas);
      totalSesi = classJournals.length;
      classJournals.forEach(j => {
        const isSakit = j.siswa_sakit.includes(s.nama_siswa);
        const isIzin = j.siswa_izin.includes(s.nama_siswa);
        const isAlpa = j.siswa_alpa.includes(s.nama_siswa);
        if (isSakit) sakit++;
        else if (isIzin) izin++;
        else if (isAlpa) alpa++;
      });
      hadir = totalSesi - (sakit + izin + alpa);
      percentage = totalSesi > 0 ? Math.round((hadir / totalSesi) * 100) : 100;
    }

    autoTable(doc, {
      startY: 65,
      head: [['Parameter Biodata', 'Detail Otentik Santri']],
      body: [
        ['ID / NISN Santri', `: ${s.id_siswa}`],
        ['Nama Lengkap', `: ${s.nama_siswa}`],
        ['Penempatan Kelas', `: Kelas ${s.kelas}`],
        ['Jenis Kelamin', `: ${gender}`],
        ['Nama Wali / Orang Tua', `: ${wali}`],
        ['Total Pertemuan KBM', `: ${totalSesi} Sesi Jurnal`],
        ['Total Hadir', `: ${hadir} Sesi (${percentage}%)`],
        ['Catatan Kehadiran', `: Sakit: ${sakit}, Izin: ${izin}, Alpa: ${alpa}`]
      ],
      theme: 'grid',
      headStyles: { fillColor: [124, 58, 237], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 4 }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 130;
    
    doc.setFontSize(11);
    doc.setFont('Helvetica', 'bold');
    doc.text('Catatan & Rekomendasi Pengasuhan:', 15, finalY + 15);
    
    doc.setFontSize(9.5);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    
    const notes = [
      '1. Santri dinyatakan aktif mengikuti seluruh rangkaian kegiatan belajar mengajar di pondok pesantren.',
      '2. Rekap absensi kehadiran dihitung secara dinamis dari catatan pengisian Jurnal Pembelajaran guru.',
      '3. Wali santri diharapkan berkoordinasi secara aktif dengan Wali Kelas untuk perkembangan ananda.',
      '4. Standar minimal persentase kehadiran di MTs Ibad Ar Rahman untuk mengikuti ujian adalah 80%.'
    ];
    
    let textY = finalY + 23;
    notes.forEach(note => {
      doc.text(note, 15, textY);
      textY += 6;
    });
    
    const signatureY = textY + 15;
    doc.setTextColor(30, 41, 59);
    doc.setFont('Helvetica', 'bold');
    doc.text('Mengetahui,', 25, signatureY);
    doc.text('Kepala Madrasah', 25, signatureY + 6);
    
    doc.text('Wali Kelas', 145, signatureY);
    doc.text(`Kelas ${s.kelas}`, 145, signatureY + 6);
    
    doc.setDrawColor(148, 163, 184);
    doc.line(25, signatureY + 35, 75, signatureY + 35);
    doc.line(145, signatureY + 35, 195, signatureY + 35);
    
    doc.setFontSize(9.5);
    doc.text(settings?.nama_kepala_madrasah || 'M. Azlan Andaru, M.Pd.', 25, signatureY + 40);
    doc.text('Ustadz Pembina', 145, signatureY + 40);
    
    doc.save(`Profil_Santri_${s.nama_siswa.replace(/\s+/g, '_')}.pdf`);
  };

  // Filter active student list for "Data Santri"
  const getFilteredSiswa = () => {
    let list = siswa.filter(s => !s.kelas.includes('Lulus') && !s.kelas.includes('Alumni'));

    if (user.role === 'wali') {
      const childIds = user.id_referensi ? user.id_referensi.split(',').map(x => x.trim()) : [];
      list = list.filter(s => childIds.includes(s.id_siswa));
    } else if (user.role !== 'admin' && user.role !== 'pengawas') {
      const teacherClasses = getTeacherClasses(user);
      list = list.filter(s => teacherClasses.includes(s.kelas));
    }

    if (filterKelas !== 'Semua') {
      list = list.filter(s => s.kelas === filterKelas);
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return list.filter(s =>
        s.nama_siswa.toLowerCase().includes(q) ||
        s.kelas.toLowerCase().includes(q) ||
        s.id_siswa.toLowerCase().includes(q)
      );
    }
    return list;
  };

  const filteredSiswa = getFilteredSiswa();

  // Pagination Calculations
  const totalItems = filteredSiswa.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSiswa = filteredSiswa.slice(startIndex, endIndex);

  // Form Handlers
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newId || !newNama) {
      alert('Mohon isi ID dan Nama Santri.');
      return;
    }

    if (siswa.some((s) => s.id_siswa === newId)) {
      alert(`ID Santri '${newId}' sudah terdaftar. Gunakan ID lain.`);
      return;
    }

    setLoading(true);
    try {
      const newSiswa: Siswa = {
        id_siswa: newId,
        nama_siswa: newNama,
        kelas: newKelas,
        jenis_kelamin: newGender,
        nama_wali: newNamaWali,
      };

      await onAddSiswa(newSiswa);

      setNewId('');
      setNewNama('');
      setNewNamaWali('');
      setIsAddModalOpen(false);
      setSavedSiswaTitle('Santri Baru Berhasil Terdaftar!');
      setShowSuccessPopup(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSuccessPopup = () => {
    setShowSuccessPopup(false);
  };

  const handleSaveEditStudent = async () => {
    if (!editingStudent || !editNewClass) return;
    setLoading(true);
    try {
      if (onUpdateSiswaClass) {
        await onUpdateSiswaClass(editingStudent.id_siswa, editNewClass);
      }
      setEditingStudent(null);
    } finally {
      setLoading(false);
    }
  };

  const activeSiswaList = siswa.filter(s => !s.kelas.includes('Lulus') && !s.kelas.includes('Alumni'));
  const lvl7SiswaList = activeSiswaList.filter(s => s.kelas.startsWith('7'));
  const lvl8SiswaList = activeSiswaList.filter(s => s.kelas.startsWith('8'));
  const lvl9SiswaList = activeSiswaList.filter(s => s.kelas.startsWith('9'));

  const validClasses = ['7A', '7B', '7C', '7D', '7E', '8A', '8B', '8C', '8D', '8E', '9A', '9B', '9C', '9D', '9E'];

  return (
    <div className="space-y-6">
      {/* Hidden File Input for Excel/CSV Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv, .xlsx, .xls"
        className="hidden"
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-800 mb-1 flex items-center gap-2">
            📂 Master Data Santri
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            Database biodata &amp; informasi seluruh santri aktif MTs Ibad Ar Rahman.
          </p>
        </div>

        <div className="bg-purple-50 border border-purple-100 px-4 py-2 rounded-2xl flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-600" />
          <span className="text-xs font-black text-purple-900">
            Total {activeSiswaList.length} Santri Aktif
          </span>
        </div>
      </div>

      {/* Panel Statistik Ringkas per Angkatan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-2">
        {/* Card 1: Total Santri Aktif */}
        <div className="bg-gradient-to-br from-purple-900 to-indigo-900 text-white p-4.5 rounded-2xl shadow-md border border-purple-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase text-purple-200 tracking-wider">Total Santri Aktif</span>
            <div className="w-8 h-8 rounded-xl bg-purple-700/60 border border-purple-500/40 flex items-center justify-center text-purple-200 shrink-0">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-3xl font-black">{activeSiswaList.length}</span>
            <span className="text-[10px] font-extrabold text-purple-200 bg-purple-800/80 px-2.5 py-0.5 rounded-full border border-purple-600/50">
              Santri Aktif
            </span>
          </div>
        </div>

        {/* Card 2: Level 7 */}
        <div className="bg-white p-4.5 rounded-2xl shadow-2xs border border-amber-200/80 flex flex-col justify-between hover:shadow-xs transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase text-amber-800 tracking-wider">Angkatan Level 7</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-3xl font-black text-amber-900">{lvl7SiswaList.length}</span>
            <span className="text-[10px] font-extrabold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              Kelas 7A-7E
            </span>
          </div>
        </div>

        {/* Card 3: Level 8 */}
        <div className="bg-white p-4.5 rounded-2xl shadow-2xs border border-emerald-200/80 flex flex-col justify-between hover:shadow-xs transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase text-emerald-800 tracking-wider">Angkatan Level 8</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-3xl font-black text-emerald-900">{lvl8SiswaList.length}</span>
            <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Kelas 8A-8E
            </span>
          </div>
        </div>

        {/* Card 4: Level 9 */}
        <div className="bg-white p-4.5 rounded-2xl shadow-2xs border border-indigo-200/80 flex flex-col justify-between hover:shadow-xs transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase text-indigo-800 tracking-wider">Angkatan Level 9</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-3xl font-black text-indigo-900">{lvl9SiswaList.length}</span>
            <span className="text-[10px] font-extrabold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
              Kelas 9A-9D
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Action Bar */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Cari Nama/Kelas/ID..."
              className="pl-11 pr-4 py-3 border border-slate-200 rounded-xl text-sm w-full focus:ring-2 focus:ring-purple-400 outline-none shadow-xs font-medium bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-black text-slate-500 uppercase flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-purple-600" /> Kelas:
            </span>
            {(() => {
              let availableClasses: string[] = [];
              if (['admin', 'pengawas'].includes(user.role)) {
                availableClasses = ([...new Set(siswa.filter(s => !s.kelas.includes('Lulus') && !s.kelas.includes('Alumni')).map(s => s.kelas))].filter(Boolean).sort()) as string[];
              } else if (['guru', 'wali_kelas'].includes(user.role)) {
                const teacherClasses = getTeacherClasses(user);
                availableClasses = teacherClasses.filter(k => siswa.some(s => s.kelas === k && !s.kelas.includes('Lulus') && !s.kelas.includes('Alumni'))).sort();
                if (availableClasses.length === 0) availableClasses = teacherClasses;
              } else if (user.role === 'wali') {
                const childIds = user.id_referensi ? user.id_referensi.split(',').map(x => x.trim()) : [];
                const myChildren = siswa.filter(s => childIds.includes(s.id_siswa));
                availableClasses = ([...new Set(myChildren.map(s => s.kelas))].filter(Boolean).sort()) as string[];
              }

              return (
                <select
                  value={filterKelas}
                  onChange={(e) => setFilterKelas(e.target.value)}
                  className="border border-slate-200 rounded-xl px-3 py-3 text-xs font-bold text-slate-700 bg-white focus:ring-2 focus:ring-purple-400 outline-none cursor-pointer shadow-xs min-w-[130px]"
                >
                  <option value="Semua">Semua Kelas</option>
                  {availableClasses.map((k, idx) => (
                    <option key={`filter-kls-${k}-${idx}`} value={k}>
                      Kelas {k} ({siswa.filter(s => s.kelas === k).length})
                    </option>
                  ))}
                </select>
              );
            })()}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0">
          {user.role === 'admin' && (
            <>
              {onResetSiswaToInitial && (
                <button
                  onClick={() => {
                    if (confirm('Kembalikan seluruh data santri ke data default awal?')) {
                      onResetSiswaToInitial();
                    }
                  }}
                  className="bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 px-3.5 py-3 rounded-xl font-bold transition flex items-center gap-1.5 text-xs cursor-pointer shadow-2xs shrink-0"
                  title="Kembalikan semua data santri ke data default awal"
                >
                  <RefreshCw className="w-4 h-4 text-rose-600" /> Reset Data Awal
                </button>
              )}

              <button
                onClick={handleDownloadTemplate}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-4 py-3 rounded-xl font-bold transition flex items-center gap-2 text-xs cursor-pointer shadow-2xs"
                title="Unduh Template Excel/CSV untuk Santri Baru"
              >
                <Download className="w-4 h-4 text-emerald-600" /> Template Excel
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 px-4 py-3 rounded-xl font-bold transition flex items-center gap-2 text-xs cursor-pointer shadow-2xs"
                title="Import data santri dari file CSV / Excel"
              >
                <Upload className="w-4 h-4 text-indigo-600" /> Import Excel / CSV
              </button>

              <button
                onClick={() => {
                  handleGenerateAutoId('7A');
                  setIsAddModalOpen(true);
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-3 rounded-xl font-black shadow-md transition transform hover:-translate-y-0.5 flex items-center gap-2 text-xs cursor-pointer shrink-0"
              >
                <UserPlus className="w-4 h-4" /> Tambah Santri Manual
              </button>
            </>
          )}
        </div>
      </div>

      {/* Table Data Santri */}
      <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-slate-100">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-black border-b border-slate-100">
            <tr>
              <th className="px-6 py-5 uppercase tracking-wider text-[11px]">ID Sistem</th>
              <th className="px-6 py-5 uppercase tracking-wider text-[11px]">Nama Lengkap Santri</th>
              <th className="px-6 py-5 uppercase tracking-wider text-[11px]">Penempatan Kelas</th>
              <th className="px-6 py-5 uppercase tracking-wider text-[11px] text-center">Profil PDF</th>
              {user.role === 'admin' && (
                <th className="px-6 py-5 uppercase tracking-wider text-[11px] text-center">Tindakan</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredSiswa.length === 0 ? (
              <tr>
                <td colSpan={user.role === 'admin' ? 5 : 4} className="px-6 py-8 text-center text-slate-400 font-medium italic">
                  Tidak ada data santri ditemukan.
                </td>
              </tr>
            ) : (
              paginatedSiswa.map((s) => (
                <tr key={s.id_siswa} className="hover:bg-purple-50/20 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded">
                      {s.id_siswa}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-black text-slate-800">{s.nama_siswa}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-black px-2.5 py-1 rounded-md text-[10px] tracking-wider uppercase border bg-purple-50 text-purple-700 border-purple-100">
                        Kelas {s.kelas}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handlePrintProfilePDF(s)}
                      className="bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 hover:border-purple-300 px-3.5 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 mx-auto shadow-2xs cursor-pointer active:scale-95"
                      title="Unduh Profil Lengkap (PDF)"
                    >
                      <FileText className="w-3.5 h-3.5" /> Profil PDF
                    </button>
                  </td>
                  {user.role === 'admin' && (
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setEditingStudent(s);
                            setEditNewClass(s.kelas);
                          }}
                          className="bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-800 px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          title="Ubah Rombel / Kelas"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-purple-600" /> Move Class
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(s.id_siswa)}
                          className="text-slate-300 hover:text-red-500 transition p-2 cursor-pointer"
                          title="Hapus Santri"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {filteredSiswa.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-bold">
            <span>Tampilkan</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border border-slate-200 bg-slate-50 rounded-lg py-1.5 px-2.5 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-purple-500/20"
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
              <span className="text-purple-600 font-black">{totalItems}</span> santri
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

            {(() => {
              const pages: (number | string)[] = [];
              const maxVisible = 5;
              
              if (totalPages <= maxVisible) {
                for (let i = 1; i <= totalPages; i++) pages.push(i);
              } else {
                pages.push(1);
                let start = Math.max(2, safeCurrentPage - 1);
                let end = Math.min(totalPages - 1, safeCurrentPage + 1);
                
                if (safeCurrentPage <= 2) {
                  end = 4;
                } else if (safeCurrentPage >= totalPages - 1) {
                  start = totalPages - 3;
                }
                
                if (start > 2) pages.push('...');
                for (let i = start; i <= end; i++) pages.push(i);
                if (end < totalPages - 1) pages.push('...');
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
                        ? 'bg-purple-600 border-purple-600 text-white shadow-sm'
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

      {/* MODAL 1: Move Class / Edit Single Student */}
      {editingStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md flex flex-col p-6 animate-fade-in border border-slate-100">
            <h3 className="font-black text-lg text-slate-800 mb-1 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-purple-600" /> Ubah Penempatan Kelas Santri
            </h3>
            <p className="text-xs text-slate-500 font-medium mb-5">
              Pindahkan <span className="font-bold text-slate-800">{editingStudent.nama_siswa}</span> ke rombel lain secara individual.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-black text-slate-500 block mb-1 uppercase">Kelas Saat Ini</label>
                <input
                  type="text"
                  disabled
                  value={`Kelas ${editingStudent.kelas}`}
                  className="w-full bg-slate-100 border border-slate-200 p-3 rounded-xl font-bold text-slate-500 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 block mb-1 uppercase">Pilih Kelas Baru</label>
                <select
                  value={editNewClass}
                  onChange={(e) => setEditNewClass(e.target.value)}
                  className="w-full border border-purple-200 p-3.5 rounded-xl font-black text-purple-900 bg-purple-50 focus:ring-2 focus:ring-purple-400 outline-none text-sm"
                >
                  {validClasses.map((k, idx) => (
                    <option key={`modal-tgt-${k}-${idx}`} value={k}>Kelas {k}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveEditStudent}
                disabled={loading}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-black text-xs transition shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                {loading ? 'Simpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Pendaftaran Santri Baru */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg flex flex-col p-6 sm:p-8 animate-fade-in border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-extrabold text-xl text-slate-800">
                  Pendaftaran Santri Baru
                </h3>
                <p className="text-xs text-slate-500 font-medium">Input manual biodata santri baru madrasah.</p>
              </div>
              
              <button
                type="button"
                onClick={() => handleGenerateAutoId(newKelas)}
                className="bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                title="Generasi Otomatis ID Santri"
              >
                <Wand2 className="w-3.5 h-3.5" /> Auto ID
              </button>
            </div>
            
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="text-xs font-black text-slate-500 block mb-1 uppercase tracking-wider">
                  Identitas Unik (ID Sistem Santri)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 7A-01"
                  className="w-full border border-slate-200 p-3.5 rounded-xl font-mono focus:ring-2 focus:ring-purple-400 outline-none shadow-sm text-slate-700 text-sm"
                  value={newId}
                  onChange={(e) => setNewId(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 block mb-1 uppercase tracking-wider">
                  Nama Lengkap Santri
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nama Lengkap Otentik..."
                  className="w-full border border-slate-200 p-3.5 rounded-xl font-bold focus:ring-2 focus:ring-purple-400 outline-none shadow-sm text-slate-700 text-sm"
                  value={newNama}
                  onChange={(e) => setNewNama(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-slate-500 block mb-1 uppercase tracking-wider">
                    Penempatan Kelas
                  </label>
                  <select
                    required
                    className="w-full border border-slate-200 p-3.5 rounded-xl font-black bg-slate-50 focus:ring-2 focus:ring-purple-400 outline-none shadow-sm text-slate-700 text-sm"
                    value={newKelas}
                    onChange={(e) => {
                      setNewKelas(e.target.value);
                      handleGenerateAutoId(e.target.value);
                    }}
                  >
                    {validClasses.map(k => (
                      <option key={k} value={k}>Kelas {k}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-500 block mb-1 uppercase tracking-wider">
                    Jenis Kelamin
                  </label>
                  <select
                    className="w-full border border-slate-200 p-3.5 rounded-xl font-bold bg-slate-50 focus:ring-2 focus:ring-purple-400 outline-none shadow-sm text-slate-700 text-sm"
                    value={newGender}
                    onChange={(e) => setNewGender(e.target.value)}
                  >
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 block mb-1 uppercase tracking-wider">
                  Nama Wali / Orang Tua
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Bpk. Ahmad Fauzi"
                  className="w-full border border-slate-200 p-3.5 rounded-xl font-medium focus:ring-2 focus:ring-purple-400 outline-none shadow-sm text-slate-700 text-sm"
                  value={newNamaWali}
                  onChange={(e) => setNewNamaWali(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-3.5 border border-slate-200 font-bold rounded-xl hover:bg-slate-50 text-sm cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-xl text-sm shadow-md cursor-pointer transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  {loading ? 'Menyimpan...' : 'Daftarkan Santri'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Import Preview Modal */}
      {isImportModalOpen && importedPreview && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl flex flex-col p-6 sm:p-8 animate-fade-in border border-slate-100 max-h-[85vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-extrabold text-xl text-slate-800 flex items-center gap-2">
                  <FileSpreadsheet className="w-6 h-6 text-indigo-600" /> Pratinjau Impor Data Santri Baru
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Ditemukan <span className="font-black text-indigo-600">{importedPreview.length} santri baru</span> yang siap dimasukkan ke database.
                </p>
              </div>

              <div className="bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl font-mono text-xs font-bold text-indigo-800">
                {importedPreview.length} Entri
              </div>
            </div>

            <div className="flex-1 overflow-y-auto mb-4 border border-slate-100 rounded-2xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-black border-b border-slate-100 sticky top-0">
                  <tr>
                    <th className="px-4 py-3">No</th>
                    <th className="px-4 py-3">ID Sistem</th>
                    <th className="px-4 py-3">Nama Santri</th>
                    <th className="px-4 py-3">Kelas</th>
                    <th className="px-4 py-3">Gender</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {importedPreview.map((item, idx) => (
                    <tr key={`prev-${item.id_siswa}-${idx}`} className="hover:bg-indigo-50/20">
                      <td className="px-4 py-2.5 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="px-4 py-2.5 font-mono font-bold text-slate-600">{item.id_siswa}</td>
                      <td className="px-4 py-2.5 font-bold text-slate-800">{item.nama_siswa}</td>
                      <td className="px-4 py-2.5">
                        <span className="font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-[10px]">
                          Kelas {item.kelas}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{item.jenis_kelamin || 'Laki-laki'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-400 font-medium">
                Sistem akan melewati ID santri yang sudah terdaftar sebelumnya.
              </span>

              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setImportedPreview(null);
                  }}
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={loading}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs transition shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {loading ? 'Mengimpor...' : `Proses Impor ${importedPreview.length} Santri`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden flex flex-col p-6 text-center border border-slate-100 animate-fade-in">
            <div className="mx-auto mb-4">
              <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center shadow-md animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>
            </div>

            <h3 className="text-xl font-black mb-2 text-slate-800 tracking-tight">
              {savedSiswaTitle}
            </h3>
            
            <p className="text-slate-500 mb-6 text-xs leading-relaxed font-semibold">
              Sistem telah berhasil memperbarui data santri dan tersimpan dengan aman di database.
            </p>

            <button
              onClick={handleCloseSuccessPopup}
              className="w-full bg-purple-600 text-white font-black text-sm py-3.5 rounded-2xl hover:bg-purple-700 shadow-xl transition transform active:scale-95 cursor-pointer"
            >
              OK, SAYA MENGERTI
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog before Deleting Student */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md flex flex-col p-6 animate-fade-in border border-slate-100">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="font-extrabold text-lg text-slate-800">Konfirmasi Hapus Santri</h3>
            </div>
            
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              Apakah Anda yakin ingin menghapus data santri ini? Semua riwayat nilai, presensi, dan log terkait akan hilang secara permanen.
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
                    await onDeleteSiswa(deleteConfirmId);
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
    </div>
  );
};
