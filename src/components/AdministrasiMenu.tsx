import React, { useState } from 'react';
import { Administrasi, User, Siswa } from '../types';
import { Search, Plus, Trash2, ExternalLink, Calendar, Info, FileText, CheckCircle2, AlertTriangle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { formatDateID } from '../utils/pdfGenerator';

interface AdministrasiMenuProps {
  user: User;
  administrasi: Administrasi[];
  batasWaktu: string;
  onAddAdministrasi: (a: Administrasi) => Promise<void>;
  onDeleteAdministrasi: (id: string) => Promise<void>;
}

export const AdministrasiMenu: React.FC<AdministrasiMenuProps> = ({
  user,
  administrasi,
  batasWaktu,
  onAddAdministrasi,
  onDeleteAdministrasi
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
  const [loading, setLoading] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [savedAdminTitle, setSavedAdminTitle] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form states
  const [tanggal, setTanggal] = useState(new Date().toISOString().substring(0, 10));
  const [namaFile, setNamaFile] = useState('');
  const [jenisFile, setJenisFile] = useState<'pdf' | 'doc' | 'url'>('pdf');
  const [urlFileInput, setUrlFileInput] = useState('');
  const [localFileBase64, setLocalFileBase64] = useState('');

  const isReadOnly = user.role === 'pengawas';

  const getFilteredDocs = () => {
    let list = administrasi || [];
    if (user.role !== 'admin' && user.role !== 'pengawas') {
      list = list.filter(a => a.nama_guru === user.nama_lengkap);
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return list.filter(a =>
        a.nama_file.toLowerCase().includes(q) ||
        a.nama_guru.toLowerCase().includes(q) ||
        a.jenis_file.toLowerCase().includes(q)
      );
    }
    return list;
  };

  const filteredDocs = getFilteredDocs();

  // Paginated Docs Logic
  const totalItems = filteredDocs.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const safeCurrentPage = Math.min(currentPage, Math.max(1, totalPages));
  
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDocs = filteredDocs.slice(startIndex, endIndex);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2097152) {
      alert("Maksimal ukuran file 2MB!");
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setLocalFileBase64(reader.result as string);
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaFile) return;

    let fileUrl = '';
    if (jenisFile === 'url') {
      fileUrl = urlFileInput.trim();
      if (!fileUrl) {
        alert("Tautan Drive / URL wajib diisi!");
        return;
      }
    } else {
      fileUrl = localFileBase64;
      if (!fileUrl) {
        alert("Wajib melampirkan file dokumen!");
        return;
      }
    }

    setLoading(true);
    try {
      const payload: Administrasi = {
        id_file: 'ADM' + Date.now(),
        tanggal: new Date(tanggal).toISOString(),
        nama_guru: user.nama_lengkap,
        nama_file: namaFile.trim(),
        jenis_file: jenisFile,
        url_file: fileUrl
      };

      await onAddAdministrasi(payload);
      setNamaFile('');
      setUrlFileInput('');
      setLocalFileBase64('');
      setSavedAdminTitle("Administrasi Berhasil Direkam");
      setShowSuccessPopup(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSuccessPopup = () => {
    setShowSuccessPopup(false);
    setIsModalOpen(false);
  };

  const checkLateStatus = (submitDateStr: string) => {
    if (!batasWaktu) return null;
    const submitDate = new Date(submitDateStr).setHours(0, 0, 0, 0);
    const limitDate = new Date(batasWaktu).setHours(0, 0, 0, 0);
    return submitDate > limitDate;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 mb-1 flex items-center gap-2">
            📂 Administrasi Guru
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            Batas Pengumpulan: <span className="font-bold text-red-500">{batasWaktu ? formatDateID(batasWaktu) : 'Belum diatur'}</span>
          </p>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Cari Dokumen..."
              className="pl-11 pr-4 py-3.5 border border-slate-200 rounded-xl text-sm w-full focus:ring-2 focus:ring-orange-400 outline-none shadow-sm font-medium bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {!isReadOnly && (
            <button
              onClick={() => {
                setTanggal(new Date().toISOString().substring(0, 10));
                setNamaFile('');
                setJenisFile('pdf');
                setUrlFileInput('');
                setLocalFileBase64('');
                setIsModalOpen(true);
              }}
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3.5 rounded-xl font-black shadow-md transition transform hover:-translate-y-0.5 flex items-center gap-2 text-sm cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" /> Upload File
            </button>
          )}
        </div>
      </div>

      {/* Grid Table */}
      <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-slate-100">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-black border-b border-slate-100">
            <tr>
              <th className="px-6 py-5 uppercase tracking-wider text-[11px]">Tgl. Kirim</th>
              <th className="px-6 py-5 uppercase tracking-wider text-[11px]">Nama Dokumen</th>
              <th className="px-6 py-5 uppercase tracking-wider text-[11px]">Format</th>
              <th className="px-6 py-5 uppercase tracking-wider text-[11px]">Nama Guru</th>
              <th className="px-6 py-5 uppercase tracking-wider text-[11px]">Status Waktu</th>
              <th className="px-6 py-5 uppercase tracking-wider text-[11px]">Tindakan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredDocs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-400 font-medium italic">
                  Belum ada dokumen administrasi yang diserahkan.
                </td>
              </tr>
            ) : (
              paginatedDocs.map((a) => {
                const isLate = checkLateStatus(a.tanggal);
                const isAuthor = user.role === 'admin' || a.nama_guru === user.nama_lengkap;
                return (
                  <tr key={a.id_file} className="hover:bg-orange-50/10 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-bold text-slate-700">{formatDateID(a.tanggal)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-black text-slate-800">{a.nama_file}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="uppercase font-black text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-md tracking-widest border border-slate-200">
                        {a.jenis_file}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-600">{a.nama_guru}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isLate === null ? (
                        <span className="text-slate-400 text-xs font-bold">-</span>
                      ) : isLate ? (
                        <span className="bg-red-50 text-red-700 px-2.5 py-1 rounded-lg text-[10px] font-black border border-red-100 uppercase tracking-wider">
                          ⚠️ Terlambat
                        </span>
                      ) : (
                        <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg text-[10px] font-black border border-emerald-100 uppercase tracking-wider">
                          ✓ Tepat Waktu
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <a
                          href={a.url_file}
                          target="_blank"
                          rel="noreferrer referrer"
                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg font-bold flex items-center transition shadow-sm text-xs gap-1"
                        >
                          <ExternalLink className="w-3 h-3" /> Buka
                        </a>
                        {!isReadOnly && isAuthor && (
                          <button
                            onClick={() => setDeleteConfirmId(a.id_file)}
                            className="text-slate-400 hover:text-red-500 transition p-2 cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
        {filteredDocs.length > 0 && (
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
                {[5, 10, 25, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size} entri
                  </option>
                ))}
              </select>
              <span>
                Menampilkan <span className="text-slate-800 font-black">{totalItems === 0 ? 0 : startIndex + 1}</span> s/d{' '}
                <span className="text-slate-800 font-black">{Math.min(endIndex, totalItems)}</span> dari{' '}
                <span className="text-indigo-600 font-black">{totalItems}</span> dokumen
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

      {/* Upload Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9990] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg flex flex-col p-6 animate-fade-in">
            <h3 className="font-extrabold text-xl text-slate-800 mb-6 border-b border-slate-100 pb-4">
              Pengumpulan Berkas Administrasi
            </h3>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-xs font-black text-slate-500 block mb-2 uppercase tracking-wider">
                  Tanggal Penyerahan
                </label>
                <input
                  type="date"
                  required
                  className="w-full border border-slate-200 p-4 rounded-xl font-bold bg-slate-50 text-slate-700 outline-none"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 block mb-2 uppercase tracking-wider">
                  Judul / Nama Dokumen Administrasi
                </label>
                <input
                  type="text"
                  required
                  className="w-full border border-slate-200 p-4 rounded-xl font-bold bg-white shadow-sm focus:ring-2 focus:ring-orange-400 outline-none text-slate-700"
                  placeholder="Contoh: RPP Matematika Semester 1 Kelas 7"
                  value={namaFile}
                  onChange={(e) => setNamaFile(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 block mb-2 uppercase tracking-wider">
                  Metode Penyerahan (Format)
                </label>
                <select
                  required
                  className="w-full border border-slate-200 p-4 rounded-xl font-black text-slate-700 bg-white shadow-sm focus:ring-2 focus:ring-orange-400 outline-none"
                  value={jenisFile}
                  onChange={(e) => setJenisFile(e.target.value as any)}
                >
                  <option value="pdf">📄 UPLOAD BERKAS PDF</option>
                  <option value="doc">📝 UPLOAD BERKAS WORD/EXCEL</option>
                  <option value="url">🔗 TAUTAN DRIVE (URL)</option>
                </select>
              </div>

              {jenisFile === 'url' ? (
                <div>
                  <label className="text-xs font-black text-slate-500 block mb-2 uppercase tracking-wider">
                    Tautan Google Drive (URL)
                  </label>
                  <input
                    type="url"
                    required
                    className="w-full border border-slate-200 p-4 rounded-xl font-medium bg-white shadow-sm focus:ring-2 focus:ring-orange-400 outline-none text-slate-700"
                    placeholder="https://drive.google.com/..."
                    value={urlFileInput}
                    onChange={(e) => setUrlFileInput(e.target.value)}
                  />
                </div>
              ) : (
                <div className="mb-8 bg-orange-50 border border-orange-200 p-6 rounded-2xl shadow-inner">
                  <label className="text-sm font-black text-orange-900 block mb-3 flex items-center gap-2 uppercase tracking-wider">
                    <FileText className="text-orange-500 w-5 h-5" /> Silakan Upload File
                  </label>
                  <input
                    type="file"
                    required
                    accept={jenisFile === 'pdf' ? '.pdf' : '.doc,.docx,.xls,.xlsx'}
                    className="w-full border border-orange-200 p-3 rounded-xl bg-white font-medium focus:ring-2 focus:ring-orange-400 outline-none text-xs text-slate-700"
                    onChange={handleFileChange}
                  />
                  <p className="text-xs font-bold text-orange-600 mt-3 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5" /> Format: {jenisFile === 'pdf' ? 'PDF' : 'DOC/XLS'}. Maks 2MB.
                  </p>
                  {localFileBase64 && <p className="text-xs text-green-600 font-bold mt-2">✓ Berkas terlampir</p>}
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
                  className="flex-1 bg-orange-500 hover:bg-orange-600 transition text-white font-black text-base py-4 rounded-xl shadow-xl transform active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Menyimpan...' : 'SIMPAN DOKUMEN'}
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
              <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center shadow-md animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
            </div>

            <h3 className="text-2xl font-black mb-3 text-slate-800 tracking-tight">
              {savedAdminTitle}
            </h3>
            
            <p className="text-slate-500 mb-8 text-sm leading-relaxed font-semibold">
              Dokumen administrasi Anda berhasil terekam dengan aman ke sistem dan diarahkan ke daftar riwayat administrasi.
            </p>

            <button
              onClick={handleCloseSuccessPopup}
              className="w-full bg-orange-500 text-white font-black text-base py-4.5 rounded-2xl hover:bg-orange-600 shadow-xl transition transform active:scale-95 cursor-pointer"
            >
              OK, SAYA MENGERTI
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog before Deleting Administrasi */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md flex flex-col p-6 animate-fade-in border border-slate-100">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="font-extrabold text-lg text-slate-800">Konfirmasi Hapus Berkas</h3>
            </div>
            
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              Apakah Anda yakin ingin menghapus berkas administrasi ini secara permanen? Tindakan ini tidak dapat dibatalkan.
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
                    await onDeleteAdministrasi(deleteConfirmId);
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
