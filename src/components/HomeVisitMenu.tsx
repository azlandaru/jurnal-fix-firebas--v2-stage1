import React, { useState } from 'react';
import { HomeVisit, User, Siswa, getTeacherClasses } from '../types';
import { Search, Plus, Trash2, Edit, FileText, Camera, Eye, CheckCircle2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { formatDateID, generateHomeVisitPDF } from '../utils/pdfGenerator';

interface HomeVisitMenuProps {
  user: User;
  siswa: Siswa[];
  homeVisits: HomeVisit[];
  onAddHomeVisit: (hv: HomeVisit) => Promise<void>;
  onEditHomeVisit: (hv: HomeVisit) => Promise<void>;
  onDeleteHomeVisit: (id: string) => Promise<void>;
  onOpenLightbox: (url: string, title: string, date: string) => void;
  onPrintHomeVisitPDF?: (hv: HomeVisit) => void; // Parent can pass standard download if requested
}

export const HomeVisitMenu: React.FC<HomeVisitMenuProps> = ({
  user,
  siswa,
  homeVisits,
  onAddHomeVisit,
  onEditHomeVisit,
  onDeleteHomeVisit,
  onOpenLightbox,
  onPrintHomeVisitPDF
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
  const [savedVisitTitle, setSavedVisitTitle] = useState('');

  // Form states
  const [tanggal, setTanggal] = useState(new Date().toISOString().substring(0, 10));
  const [selectedKelas, setSelectedKelas] = useState('');
  const [idSiswa, setIdSiswa] = useState('');
  const [alasan, setAlasan] = useState('');
  const [hasil, setHasil] = useState('');
  const [tindakLanjut, setTindakLanjut] = useState('');
  const [foto1, setFoto1] = useState('');
  const [foto2, setFoto2] = useState('');

  const isReadOnly = user.role === 'pengawas';

  // Auth classes
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

  const authClasses = getAuthorizedClasses();

  // Filter home visit data
  const getFilteredHomeVisits = () => {
    let list = homeVisits;
    if (user.role !== 'admin' && user.role !== 'pengawas') {
      const authSiswaIds = siswa.filter(s => authClasses.includes(s.kelas)).map(s => s.id_siswa);
      list = homeVisits.filter(h => authSiswaIds.includes(h.id_siswa) || h.nama_guru === user.nama_lengkap);
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return list.filter(h => {
        const student = siswa.find(s => s.id_siswa === h.id_siswa);
        return (
          h.nama_guru.toLowerCase().includes(q) ||
          h.alasan_kunjungan.toLowerCase().includes(q) ||
          h.hasil_kunjungan.toLowerCase().includes(q) ||
          (student && student.nama_siswa.toLowerCase().includes(q))
        );
      });
    }
    return list;
  };

  const filteredVisits = getFilteredHomeVisits();

  // Paginated Visits Logic
  const totalItems = filteredVisits.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const safeCurrentPage = Math.min(currentPage, Math.max(1, totalPages));
  
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedVisits = filteredVisits.slice(startIndex, endIndex);

  const handleOpenAdd = () => {
    setEditingId(null);
    setTanggal(new Date().toISOString().substring(0, 10));
    setSelectedKelas(authClasses[0] || '');
    setIdSiswa('');
    setAlasan('');
    setHasil('');
    setTindakLanjut('');
    setFoto1('');
    setFoto2('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (hv: HomeVisit) => {
    const s = siswa.find(x => x.id_siswa === hv.id_siswa);
    setEditingId(hv.id_kunjungan);
    setTanggal(hv.tanggal.substring(0, 10));
    setSelectedKelas(s ? s.kelas : '');
    setIdSiswa(hv.id_siswa);
    setAlasan(hv.alasan_kunjungan);
    setHasil(hv.hasil_kunjungan);
    setTindakLanjut(hv.tindak_lanjut);
    setFoto1(hv.foto_1 || '');
    setFoto2(hv.foto_2 || '');
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, num: 1 | 2) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2097152) {
      alert("Ukuran file maksimal 2MB!");
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64String = reader.result as string;
      const compressed = await compressImage(base64String);
      if (num === 1) setFoto1(compressed);
      else setFoto2(compressed);
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idSiswa || !alasan || !hasil || !tindakLanjut) {
      alert("Semua kolom harus diisi!");
      return;
    }
    if (!editingId && !foto1) {
      alert("Wajib melampirkan minimal 1 (satu) foto dokumentasi bukti pelaporan!");
      return;
    }

    setLoading(true);
    try {
      const payload: HomeVisit = {
        id_kunjungan: editingId || 'HV' + Date.now(),
        tanggal: new Date(tanggal).toISOString(),
        id_siswa: idSiswa,
        nama_guru: editingId ? (homeVisits.find(x => x.id_kunjungan === editingId)?.nama_guru || user.nama_lengkap) : user.nama_lengkap,
        alasan_kunjungan: alasan,
        hasil_kunjungan: hasil,
        tindak_lanjut: tindakLanjut,
        foto_1: foto1 || undefined,
        foto_2: foto2 || undefined
      };

      if (editingId) {
        await onEditHomeVisit(payload);
        setSavedVisitTitle("Kunjungan Rumah Berhasil Diubah");
      } else {
        await onAddHomeVisit(payload);
        setSavedVisitTitle("Kunjungan Rumah Berhasil Direkam");
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
            🏠 Kunjungan Rumah (Home Visit)
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            Laporan koordinasi dan tindak lanjut visitasi ke wali santri.
          </p>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Cari Laporan..."
              className="pl-11 pr-4 py-3.5 border border-slate-200 rounded-xl text-sm w-full focus:ring-2 focus:ring-cyan-400 outline-none shadow-sm font-medium bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {!isReadOnly && (
            <button
              onClick={handleOpenAdd}
              className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-3.5 rounded-xl font-black shadow-md transition transform hover:-translate-y-0.5 flex items-center gap-2 text-sm cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" /> Input Visit
            </button>
          )}
        </div>
      </div>

      {/* Grid Table */}
      <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-slate-100">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-black border-b border-slate-100">
            <tr>
              <th className="px-6 py-5 uppercase tracking-wider text-[11px]">Tanggal</th>
              <th className="px-6 py-5 uppercase tracking-wider text-[11px]">Data Santri</th>
              <th className="px-6 py-5 uppercase tracking-wider text-[11px]">Alasan</th>
              <th className="px-6 py-5 uppercase tracking-wider text-[11px]">Hasil Visit</th>
              <th className="px-6 py-5 uppercase tracking-wider text-[11px]">Guru Visit</th>
              <th className="px-6 py-5 uppercase tracking-wider text-[11px] text-center">Tindakan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredVisits.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-400 font-medium italic">
                  Belum ada laporan kunjungan rumah.
                </td>
              </tr>
            ) : (
              paginatedVisits.map((v) => {
                const sI = siswa.find(s => s.id_siswa === v.id_siswa);
                const isAuthor = user.role === 'admin' || v.nama_guru === user.nama_lengkap;
                return (
                  <tr key={v.id_kunjungan} className="hover:bg-cyan-50/20 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-bold text-slate-700">{formatDateID(v.tanggal)}</span>
                    </td>
                    <td className="px-6 py-4">
                      {sI ? (
                        <div>
                          <span className="font-black text-slate-800">{sI.nama_siswa}</span>
                          <br />
                          <span className="text-[10px] text-cyan-700 font-black tracking-wider uppercase bg-cyan-50 border border-cyan-100 px-2 py-0.5 rounded-md mt-1 inline-block">
                            KLS {sI.kelas}
                          </span>
                        </div>
                      ) : (
                        <span className="font-mono text-xs text-slate-500">{v.id_siswa}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="truncate w-40 text-sm font-semibold text-slate-600" title={v.alasan_kunjungan}>
                        {v.alasan_kunjungan}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="truncate w-40 text-sm font-semibold text-slate-600" title={v.hasil_kunjungan}>
                        {v.hasil_kunjungan}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs font-bold text-slate-700">{v.nama_guru}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={async (e) => {
                            const btn = e.currentTarget;
                            const originalTitle = btn.getAttribute('title') || 'Ekspor PDF';
                            try {
                              btn.disabled = true;
                              btn.setAttribute('title', 'Memuat...');
                              const studentName = sI ? sI.nama_siswa : 'Santri';
                              const studentKelas = sI ? sI.kelas : 'Rombel';
                              const parentName = sI ? sI.nama_wali : '-';
                              await generateHomeVisitPDF(v, studentName, studentKelas, parentName);
                            } catch (err) {
                              console.error(err);
                              alert('Gagal mengekspor PDF.');
                            } finally {
                              btn.disabled = false;
                              btn.setAttribute('title', originalTitle);
                            }
                          }}
                          className="text-cyan-500 hover:text-cyan-700 transition"
                          title="Ekspor PDF"
                        >
                          <FileText className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            const desc = `Alasan Kunjungan:\n${v.alasan_kunjungan}\n\nHasil Kunjungan:\n${v.hasil_kunjungan}\n\nTindak Lanjut:\n${v.tindak_lanjut}`;
                            alert(desc);
                          }}
                          className="text-blue-500 hover:text-blue-700 transition"
                          title="Lihat Detail"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Photo 1 display */}
                        {v.foto_1 && (
                          <button
                            onClick={() => onOpenLightbox(v.foto_1!, 'Foto Visit 1 - ' + (sI?.nama_siswa || ''), formatDateID(v.tanggal))}
                            className="text-indigo-500 hover:text-indigo-700 transition"
                            title="Foto 1"
                          >
                            <Camera className="w-4 h-4" />
                          </button>
                        )}

                        {!isReadOnly && isAuthor && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(v)}
                              className="text-emerald-500 hover:text-emerald-700 transition"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onDeleteHomeVisit(v.id_kunjungan)}
                              className="text-slate-300 hover:text-red-500 transition"
                              title="Hapus"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination Controls */}
        {filteredVisits.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50 p-5 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-bold">
              <span>Tampilkan</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-slate-200 bg-white rounded-lg py-1.5 px-2.5 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-cyan-500/20"
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
                <span className="text-cyan-600 font-black">{totalItems}</span> kunjungan
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
                          ? 'bg-cyan-600 border-cyan-600 text-white shadow-sm'
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

      {/* Input/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9990] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl flex flex-col p-6 max-h-[90vh] overflow-y-auto animate-fade-in my-auto">
            <h3 className="font-extrabold text-xl text-slate-800 mb-6 border-b border-slate-100 pb-4">
              {editingId ? 'Edit Laporan Home Visit' : 'Laporan Home Visit Baru'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="mb-5">
                <label className="text-xs font-black text-slate-500 block mb-2 uppercase tracking-wider">
                  Tanggal Kunjungan
                </label>
                <input
                  type="date"
                  required
                  className="w-full border border-slate-200 p-4 rounded-xl font-bold bg-slate-50 text-slate-700 focus:ring-2 focus:ring-cyan-400 outline-none"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div>
                  <label className="text-xs font-black text-slate-500 block mb-2 uppercase tracking-wider">
                    Pilih Kelas
                  </label>
                  <select
                    required
                    className="w-full border border-slate-200 p-4 rounded-xl font-bold bg-white shadow-sm text-slate-700 outline-none"
                    value={selectedKelas}
                    onChange={(e) => {
                      setSelectedKelas(e.target.value);
                      setIdSiswa('');
                    }}
                  >
                    <option value="">-- Pilih Kelas --</option>
                    {authClasses.map(c => (
                      <option key={c} value={c}>Kelas {c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-500 block mb-2 uppercase tracking-wider">
                    Santri Target
                  </label>
                  <select
                    required
                    className="w-full border border-slate-200 p-4 rounded-xl font-bold bg-white shadow-sm text-slate-700 outline-none"
                    value={idSiswa}
                    onChange={(e) => setIdSiswa(e.target.value)}
                  >
                    <option value="">-- Pilih Santri --</option>
                    {siswa
                      .filter(s => s.kelas === selectedKelas && !s.kelas.includes('Lulus') && !s.kelas.includes('Alumni'))
                      .map(s => (
                        <option key={s.id_siswa} value={s.id_siswa}>
                          {s.nama_siswa} (Kelas {s.kelas})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 block mb-2 uppercase tracking-wider">
                  Alasan Dasar Visitasi
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Mengapa kunjungan ini dilakukan?"
                  className="w-full border border-slate-200 p-4 rounded-xl font-medium bg-white shadow-sm text-slate-700 outline-none focus:ring-2 focus:ring-cyan-400"
                  value={alasan}
                  onChange={(e) => setAlasan(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 block mb-2 uppercase tracking-wider">
                  Hasil Diskusi Keluarga
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Tulis hasil wawancara atau kesepakatan..."
                  className="w-full border border-slate-200 p-4 rounded-xl font-medium bg-white shadow-sm text-slate-700 outline-none focus:ring-2 focus:ring-cyan-400"
                  value={hasil}
                  onChange={(e) => setHasil(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 block mb-2 uppercase tracking-wider">
                  Tindak Lanjut &amp; Perjanjian
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Langkah nyata ke depan dari guru dan keluarga..."
                  className="w-full border border-slate-200 p-4 rounded-xl font-medium bg-white shadow-sm text-slate-700 outline-none focus:ring-2 focus:ring-cyan-400"
                  value={tindakLanjut}
                  onChange={(e) => setTindakLanjut(e.target.value)}
                />
              </div>

              <div className="bg-cyan-50/50 p-6 rounded-2xl mb-8 border border-cyan-100">
                <label className="text-xs font-black text-cyan-950 block mb-3 uppercase tracking-wider flex items-center gap-2">
                  <Camera className="text-cyan-500 w-5 h-5" /> Foto Bukti Visitasi (*Wajib min 1 foto)
                </label>
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="flex-1">
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">FOTO 1</label>
                    <input
                      type="file"
                      accept="image/*"
                      required={!editingId && !foto1}
                      onChange={(e) => handleFileChange(e, 1)}
                      className="w-full border border-cyan-200 bg-white p-2.5 rounded-xl text-xs font-medium"
                    />
                    {foto1 && <p className="text-[10px] text-green-600 font-bold mt-1">✓ Terunggah</p>}
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">FOTO 2 (OPSIONAL)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 2)}
                      className="w-full border border-cyan-200 bg-white p-2.5 rounded-xl text-xs font-medium"
                    />
                    {foto2 && <p className="text-[10px] text-green-600 font-bold mt-1">✓ Terunggah</p>}
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
                  className="flex-1 bg-cyan-600 text-white font-black text-base py-4 rounded-xl shadow-xl hover:bg-cyan-700 transition transform active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Menyimpan...' : (editingId ? 'SIMPAN PERUBAHAN' : 'REKAM VISITASI')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden flex flex-col p-8 text-center border border-slate-100 animate-fade-in">
            <div className="mx-auto mb-6">
              <div className="w-20 h-20 bg-cyan-100 text-cyan-600 rounded-full flex items-center justify-center shadow-md animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
            </div>

            <h3 className="text-2xl font-black mb-3 text-slate-800 tracking-tight">
              {savedVisitTitle}
            </h3>
            
            <p className="text-slate-500 mb-8 text-sm leading-relaxed font-semibold">
              Laporan Kunjungan Rumah (Home Visit) berhasil disimpan dengan aman ke sistem dan diarahkan kembali ke riwayat pengisian.
            </p>

            <button
              onClick={handleCloseSuccessPopup}
              className="w-full bg-cyan-600 text-white font-black text-base py-4.5 rounded-2xl hover:bg-cyan-700 shadow-xl transition transform active:scale-95 cursor-pointer"
            >
              OK, SAYA MENGERTI
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
