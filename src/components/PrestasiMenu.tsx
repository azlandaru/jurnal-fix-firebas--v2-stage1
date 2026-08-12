import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { 
  Trophy, Search, Plus, Calendar, Award, Building, User as UserIcon, Tag, 
  FileText, ExternalLink, Trash2, Edit, X, Upload, Check, ChevronDown, Filter, GraduationCap,
  Printer, Users, Download, BarChart2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from 'lucide-react';
import { User, Siswa, Prestasi, SystemSettings, getTeacherClasses } from '../types';
import { drawFooter, formatDateID } from '../utils/pdfGenerator';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

interface PrestasiMenuProps {
  user: User;
  siswa: Siswa[];
  prestasi: Prestasi[];
  onAddPrestasi: (newP: Prestasi) => void;
  onEditPrestasi: (updatedP: Prestasi) => void;
  onDeletePrestasi: (id: string) => void;
  settings?: SystemSettings;
}

// Helper function to convert oklch and oklab CSS color declarations to safe standard RGB / RGBA colors,
// which prevents html2canvas parsing errors on modern browsers or Tailwind v4.
function replaceOklchInCss(cssText: string): string {
  // First, handle oklch(...)
  let processed = cssText.replace(/oklch\(([^)]+)\)/g, (match, contents) => {
    try {
      const parts = contents
        .trim()
        .split(/[\s,+/]+/g)
        .filter(Boolean);
      
      if (parts.length < 3) {
        return 'rgb(99, 102, 241)'; // Fallback to a beautiful indigo
      }

      // 1. Lightness (L)
      const lStr = parts[0];
      let l = parseFloat(lStr);
      if (lStr.includes('%')) {
        l = l / 100;
      }
      
      // 2. Chroma (C)
      const cStr = parts[1];
      let c = parseFloat(cStr);
      if (cStr.includes('%')) {
        c = (c / 100) * 0.4;
      }

      // 3. Hue (H)
      const hStr = parts[2];
      let h = parseFloat(hStr);
      if (hStr.includes('deg')) {
        h = parseFloat(hStr.replace('deg', ''));
      } else if (hStr.includes('rad')) {
        h = parseFloat(hStr.replace('rad', '')) * (180 / Math.PI);
      } else if (hStr.includes('turn')) {
        h = parseFloat(hStr.replace('turn', '')) * 360;
      }

      // 4. Alpha (A)
      let a = 1;
      if (parts.length >= 4) {
        const aStr = parts[3];
        a = parseFloat(aStr);
        if (aStr.includes('%')) {
          a = a / 100;
        }
      }

      if (isNaN(l)) l = 0.5;
      if (isNaN(c)) c = 0.1;
      if (isNaN(h)) h = 0;
      if (isNaN(a)) a = 1;

      l = Math.max(0, Math.min(1, l));
      c = Math.max(0, Math.min(0.4, c));
      h = (h % 360 + 360) % 360;

      // Convert OKLCH to OKLAB
      const a_ = c * Math.cos((h * Math.PI) / 180);
      const b_ = c * Math.sin((h * Math.PI) / 180);
      
      // Convert OKLAB to LMS
      const l_ = l + 0.3963377774 * a_ + 0.2158037573 * b_;
      const m_ = l - 0.1055613458 * a_ - 0.0638541728 * b_;
      const s_ = l - 0.0894841775 * a_ - 1.2914855480 * b_;
      
      // Non-linear LMS to linear LMS (cube)
      const l_cube = l_ * l_ * l_;
      const m_cube = m_ * m_ * m_;
      const s_cube = s_ * s_ * s_;
      
      // Linear LMS to linear RGB
      const r = +4.0767416621 * l_cube - 3.3077115913 * m_cube + 0.2309699292 * s_cube;
      const g = -1.2684380046 * l_cube + 2.6097574011 * m_cube - 0.3413193965 * s_cube;
      const b = -0.0041960863 * l_cube - 0.7034186147 * m_cube + 1.7076147010 * s_cube;
      
      // Standard gamma correction to sRGB
      const f = (x: number) => {
        if (x <= 0) return 0;
        return x >= 0.0031308 ? 1.055 * Math.pow(x, 1 / 2.4) - 0.055 : 12.92 * x;
      };
      
      const rByte = Math.min(255, Math.max(0, Math.round(f(r) * 255)));
      const gByte = Math.min(255, Math.max(0, Math.round(f(g) * 255)));
      const bByte = Math.min(255, Math.max(0, Math.round(f(b) * 255)));
      
      return a === 1 ? `rgb(${rByte}, ${gByte}, ${bByte})` : `rgba(${rByte}, ${gByte}, ${bByte}, ${a})`;
    } catch (err) {
      return 'rgb(99, 102, 241)';
    }
  });

  // Second, handle oklab(...)
  processed = processed.replace(/oklab\(([^)]+)\)/g, (match, contents) => {
    try {
      const parts = contents
        .trim()
        .split(/[\s,+/]+/g)
        .filter(Boolean);
      
      if (parts.length < 3) {
        return 'rgb(99, 102, 241)';
      }

      // 1. Lightness (L)
      const lStr = parts[0];
      let l = parseFloat(lStr);
      if (lStr.includes('%')) {
        l = l / 100;
      }
      
      // 2. a_ (green-red)
      const aStr = parts[1];
      let a_ = parseFloat(aStr);
      if (aStr.includes('%')) {
        a_ = (a_ / 100) * 0.4;
      }

      // 3. b_ (blue-yellow)
      const bStr = parts[2];
      let b_ = parseFloat(bStr);
      if (bStr.includes('%')) {
        b_ = (b_ / 100) * 0.4;
      }

      // 4. Alpha (A)
      let a = 1;
      if (parts.length >= 4) {
        const aStr = parts[3];
        a = parseFloat(aStr);
        if (aStr.includes('%')) {
          a = a / 100;
        }
      }

      if (isNaN(l)) l = 0.5;
      if (isNaN(a_)) a_ = 0;
      if (isNaN(b_)) b_ = 0;
      if (isNaN(a)) a = 1;

      l = Math.max(0, Math.min(1, l));
      a_ = Math.max(-0.4, Math.min(0.4, a_));
      b_ = Math.max(-0.4, Math.min(0.4, b_));

      // Convert OKLAB to LMS
      const l_ = l + 0.3963377774 * a_ + 0.2158037573 * b_;
      const m_ = l - 0.1055613458 * a_ - 0.0638541728 * b_;
      const s_ = l - 0.0894841775 * a_ - 1.2914855480 * b_;
      
      // Non-linear LMS to linear LMS (cube)
      const l_cube = l_ * l_ * l_;
      const m_cube = m_ * m_ * m_;
      const s_cube = s_ * s_ * s_;
      
      // Linear LMS to linear RGB
      const r = +4.0767416621 * l_cube - 3.3077115913 * m_cube + 0.2309699292 * s_cube;
      const g = -1.2684380046 * l_cube + 2.6097574011 * m_cube - 0.3413193965 * s_cube;
      const b = -0.0041960863 * l_cube - 0.7034186147 * m_cube + 1.7076147010 * s_cube;
      
      // Standard gamma correction to sRGB
      const f = (x: number) => {
        if (x <= 0) return 0;
        return x >= 0.0031308 ? 1.055 * Math.pow(x, 1 / 2.4) - 0.055 : 12.92 * x;
      };
      
      const rByte = Math.min(255, Math.max(0, Math.round(f(r) * 255)));
      const gByte = Math.min(255, Math.max(0, Math.round(f(g) * 255)));
      const bByte = Math.min(255, Math.max(0, Math.round(f(b) * 255)));
      
      return a === 1 ? `rgb(${rByte}, ${gByte}, ${bByte})` : `rgba(${rByte}, ${gByte}, ${bByte}, ${a})`;
    } catch (err) {
      return 'rgb(99, 102, 241)';
    }
  });

  return processed;
}

export function PrestasiMenu({
  user,
  siswa,
  prestasi,
  onAddPrestasi,
  onEditPrestasi,
  onDeletePrestasi,
  settings
}: PrestasiMenuProps) {
  // Navigation & View States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Prestasi | null>(null);
  const [deletingItem, setDeletingItem] = useState<Prestasi | null>(null);
  const [chartMetric, setChartMetric] = useState<'kategori' | 'kelas'>('kategori');

  // Form States
  const [jenis, setJenis] = useState<'Individu' | 'Kelompok'>('Individu');
  const [selectedSiswaIds, setSelectedSiswaIds] = useState<string[]>([]);
  const [searchSiswaQuery, setSearchSiswaQuery] = useState('');
  const [printItem, setPrintItem] = useState<Prestasi | null>(null);
  
  // Custom print-settings states
  const [printNamaSekolah, setPrintNamaSekolah] = useState('MTs Ibad Ar Rahman');
  const [printNomorSurat, setPrintNomorSurat] = useState('');
  const [printTanggalPenghargaan, setPrintTanggalPenghargaan] = useState('');
  const [printNamaMengetahui, setPrintNamaMengetahui] = useState(settings?.nama_kepala_madrasah || 'Ustadz H. Ahmad Hambali, Lc.');
  const [printJabatanMengetahui, setPrintJabatanMengetahui] = useState('Kepala Madrasah');

  React.useEffect(() => {
    if (settings?.nama_kepala_madrasah) {
      setPrintNamaMengetahui(settings.nama_kepala_madrasah);
    }
  }, [settings?.nama_kepala_madrasah]);

  const handlePrintClick = (item: Prestasi) => {
    setPrintItem(item);
    setPrintNamaSekolah('MTs Ibad Ar Rahman');
    setPrintNomorSurat(item.id_prestasi.replace('PRST_', 'PGM/'));
    setPrintTanggalPenghargaan(item.tanggal);
    setPrintNamaMengetahui(settings?.nama_kepala_madrasah || 'Ustadz H. Ahmad Hambali, Lc.');
    setPrintJabatanMengetahui('Kepala Madrasah');
  };

  const handleDownloadPDF = async () => {
    if (!printItem) return;
    const element = document.getElementById('print-area');
    if (!element) {
      showToast('Gagal menemukan area cetak!', true);
      return;
    }

    // Save originals of the main window and its constructors to restore them perfectly later
    const originalGetComputedStyle = window.getComputedStyle;
    const originalGetPropertyValue = CSSStyleDeclaration.prototype.getPropertyValue;
    const originalCssTextDescriptor = Object.getOwnPropertyDescriptor(CSSStyleDeclaration.prototype, 'cssText');
    const originalRuleCssTextDescriptor = Object.getOwnPropertyDescriptor(CSSRule.prototype, 'cssText');
    const originalCreateElement = document.createElement;

    // Helper to apply overrides to any window object (e.g., main window and dynamic iframe windows)
    const applyOklchShield = (win: any) => {
      if (!win || win.__oklchShieldApplied) return;
      win.__oklchShieldApplied = true;

      const originalWinGetComputedStyle = win.getComputedStyle;
      if (originalWinGetComputedStyle) {
        win.getComputedStyle = function (elt: any, pseudoElt?: any) {
          const style = originalWinGetComputedStyle(elt, pseudoElt);
          return new Proxy(style, {
            get(target, prop, receiver) {
              if (prop === 'getPropertyValue') {
                return function (propertyName: string) {
                  try {
                    const val = target.getPropertyValue(propertyName);
                    if (typeof val === 'string' && (val.includes('oklch') || val.includes('oklab'))) {
                      return replaceOklchInCss(val);
                    }
                    return val;
                  } catch (e) {
                    return '';
                  }
                };
              }
              let value;
              try {
                value = Reflect.get(target, prop, target);
              } catch (e) {
                value = (target as any)[prop];
              }
              if (typeof value === 'function') {
                return value.bind(target);
              }
              if (typeof value === 'string' && (value.includes('oklch') || value.includes('oklab'))) {
                return replaceOklchInCss(value);
              }
              return value;
            }
          });
        };
      }

      if (win.CSSStyleDeclaration && win.CSSStyleDeclaration.prototype) {
        const proto = win.CSSStyleDeclaration.prototype;
        const originalProtoGetPropertyValue = proto.getPropertyValue;
        if (originalProtoGetPropertyValue) {
          proto.getPropertyValue = function (propertyName: string) {
            try {
              const val = originalProtoGetPropertyValue.call(this, propertyName);
              if (typeof val === 'string' && (val.includes('oklch') || val.includes('oklab'))) {
                return replaceOklchInCss(val);
              }
              return val;
            } catch (e) {
              return '';
            }
          };
        }

        const descriptor = Object.getOwnPropertyDescriptor(proto, 'cssText');
        if (descriptor && descriptor.get) {
          const originalGet = descriptor.get;
          Object.defineProperty(proto, 'cssText', {
            get() {
              try {
                const val = originalGet.call(this);
                if (typeof val === 'string' && (val.includes('oklch') || val.includes('oklab'))) {
                  return replaceOklchInCss(val);
                }
                return val;
              } catch (e) {
                return '';
              }
            },
            configurable: true
          });
        }
      }

      if (win.CSSRule && win.CSSRule.prototype) {
        const proto = win.CSSRule.prototype;
        const descriptor = Object.getOwnPropertyDescriptor(proto, 'cssText');
        if (descriptor && descriptor.get) {
          const originalGet = descriptor.get;
          Object.defineProperty(proto, 'cssText', {
            get() {
              try {
                const val = originalGet.call(this);
                if (typeof val === 'string' && (val.includes('oklch') || val.includes('oklab'))) {
                  return replaceOklchInCss(val);
                }
                return val;
              } catch (e) {
                return '';
              }
            },
            configurable: true
          });
        }
      }
    };

    try {
      showToast('Menyiapkan file PDF, mohon tunggu...');

      // Apply shield to main window immediately
      applyOklchShield(window);

      // Intercept any iframe created by html2canvas to apply the same shield to its contentWindow
      document.createElement = function (tagName: string, options?: ElementCreationOptions) {
        const element = originalCreateElement.call(document, tagName, options);
        if (tagName.toLowerCase() === 'iframe') {
          Object.defineProperty(element, 'contentWindow', {
            get() {
              const win = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow')?.get?.call(this);
              if (win) {
                applyOklchShield(win);
              }
              return win;
            },
            configurable: true
          });
        }
        return element;
      } as any;

      // Clone the element to render it in a clean, offscreen environment
      const clone = element.cloneNode(true) as HTMLElement;
      
      // Absolute positioning offscreen ensures no clipping, overflows, or translation bugs
      clone.style.position = 'fixed';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      clone.style.width = '600px';
      clone.style.maxWidth = 'none'; // Critical: remove max-w-lg restriction to let it span exactly 600px
      clone.style.margin = '0';      // Critical: remove mx-auto to align perfectly to the top-left (0,0) of the capture canvas
      clone.style.boxShadow = 'none'; // Critical: remove external shadow to prevent gray dirty edge artifacts in the PDF
      clone.style.height = 'auto';
      clone.style.backgroundColor = '#ffffff';
      clone.style.zIndex = '-9999';
      clone.style.transform = 'none';
      clone.style.transition = 'none';
      
      document.body.appendChild(clone);

      const canvas = await html2canvas(clone, {
        scale: 3, // High quality crisp text
        useCORS: true,
        allowTaint: false, // Critical: must be false, otherwise toDataURL fails!
        backgroundColor: '#ffffff',
        logging: false,
        width: 600,
        windowWidth: 600,
        scrollX: 0,
        scrollY: 0,
        x: 0,
        y: 0,
        onclone: (clonedDoc) => {
          // Process all <style> elements in the cloned document
          const styleElements = clonedDoc.getElementsByTagName('style');
          for (let i = 0; i < styleElements.length; i++) {
            const style = styleElements[i];
            if (style.textContent && (style.textContent.includes('oklch') || style.textContent.includes('oklab'))) {
              style.textContent = replaceOklchInCss(style.textContent);
            }
          }

          // Process all inline style attributes in the cloned document
          const allElements = clonedDoc.getElementsByTagName('*');
          for (let i = 0; i < allElements.length; i++) {
            const el = allElements[i] as HTMLElement;
            if (el.style) {
              const styleAttr = el.getAttribute('style');
              if (styleAttr && (styleAttr.includes('oklch') || styleAttr.includes('oklab'))) {
                el.setAttribute('style', replaceOklchInCss(styleAttr));
              }
            }
          }
        }
      });

      // Clean up clone
      if (clone.parentNode) {
        clone.parentNode.removeChild(clone);
      }

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const isLandscape = imgWidth > imgHeight;
      const orientation = isLandscape ? 'l' : 'p';

      const pdf = new jsPDF({
        orientation: orientation,
        unit: 'px',
        format: [imgWidth / 3, imgHeight / 3]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth / 3, imgHeight / 3);
      pdf.save(`Piagam_${printItem.nama_siswa.replace(/\s+/g, '_')}_${printItem.id_prestasi}.pdf`);
      showToast('PDF berhasil diunduh!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      showToast('Gagal mengunduh file PDF', true);
    } finally {
      // Restore all original functions and descriptors on the main window to keep everything beautiful and perfectly standard
      window.getComputedStyle = originalGetComputedStyle;
      CSSStyleDeclaration.prototype.getPropertyValue = originalGetPropertyValue;
      if (originalCssTextDescriptor) {
        Object.defineProperty(CSSStyleDeclaration.prototype, 'cssText', originalCssTextDescriptor);
      }
      if (originalRuleCssTextDescriptor) {
        Object.defineProperty(CSSRule.prototype, 'cssText', originalRuleCssTextDescriptor);
      }
      document.createElement = originalCreateElement;
    }
  };

  const [namaKompetisi, setNamaKompetisi] = useState('');
  const [penyelenggara, setPenyelenggara] = useState('');
  const [kategori, setKategori] = useState('Akademik');
  const [kategoriManual, setKategoriManual] = useState('');
  const [selectedSiswaId, setSelectedSiswaId] = useState('');
  const [tanggal, setTanggal] = useState(new Date().toISOString().substring(0, 10));
  const [kategoriJuara, setKategoriJuara] = useState('');
  const [tingkat, setTingkat] = useState('Sekolah');
  const [sertifikatUrl, setSertifikatUrl] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formSubmitted, setFormSubmitted] = useState(false);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKategori, setFilterKategori] = useState('');
  const [filterTingkat, setFilterTingkat] = useState('');
  const [filterKelas, setFilterKelas] = useState('');
  const [selectedChildId, setSelectedChildId] = useState('');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Reset page to 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterKategori, filterTingkat, filterKelas, selectedChildId]);

  // Toast / Status notification helper
  const [toast, setToast] = useState<{ show: boolean; msg: string; isError?: boolean }>({ show: false, msg: '' });
  const showToast = (msg: string, isError = false) => {
    setToast({ show: true, msg, isError });
    setTimeout(() => setToast({ show: false, msg: '' }), 3000);
  };

  // Get list of students authorized to be chosen
  const getAuthorizedStudents = () => {
    const activeSiswa = siswa.filter(s => s.kelas && !s.kelas.includes('Lulus') && !s.kelas.includes('Alumni'));
    if (['admin', 'pengawas'].includes(user.role)) {
      return activeSiswa;
    }
    if (user.role === 'wali') {
      const childIds = user.id_referensi ? user.id_referensi.split(',').map(x => x.trim()) : [];
      return activeSiswa.filter(s => childIds.includes(s.id_siswa));
    }
    if (['guru', 'wali_kelas'].includes(user.role)) {
      const teacherClasses = getTeacherClasses(user);
      return activeSiswa.filter(s => teacherClasses.includes(s.kelas));
    }
    return activeSiswa;
  };

  const authorizedStudents = getAuthorizedStudents();

  // Handle file input upload (base64 reader)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast('Ukuran file tidak boleh melebihi 2MB', true);
        return;
      }
      setFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSertifikatUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Trigger open edit
  const handleEditClick = (item: Prestasi) => {
    setEditingItem(item);
    setNamaKompetisi(item.nama_kompetisi);
    setPenyelenggara(item.penyelenggara);
    
    const categories = ['Akademik', 'Non Akademik', 'Teknologi', 'Tahfidz', 'Agama', 'Sains', 'Bahasa', 'Robotik', 'Design'];
    if (categories.includes(item.kategori)) {
      setKategori(item.kategori);
      setKategoriManual('');
    } else {
      setKategori('Lainnya');
      setKategoriManual(item.kategori);
    }

    setJenis(item.jenis || 'Individu');
    setSelectedSiswaIds(item.id_siswa_list || (item.id_siswa ? [item.id_siswa] : []));
    setSelectedSiswaId(item.id_siswa);
    setSearchSiswaQuery('');
    setTanggal(item.tanggal);
    setKategoriJuara(item.kategori_juara);
    setTingkat(item.tingkat);
    setSertifikatUrl(item.sertifikat_url || '');
    setDeskripsi(item.deskripsi || '');
    setFileName(item.sertifikat_url && item.sertifikat_url.startsWith('data:') ? 'Sertifikat Terunggah' : '');
    setIsFormOpen(true);
  };

  // Reset Form
  const resetForm = () => {
    setNamaKompetisi('');
    setPenyelenggara('');
    setKategori('Akademik');
    setKategoriManual('');
    setJenis('Individu');
    setSelectedSiswaIds([]);
    setSelectedSiswaId('');
    setSearchSiswaQuery('');
    setTanggal(new Date().toISOString().substring(0, 10));
    setKategoriJuara('');
    setTingkat('Sekolah');
    setSertifikatUrl('');
    setDeskripsi('');
    setFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setEditingItem(null);
    setFormSubmitted(false);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);

    if (!namaKompetisi.trim()) {
      showToast('Kolom "Nama Kompetisi" tidak boleh kosong!', true);
      return;
    }

    if (!tanggal) {
      showToast('Kolom "Tanggal" tidak boleh kosong!', true);
      return;
    }

    if (!penyelenggara.trim()) {
      showToast('Kolom "Penyelenggara" tidak boleh kosong!', true);
      return;
    }

    const activeIds = jenis === 'Individu' ? (selectedSiswaId ? [selectedSiswaId] : []) : selectedSiswaIds;
    if (activeIds.length === 0) {
      showToast('Harap pilih santri penerima penghargaan!', true);
      return;
    }

    if (!kategoriJuara.trim()) {
      showToast('Kolom "Kategori Juara" tidak boleh kosong!', true);
      return;
    }

    const selectedSiswaObjects = siswa.filter(s => activeIds.includes(s.id_siswa));
    if (selectedSiswaObjects.length === 0) {
      showToast('Siswa tidak valid atau belum dipilih', true);
      return;
    }

    const finalKategori = kategori === 'Lainnya' ? (kategoriManual || 'Lainnya') : kategori;
    const namaSiswaJoined = selectedSiswaObjects.map(s => s.nama_siswa).join(', ');
    const firstSiswaObj = selectedSiswaObjects[0];

    if (editingItem) {
      // Update
      const updatedPrestasi: Prestasi = {
        ...editingItem,
        nama_kompetisi: namaKompetisi,
        penyelenggara: penyelenggara,
        kategori: finalKategori,
        nama_siswa: namaSiswaJoined,
        id_siswa: firstSiswaObj.id_siswa,
        kelas: firstSiswaObj.kelas,
        tanggal,
        kategori_juara: kategoriJuara,
        tingkat,
        sertifikat_url: sertifikatUrl,
        deskripsi,
        jenis,
        id_siswa_list: activeIds,
        nama_siswa_list: selectedSiswaObjects.map(s => s.nama_siswa)
      };
      onEditPrestasi(updatedPrestasi);
      showToast('Prestasi berhasil diperbarui');
    } else {
      // Add
      const newPrestasi: Prestasi = {
        id_prestasi: 'PRST_' + Date.now() + Math.floor(Math.random() * 100),
        nama_kompetisi: namaKompetisi,
        penyelenggara: penyelenggara,
        kategori: finalKategori,
        nama_siswa: namaSiswaJoined,
        id_siswa: firstSiswaObj.id_siswa,
        kelas: firstSiswaObj.kelas,
        tanggal,
        kategori_juara: kategoriJuara,
        tingkat,
        sertifikat_url: sertifikatUrl,
        deskripsi,
        created_by: user.username,
        jenis,
        id_siswa_list: activeIds,
        nama_siswa_list: selectedSiswaObjects.map(s => s.nama_siswa)
      };
      onAddPrestasi(newPrestasi);
      showToast('Prestasi baru berhasil disimpan');
    }

    setIsFormOpen(false);
    resetForm();
  };

  // Filter logic based on user roles and filter selections
  const getFilteredPrestasi = () => {
    let list = [...prestasi];

    // Role Wali filter: Only see achievements of their children
    if (user.role === 'wali') {
      const childIds = user.id_referensi ? user.id_referensi.split(',').map(x => x.trim()) : [];
      list = list.filter(p => childIds.includes(p.id_siswa));
      
      // Secondary filter inside Wali Role
      if (selectedChildId) {
        list = list.filter(p => p.id_siswa === selectedChildId);
      }
    } else if (user.role === 'wali_kelas') {
      // Wali kelas: usually can view all, but let's highlight or default to filter by their own class if they wish.
      // We do not strictly restrict viewing others, but let's allow them to filter.
    }

    // Apply filters
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => 
        p.nama_siswa.toLowerCase().includes(q) || 
        p.nama_kompetisi.toLowerCase().includes(q) ||
        p.penyelenggara.toLowerCase().includes(q) ||
        p.kategori_juara.toLowerCase().includes(q)
      );
    }

    if (filterKategori) {
      list = list.filter(p => p.kategori.toLowerCase() === filterKategori.toLowerCase());
    }

    if (filterTingkat) {
      list = list.filter(p => p.tingkat.toLowerCase() === filterTingkat.toLowerCase());
    }

    if (filterKelas) {
      list = list.filter(p => p.kelas === filterKelas);
    }

    return list.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  };

  const filteredPrestasi = getFilteredPrestasi();

  // Paginated Prestasi Logic
  const totalItems = filteredPrestasi.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const safeCurrentPage = Math.min(currentPage, Math.max(1, totalPages));
  
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPrestasi = filteredPrestasi.slice(startIndex, endIndex);

  // Unique categories for filtering
  const availableCategories = ['Akademik', 'Non Akademik', 'Teknologi', 'Tahfidz', 'Agama', 'Sains', 'Bahasa', 'Robotik', 'Design'];
  const uniqueKelas = Array.from(new Set(siswa.map(s => s.kelas))).sort();

  // For parent/wali children mapping
  const getWaliChildren = () => {
    if (user.role !== 'wali') return [];
    const childIds = user.id_referensi ? user.id_referensi.split(',').map(x => x.trim()) : [];
    return siswa.filter(s => childIds.includes(s.id_siswa));
  };
  const waliChildren = getWaliChildren();

  const handleExportPDFAll = async () => {
    if (filteredPrestasi.length === 0) return;

    try {
      showToast('Menyiapkan Lampiran Rapor PDF, mohon tunggu...');

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      let activeTahunAjaran = '2025/2026';
      try {
        const stored = localStorage.getItem('edu_settings');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.tahun_ajaran) {
            activeTahunAjaran = parsed.tahun_ajaran;
          }
        }
      } catch (e) {}

      // Check if all achievements belong to a single student
      const firstStudentId = filteredPrestasi[0].id_siswa;
      const isSingleStudent = filteredPrestasi.every(p => p.id_siswa === firstStudentId);
      const studentName = filteredPrestasi[0].nama_siswa;
      const studentClass = filteredPrestasi[0].kelas;

      let currentY = 18;

      // Header Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('MTS IBAD AR RAHMAN', 105, currentY, { align: 'center' });
      
      currentY += 5.5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('LAMPIRAN RAPOR: PRESTASI & KEJUARAAN SANTRI', 105, currentY, { align: 'center' });
      
      currentY += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.text(`Tahun Ajaran: ${activeTahunAjaran}`, 105, currentY, { align: 'center' });

      // If it's a single student, show their metadata beautifully at the top
      if (isSingleStudent) {
        currentY += 8;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text("IDENTITAS SANTRI", 14, currentY);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(51, 65, 85); // slate-700
        doc.text("Nama Lengkap", 14, currentY + 6);
        doc.text(`: ${studentName}`, 45, currentY + 6);
        
        doc.text("Kelas Rombel", 14, currentY + 11);
        doc.text(`: Kelas ${studentClass}`, 45, currentY + 11);

        doc.text("Tanggal Cetak", 110, currentY + 6);
        doc.text(`: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, 140, currentY + 6);

        currentY += 15;
      } else {
        // Multi-student view, or filtered view
        currentY += 8;
        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        doc.text(`Total Capaian: ${filteredPrestasi.length} Prestasi`, 14, currentY);
        doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, 140, currentY);
        currentY += 4;
      }

      // Configure columns based on single vs multi student
      const tableHead = isSingleStudent
        ? [['No', 'Tanggal', 'Nama Kompetisi & Penyelenggara', 'Kategori / Tingkat', 'Penghargaan / Juara']]
        : [['No', 'Nama Santri & Kelas', 'Tanggal', 'Nama Kompetisi & Penyelenggara', 'Kategori / Tingkat', 'Penghargaan / Juara']];

      const tableBody = filteredPrestasi.map((p, idx) => {
        const rowNo = idx + 1;
        const dateStr = formatDateID(p.tanggal);
        const compStr = `${p.nama_kompetisi}\n(Penyelenggara: ${p.penyelenggara})`;
        const catTingkat = `${p.kategori}\n(Tingkat ${p.tingkat})`;
        const awardStr = p.kategori_juara + (p.deskripsi ? `\n\n"${p.deskripsi}"` : '');

        if (isSingleStudent) {
          return [rowNo, dateStr, compStr, catTingkat, awardStr];
        } else {
          return [rowNo, `${p.nama_siswa}\n(Kelas ${p.kelas})`, dateStr, compStr, catTingkat, awardStr];
        }
      });

      autoTable(doc, {
        startY: currentY + 4,
        theme: 'grid',
        head: tableHead,
        body: tableBody,
        styles: {
          fontSize: 8.5,
          cellPadding: 4,
          valign: 'top',
          overflow: 'linebreak',
          font: 'helvetica'
        },
        columnStyles: isSingleStudent ? {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 25 },
          2: { cellWidth: 60 },
          3: { cellWidth: 35 },
          4: { cellWidth: 50 }
        } : {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 35 },
          2: { cellWidth: 22 },
          3: { cellWidth: 45 },
          4: { cellWidth: 30 },
          5: { cellWidth: 40 }
        },
        headStyles: {
          fillColor: [79, 70, 229], // Indigo-600
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
          halign: 'left'
        },
        margin: { top: 38, bottom: 42, left: 14, right: 14 }
      });

      // Signature section
      currentY = (doc as any).lastAutoTable.finalY + 12;
      if (currentY + 32 > 280) {
        doc.addPage();
        currentY = 20;
      }

      const sigX = 140;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      
      const printDateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      doc.text(`Pandeglang, ${printDateStr}`, sigX, currentY);
      
      currentY += 5.5;
      doc.text('Kepala Madrasah,', sigX, currentY);
      
      currentY += 21;
      doc.setFont('helvetica', 'bold');
      const signatureName = settings?.nama_kepala_madrasah || 'Ustadz H. Ahmad Hambali, Lc.';
      doc.text(signatureName, sigX, currentY);
      
      const textWidth = doc.getTextWidth(signatureName);
      doc.setLineWidth(0.3);
      doc.setDrawColor(0, 0, 0);
      doc.line(sigX, currentY + 1, sigX + textWidth, currentY + 1);

      // Footer and Page Numbers
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        drawFooter(doc, i, pageCount);
      }

      const filename = isSingleStudent
        ? `Lampiran_Rapor_Prestasi_${studentName.replace(/\s+/g, '_')}_Kelas_${studentClass}.pdf`
        : `Lampiran_Rapor_Prestasi_Santri_Kelas_${filterKelas || 'Semua'}.pdf`;

      doc.save(filename);
      showToast('PDF Lampiran Rapor berhasil diunduh!');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      showToast('Gagal mengunduh PDF', true);
    }
  };

  const handleExportXLSX = () => {
    if (filteredPrestasi.length === 0) {
      showToast('Tidak ada data prestasi untuk diekspor.', true);
      return;
    }

    try {
      showToast('Mengekspor data prestasi ke Excel...');
      
      const dataForExcel = filteredPrestasi.map((p, index) => ({
        'No': index + 1,
        'ID Prestasi': p.id_prestasi,
        'Nama Siswa': p.nama_siswa,
        'Kelas': p.kelas,
        'Nama Kompetisi / Lomba': p.nama_kompetisi,
        'Kategori': p.kategori,
        'Tingkat': p.tingkat,
        'Kategori Juara': p.kategori_juara,
        'Tanggal Capaian': p.tanggal,
        'Penyelenggara': p.penyelenggara,
        'Deskripsi / Keterangan': p.deskripsi || '-',
        'Sertifikat URL': p.sertifikat_url || '-',
        'Jenis Kepesertaan': p.jenis || 'Individu'
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Prestasi Santri');

      const maxColWidths = Object.keys(dataForExcel[0] || {}).map(key => {
        let maxLen = key.length;
        dataForExcel.forEach(row => {
          const val = row[key as keyof typeof row];
          if (val !== undefined && val !== null) {
            maxLen = Math.max(maxLen, String(val).length);
          }
        });
        return { wch: maxLen + 3 };
      });
      worksheet['!cols'] = maxColWidths;

      XLSX.writeFile(workbook, `Rekap_Prestasi_Santri_${new Date().toISOString().split('T')[0]}.xlsx`);
      showToast('Data prestasi berhasil diekspor ke Excel!');
    } catch (error) {
      console.error('Error exporting Excel:', error);
      showToast('Gagal mengekspor data ke Excel.', true);
    }
  };

  const categoryCounts = filteredPrestasi.reduce((acc, p) => {
    acc[p.kategori] = (acc[p.kategori] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const categoryChartData = Object.entries(categoryCounts).map(([name, count]) => ({
    name,
    count
  }));

  const classCounts = filteredPrestasi.reduce((acc, p) => {
    const kls = p.kelas ? `Kelas ${p.kelas}` : 'Lainnya';
    acc[kls] = (acc[kls] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const classChartData = Object.entries(classCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const COLORS = ['#4f46e5', '#0d9488', '#7c3aed', '#d97706', '#e11d48', '#0284c7', '#059669', '#2563eb', '#db2777'];

  return (
    <div className="space-y-8 font-sans antialiased pb-12 selection:bg-indigo-500 selection:text-white">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast.show && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-xl border flex items-center gap-2 font-black text-xs uppercase tracking-wider ${
              toast.isError ? 'bg-rose-50 border-rose-100 text-rose-800' : 'bg-emerald-50 border-emerald-100 text-emerald-800'
            }`}
          >
            {toast.isError ? '❌' : '✅'}
            <span>{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Panel */}
      <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 sm:p-10 relative overflow-hidden shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500/10 to-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3.5 py-1.5 rounded-full font-black text-[10px] tracking-widest uppercase inline-flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-indigo-400 animate-bounce" /> Portal Prestasi Santri
            </span>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-none">
              Pusat Prestasi & Kejuaraan
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl font-medium">
              Dokumentasi, publikasi, dan apresiasi rekam jejak capaian unggul santri dalam bidang akademik, non-akademik, teknologi, sains, dan keagamaan.
            </p>
          </div>

          {['admin', 'wali_kelas'].includes(user.role) && (
            <button
              id="btn-tambah-prestasi"
              onClick={() => { resetForm(); setIsFormOpen(true); }}
              className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-extrabold text-xs uppercase tracking-wider px-6 py-4 rounded-2xl flex items-center gap-2 shadow-lg shadow-indigo-600/30 border border-indigo-500/40 transition-all cursor-pointer self-start md:self-center"
            >
              <Plus className="w-4 h-4 text-white" />
              Input Prestasi Baru
            </button>
          )}
        </div>

        {/* Highlight Stats Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-8 border-t border-slate-800 relative z-10 text-center sm:text-left">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Prestasi</span>
            <div className="text-2xl font-black text-white mt-1">{prestasi.length} Piala</div>
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Tingkat Nasional+</span>
            <div className="text-2xl font-black text-indigo-400 mt-1">
              {prestasi.filter(p => ['Nasional', 'Internasional'].includes(p.tingkat)).length} Prestasi
            </div>
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Kategori Terbanyak</span>
            <div className="text-2xl font-black text-teal-400 mt-1">
              {(() => {
                const counts: Record<string, number> = {};
                prestasi.forEach(p => counts[p.kategori] = (counts[p.kategori] || 0) + 1);
                const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
                return sorted[0] ? sorted[0][0] : '-';
              })()}
            </div>
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Tahun Pembinaan</span>
            <div className="text-2xl font-black text-amber-400 mt-1">2025 / 2026</div>
          </div>
        </div>
      </div>

      {/* Main Content Area split into List and Interactive Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Side Filters Widget */}
        <div className="lg:col-span-1 bg-white border border-slate-100 p-6 rounded-[2rem] shadow-xs space-y-6 self-start">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" />
              Saring Data
            </h3>
            <button 
              onClick={() => {
                setSearchQuery('');
                setFilterKategori('');
                setFilterTingkat('');
                setFilterKelas('');
                setSelectedChildId('');
              }}
              className="text-[10px] font-black uppercase tracking-wider text-indigo-600 hover:text-indigo-800"
            >
              Reset
            </button>
          </div>

          {/* Search bar */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
              Pencarian Kata Kunci
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama, lomba, dll..."
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 rounded-xl outline-none text-xs font-bold text-slate-700 transition"
              />
            </div>
          </div>

          {/* Wali/Parent Child Selector */}
          {user.role === 'wali' && waliChildren.length > 1 && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                Pilih Buah Hati
              </label>
              <select
                value={selectedChildId}
                onChange={(e) => setSelectedChildId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 focus:border-indigo-400 outline-none transition"
              >
                <option value="">Semua Anak ({waliChildren.length})</option>
                {waliChildren.map(child => (
                  <option key={child.id_siswa} value={child.id_siswa}>{child.nama_siswa} (Kelas {child.kelas})</option>
                ))}
              </select>
            </div>
          )}

          {/* Category Filter */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
              Kategori Kejuaraan
            </label>
            <select
              value={filterKategori}
              onChange={(e) => setFilterKategori(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 focus:border-indigo-400 outline-none transition"
            >
              <option value="">Semua Kategori</option>
              {availableCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Level Filter */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
              Tingkat Kompetisi
            </label>
            <select
              value={filterTingkat}
              onChange={(e) => setFilterTingkat(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 focus:border-indigo-400 outline-none transition"
            >
              <option value="">Semua Tingkat</option>
              {['Sekolah', 'Kecamatan', 'Kabupaten', 'Provinsi', 'Nasional', 'Internasional'].map(lv => (
                <option key={lv} value={lv}>{lv}</option>
              ))}
            </select>
          </div>

          {/* Class Filter (only for admin and wali kelas) */}
          {user.role !== 'wali' && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                Saring Berdasarkan Rombel
              </label>
              <select
                value={filterKelas}
                onChange={(e) => setFilterKelas(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 focus:border-indigo-400 outline-none transition"
              >
                <option value="">Semua Kelas</option>
                {uniqueKelas.map(kls => (
                  <option key={kls} value={kls}>Kelas {kls}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Right Side: Grid of Achievements cards */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Ringkasan & Grafik Batang (Recharts) */}
          {filteredPrestasi.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-slate-100 rounded-[2.5rem] p-6 sm:p-8 shadow-xs space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-indigo-600" />
                    Grafik Ringkasan Prestasi
                  </h3>
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                    Visualisasi distribusi prestasi berdasarkan {chartMetric === 'kategori' ? 'kategori kompetisi' : 'rombel kelas'}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-150 p-1 rounded-xl self-start sm:self-auto">
                  <button
                    onClick={() => setChartMetric('kategori')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${
                      chartMetric === 'kategori' 
                        ? 'bg-indigo-600 text-white shadow-xs' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Per Kategori
                  </button>
                  <button
                    onClick={() => setChartMetric('kelas')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${
                      chartMetric === 'kelas' 
                        ? 'bg-indigo-600 text-white shadow-xs' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Per Kelas
                  </button>
                </div>
              </div>

              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartMetric === 'kategori' ? categoryChartData : classChartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      stroke="#94a3b8" 
                      fontSize={9} 
                      tickLine={false} 
                      axisLine={false}
                      fontFamily="Inter, sans-serif"
                      fontWeight="bold"
                    />
                    <YAxis 
                      stroke="#94a3b8" 
                      fontSize={9} 
                      tickLine={false} 
                      axisLine={false}
                      fontFamily="Inter, sans-serif"
                      fontWeight="bold"
                      allowDecimals={false}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc', opacity: 0.5 }}
                      contentStyle={{ 
                        backgroundColor: '#0f172a', 
                        borderColor: '#1e293b', 
                        borderRadius: '1rem',
                        color: '#fff',
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                      }}
                      itemStyle={{ color: '#818cf8' }}
                      labelStyle={{ color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                    />
                    <Bar 
                      dataKey="count" 
                      radius={[6, 6, 0, 0]} 
                      maxBarSize={45}
                    >
                      {(chartMetric === 'kategori' ? categoryChartData : classChartData).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="font-black text-slate-800 text-lg flex items-center gap-2">
              🏆 Daftar Prestasi Gemilang Santri
              <span className="text-xs bg-indigo-50 text-indigo-700 font-extrabold px-2.5 py-1 rounded-full border border-indigo-100">
                {filteredPrestasi.length} Hasil
              </span>
            </h2>

            {filteredPrestasi.length > 0 && (
              <div className="flex flex-wrap gap-2 self-start sm:self-auto">
                <button
                  onClick={handleExportPDFAll}
                  className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-850 active:scale-95 text-white font-extrabold text-[11px] uppercase tracking-wider px-4.5 py-2.5 rounded-xl flex items-center gap-2 shadow-md border border-indigo-500/20 transition cursor-pointer"
                >
                  <Download className="w-4 h-4" /> Unduh PDF Lampiran Rapor
                </button>
                <button
                  onClick={handleExportXLSX}
                  className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 active:scale-95 text-white font-extrabold text-[11px] uppercase tracking-wider px-4.5 py-2.5 rounded-xl flex items-center gap-2 shadow-md border border-emerald-500/20 transition cursor-pointer"
                >
                  <FileText className="w-4 h-4" /> Ekspor ke Excel (XLSX)
                </button>
              </div>
            )}
          </div>

          {filteredPrestasi.length === 0 ? (
            <div className="bg-white border border-slate-100 p-16 rounded-[2.5rem] text-center space-y-3">
              <div className="text-5xl">🎖️</div>
              <h3 className="font-black text-slate-800 text-base">Tidak ada data prestasi</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto font-bold uppercase tracking-wider">
                Belum ada data kejuaraan yang cocok dengan saringan yang Anda gunakan saat ini.
              </p>
            </div>
          ) : (
            <>
              <motion.div layout className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <AnimatePresence mode="popLayout">
                {paginatedPrestasi.map((p) => {
                  const canModify = user.role === 'admin' || (user.role === 'wali_kelas' && p.created_by === user.username);
                  
                  // Color mapping for Tingkat
                  let tagColor = 'bg-slate-100 text-slate-700 border-slate-200/60';
                  if (p.tingkat === 'Internasional') tagColor = 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100';
                  else if (p.tingkat === 'Nasional') tagColor = 'bg-indigo-50 text-indigo-700 border-indigo-100';
                  else if (p.tingkat === 'Provinsi') tagColor = 'bg-blue-50 text-blue-700 border-blue-100';
                  else if (p.tingkat === 'Kabupaten') tagColor = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                  else if (p.tingkat === 'Kecamatan') tagColor = 'bg-amber-50 text-amber-700 border-amber-100';

                  return (
                    <motion.div 
                      layout
                      key={p.id_prestasi}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3 }}
                      whileHover={{ 
                        y: -6, 
                        scale: 1.01, 
                        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)" 
                      }}
                      className="bg-white border border-slate-100/80 rounded-[2rem] p-6 flex flex-col justify-between space-y-4 hover:border-indigo-100 group relative transition-all duration-300 cursor-default"
                    >
                    {/* Action buttons (Edit/Delete) */}
                    {canModify && (
                      <div className="absolute top-5 right-5 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                          onClick={() => handleEditClick(p)}
                          className="p-2 bg-indigo-55 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl border border-indigo-100 active:scale-95 transition"
                          title="Ubah Data"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setDeletingItem(p);
                          }}
                          className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl border border-rose-100 active:scale-95 transition"
                          title="Hapus Data"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <div className="space-y-3.5">
                      {/* Badge Row */}
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${tagColor}`}>
                          {p.tingkat}
                        </span>
                        <span className="text-[9px] font-black uppercase tracking-wider bg-slate-50 text-slate-500 border border-slate-150 px-2.5 py-1 rounded-full">
                          {p.kategori}
                        </span>
                        <span className="text-[9px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-600 border border-indigo-100/60 px-2.5 py-1 rounded-full">
                          Kelas {p.kelas}
                        </span>
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${p.jenis === 'Kelompok' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-slate-50 text-slate-500 border-slate-150'}`}>
                          {p.jenis || 'Individu'}
                        </span>
                      </div>
                      
                      {/* Competition details */}
                      <div>
                        <h3 className="font-extrabold text-slate-800 text-base leading-tight group-hover:text-indigo-600 transition">
                          {p.nama_kompetisi}
                        </h3>
                        <p className="text-xs text-slate-500 font-bold flex items-center gap-1.5 mt-1.5">
                          <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Penyelenggara: {p.penyelenggara}</span>
                        </p>
                      </div>

                      {/* Student information */}
                      <div className="bg-slate-50/60 p-3.5 rounded-2xl border border-slate-100 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-teal-500 text-white flex items-center justify-center font-black text-sm shrink-0">
                          {p.jenis === 'Kelompok' ? <Users className="w-4 h-4 text-white" /> : <UserIcon className="w-4 h-4 text-white" />}
                        </div>
                        <div className="overflow-hidden flex-1 text-left">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {p.jenis === 'Kelompok' ? 'Penerima (Kelompok)' : 'Penerima Penghargaan'}
                          </p>
                          <p className="text-xs font-extrabold text-slate-800 truncate" title={p.nama_siswa}>
                            {p.nama_siswa}
                          </p>
                        </div>
                      </div>

                      {/* Prize Details & Description */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs shrink-0">
                            🏆
                          </span>
                          <span className="text-xs font-black text-amber-700 uppercase tracking-wider">
                            {p.kategori_juara}
                          </span>
                        </div>

                        {p.deskripsi && (
                          <p className="text-[11px] text-slate-500 font-medium leading-relaxed bg-slate-50/30 p-2.5 rounded-xl border border-slate-100/40">
                            {p.deskripsi}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Footer Row */}
                    <div className="pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{new Date(p.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>

                      <div className="flex items-center gap-2.5 self-end sm:self-auto">
                        <button
                          onClick={() => handlePrintClick(p)}
                          className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200/50 flex items-center gap-1 font-extrabold cursor-pointer transition text-[9px] uppercase tracking-wider"
                          title="Cetak Piagam Apresiasi"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Cetak
                        </button>

                        {p.sertifikat_url ? (
                          <a 
                            href={p.sertifikat_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-extrabold text-[9px] uppercase tracking-wider"
                          >
                            Sertifikat <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-slate-300 italic text-[9px]">Tanpa Sertifikat</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              </AnimatePresence>
            </motion.div>

            {/* Pagination Controls */}
            {filteredPrestasi.length > 0 && (
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm mt-6">
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-bold">
                  <span>Tampilkan</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="border border-slate-200 bg-slate-50 rounded-lg py-1.5 px-2.5 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 animate-none"
                  >
                    {[6, 10, 20, 50, 100].map((size) => (
                      <option key={size} value={size}>
                        {size} entri
                      </option>
                    ))}
                  </select>
                  <span>
                    Menampilkan <span className="text-slate-800 font-black">{totalItems === 0 ? 0 : startIndex + 1}</span> s/d{' '}
                    <span className="text-slate-800 font-black">{Math.min(endIndex, totalItems)}</span> dari{' '}
                    <span className="text-indigo-600 font-black">{totalItems}</span> prestasi
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(1)}
                    disabled={safeCurrentPage === 1}
                    className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer text-slate-600 bg-white"
                    title="Halaman Pertama"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={safeCurrentPage === 1}
                    className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer text-slate-600 bg-white"
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
                    className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer text-slate-600 bg-white"
                    title="Halaman Berikutnya"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={safeCurrentPage === totalPages}
                    className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer text-slate-600 bg-white"
                    title="Halaman Terakhir"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      </div>

      {/* INPUT FORM MODAL */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden flex flex-col my-8 max-h-[90vh]"
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                    🏆 {editingItem ? 'Ubah Data Prestasi' : 'Input Prestasi Baru'}
                  </h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mt-1">
                    Masukkan detail kejuaraan yang diraih siswa.
                  </p>
                </div>
                <button 
                  onClick={() => { resetForm(); setIsFormOpen(false); }}
                  className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-full transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body - Scrollable */}
              <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 text-left">
                
                {/* Nama Kompetisi */}
                <div className="space-y-1.5">
                  <label className="text-[10.5px] font-black text-slate-500 uppercase tracking-widest block">
                    Nama Kompetisi / Lomba <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Lomba Robotik Nasional"
                    value={namaKompetisi}
                    onChange={(e) => setNamaKompetisi(e.target.value)}
                    className={`w-full px-4 py-3.5 border rounded-2xl outline-none font-bold text-xs transition ${
                      formSubmitted && !namaKompetisi.trim()
                        ? 'border-rose-400 focus:ring-2 focus:ring-rose-400 bg-rose-50/20 text-rose-800'
                        : 'border-slate-200 focus:ring-2 focus:ring-indigo-400 bg-slate-50 focus:bg-white text-slate-700'
                    }`}
                  />
                  {formSubmitted && !namaKompetisi.trim() && (
                    <p className="text-[10px] text-rose-500 font-extrabold uppercase tracking-wider mt-1 flex items-center gap-1">
                      ⚠️ Nama kompetisi wajib diisi dan tidak boleh kosong
                    </p>
                  )}
                </div>

                {/* Grid Penyelenggara & Kategori */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Penyelenggara */}
                  <div className="space-y-1.5">
                    <label className="text-[10.5px] font-black text-slate-500 uppercase tracking-widest block">
                      Penyelenggara <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Kemenag / "
                      value={penyelenggara}
                      onChange={(e) => setPenyelenggara(e.target.value)}
                      className="w-full px-4 py-3.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-400 outline-none font-bold text-xs text-slate-700 bg-slate-50 focus:bg-white transition"
                    />
                  </div>

                  {/* Kategori Lomba dropdown */}
                  <div className="space-y-1.5">
                    <label className="text-[10.5px] font-black text-slate-500 uppercase tracking-widest block">
                      Kategori Lomba <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={kategori}
                      onChange={(e) => setKategori(e.target.value)}
                      className="w-full px-4 py-3.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-400 outline-none font-bold text-xs text-slate-700 bg-slate-50 focus:bg-white transition"
                    >
                      {availableCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      <option value="Lainnya">Lainnya (Tulis Manual)</option>
                    </select>
                  </div>
                </div>

                {/* Manual category input if Lainnya chosen */}
                {kategori === 'Lainnya' && (
                  <div className="space-y-1.5">
                    <label className="text-[10.5px] font-black text-slate-500 uppercase tracking-widest block">
                      Kategori Lomba Manual <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Masukkan kategori (misal: Kaligrafi, Musik)"
                      value={kategoriManual}
                      onChange={(e) => setKategoriManual(e.target.value)}
                      className="w-full px-4 py-3.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-400 outline-none font-bold text-xs text-slate-700 bg-slate-50 focus:bg-white transition"
                    />
                  </div>
                )}

                {/* Jenis Prestasi (Individu / Kelompok) */}
                <div className="space-y-1.5">
                  <label className="text-[10.5px] font-black text-slate-500 uppercase tracking-widest block">
                    Jenis Prestasi <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setJenis('Individu');
                        if (selectedSiswaIds.length > 0) {
                          setSelectedSiswaId(selectedSiswaIds[0]);
                        }
                      }}
                      className={`px-4 py-3 rounded-2xl border font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer ${
                        jenis === 'Individu'
                          ? 'bg-[#091a3d] text-white border-[#091a3d]'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <UserIcon className="w-4 h-4" />
                      Individu
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setJenis('Kelompok');
                        if (selectedSiswaId && !selectedSiswaIds.includes(selectedSiswaId)) {
                          setSelectedSiswaIds([selectedSiswaId]);
                        }
                      }}
                      className={`px-4 py-3 rounded-2xl border font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer ${
                        jenis === 'Kelompok'
                          ? 'bg-[#091a3d] text-white border-[#091a3d]'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      Kelompok
                    </button>
                  </div>
                </div>

                {/* Grid Nama Siswa & Tanggal */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Nama Siswa dropdown selection */}
                  {jenis === 'Individu' ? (
                    <div className="space-y-1.5">
                      <label className="text-[10.5px] font-black text-slate-500 uppercase tracking-widest block">
                        Nama Santri <span className="text-rose-500">*</span>
                      </label>
                      <select
                        required={jenis === 'Individu'}
                        value={selectedSiswaId}
                        onChange={(e) => {
                          setSelectedSiswaId(e.target.value);
                          if (e.target.value) {
                            setSelectedSiswaIds([e.target.value]);
                          } else {
                            setSelectedSiswaIds([]);
                          }
                        }}
                        className="w-full px-4 py-3.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-400 outline-none font-bold text-xs text-slate-700 bg-slate-50 focus:bg-white transition"
                      >
                        <option value="">-- Pilih Santri --</option>
                        {authorizedStudents.map(s => (
                          <option key={s.id_siswa} value={s.id_siswa}>
                            {s.nama_siswa} (Kelas {s.kelas})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    /* Kelompok Multi-student selection */
                    <div className="space-y-1.5 sm:col-span-1">
                      <label className="text-[10.5px] font-black text-slate-500 uppercase tracking-widest block">
                        Pilih Santri Kelompok ({selectedSiswaIds.length} terpilih) <span className="text-rose-500">*</span>
                      </label>
                      <div className="border border-slate-200 rounded-2xl p-3 bg-slate-50 space-y-3">
                        <input
                          type="text"
                          placeholder="Cari nama santri..."
                          value={searchSiswaQuery}
                          onChange={(e) => setSearchSiswaQuery(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none font-bold text-xs text-slate-700 bg-white focus:ring-1 focus:ring-indigo-400 transition"
                        />
                        
                        <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 text-left">
                          {authorizedStudents
                            .filter(s => s.nama_siswa.toLowerCase().includes(searchSiswaQuery.toLowerCase()))
                            .map(s => {
                              const isChecked = selectedSiswaIds.includes(s.id_siswa);
                              return (
                                <label 
                                  key={s.id_siswa} 
                                  className="flex items-center gap-2.5 px-2 py-1.5 hover:bg-slate-100 rounded-lg cursor-pointer transition select-none"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      if (isChecked) {
                                        setSelectedSiswaIds(selectedSiswaIds.filter(id => id !== s.id_siswa));
                                        if (selectedSiswaId === s.id_siswa) {
                                          setSelectedSiswaId(selectedSiswaIds.find(id => id !== s.id_siswa) || '');
                                        }
                                      } else {
                                        setSelectedSiswaIds([...selectedSiswaIds, s.id_siswa]);
                                        if (!selectedSiswaId) {
                                          setSelectedSiswaId(s.id_siswa);
                                        }
                                      }
                                    }}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                  />
                                  <span className="text-xs font-bold text-slate-700">
                                    {s.nama_siswa} <span className="text-[10px] text-slate-400 font-medium">({s.kelas})</span>
                                  </span>
                                </label>
                              );
                            })}
                          {authorizedStudents.filter(s => s.nama_siswa.toLowerCase().includes(searchSiswaQuery.toLowerCase())).length === 0 && (
                            <p className="text-[10px] text-slate-400 italic text-center py-2 font-bold">Santri tidak ditemukan</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tanggal */}
                  <div className={`space-y-1.5 ${jenis === 'Kelompok' ? 'sm:col-span-1 flex flex-col justify-end' : ''}`}>
                    <label className="text-[10.5px] font-black text-slate-500 uppercase tracking-widest block">
                      Tanggal <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={tanggal}
                      onChange={(e) => setTanggal(e.target.value)}
                      className={`w-full px-4 py-3.5 border rounded-2xl outline-none font-bold text-xs transition ${
                        formSubmitted && !tanggal
                          ? 'border-rose-400 focus:ring-2 focus:ring-rose-400 bg-rose-50/20 text-rose-800'
                          : 'border-slate-200 focus:ring-2 focus:ring-indigo-400 bg-slate-50 focus:bg-white text-slate-700'
                      }`}
                    />
                    {formSubmitted && !tanggal && (
                      <p className="text-[10px] text-rose-500 font-extrabold uppercase tracking-wider mt-1 flex items-center gap-1">
                        ⚠️ Tanggal penghargaan wajib diisi
                      </p>
                    )}
                  </div>
                </div>

                {/* Display selected group members tags as pills if Kelompok */}
                {jenis === 'Kelompok' && selectedSiswaIds.length > 0 && (
                  <div className="space-y-1 px-1 mt-2 text-left">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Santri Kelompok Terpilih:</span>
                    <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto mt-1">
                      {siswa.filter(s => selectedSiswaIds.includes(s.id_siswa)).map(s => (
                        <span 
                          key={s.id_siswa} 
                          className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-100 text-indigo-700 px-2.5 py-1 rounded-xl text-[10px] font-black"
                        >
                          {s.nama_siswa}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSiswaIds(selectedSiswaIds.filter(id => id !== s.id_siswa));
                              if (selectedSiswaId === s.id_siswa) {
                                setSelectedSiswaId(selectedSiswaIds.find(id => id !== s.id_siswa) || '');
                              }
                            }}
                            className="hover:bg-indigo-100 rounded-full p-0.5 inline-flex items-center justify-center cursor-pointer"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Grid Kategori Juara & Tingkat */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Kategori Juara */}
                  <div className="space-y-1.5">
                    <label className="text-[10.5px] font-black text-slate-500 uppercase tracking-widest block">
                      Kategori Juara <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Juara 1, Gol"
                      value={kategoriJuara}
                      onChange={(e) => setKategoriJuara(e.target.value)}
                      className="w-full px-4 py-3.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-400 outline-none font-bold text-xs text-slate-700 bg-slate-50 focus:bg-white transition"
                    />
                  </div>

                  {/* Tingkat */}
                  <div className="space-y-1.5">
                    <label className="text-[10.5px] font-black text-slate-500 uppercase tracking-widest block">
                      Tingkat <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={tingkat}
                      onChange={(e) => setTingkat(e.target.value)}
                      className="w-full px-4 py-3.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-400 outline-none font-bold text-xs text-slate-700 bg-slate-50 focus:bg-white transition"
                    >
                      {['Sekolah', 'Kecamatan', 'Kabupaten', 'Provinsi', 'Nasional', 'Internasional'].map(lv => (
                        <option key={lv} value={lv}>{lv}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Upload Sertifikat URL atau file */}
                <div className="space-y-1.5">
                  <label className="text-[10.5px] font-black text-slate-500 uppercase tracking-widest block">
                    Upload Sertifikat (HP/PC) atau URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://... (opsional)"
                    value={sertifikatUrl.startsWith('data:') ? '' : sertifikatUrl}
                    onChange={(e) => setSertifikatUrl(e.target.value)}
                    className="w-full px-4 py-3.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-400 outline-none font-bold text-xs text-slate-700 bg-slate-50 focus:bg-white transition"
                  />
                  
                  {/* File Upload Trigger */}
                  <div className="mt-2 flex items-center gap-2">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      className="hidden" 
                      accept="image/*,.pdf" 
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl font-extrabold text-[10px] uppercase tracking-wider text-slate-700 cursor-pointer flex items-center gap-1.5 transition"
                    >
                      <Upload className="w-3.5 h-3.5" /> Pilih File
                    </button>
                    <span className="text-[10px] text-slate-400 font-bold truncate max-w-[200px]">
                      {fileName || 'Tidak ada file yang dipilih'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold italic mt-1">
                    Bisa pilih file langsung dari HP/PC, atau tempel URL publik.
                  </p>
                </div>

                {/* Deskripsi */}
                <div className="space-y-1.5">
                  <label className="text-[10.5px] font-black text-slate-500 uppercase tracking-widest block">
                    Deskripsi (Opsional)
                  </label>
                  <textarea
                    placeholder="Keterangan tambahan..."
                    value={deskripsi}
                    onChange={(e) => setDeskripsi(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-400 outline-none font-bold text-xs text-slate-700 bg-slate-50 focus:bg-white transition"
                  />
                </div>

                {/* Button Save */}
                <button
                  type="submit"
                  className="w-full bg-[#091a3d] hover:bg-[#122e66] text-white font-black text-xs uppercase tracking-widest py-4 rounded-2xl mt-4 active:scale-98 transition shadow-lg shadow-blue-900/10 cursor-pointer text-center block"
                >
                  Simpan Data
                </button>

              </form>
            </motion.div>
          </div>
        )}

        {printItem && (
          <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto no-print">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 w-full max-w-4xl overflow-hidden flex flex-col my-8 relative"
            >
              {/* Dynamic print-only styling */}
              <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                  body * {
                    visibility: hidden !important;
                  }
                  #print-area, #print-area * {
                    visibility: visible !important;
                  }
                  #print-area {
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    border: none !important;
                    box-shadow: none !important;
                    background: white !important;
                    padding: 40px !important;
                    margin: 0 !important;
                  }
                  .no-print {
                    display: none !important;
                  }
                }
              `}} />

              {/* Header inside modal */}
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 no-print">
                <span className="font-black text-[11px] text-[#091a3d] uppercase tracking-widest flex items-center gap-2">
                  <Printer className="w-4 h-4 text-[#091a3d]" />
                  Pratinjau &amp; Kustomisasi Cetak Piagam
                </span>
                <button
                  onClick={() => setPrintItem(null)}
                  className="p-1.5 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              {/* Two Column Layout: Custom Settings and live Piagam Certificate Template */}
              <div className="grid grid-cols-1 md:grid-cols-12 overflow-y-auto max-h-[75vh]">
                
                {/* Left Side: Settings Panel (no-print) */}
                <div className="md:col-span-5 p-6 border-r border-slate-100 space-y-4 text-left bg-slate-50/50 no-print">
                  <div>
                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-1">
                      <span>⚙️</span> Kustomisasi Piagam
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">Sesuaikan informasi berikut sebelum piagam dicetak.</p>
                  </div>

                  {/* Nama Sekolah */}
                  <div className="space-y-1">
                    <label className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider block">Nama Sekolah/Instansi</label>
                    <input
                      type="text"
                      value={printNamaSekolah}
                      onChange={(e) => setPrintNamaSekolah(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-xs font-bold bg-white text-slate-700 shadow-3xs"
                      placeholder="MTs Ibad Ar Rahman"
                    />
                  </div>

                  {/* Nomor Surat */}
                  <div className="space-y-1">
                    <label className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider block">Nomor Piagam/Sertifikat</label>
                    <input
                      type="text"
                      value={printNomorSurat}
                      onChange={(e) => setPrintNomorSurat(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-xs font-bold bg-white text-slate-700 shadow-3xs"
                      placeholder="Nomor Piagam"
                    />
                  </div>

                  {/* Tanggal Penghargaan */}
                  <div className="space-y-1">
                    <label className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider block">Tanggal Penghargaan</label>
                    <input
                      type="date"
                      value={printTanggalPenghargaan}
                      onChange={(e) => setPrintTanggalPenghargaan(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-xs font-bold bg-white text-slate-700 shadow-3xs"
                    />
                  </div>

                  {/* Nama Bagian Mengetahui */}
                  <div className="space-y-1">
                    <label className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider block">Nama Penandatangan (Mengetahui)</label>
                    <input
                      type="text"
                      value={printNamaMengetahui}
                      onChange={(e) => setPrintNamaMengetahui(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-xs font-bold bg-white text-slate-700 shadow-3xs"
                      placeholder="Contoh: Ustadz H. Ahmad Hambali, Lc."
                    />
                  </div>

                  {/* Jabatan Bagian Mengetahui */}
                  <div className="space-y-1">
                    <label className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider block">Jabatan Penandatangan</label>
                    <input
                      type="text"
                      value={printJabatanMengetahui}
                      onChange={(e) => setPrintJabatanMengetahui(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none text-xs font-bold bg-white text-slate-700 shadow-3xs"
                      placeholder="Contoh: Kepala Madrasah"
                    />
                  </div>
                </div>

                {/* Right Side: Live Piagam Preview Container */}
                <div className="md:col-span-7 p-6 bg-slate-100 flex items-center justify-center">
                  <div 
                    id="print-area"
                    className="w-full bg-white border-8 border-double border-amber-500 rounded-[2rem] p-8 md:p-10 text-center relative shadow-lg max-w-lg mx-auto overflow-hidden bg-radial-gradient"
                    style={{
                      backgroundImage: 'radial-gradient(circle, rgba(253,246,227,0.2) 0%, rgba(255,255,255,1) 100%)'
                    }}
                  >
                    {/* Elegant gold corner borders */}
                    <div className="absolute top-4 left-4 w-10 h-10 border-t-4 border-l-4 border-amber-400"></div>
                    <div className="absolute top-4 right-4 w-10 h-10 border-t-4 border-r-4 border-amber-400"></div>
                    <div className="absolute bottom-4 left-4 w-10 h-10 border-b-4 border-l-4 border-amber-400"></div>
                    <div className="absolute bottom-4 right-4 w-10 h-10 border-b-4 border-r-4 border-amber-400"></div>

                    <div className="space-y-5">
                      {/* Header Emblem */}
                      <div className="flex flex-col items-center justify-center space-y-1">
                        <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-2xl shadow-xs">
                          🏆
                        </div>
                        <span className="text-[9px] font-black tracking-widest text-amber-600 uppercase">
                          Madrasah &amp; Pondok Pesantren
                        </span>
                        <span className="text-[10px] font-black tracking-wider text-slate-800 uppercase">
                          {printNamaSekolah}
                        </span>
                      </div>

                      {/* Piagam Title */}
                      <div className="space-y-1">
                        <h1 className="text-xl font-black tracking-wider text-[#091a3d] font-serif uppercase">
                          PIAGAM APRESIASI
                        </h1>
                        <div className="h-0.5 w-32 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400 mx-auto"></div>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                          Nomor: {printNomorSurat}
                        </p>
                      </div>

                      {/* Given To section */}
                      <div className="space-y-1.5 py-1">
                        <p className="text-[11px] italic text-slate-500 font-medium">Dengan penuh rasa bangga, piagam ini dianugerahkan kepada:</p>
                        <h2 className="text-xl font-black text-indigo-900 border-b border-slate-100 pb-1 max-w-sm mx-auto leading-tight">
                          {printItem.nama_siswa}
                        </h2>
                        <p className="text-[10px] font-extrabold uppercase text-slate-600 tracking-wider">
                          Santri Kelas {printItem.kelas}
                        </p>
                      </div>

                      {/* Achievement Details */}
                      <div className="bg-slate-50/50 rounded-2xl p-3 border border-slate-100 max-w-sm mx-auto space-y-1 text-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Atas prestasi gemilang sebagai:</p>
                        <p className="text-xs font-black text-amber-700 uppercase tracking-wide">
                          {printItem.kategori_juara}
                        </p>
                        <p className="text-[11px] font-bold text-slate-700">
                          dalam ajang <span className="font-extrabold text-slate-900">{printItem.nama_kompetisi}</span>
                        </p>
                        <p className="text-[9px] font-medium text-slate-500">
                          Diselenggarakan oleh: <span className="font-bold">{printItem.penyelenggara}</span> | Tingkat {printItem.tingkat} ({printItem.kategori})
                        </p>
                      </div>

                      {/* Sign-off signatures */}
                      <div className="grid grid-cols-2 gap-6 pt-4 max-w-sm mx-auto text-center text-xs">
                        <div>
                          <p className="text-slate-400 font-bold uppercase text-[8px] tracking-wider">Tanggal Penghargaan</p>
                          <p className="font-extrabold text-slate-700 mt-1 text-[10px]">
                            {printTanggalPenghargaan ? new Date(printTanggalPenghargaan).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                          </p>
                        </div>
                        <div className="flex flex-col items-center">
                          <p className="text-slate-400 font-bold uppercase text-[8px] tracking-wider">Mengetahui,</p>
                          <p className="font-black text-[#091a3d] mt-1 text-[9px] uppercase tracking-wider">{printJabatanMengetahui}</p>
                          <div className="h-8"></div> {/* Spacer for signature */}
                          <div className="w-28 border-b border-slate-300"></div>
                          <p className="text-[9px] text-slate-700 font-extrabold uppercase tracking-wide mt-1 leading-tight">{printNamaMengetahui}</p>
                        </div>
                      </div>

                      {/* Motivation message */}
                      <p className="text-[9px] italic text-slate-400 font-medium pt-1">
                        "Barangsiapa yang bersungguh-sungguh, maka ia akan berhasil (Man Jadda Wajada)"
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons inside Modal footer */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 no-print">
                <button
                  type="button"
                  onClick={() => setPrintItem(null)}
                  className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-extrabold text-xs uppercase tracking-wider cursor-pointer transition"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 cursor-pointer transition shadow-md shadow-indigo-600/20"
                >
                  <Download className="w-4 h-4" />
                  Unduh PDF
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {deletingItem && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto no-print">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] border border-slate-100 p-6 w-full max-w-md shadow-2xl relative text-center space-y-4"
            >
              <div className="mx-auto w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center text-xl shrink-0">
                ⚠️
              </div>
              
              <div className="space-y-1">
                <h3 className="font-black text-slate-800 text-lg">Konfirmasi Hapus</h3>
                <p className="text-xs text-slate-500 font-bold leading-relaxed">
                  Apakah Anda yakin ingin menghapus data prestasi <span className="font-black text-slate-800">"{deletingItem.nama_siswa}"</span> di ajang <span className="font-black text-slate-800">"{deletingItem.nama_kompetisi}"</span>?
                </p>
                <p className="text-[10px] text-rose-500 font-bold uppercase tracking-wider">
                  Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingItem(null)}
                  className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer transition text-center"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeletePrestasi(deletingItem.id_prestasi);
                    setDeletingItem(null);
                    showToast('Prestasi berhasil dihapus');
                  }}
                  className="flex-1 px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer transition text-center shadow-lg shadow-rose-600/15"
                >
                  Ya, Hapus
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
