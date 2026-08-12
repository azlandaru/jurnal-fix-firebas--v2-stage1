import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Jurnal, HomeVisit, Dokumentasi, Siswa, CatatanPerkembangan, CatatanPerilaku } from '../types';

export function isValidImage(src: any): boolean {
  if (!src || typeof src !== 'string') return false;
  const s = src.trim();
  if (s === '' || s === '-' || s === '0' || s.toLowerCase() === 'undefined') return false;
  return s.startsWith('data:image/') || s.startsWith('http://') || s.startsWith('https://') || s.startsWith('blob:') || /^[A-Za-z0-9+/=]+$/.test(s.replace(/\s/g, ''));
}

export function getCleanImageBase64(src: string): Promise<string> {
  return new Promise((resolve) => {
    if (!src || typeof src !== 'string') {
      resolve('');
      return;
    }

    const trimmed = src.trim();

    // If it's already a clean base64 data URL starting with "data:image/"
    if (trimmed.startsWith('data:image/')) {
      // Clean up internal whitespaces/newlines which can corrupt jsPDF image parser
      const parts = trimmed.split(',');
      if (parts[1]) {
        resolve(parts[0] + ',' + parts[1].replace(/\s/g, ''));
      } else {
        resolve(trimmed);
      }
      return;
    }

    // If it's a blob URL (e.g. blob:http://...) or a standard HTTP/S URL
    if (trimmed.startsWith('blob:') || trimmed.startsWith('http:') || trimmed.startsWith('https:')) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width || 300;
          canvas.height = img.naturalHeight || img.height || 300;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            resolve(dataUrl);
          } else {
            resolve(trimmed);
          }
        } catch (err) {
          resolve(trimmed);
        }
      };
      img.onerror = () => {
        resolve(trimmed);
      };
      img.src = trimmed;
      return;
    }

    // If it is a base64 string but missing the prefix
    const cleanBase64 = trimmed.replace(/\s/g, '');
    if (/^[A-Za-z0-9+/=]+$/.test(cleanBase64)) {
      resolve('data:image/jpeg;base64,' + cleanBase64);
      return;
    }

    resolve(trimmed);
  });
}

export function drawKopSurat(doc: jsPDF) {
  // Kop surat ditiadakan berdasarkan permintaan user
}

export function drawFooter(doc: jsPDF, pageNum?: number, totalPages?: number) {
  // Preserve state
  const originalFont = doc.getFont();
  const originalFontSize = doc.getFontSize();
  const originalTextColor = doc.getTextColor();
  const originalDrawColor = doc.getDrawColor();
  const originalLineWidth = doc.getLineWidth();

  const footerY = 265; // Balanced position to stay clear of printable borders and the table

  // Double divider lines above footer
  doc.setLineWidth(0.8);
  doc.setDrawColor(15, 23, 42); // slate-900
  doc.line(14, footerY, 196, footerY);

  doc.setLineWidth(0.25);
  doc.line(14, footerY + 1.2, 196, footerY + 1.2);

  // Footer Text details
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text("KAMPUS IBAD AR RAHMAN", 105, footerY + 6, { align: "center" });

  doc.setFont("helvetica", "oblique");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text("Ibad Ar Rahman Islamic Boarding School", 105, footerY + 10, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("Jalan Cikoromoy Km. 01 Batubantar, Desa Cimanuk", 105, footerY + 14, { align: "center" });
  doc.text("Kabupaten Pandeglang - Provinsi Banten, Kode Pos 42271", 105, footerY + 18, { align: "center" });
  doc.text("Telepon :+62 (0253) 5210 995", 105, footerY + 22, { align: "center" });

  if (pageNum !== undefined && totalPages !== undefined) {
    // Page Number Indicator
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Halaman ${pageNum} dari ${totalPages}`, 196, footerY + 22, { align: "right" });
  }

  // Restore state
  doc.setFont(originalFont.fontName, originalFont.fontStyle);
  doc.setFontSize(originalFontSize);
  doc.setTextColor(originalTextColor);
  doc.setDrawColor(originalDrawColor);
  doc.setLineWidth(originalLineWidth);
}

export function formatDateID(dStr: string) {
  if (!dStr) return '';
  try {
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return dStr;
    const mo = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${d.getDate()} ${mo[d.getMonth()]} ${d.getFullYear()}`;
  } catch (e) {
    return dStr;
  }
}

// Extract human readable absence details
function getAbsenDetailText(type: 'Sakit' | 'Izin' | 'Alpa', rawStr: string): string {
  if (!rawStr || rawStr === '-' || rawStr === '0') return '';
  const m = String(rawStr).match(/^\d+\s*\((.*?)\)/);
  if (m && m[1]) {
    return `${type}: ${m[1]}`;
  }
  const names = rawStr.split(',').map(x => x.trim()).filter(x => x);
  if (names.length > 0) {
    return `${type}: ${names.join(', ')}`;
  }
  return '';
}

// Get numeric count of absent students
function getAbsenCount(rawStr: string): number {
  if (!rawStr || rawStr === '-' || rawStr === '0') return 0;
  const m = String(rawStr).match(/^(\d+)/);
  if (m) {
    return parseInt(m[1], 10);
  }
  return rawStr.split(',').map(x => x.trim()).filter(x => x).length;
}

export async function generateJurnalPDF(jurnal: Jurnal, tahunAjaran: string = '') {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const leftMargin = 15;
  const rightMargin = 15;
  let currentY = 15;

  // Fetch actual tahun ajaran from localStorage if not provided
  let activeTahunAjaran = tahunAjaran;
  if (!activeTahunAjaran) {
    try {
      const stored = localStorage.getItem('edu_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.tahun_ajaran) {
          activeTahunAjaran = parsed.tahun_ajaran;
        }
      }
    } catch (e) {
      // fallback
    }
  }
  if (!activeTahunAjaran) {
    activeTahunAjaran = '2025/2026';
  }

  // --- 1. Draw Kop Surat ---
  drawKopSurat(doc);

  // --- 3. DOCUMENT TITLE ---
  currentY = 18;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('MTS IBAD AR RAHMAN', 105, currentY, { align: 'center' });
  
  currentY += 5.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('JURNAL HARIAN DAN AGENDA MENGAJAR GURU', 105, currentY, { align: 'center' });
  
  currentY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`Tahun Ajaran: ${activeTahunAjaran}`, 105, currentY, { align: 'center' });

  // --- 4. DATA COMPILATION ---
  const parseKehadiranValue = () => {
    const sCount = getAbsenCount(jurnal.siswa_sakit);
    const iCount = getAbsenCount(jurnal.siswa_izin);
    const aCount = getAbsenCount(jurnal.siswa_alpa);
    
    let summary = `Sakit: ${sCount}, Izin: ${iCount}, Alpa: ${aCount}`;
    
    const details: string[] = [];
    const sDet = getAbsenDetailText('Sakit', jurnal.siswa_sakit);
    const iDet = getAbsenDetailText('Izin', jurnal.siswa_izin);
    const aDet = getAbsenDetailText('Alpa', jurnal.siswa_alpa);
    
    if (sDet) details.push(sDet);
    if (iDet) details.push(iDet);
    if (aDet) details.push(aDet);

    if (details.length > 0) {
      summary += `\n\nDetail Ketidakhadiran Santri:\n` + details.join('\n');
    } else {
      summary += `\n\nDetail Ketidakhadiran Santri:\nNihil (Semua Santri Hadir)`;
    }
    return summary;
  };

  // Parse materi
  const matVal = jurnal.materi || '';
  let ajar = matVal;
  let indikator = '';
  if (matVal.includes('[Ajar]') && (matVal.includes('| [Murojaah]') || matVal.includes('| [Indikator]'))) {
    const splitToken = matVal.includes('| [Indikator]') ? '| [Indikator]' : '| [Murojaah]';
    const parts = matVal.split(splitToken);
    ajar = parts[0].replace('[Ajar] ', '').trim();
    indikator = parts[1]?.trim() || '';
  }

  // --- 5. RENDER TABULAR DATA WITH AUTOTABLE ---
  const tableBody = [
    ['Hari / Tanggal', formatDateID(jurnal.tanggal)],
    ['Nama Guru Pengajar', jurnal.nama_guru],
    ['Mata Pelajaran', jurnal.mata_pelajaran],
    ['Rombel Kelas', `Kelas ${jurnal.kelas}`],
    ['Jam Mengajar / Ke', `Jam Ke- ${jurnal.jam_ke || '-'}`],
    ['Indikator Pembelajaran', indikator || '-'],
    ['Pokok Bahasan Materi', ajar || '-'],
    ['Uraian Kegiatan Pembelajaran', jurnal.uraian_pembelajaran || '-'],
    ['Presensi & Kehadiran Santri', parseKehadiranValue()],
    ['Catatan Kejadian Penting', jurnal.catatan || '-']
  ];

  autoTable(doc, {
    startY: currentY + 5,
    theme: 'grid',
    head: [['Aspek Agenda Pembelajaran', 'Rincian Kegiatan & Informasi Terkait']],
    body: tableBody,
    styles: {
      fontSize: 9.5,
      cellPadding: 4,
      valign: 'middle',
      overflow: 'linebreak',
      font: 'helvetica'
    },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold', fillColor: [240, 253, 250], textColor: [15, 118, 110] }, // Teal-50 & Teal-700
      1: { cellWidth: 130 }
    },
    headStyles: {
      fillColor: [13, 148, 136], // Teal-600
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10,
      halign: 'left'
    },
    margin: { top: 38, bottom: 42, left: leftMargin, right: rightMargin },
    didParseCell: (data: any) => {
      // Style first column bold
      if (data.column.index === 0) {
        data.cell.styles.fontStyle = 'bold';
      }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // --- 6. DOKUMENTASI (PHOTOS) SECTION ---
  const showFoto1 = isValidImage(jurnal.foto_1);
  const showFoto2 = isValidImage(jurnal.foto_2);
  const hasPhotos = showFoto1 || showFoto2;
  
  if (hasPhotos) {
    if (currentY + 68 > 280) {
      doc.addPage();
      currentY = 18;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text('Dokumentasi Kegiatan Pembelajaran:', leftMargin, currentY);
    currentY += 5;

    const drawImageSafely = async (base64Str: string, x: number, y: number, w: number, h: number) => {
      try {
        const cleanedBase64 = await getCleanImageBase64(base64Str);
        if (!cleanedBase64) throw new Error('Empty image');
        
        let format = 'JPEG';
        if (cleanedBase64.startsWith('data:image/png') || cleanedBase64.includes('png')) {
          format = 'PNG';
        } else if (cleanedBase64.startsWith('data:image/webp') || cleanedBase64.includes('webp')) {
          format = 'WEBP';
        } else if (cleanedBase64.startsWith('data:image/gif') || cleanedBase64.includes('gif')) {
          format = 'GIF';
        }
        
        doc.addImage(cleanedBase64, format, x, y, w, h);
      } catch (err) {
        // Fallback placeholder border and label
        doc.setDrawColor(204, 251, 241); // Teal-100
        doc.setFillColor(240, 253, 250); // Teal-50
        doc.rect(x, y, w, h, 'FD');
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8.5);
        doc.text('Pratinjau Foto Pembelajaran', x + w/2, y + h/2, { align: 'center' });
      }
    };

    if (showFoto1 && showFoto2) {
      const imgWidth = 85;
      const imgHeight = 55;
      await drawImageSafely(jurnal.foto_1!, leftMargin, currentY, imgWidth, imgHeight);
      await drawImageSafely(jurnal.foto_2!, leftMargin + imgWidth + 10, currentY, imgWidth, imgHeight);
      currentY += imgHeight + 8;
    } else if (showFoto1) {
      const imgWidth = 95;
      const imgHeight = 60;
      await drawImageSafely(jurnal.foto_1!, 57.5, currentY, imgWidth, imgHeight);
      currentY += imgHeight + 8;
    } else if (showFoto2) {
      const imgWidth = 95;
      const imgHeight = 60;
      await drawImageSafely(jurnal.foto_2!, 57.5, currentY, imgWidth, imgHeight);
      currentY += imgHeight + 8;
    }
  }

  // --- 7. SIGNATURE SECTION ---
  if (currentY + 36 > 280) {
    doc.addPage();
    currentY = 18;
  } else {
    currentY += 4;
  }

  const sigX = 140;
  doc.setFont('times', 'normal');
  doc.setFontSize(10.5);
  
  // Format Indonesian Date
  const dateStr = formatDateID(jurnal.tanggal);
  doc.text(`Pandeglang, ${dateStr}`, sigX, currentY);
  
  currentY += 5.5;
  doc.text('Guru Pengajar,', sigX, currentY);
  
  // Space for physical signature
  currentY += 21;
  doc.setFont('times', 'bold');
  doc.text(jurnal.nama_guru, sigX, currentY);
  
  // Clean underline under signature name
  const textWidth = doc.getTextWidth(jurnal.nama_guru);
  doc.setLineWidth(0.3);
  doc.setDrawColor(0, 0, 0);
  doc.line(sigX, currentY + 1, sigX + textWidth, currentY + 1);

  // Draw footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    // Draw kop surat on pages other than the first page too, if desired, but drawing footer is essential.
    if (i > 1) {
      drawKopSurat(doc);
    }
    drawFooter(doc, i, pageCount);
  }

  // Save the PDF
  const safeFilename = `Jurnal_${jurnal.kelas}_${jurnal.mata_pelajaran.replace(/[^a-zA-Z0-9]/g, '_')}_${jurnal.tanggal.substring(0, 10)}.pdf`;
  doc.save(safeFilename);
}

export async function generateHomeVisitPDF(hv: HomeVisit, studentName: string, studentKelas: string, parentName: string, activeTahunAjaran: string = '') {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Fetch actual tahun ajaran from localStorage if not provided
  let activeTA = activeTahunAjaran;
  if (!activeTA) {
    try {
      const stored = localStorage.getItem('edu_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.tahun_ajaran) {
          activeTA = parsed.tahun_ajaran;
        }
      }
    } catch (e) {}
  }
  if (!activeTA) activeTA = '2025/2026';

  let currentY = 18;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('LAPORAN KUNJUNGAN RUMAH (HOME VISIT)', 105, currentY, { align: 'center' });
  
  currentY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Tahun Ajaran: ${activeTA}`, 105, currentY, { align: 'center' });

  // BIODATA
  currentY += 8;
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  doc.setFont("helvetica", "bold");
  doc.text("IDENTITAS SANTRI & LAPORAN VISITASI", 14, currentY);

  doc.setFont("helvetica", "normal");
  doc.text("Nama Lengkap", 14, currentY + 6);
  doc.text(`: ${studentName}`, 45, currentY + 6);
  
  doc.text("Kelas Rombel", 14, currentY + 11);
  doc.text(`: Kelas ${studentKelas}`, 45, currentY + 11);
  
  doc.text("Nama Wali / Ortun", 14, currentY + 16);
  doc.text(`: ${parentName}`, 45, currentY + 16);

  doc.text("Tanggal Kunjungan", 110, currentY + 6);
  doc.text(`: ${formatDateID(hv.tanggal)}`, 142, currentY + 6);

  doc.text("Petugas Visit", 110, currentY + 11);
  doc.text(`: ${hv.nama_guru}`, 142, currentY + 11);

  currentY += 22;

  // TABLE OF DETAILS
  const tableBody = [
    ['Alasan / Fokus Masalah', hv.alasan_kunjungan],
    ['Hasil Diskusi & Solusi', hv.hasil_kunjungan],
    ['Tindak Lanjut', hv.tindak_lanjut]
  ];

  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    head: [['Aspek Kunjungan Rumah', 'Rincian Kegiatan & Hasil Pembahasan']],
    body: tableBody,
    styles: {
      fontSize: 9.5,
      cellPadding: 4,
      valign: 'middle',
      overflow: 'linebreak',
      font: 'helvetica'
    },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold', fillColor: [236, 254, 255], textColor: [8, 145, 178] }, // Cyan-50 & Cyan-700
      1: { cellWidth: 130 }
    },
    headStyles: {
      fillColor: [8, 145, 178], // Cyan-600
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10,
      halign: 'left'
    },
    margin: { top: 38, bottom: 42, left: 14, right: 14 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // PHOTOS
  const showFoto1 = isValidImage(hv.foto_1);
  const showFoto2 = isValidImage(hv.foto_2);
  const hasPhotos = showFoto1 || showFoto2;
  if (hasPhotos) {
    if (currentY + 68 > 280) {
      doc.addPage();
      currentY = 18;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text('Dokumentasi Kunjungan Rumah:', 14, currentY);
    currentY += 5;

    const imgW = 80;
    const imgH = 55;
    
    if (showFoto1) {
      try {
        const base64 = await getCleanImageBase64(hv.foto_1!);
        if (base64) {
          doc.addImage(base64, 'JPEG', 14, currentY, imgW, imgH);
        } else {
          throw new Error('Empty');
        }
      } catch (err) {
        doc.setDrawColor(224, 242, 254);
        doc.setFillColor(240, 249, 255);
        doc.rect(14, currentY, imgW, imgH, 'FD');
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8.5);
        doc.text('Foto Visit 1', 14 + imgW/2, currentY + imgH/2, { align: 'center' });
      }
    }

    if (showFoto2) {
      const xPos = 14 + imgW + 10;
      try {
        const base64 = await getCleanImageBase64(hv.foto_2!);
        if (base64) {
          doc.addImage(base64, 'JPEG', xPos, currentY, imgW, imgH);
        } else {
          throw new Error('Empty');
        }
      } catch (err) {
        doc.setDrawColor(224, 242, 254);
        doc.setFillColor(240, 249, 255);
        doc.rect(xPos, currentY, imgW, imgH, 'FD');
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8.5);
        doc.text('Foto Visit 2', xPos + imgW/2, currentY + imgH/2, { align: 'center' });
      }
    }

    currentY += imgH + 8;
  }

  // SIGNATURE
  if (currentY + 30 > 280) {
    doc.addPage();
    currentY = 18;
  } else {
    currentY += 4;
  }

  const sigX = 140;
  doc.setFont('times', 'normal');
  doc.setFontSize(10.5);
  doc.text(`Pandeglang, ${formatDateID(hv.tanggal)}`, sigX, currentY);
  
  currentY += 5.5;
  doc.text('Petugas Visitasi,', sigX, currentY);
  
  currentY += 21;
  doc.setFont('times', 'bold');
  doc.text(hv.nama_guru, sigX, currentY);
  
  const textWidth = doc.getTextWidth(hv.nama_guru);
  doc.setLineWidth(0.3);
  doc.line(sigX, currentY + 1, sigX + textWidth, currentY + 1);

  // Footer and Pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    drawFooter(doc, i, pageCount);
  }

  const safeFilename = `HomeVisit_${studentName.replace(/[^a-zA-Z0-9]/g, '_')}_${hv.tanggal.substring(0, 10)}.pdf`;
  doc.save(safeFilename);
}

export async function generateDokumentasiPDF(docData: Dokumentasi, activeTahunAjaran: string = '') {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Fetch actual tahun ajaran from localStorage if not provided
  let activeTA = activeTahunAjaran;
  if (!activeTA) {
    try {
      const stored = localStorage.getItem('edu_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.tahun_ajaran) {
          activeTA = parsed.tahun_ajaran;
        }
      }
    } catch (e) {}
  }
  if (!activeTA) activeTA = '2025/2026';

  let currentY = 18;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('LAPORAN DOKUMENTASI KEGIATAN MADRASAH', 105, currentY, { align: 'center' });
  
  currentY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Tahun Ajaran: ${activeTA}`, 105, currentY, { align: 'center' });

  // DETAILS PANEL
  currentY += 8;
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  doc.setFont("helvetica", "bold");
  doc.text("DETAIL KEGIATAN", 14, currentY);

  doc.setFont("helvetica", "normal");
  doc.text("Nama Kegiatan", 14, currentY + 6);
  doc.text(`: ${docData.nama_kegiatan}`, 45, currentY + 6);
  
  doc.text("Kelas Rombel", 14, currentY + 11);
  doc.text(`: Kelas ${docData.kelas}`, 45, currentY + 11);
  
  doc.text("Tanggal Kegiatan", 110, currentY + 6);
  doc.text(`: ${formatDateID(docData.tanggal)}`, 142, currentY + 6);

  doc.text("Guru Pembina", 110, currentY + 11);
  doc.text(`: ${docData.nama_guru}`, 142, currentY + 11);

  currentY += 22;

  // DOKUMENTASI IMAGE
  const showFoto = isValidImage(docData.foto);
  if (showFoto) {
    if (currentY + 110 > 280) {
      doc.addPage();
      currentY = 18;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text('Dokumentasi Visual Kegiatan:', 14, currentY);
    currentY += 5;

    const imgW = 140;
    const imgH = 95;
    const centerX = (210 - imgW) / 2;

    try {
      const base64 = await getCleanImageBase64(docData.foto);
      if (base64) {
        doc.addImage(base64, 'JPEG', centerX, currentY, imgW, imgH);
      } else {
        throw new Error('Empty image');
      }
    } catch (err) {
      doc.setDrawColor(224, 231, 255);
      doc.setFillColor(245, 247, 255);
      doc.rect(centerX, currentY, imgW, imgH, 'FD');
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.text('Gagal memuat foto dokumentasi', centerX + imgW/2, currentY + imgH/2, { align: 'center' });
    }

    currentY += imgH + 8;
  }

  // SIGNATURE
  if (currentY + 30 > 280) {
    doc.addPage();
    currentY = 18;
  } else {
    currentY += 4;
  }

  const sigX = 140;
  doc.setFont('times', 'normal');
  doc.setFontSize(10.5);
  doc.text(`Pandeglang, ${formatDateID(docData.tanggal)}`, sigX, currentY);
  
  currentY += 5.5;
  doc.text('Guru Pembina / Pelapor,', sigX, currentY);
  
  currentY += 21;
  doc.setFont('times', 'bold');
  doc.text(docData.nama_guru, sigX, currentY);
  
  const textWidth = doc.getTextWidth(docData.nama_guru);
  doc.setLineWidth(0.3);
  doc.line(sigX, currentY + 1, sigX + textWidth, currentY + 1);

  // Footer and Pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    drawFooter(doc, i, pageCount);
  }

  const safeFilename = `Dokumentasi_${docData.nama_kegiatan.replace(/[^a-zA-Z0-9]/g, '_')}_${docData.tanggal.substring(0, 10)}.pdf`;
  doc.save(safeFilename);
}

export async function generateRingkasanKonsultasiPDF(
  siswaObj: Siswa,
  perkembanganList: CatatanPerkembangan[],
  perilakuList: CatatanPerilaku[],
  tahunAjaran?: string
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Fetch actual tahun ajaran from localStorage if not provided
  let activeTA = tahunAjaran || '';
  if (!activeTA) {
    try {
      const stored = localStorage.getItem('edu_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.tahun_ajaran) {
          activeTA = parsed.tahun_ajaran;
        }
      }
    } catch (e) {}
  }
  if (!activeTA) activeTA = '2025/2026';

  let currentY = 18;

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('MTS IBAD AR RAHMAN', 105, currentY, { align: 'center' });

  currentY += 5.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('RINGKASAN EVALUASI AKADEMIK & CATATAN ADAB SANTRI', 105, currentY, { align: 'center' });

  currentY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Lembar Konsultasi Wali Santri - Tahun Ajaran ${activeTA}`, 105, currentY, { align: 'center' });

  // Student Identity Box
  currentY += 8;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(14, currentY, 182, 24, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('IDENTITAS SANTRI', 18, currentY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Nama Santri  : ${siswaObj.nama_siswa}`, 18, currentY + 11);
  doc.text(`ID / NIS Santri: ${siswaObj.id_siswa}`, 18, currentY + 16);
  doc.text(`Jenis Kelamin : ${siswaObj.jenis_kelamin || '-'}`, 18, currentY + 21);

  doc.text(`Kelas Rombel : Kelas ${siswaObj.kelas}`, 110, currentY + 11);
  doc.text(`Nama Wali    : ${siswaObj.nama_wali || '-'}`, 110, currentY + 16);
  doc.text(`Tanggal Cetak: ${formatDateID(new Date().toISOString())}`, 110, currentY + 21);

  currentY += 28;

  // --- SECTION 1: EVALUASI AKADEMIK & KETERAMPILAN ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(29, 78, 216); // blue-700
  doc.text('I. CATATAN EVALUASI PERKEMBANGAN AKADEMIK & KETERAMPILAN', 14, currentY);

  if (perkembanganList.length === 0) {
    currentY += 5;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Belum ada catatan perkembangan akademik direkam.', 18, currentY);
    currentY += 6;
  } else {
    const perkembanganRows = perkembanganList.map((p) => [
      formatDateID(p.tanggal),
      p.mata_pelajaran || '-',
      p.kategori,
      p.deskripsi_perkembangan,
      p.nama_guru
    ]);

    autoTable(doc, {
      startY: currentY + 3,
      theme: 'grid',
      head: [['Tanggal', 'Mata Pelajaran', 'Kategori', 'Uraian Capaian & Perkembangan', 'Guru Pengampu']],
      body: perkembanganRows,
      styles: {
        fontSize: 8,
        cellPadding: 3,
        valign: 'top',
        overflow: 'linebreak',
        font: 'helvetica'
      },
      columnStyles: {
        0: { cellWidth: 26 },
        1: { cellWidth: 32, fontStyle: 'bold' },
        2: { cellWidth: 24, fontStyle: 'bold' },
        3: { cellWidth: 68 },
        4: { cellWidth: 32 }
      },
      headStyles: {
        fillColor: [37, 99, 235], // blue-600
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5
      },
      margin: { left: 14, right: 14, top: 20, bottom: 35 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // --- SECTION 2: CATATAN ADAB & PERILAKU ---
  if (currentY + 40 > 260) {
    doc.addPage();
    currentY = 18;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(219, 39, 119); // pink-600
  doc.text('II. CATATAN ADAB, AKHLAK, & PERILAKU SANTRI', 14, currentY);

  if (perilakuList.length === 0) {
    currentY += 5;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Belum ada catatan perilaku / adab direkam.', 18, currentY);
    currentY += 6;
  } else {
    const perilakuRows = perilakuList.map((p) => [
      formatDateID(p.tanggal),
      p.jenis_perilaku,
      p.deskripsi_perilaku,
      p.tindak_lanjut || '-',
      p.nama_guru
    ]);

    autoTable(doc, {
      startY: currentY + 3,
      theme: 'grid',
      head: [['Tanggal', 'Sifat', 'Uraian Kejadian & Adab Santri', 'Penanganan / Tindak Lanjut', 'Guru / Wali']],
      body: perilakuRows,
      styles: {
        fontSize: 8,
        cellPadding: 3,
        valign: 'top',
        overflow: 'linebreak',
        font: 'helvetica'
      },
      columnStyles: {
        0: { cellWidth: 26 },
        1: { cellWidth: 20, fontStyle: 'bold' },
        2: { cellWidth: 70 },
        3: { cellWidth: 36 },
        4: { cellWidth: 30 }
      },
      headStyles: {
        fillColor: [219, 39, 119], // pink-600
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5
      },
      margin: { left: 14, right: 14, top: 20, bottom: 35 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // --- SECTION 3: REKOMENDASI KONSULTASI & TANDA TANGAN ---
  if (currentY + 45 > 260) {
    doc.addPage();
    currentY = 18;
  }

  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setFillColor(255, 255, 255);
  doc.rect(14, currentY, 182, 18, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Catatan / Kesimpulan Tambahan Konsultasi Orang Tua / Wali Santri:', 16, currentY + 4.5);

  currentY += 24;

  const dateToday = formatDateID(new Date().toISOString());
  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);

  // Left signature: Orang Tua / Wali
  doc.text('Mengetahui,', 25, currentY);
  doc.text('Orang Tua / Wali Santri', 25, currentY + 5);
  doc.text('( ............................................. )', 25, currentY + 24);

  // Right signature: Wali Kelas / Guru
  doc.text(`Pandeglang, ${dateToday}`, 135, currentY);
  doc.text('Wali Kelas / Guru Pengampu,', 135, currentY + 5);
  doc.text(`( ............................................. )`, 135, currentY + 24);

  // Footer for all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    drawFooter(doc, i, pageCount);
  }

  const safeName = siswaObj.nama_siswa.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Ringkasan_Evaluasi_${safeName}_${new Date().toISOString().substring(0, 10)}.pdf`);
}
