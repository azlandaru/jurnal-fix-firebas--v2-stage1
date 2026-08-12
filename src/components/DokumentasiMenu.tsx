import React, { useState } from 'react';
import { Dokumentasi, User, Siswa, Jurnal, HomeVisit, getTeacherClasses } from '../types';
import { Camera, Trash2, Eye, Download, Info } from 'lucide-react';
import { formatDateID, generateDokumentasiPDF } from '../utils/pdfGenerator';
import { LazyImage } from './LazyImage';
import { CardSkeleton } from './SkeletonLoader';

interface DokumentasiMenuProps {
  user: User;
  siswa: Siswa[];
  dokumentasi: Dokumentasi[];
  onAddDokumentasi: (d: Dokumentasi) => Promise<void>;
  onDeleteDokumentasi: (id: string) => Promise<void>;
  onOpenLightbox?: (url: string, title: string, date: string) => void;
  jurnal?: Jurnal[];
  homeVisit?: HomeVisit[];
}

export const DokumentasiMenu: React.FC<DokumentasiMenuProps> = ({
  user,
  siswa,
  dokumentasi,
  onAddDokumentasi,
  onDeleteDokumentasi,
  onOpenLightbox,
  jurnal,
  homeVisit
}) => {
  const [selectedFilterKelas, setSelectedFilterKelas] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localLightbox, setLocalLightbox] = useState<{ url: string; title: string; date: string } | null>(null);

  const handleOpenImage = (url: string, title: string, date: string) => {
    if (onOpenLightbox) {
      onOpenLightbox(url, title, date);
    } else {
      setLocalLightbox({ url, title, date });
    }
  };

  // Form states
  const [tanggal, setTanggal] = useState(new Date().toISOString().substring(0, 10));
  const [kelas, setKelas] = useState('7C');
  const [namaKegiatan, setNamaKegiatan] = useState('');
  const [fotos, setFotos] = useState<string[]>([]);

  const isClassWali = user.role === 'wali_kelas';

  // Get list of authorized classes for filtering/creating
  const getAuthorizedClasses = () => {
    const activeSiswa = siswa.filter(s => s.kelas && !s.kelas.includes('Lulus') && !s.kelas.includes('Alumni'));
    const activeClassList = [...new Set(activeSiswa.map(s => s.kelas))].filter(Boolean).sort();
    if (['admin', 'pengawas'].includes(user.role)) {
      return activeClassList;
    }
    if (user.role === 'wali') {
      const childrenIds = user.id_referensi ? user.id_referensi.split(',').map(x => x.trim()) : [];
      const children = activeSiswa.filter(s => childrenIds.includes(s.id_siswa));
      return [...new Set(children.map(ch => ch.kelas))].filter(Boolean).sort();
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

  // Extract photos from teacher journal entries as virtual documentation
  const getJournalDocs = (): Dokumentasi[] => {
    if (!jurnal) return [];
    const list: Dokumentasi[] = [];
    jurnal.forEach(j => {
      if (j.foto_1 && j.foto_1.length > 10) {
        list.push({
          id_dokumentasi: `JRN-F1-${j.id_jurnal}`,
          tanggal: j.tanggal,
          kelas: j.kelas,
          nama_kegiatan: `${j.mata_pelajaran}: ${j.materi}`,
          foto: j.foto_1,
          nama_guru: j.nama_guru,
          isFromJournal: true
        });
      }
      if (j.foto_2 && j.foto_2.length > 10) {
        list.push({
          id_dokumentasi: `JRN-F2-${j.id_jurnal}`,
          tanggal: j.tanggal,
          kelas: j.kelas,
          nama_kegiatan: `${j.mata_pelajaran}: ${j.materi} (Alt)`,
          foto: j.foto_2,
          nama_guru: j.nama_guru,
          isFromJournal: true
        });
      }
    });
    return list;
  };

  // Extract photos from home visit / BK entries as virtual documentation
  const getHomeVisitDocs = (): Dokumentasi[] => {
    if (!homeVisit) return [];
    const list: Dokumentasi[] = [];
    homeVisit.forEach(hv => {
      const student = siswa.find(s => s.id_siswa === hv.id_siswa);
      const studentClass = student?.kelas || 'Kunjungan Rumah';
      if (hv.foto_1 && hv.foto_1.length > 10) {
        list.push({
          id_dokumentasi: `HV-F1-${hv.id_visit}`,
          tanggal: hv.tanggal,
          kelas: studentClass,
          nama_kegiatan: `Home Visit BK / Wali Kelas (${student?.nama_siswa || 'Santri'})`,
          foto: hv.foto_1,
          nama_guru: hv.nama_guru || 'BK / Wali Kelas',
          isFromJournal: true
        });
      }
      if (hv.foto_2 && hv.foto_2.length > 10) {
        list.push({
          id_dokumentasi: `HV-F2-${hv.id_visit}`,
          tanggal: hv.tanggal,
          kelas: studentClass,
          nama_kegiatan: `Home Visit BK / Wali Kelas (${student?.nama_siswa || 'Santri'})`,
          foto: hv.foto_2,
          nama_guru: hv.nama_guru || 'BK / Wali Kelas',
          isFromJournal: true
        });
      }
    });
    return list;
  };

  // Filter gallery items
  const getFilteredDocs = () => {
    const manualDocs = dokumentasi || [];
    // If user is parent (wali), do not load journal photos, only show photos from this menu
    const showJournal = user.role !== 'wali';
    const journalDocs = showJournal ? getJournalDocs() : [];
    const homeVisitDocs = showJournal ? getHomeVisitDocs() : [];
    let list = [...manualDocs, ...journalDocs, ...homeVisitDocs];
    
    // Parent or teacher restricts list initially
    if (user.role !== 'admin' && user.role !== 'pengawas') {
      list = list.filter(d => authClasses.includes(d.kelas));
    }

    if (selectedFilterKelas) {
      list = list.filter(d => d.kelas === selectedFilterKelas);
    }

    return list.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  };

  const filteredDocs = getFilteredDocs();

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    if (fotos.length + files.length > 4) {
      alert("Maksimal 4 foto yang dapat diunggah!");
      e.target.value = '';
      return;
    }

    const newPhotos: string[] = [...fotos];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 2097152) {
        alert(`Batas file 2MB terlampaui untuk ${file.name}`);
        continue;
      }

      await new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
          const base64String = reader.result as string;
          const compressed = await compressImage(base64String);
          newPhotos.push(compressed);
          resolve();
        };
        reader.onerror = () => resolve();
      });
    }

    setFotos(newPhotos);
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaKegiatan || fotos.length === 0) {
      alert("Nama kegiatan dan minimal satu foto wajib diisi!");
      return;
    }

    setLoading(true);
    try {
      const payload: Dokumentasi = {
        id_dokumentasi: 'GAL' + Date.now(),
        tanggal: new Date(tanggal).toISOString(),
        kelas: isClassWali ? (authClasses[0] || kelas) : kelas,
        nama_kegiatan: namaKegiatan.trim(),
        foto: fotos[0] || '',
        fotos: fotos,
        nama_guru: user.nama_lengkap
      };

      await onAddDokumentasi(payload);
      setIsModalOpen(false);
      setNamaKegiatan('');
      setFotos([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            📸 Galeri Kelas
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            Dokumentasi momen berharga dan kegiatan ananda santri di madrasah.
          </p>
        </div>

        {isClassWali && (
          <button
            onClick={() => {
              setTanggal(new Date().toISOString().substring(0, 10));
              setNamaKegiatan('');
              setFotos([]);
              setIsModalOpen(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3.5 rounded-xl shadow-md font-black transition transform hover:-translate-y-0.5 flex items-center gap-2 text-sm cursor-pointer shrink-0"
          >
            <Camera className="w-4 h-4" /> Upload Foto
          </button>
        )}
      </div>

      {/* Filter Select Box */}
      {authClasses.length > 1 && (
        <div className="w-full md:w-64">
          <select
            className="border border-slate-200 p-4 rounded-xl text-sm font-bold bg-white focus:ring-2 focus:ring-indigo-400 outline-none w-full shadow-sm text-slate-700"
            value={selectedFilterKelas}
            onChange={(e) => setSelectedFilterKelas(e.target.value)}
          >
            <option value="">-- Tampilkan Semua Kelas --</option>
            {authClasses.map(c => (
              <option key={c} value={c}>Kelas {c}</option>
            ))}
          </select>
        </div>
      )}

      {/* Masonry-style Grid */}
      {filteredDocs.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-[2rem] shadow-sm border border-slate-100 mt-4 flex flex-col items-center justify-center">
          <Camera className="w-12 h-12 text-slate-200 mb-4" />
          <p className="text-slate-500 font-medium">Belum ada dokumentasi untuk kelas ini.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredDocs.map((d) => (
            <div
              key={d.id_dokumentasi}
              className="group relative rounded-[1.5rem] overflow-hidden shadow-sm hover:shadow-2xl bg-white border border-slate-100 transition-all duration-500 flex flex-col h-full"
            >
              {/* Photo */}
              <div className="relative aspect-video overflow-hidden bg-slate-100">
                {d.fotos && d.fotos.length > 0 ? (
                  <div className="w-full h-full grid gap-1" style={{ gridTemplateColumns: d.fotos.length === 1 ? '1fr' : d.fotos.length === 2 ? '1fr 1fr' : '2fr 1fr' }}>
                    {d.fotos.length === 1 && (
                      <LazyImage
                        src={d.fotos[0]}
                        alt={d.nama_kegiatan}
                        className="w-full h-full cursor-pointer hover:scale-105 transition duration-500"
                        onClick={() => handleOpenImage(d.fotos![0], d.nama_kegiatan, `${formatDateID(d.tanggal)} | Kelas: ${d.kelas} (Foto 1 dari 1)`)}
                      />
                    )}
                    {d.fotos.length === 2 && (
                      <>
                        <LazyImage
                          src={d.fotos[0]}
                          alt={d.nama_kegiatan}
                          className="w-full h-full cursor-pointer hover:scale-105 transition duration-500"
                          onClick={() => handleOpenImage(d.fotos![0], d.nama_kegiatan, `${formatDateID(d.tanggal)} | Kelas: ${d.kelas} (Foto 1 dari 2)`)}
                        />
                        <LazyImage
                          src={d.fotos[1]}
                          alt={d.nama_kegiatan}
                          className="w-full h-full cursor-pointer hover:scale-105 transition duration-500"
                          onClick={() => handleOpenImage(d.fotos![1], d.nama_kegiatan, `${formatDateID(d.tanggal)} | Kelas: ${d.kelas} (Foto 2 dari 2)`)}
                        />
                      </>
                    )}
                    {d.fotos.length >= 3 && (
                      <>
                        <LazyImage
                          src={d.fotos[0]}
                          alt={d.nama_kegiatan}
                          className="w-full h-full cursor-pointer hover:scale-105 transition duration-500"
                          onClick={() => handleOpenImage(d.fotos![0], d.nama_kegiatan, `${formatDateID(d.tanggal)} | Kelas: ${d.kelas} (Foto 1 dari ${d.fotos!.length})`)}
                        />
                        <div className="grid grid-rows-2 gap-1 h-full">
                          <LazyImage
                            src={d.fotos[1]}
                            alt={d.nama_kegiatan}
                            className="w-full h-full cursor-pointer hover:scale-105 transition duration-500"
                            onClick={() => handleOpenImage(d.fotos![1], d.nama_kegiatan, `${formatDateID(d.tanggal)} | Kelas: ${d.kelas} (Foto 2 dari ${d.fotos!.length})`)}
                          />
                          <div className="relative w-full h-full">
                            <LazyImage
                              src={d.fotos[2]}
                              alt={d.nama_kegiatan}
                              className="w-full h-full cursor-pointer hover:scale-105 transition duration-500"
                              onClick={() => handleOpenImage(d.fotos![2], d.nama_kegiatan, `${formatDateID(d.tanggal)} | Kelas: ${d.kelas} (Foto 3 dari ${d.fotos!.length})`)}
                            />
                            {d.fotos.length === 4 && (
                              <div 
                                className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-[10px] font-black cursor-pointer hover:bg-black/50 transition z-10"
                                onClick={() => handleOpenImage(d.fotos![3], d.nama_kegiatan, `${formatDateID(d.tanggal)} | Kelas: ${d.kelas} (Foto 4 dari 4)`)}
                              >
                                +1 FOTO
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : d.foto ? (
                  <LazyImage
                    src={d.foto}
                    alt={d.nama_kegiatan}
                    className="w-full h-full cursor-pointer transform group-hover:scale-105 transition-transform duration-700"
                    onClick={() => handleOpenImage(d.foto, d.nama_kegiatan, formatDateID(d.tanggal) + ' | Kelas: ' + d.kelas)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <Camera className="w-8 h-8" />
                  </div>
                )}
                <div className="absolute top-4 left-4 flex flex-col gap-1 z-20">
                  <span className="bg-indigo-600 text-white text-[10px] font-black px-3 py-1.5 rounded-lg shadow-md tracking-wider self-start">
                    KLS {d.kelas}
                  </span>
                  {d.isFromJournal && (
                    <span className="bg-emerald-600 text-white text-[9px] font-black px-2 py-1 rounded-md shadow-md tracking-wider uppercase self-start">
                      Jurnal Guru 📖
                    </span>
                  )}
                </div>
              </div>

              {/* Text Info */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-slate-800 font-black text-base leading-tight">
                    {d.nama_kegiatan}
                  </h4>
                  <p className="text-slate-400 text-xs mt-2 font-bold flex items-center gap-1">
                    📅 {formatDateID(d.tanggal)}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-slate-400">
                    Oleh: {d.nama_guru}
                  </span>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={async (e) => {
                        const btn = e.currentTarget;
                        const originalTitle = btn.getAttribute('title') || 'Ekspor PDF';
                        try {
                          btn.disabled = true;
                          btn.setAttribute('title', 'Memuat...');
                          await generateDokumentasiPDF(d);
                        } catch (err) {
                          console.error(err);
                          alert('Gagal mengekspor PDF.');
                        } finally {
                          btn.disabled = false;
                          btn.setAttribute('title', originalTitle);
                        }
                      }}
                      className="text-slate-400 hover:text-cyan-600 transition cursor-pointer"
                      title="Ekspor PDF"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleOpenImage(d.foto, d.nama_kegiatan, formatDateID(d.tanggal) + ' | Kelas: ' + d.kelas)}
                      className="text-slate-400 hover:text-indigo-600 transition"
                      title="Lihat Gambar"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {(user.role === 'admin' || isClassWali) && !d.isFromJournal && (
                      <button
                        onClick={() => onDeleteDokumentasi(d.id_dokumentasi)}
                        className="text-slate-400 hover:text-red-500 transition cursor-pointer"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9990] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg flex flex-col p-6 animate-fade-in">
            <h3 className="font-extrabold text-xl text-slate-800 mb-6 border-b border-slate-100 pb-4">
              Tambahkan Dokumentasi Kegiatan
            </h3>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-black text-slate-500 block mb-2 uppercase tracking-wider">
                    Tanggal Kegiatan
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
                    Kelas Penyelenggara
                  </label>
                  {isClassWali ? (
                    <input
                      type="text"
                      className="w-full border border-slate-200 p-4 rounded-xl font-bold bg-slate-100 text-slate-500 outline-none"
                      value={`KLS ${authClasses[0] || '7C'}`}
                      readOnly
                    />
                  ) : (
                    <select
                      required
                      className="w-full border border-slate-200 p-4 rounded-xl font-bold bg-white text-slate-700 outline-none focus:ring-2 focus:ring-indigo-400"
                      value={kelas}
                      onChange={(e) => setKelas(e.target.value)}
                    >
                      {authClasses.map(c => (
                        <option key={c} value={c}>Kelas {c}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 block mb-2 uppercase tracking-wider">
                  Nama / Deskripsi Singkat Kegiatan
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Praktik Sholat Jenazah"
                  className="w-full border border-slate-200 p-4 rounded-xl font-bold bg-white shadow-sm focus:ring-2 focus:ring-indigo-400 outline-none text-slate-700"
                  value={namaKegiatan}
                  onChange={(e) => setNamaKegiatan(e.target.value)}
                />
              </div>

              <div className="bg-indigo-50/80 border border-indigo-200 p-6 rounded-2xl shadow-inner">
                <label className="text-sm font-black text-indigo-900 block mb-3 flex items-center justify-between uppercase tracking-wider">
                  <span className="flex items-center gap-2">
                    <Camera className="text-indigo-500 w-5 h-5" /> Upload File Dokumentasi
                  </span>
                  <span className="text-xs text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full font-black">
                    {fotos.length}/4 Foto
                  </span>
                </label>
                
                {fotos.length < 4 ? (
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    required={fotos.length === 0}
                    className="w-full border border-indigo-200 p-3 rounded-xl bg-white font-medium focus:ring-2 focus:ring-indigo-400 outline-none text-xs text-slate-700"
                    onChange={handleFileChange}
                  />
                ) : (
                  <div className="text-center p-3.5 bg-indigo-100 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-800">
                    Sudah mencapai batas maksimal 4 foto.
                  </div>
                )}

                <p className="text-xs font-bold text-indigo-500 mt-3 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" /> Pilih sampai dengan 4 foto (Maksimal 2MB per file).
                </p>

                {/* Grid Preview */}
                {fotos.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mt-4">
                    {fotos.map((f, idx) => (
                      <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border-2 border-indigo-200 group bg-slate-100">
                        <img src={f} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setFotos(fotos.filter((_, i) => i !== idx))}
                          className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full shadow-lg transition transform hover:scale-110 flex items-center justify-center w-5 h-5 cursor-pointer text-[10px] font-black"
                          title="Hapus foto ini"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-base py-4 rounded-xl shadow-xl transition transform active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Mengunggah...' : 'UNGGAH KE GALERI'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Local Lightbox Fallback Modal */}
      {localLightbox && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[9999] flex flex-col items-center justify-center p-4" onClick={() => setLocalLightbox(null)}>
          <button 
            className="absolute top-6 right-6 text-white hover:text-red-400 font-bold text-2xl transition cursor-pointer bg-black/40 p-3 rounded-full"
            onClick={() => setLocalLightbox(null)}
          >
            ✕
          </button>
          <div className="max-w-4xl max-h-[80vh] w-full flex items-center justify-center p-2" onClick={(e) => e.stopPropagation()}>
            <img src={localLightbox.url} alt={localLightbox.title} className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl" />
          </div>
          <div className="text-center mt-6 text-white max-w-xl px-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-extrabold text-xl">{localLightbox.title}</h3>
            <p className="text-slate-300 text-sm mt-1">{localLightbox.date}</p>
          </div>
        </div>
      )}
    </div>
  );
};
