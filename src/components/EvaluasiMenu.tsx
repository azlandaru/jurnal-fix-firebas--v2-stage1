import React, { useState } from 'react';
import { CatatanPerkembangan, CatatanPerilaku, User, Siswa, getTeacherClasses } from '../types';
import { Search, Plus, Trash2, Edit, Award, Smile, CheckSquare, Eye, Book, CheckCircle, CheckCircle2, Printer, FileText } from 'lucide-react';
import { formatDateID, generateRingkasanKonsultasiPDF } from '../utils/pdfGenerator';

interface EvaluasiMenuProps {
  user: User;
  siswa: Siswa[];
  perkembangan: CatatanPerkembangan[];
  perilaku: CatatanPerilaku[];
  type: 'perkembangan' | 'perilaku';
  onAddPerkembangan: (p: CatatanPerkembangan) => Promise<void>;
  onEditPerkembangan: (p: CatatanPerkembangan) => Promise<void>;
  onDeletePerkembangan: (id: string) => Promise<void>;
  onAddPerilaku: (p: CatatanPerilaku) => Promise<void>;
  onEditPerilaku: (p: CatatanPerilaku) => Promise<void>;
  onDeletePerilaku: (id: string) => Promise<void>;
}

const templatePerkembanganAkademik: Record<string, string> = {
  "Sangat Baik": "Pengetahuan mencakup pemahaman konsep dan teori dasar mata pelajaran {mapel} yang sangat mendalam, runtut, dan komprehensif. Ananda menunjukkan daya analisis akademik yang tajam, mampu menyelesaikan ujian tertulis serta lembar kerja secara cermat, rapi, dan mandiri.\n\nSikap belajar yang ditunjukkan sangat positif dengan antusiasme tinggi saat sesi diskusi materi. Konsistensi dan ketelitian ini menjadi modal berharga bagi Ananda untuk meraih prestasi puncak.",
  "Baik": "Pengetahuan mencakup pemahaman konsep dan teori dasar mata pelajaran {mapel} yang berkembang dengan baik dan terstruktur. Ananda mampu mengikuti alur penjelasan teori di kelas dan menjawab latihan soal secara teratur.\n\nKeaktifan dan tanggung jawab dalam pengerjaan tugas akademik harian menunjukkan sikap positif. Dengan mempertahankan ketelitian saat menghadapi variasi soal, pemahaman teori Ananda akan semakin matang.",
  "Perlu Bimbingan": "Pengetahuan mencakup pemahaman konsep dan teori dasar mata pelajaran {mapel} yang masih memerlukan pendampingan intensif dari guru. Ananda terkadang kesulitan dalam memahami istilah teknis dan mengaplikasikan teori ke dalam latihan soal.\n\nDiperlukan perhatian khusus dan bimbingan pengulangan materi baik di sekolah maupun bimbingan belajar di rumah agar Ananda dapat membangun fondasi akademik yang lebih kokoh."
};

const templatePerkembanganPraktik: Record<string, string> = {
  "Sangat Baik": "Praktik meliputi aspek ketepatan teknis, urutan alur kerja, kelancaran unjuk kerja, dan hasil akhir yang sangat presisi pada mata pelajaran {mapel}. Ananda sangat mahir memeragakan instruksi praktik secara mandiri tanpa ragu.\n\nSelain penguasaan ketangkasan motorik yang unggul, Ananda senantiasa menerapkan standar keselamatan kerja (K3), menjaga kerapian area praktik, serta aktif membantu membimbing teman kelompoknya.",
  "Baik": "Praktik meliputi aspek ketepatan teknis, urutan alur kerja, dan hasil akhir pada mata pelajaran {mapel} yang terlaksana dengan baik sesuai petunjuk operasional. Ananda dapat menggunakan peralatan praktik secara aman dan tertib.\n\nHasil unjuk kerja menunjukkan penguasaan keterampilan yang memadai. Dengan menambah frekuensi jam latihan mandiri, kerapian dan efisiensi waktu praktik Ananda akan semakin sempurna.",
  "Perlu Bimbingan": "Praktik meliputi aspek ketepatan teknis, urutan alur kerja, dan hasil akhir pada mata pelajaran {mapel} yang masih memerlukan bimbingan dan pengawasan langsung dari instruktur. Ananda masih canggung dalam mengoperasikan alat dan menerapkan langkah kerja.\n\nDiperlukan simulasi peragaan berulang dan pendampingan bertahap agar Ananda lebih percaya diri, cermat, dan aman dalam menyelesaikan setiap tugas praktik."
};

const templatePerilakuPositif: Record<string, { desc: string; tindak: string }> = {
  "Siswa Aktif & Membantu Diskusi": {
    desc: "Kejadian: Saat guru membuka sesi pembelajaran, Ananda dengan antusias berinisiatif mengajukan pertanyaan kritis mengenai materi yang sedang dibahas, kemudian aktif mendampingi serta mengarahkan teman-teman dalam kelompok diskusi.\n\nAlur & Dampak: Antusiasme dan sikap terbuka ini menciptakan suasana belajar yang hidup, interaktif, dan kondusif bagi seluruh kawan sekelas.",
    tindak: "Diberikan apresiasi positif dan poin nilai plus karakter di depan kelas untuk memotivasi seluruh santri."
  },
  "Kedisiplinan & Piket Bersama": {
    desc: "Kejadian: Sebelum jam pelajaran dimulai, Ananda tiba di madrasah tepat waktu dengan seragam rapi lengkap, lalu berinisiatif memimpin pelaksanaan piket kebersihan hingga ruang kelas siap digunakan.\n\nAlur & Dampak: Kedisiplinan dan rasa tanggung jawab yang ditunjukkan secara konsisten ini memberikan kenyamanan belajar bagi seluruh penghuni kelas.",
    tindak: "Dicatat sebagai teladan kedisiplinan dan diberikan pujian lisan saat apel kelas."
  },
  "Akhlak Karimah & Kesopanan": {
    desc: "Kejadian: Saat berpapasan dengan guru maupun berinteraksi dengan sesama santri di lingkungan madrasah, Ananda senantiasa membiasakan senyum, salam, dan sapa dengan tutur kata yang sangat santun dan rendah hati.\n\nAlur & Dampak: Konsistensi penghormatan adab ini menghadirkan suasana persaudaraan yang sejuk dan menjadi teladan akhlakul karimah.",
    tindak: "Pujian khusus diberikan dalam catatan adab dan disampaikan kepada orang tua melalui laporan wali kelas."
  },
  "Shalat Dhuha": {
    desc: "Kejadian: Pada waktu Dhuha yang dijadwalkan, Ananda secara mandiri melangkah ke masjid/mushalla madrasah, berwudhu dengan tertib, lalu menunaikan Shalat Dhuha serta berzikir dengan khusyuk.\n\nAlur & Dampak: Keajegan ibadah sunnah ini memancarkan keteladanan spiritual yang kuat serta membawa suasana keberkahan bagi lingkungan madrasah.",
    tindak: "Diberikan apresiasi positif, ucapan selamat, serta dorongan untuk terus istiqamah menunaikan shalat sunnah Dhuha."
  }
};

const templatePerilakuNegatif: Record<string, { desc: string; tindak: string }> = {
  "Siswa Mengganggu Teman Saat Belajar": {
    desc: "Kejadian: Di tengah jam pelajaran saat guru menjelaskan materi, Ananda terdistraksi dan beberapa kali mengobrol serta bergurau dengan teman di sekitarnya.\n\nAlur & Dampak: Tindakan ini mengganggu konsentrasi belajar kelas di barisan duduknya serta membuat pengerjaan tugas mandiri Ananda menjadi terlambat.",
    tindak: "Dipindahkan posisi duduknya ke barisan depan, diberikan teguran simpatik, dan diajak dialog personal setelah jam pelajaran."
  },
  "Indisipliner Waktu & Lupa Perlengkapan": {
    desc: "Kejadian: Ananda masuk ke dalam kelas terlambat setelah bel berbunyi dan belum membawa buku paket serta perlengkapan belajar yang dibutuhkan.\n\nAlur & Dampak: Hal ini mengganggu kelancaran alur masuk pembelajaran dan mempengaruhi kesiapan Ananda dalam menyimak materi dari awal.",
    tindak: "Diberikan arahan komitmen kedisiplinan, diminta mencatat kembali materi, dan menginformasikan ke wali kelas untuk pemantauan perlengkapan."
  },
  "Kurang Sopan & Tutur Kata Less Santun": {
    desc: "Kejadian: Saat ditegur guru atau berinteraksi dalam kegiatan kelompok, Ananda menunjukkan sikap kurang mengindahkan instruksi dan sempat menggunakan tutur kata yang kurang santun.\n\nAlur & Dampak: Kejadian ini bertentangan dengan standar adab santri yang menjunjung tinggi kelembutan tutur kata dan ketundukan penghormatan.",
    tindak: "Pembinaan karakter dan adab secara personal, diajak membaca janji santri, dan diberikan tugas pembiasaan kalimat thayyibah."
  },
  "Abaikan Tugas & Bersikap Acuh": {
    desc: "Kejadian: Ketika batas waktu pengumpulan tugas kelas tiba, Ananda belum menyelesaikan lembar kerja mandiri yang disepakati dan tampak kurang bersemangat merespons arahan guru.\n\nAlur & Dampak: Kondisi ini berpotensi menghambat capaian perkembangan akademiknya jika tidak segera ditangani secara bersama.",
    tindak: "Diberikan waktu pengerjaan khusus di bawah pengawasan guru dan dijadwalkan sesi motivasi belajar personal."
  }
};

export const EvaluasiMenu: React.FC<EvaluasiMenuProps> = ({
  user,
  siswa,
  perkembangan,
  perilaku,
  type,
  onAddPerkembangan,
  onEditPerkembangan,
  onDeletePerkembangan,
  onAddPerilaku,
  onEditPerilaku,
  onDeletePerilaku
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [savedEvalTitle, setSavedEvalTitle] = useState('');

  // Common Form States
  const [tanggal, setTanggal] = useState(new Date().toISOString().substring(0, 10));
  const [selectedKelas, setSelectedKelas] = useState('');
  const [targetStudentIds, setTargetStudentIds] = useState<string[]>([]);
  
  // Perkembangan states
  const [mapel, setMapel] = useState('');
  const [kategori, setKategori] = useState<'Akademik' | 'Keterampilan'>('Akademik');
  const [descPerkembangan, setDescPerkembangan] = useState('');
  const [templateSel, setTemplateSel] = useState('');

  // Perilaku states
  const [jenisPerilaku, setJenisPerilaku] = useState<'Positif' | 'Negatif'>('Positif');
  const [descPerilaku, setDescPerilaku] = useState('');
  const [tindakLanjut, setTindakLanjut] = useState('');
  const [templatePerilakuSel, setTemplatePerilakuSel] = useState('');
  const [selectedPerilakuTemplates, setSelectedPerilakuTemplates] = useState<string[]>(['Siswa Aktif & Membantu Diskusi']);

  // Per-student customization states
  const [isPersonalizedPerStudent, setIsPersonalizedPerStudent] = useState<boolean>(false);
  const [individualDescs, setIndividualDescs] = useState<Record<string, string>>({});
  const [individualTindaks, setIndividualTindaks] = useState<Record<string, string>>({});

  // Print PDF states
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printSelectedKelas, setPrintSelectedKelas] = useState('');
  const [printSelectedStudentId, setPrintSelectedStudentId] = useState('all');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

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

  const getTeacherMapelList = () => {
    if (user.id_referensi) {
      const m = user.id_referensi.split('|').find(x => x.startsWith('MAPEL:'));
      if (m) return m.replace('MAPEL:', '').split(',').map(x => x.trim()).filter(x => x);
    }
    return [];
  };

  const teacherMapels = getTeacherMapelList();

  const getSpecificNotesForTemplate = (templateKey: string, studentName: string): string => {
    switch (templateKey) {
      case "Siswa Aktif & Membantu Diskusi":
        return `Catatan Khusus Keaktifan (${studentName}): Ananda ${studentName} menunjukkan antusiasme tinggi dengan mengajukan pertanyaan kritis dan berinisiatif membimbing kawan kelompoknya.`;
      case "Kedisiplinan & Piket Bersama":
        return `Catatan Khusus Kedisiplinan (${studentName}): Ananda ${studentName} hadir lebih awal dengan seragam rapi serta secara mandiri memimpin pelaksanaan piket kebersihan kelas.`;
      case "Akhlak Karimah & Kesopanan":
        return `Catatan Khusus Adab (${studentName}): Ananda ${studentName} senantiasa menerapkan adab salam, sapa, dan tutur kata santun kepada guru serta kawan-kawan.`;
      case "Shalat Dhuha":
        return `Catatan Khusus Shalat Dhuha (${studentName}): Ananda ${studentName} terbiasa menunaikan Shalat Dhuha secara rutin dan khusyuk di masjid madrasah.`;
      case "Siswa Mengganggu Teman Saat Belajar":
        return `Catatan Khusus Pemantauan (${studentName}): Ananda ${studentName} memerlukan pendampingan fokus agar tidak terdistraksi dan tidak mengganggu konsentrasi kawan sekelas.`;
      case "Indisipliner Waktu & Lupa Perlengkapan":
        return `Catatan Khusus Kedisiplinan (${studentName}): Ananda ${studentName} perlu diingatkan secara berkala mengenai ketepatan waktu hadir dan kelengkapan buku pelajaran.`;
      case "Kurang Sopan & Tutur Kata Less Santun":
        return `Catatan Khusus Adab (${studentName}): Ananda ${studentName} dalam proses pembimbingan adab tutur kata yang santun serta tata cara berinteraksi di madrasah.`;
      case "Abaikan Tugas & Bersikap Acuh":
        return `Catatan Khusus Tugas (${studentName}): Ananda ${studentName} membutuhkan dorongan motivasi dan pengawasan langsung agar menyelesaikan tugas tepat waktu.`;
      default:
        return `Catatan Khusus (${studentName}): Menunjukkan perkembangan karakter dan adab harian yang didampingi secara berkala oleh guru.`;
    }
  };

  // Auto-generate unique & personalized entries per student based on selected template(s)
  const generatePersonalizedEntriesFor = (
    selTemplates: string[],
    currentJenis: 'Positif' | 'Negatif',
    baseDesc: string,
    baseTindak: string
  ) => {
    const newDescs: Record<string, string> = {};
    const newTindaks: Record<string, string> = {};

    targetStudentIds.forEach((sId) => {
      const st = siswa.find(x => x.id_siswa === sId);
      const name = st ? st.nama_siswa.split(' ')[0] : 'Santri';

      let pDesc = baseDesc ? baseDesc.replace(/Ananda/g, `Ananda ${name}`) : `Catatan evaluasi khusus untuk Ananda ${name}.`;

      if (type === 'perilaku') {
        const customNotes: string[] = [];
        const templatesToUse = selTemplates.length > 0
          ? selTemplates
          : [currentJenis === 'Positif' ? 'Siswa Aktif & Membantu Diskusi' : 'Siswa Mengganggu Teman Saat Belajar'];

        templatesToUse.forEach(tKey => {
          customNotes.push(getSpecificNotesForTemplate(tKey, name));
        });

        if (customNotes.length > 0) {
          pDesc += `\n\n${customNotes.join('\n')}`;
        }
      } else {
        let note = '';
        if (kategori === 'Keterampilan') {
          if (templateSel === 'Sangat Baik') {
            note = `Catatan Khusus Praktik (${name}): Ananda ${name} sangat mahir memeragakan unjuk kerja ${mapel || 'mata pelajaran'} secara mandiri dan presisi.`;
          } else if (templateSel === 'Baik') {
            note = `Catatan Khusus Praktik (${name}): Ananda ${name} melaksanakan alur kerja praktik ${mapel || 'mata pelajaran'} dengan tertib dan lancar.`;
          } else {
            note = `Catatan Khusus Praktik (${name}): Ananda ${name} membutuhkan bimbingan peragaan teknis langsung pada mata pelajaran ${mapel || 'mata pelajaran'}.`;
          }
        } else {
          if (templateSel === 'Sangat Baik') {
            note = `Catatan Khusus Akademik (${name}): Ananda ${name} memiliki pemahaman teori ${mapel || 'mata pelajaran'} yang sangat tajam dan mendalam.`;
          } else if (templateSel === 'Baik') {
            note = `Catatan Khusus Akademik (${name}): Ananda ${name} menguasai konsep dasar ${mapel || 'mata pelajaran'} dengan terstruktur dan rapi.`;
          } else {
            note = `Catatan Khusus Akademik (${name}): Ananda ${name} memerlukan pendampingan latihan soal dan pengulangan teori ${mapel || 'mata pelajaran'}.`;
          }
        }
        if (note) {
          pDesc += `\n\n${note}`;
        }
      }

      newDescs[sId] = pDesc;
      newTindaks[sId] = baseTindak || 'Pendampingan dan pemantauan berkala oleh guru.';
    });

    setIndividualDescs(newDescs);
    setIndividualTindaks(newTindaks);
  };

  const generatePersonalizedEntries = () => {
    const baseDesc = type === 'perkembangan' ? descPerkembangan : descPerilaku;
    generatePersonalizedEntriesFor(selectedPerilakuTemplates, jenisPerilaku, baseDesc, tindakLanjut);
  };

  const handleTemplateChange = (val: string, currentMapel: string, currentKategori: 'Akademik' | 'Keterampilan') => {
    setTemplateSel(val);
    if (!val) return;
    const templateMap = currentKategori === 'Keterampilan' ? templatePerkembanganPraktik : templatePerkembanganAkademik;
    const templateText = templateMap[val];
    const mStr = currentMapel || '...';
    if (templateText) {
      const generated = templateText.replace(/{mapel}/g, mStr);
      setDescPerkembangan(generated);
      if (isPersonalizedPerStudent) {
        generatePersonalizedEntriesFor(selectedPerilakuTemplates, jenisPerilaku, generated, tindakLanjut);
      }
    }
  };

  const handleKategoriChange = (newKategori: 'Akademik' | 'Keterampilan') => {
    setKategori(newKategori);
    if (templateSel) {
      const templateMap = newKategori === 'Keterampilan' ? templatePerkembanganPraktik : templatePerkembanganAkademik;
      const templateText = templateMap[templateSel];
      if (templateText) {
        const generated = templateText.replace(/{mapel}/g, mapel || '...');
        setDescPerkembangan(generated);
        if (isPersonalizedPerStudent) {
          generatePersonalizedEntriesFor(selectedPerilakuTemplates, jenisPerilaku, generated, tindakLanjut);
        }
      }
    }
  };

  const handleMapelChange = (newMapel: string) => {
    setMapel(newMapel);
    if (templateSel) {
      const templateMap = kategori === 'Keterampilan' ? templatePerkembanganPraktik : templatePerkembanganAkademik;
      const templateText = templateMap[templateSel];
      if (templateText) {
        const generated = templateText.replace(/{mapel}/g, newMapel || '...');
        setDescPerkembangan(generated);
        if (isPersonalizedPerStudent) {
          generatePersonalizedEntriesFor(selectedPerilakuTemplates, jenisPerilaku, generated, tindakLanjut);
        }
      }
    }
  };

  // Helper for combining multiple behavior templates
  const applyMultiPerilakuTemplates = (selectedKeys: string[], currentJenis: 'Positif' | 'Negatif') => {
    setSelectedPerilakuTemplates(selectedKeys);
    if (selectedKeys.length === 0) {
      setDescPerilaku('');
      setTindakLanjut('');
      setTemplatePerilakuSel('');
      if (isPersonalizedPerStudent) {
        setIndividualDescs({});
        setIndividualTindaks({});
      }
      return;
    }
    const tplMap = currentJenis === 'Positif' ? templatePerilakuPositif : templatePerilakuNegatif;
    const descs: string[] = [];
    const tindaks: string[] = [];
    selectedKeys.forEach(k => {
      if (tplMap[k]) {
        descs.push(tplMap[k].desc);
        tindaks.push(tplMap[k].tindak);
      }
    });
    setTemplatePerilakuSel(selectedKeys[selectedKeys.length - 1] || '');
    const combinedDesc = descs.join('\n\n');
    const combinedTindak = tindaks.join('; ');
    setDescPerilaku(combinedDesc);
    setTindakLanjut(combinedTindak);

    if (isPersonalizedPerStudent) {
      generatePersonalizedEntriesFor(selectedKeys, currentJenis, combinedDesc, combinedTindak);
    }
  };

  const handleTogglePerilakuTemplate = (key: string) => {
    let nextKeys: string[];
    if (selectedPerilakuTemplates.includes(key)) {
      nextKeys = selectedPerilakuTemplates.filter(k => k !== key);
    } else {
      nextKeys = [...selectedPerilakuTemplates, key];
    }
    applyMultiPerilakuTemplates(nextKeys, jenisPerilaku);
  };

  const handleJenisPerilakuChange = (newJenis: 'Positif' | 'Negatif') => {
    setJenisPerilaku(newJenis);
    const defaultKey = newJenis === 'Positif' ? 'Siswa Aktif & Membantu Diskusi' : 'Siswa Mengganggu Teman Saat Belajar';
    applyMultiPerilakuTemplates([defaultKey], newJenis);
  };

  const handlePerilakuTemplateChange = (val: string, currentJenis: 'Positif' | 'Negatif') => {
    if (!val) return;
    if (!selectedPerilakuTemplates.includes(val)) {
      applyMultiPerilakuTemplates([...selectedPerilakuTemplates, val], currentJenis);
    } else {
      applyMultiPerilakuTemplates([val], currentJenis);
    }
  };

  const handleTogglePersonalized = (checked: boolean) => {
    setIsPersonalizedPerStudent(checked);
    if (checked) {
      generatePersonalizedEntries();
    }
  };

  const getStudentSuggestedKeywords = () => {
    const keywordsSet = new Set<string>();

    // 1. Dynamic extraction from target student(s) past behavior records
    if (targetStudentIds.length > 0) {
      const pastList = perilaku.filter(p => targetStudentIds.includes(p.id_siswa));
      pastList.forEach(p => {
        if (p.deskripsi_perilaku) {
          const txt = p.deskripsi_perilaku.toLowerCase();
          if (txt.includes("aktif") || txt.includes("tanya")) keywordsSet.add("Siswa aktif bertanya");
          if (txt.includes("diskusi")) keywordsSet.add("Membantu diskusi kelompok");
          if (txt.includes("piket") || txt.includes("kebersihan")) keywordsSet.add("Inisiatif piket bersama");
          if (txt.includes("santun") || txt.includes("sopan") || txt.includes("adab")) keywordsSet.add("Berakhlak santun");
          if (txt.includes("ibadah") || txt.includes("dzikir") || txt.includes("shalat")) keywordsSet.add("Disiplin ibadah & dzikir");
          if (txt.includes("terlambat") || txt.includes("waktu")) keywordsSet.add("Terlambat masuk kelas");
          if (txt.includes("ganggu") || txt.includes("obrol")) keywordsSet.add("Siswa mengganggu teman");
          if (txt.includes("tugas") || txt.includes("buku") || txt.includes("perlengkapan")) keywordsSet.add("Lupa membawa perlengkapan");
        }
      });
    }

    // 2. Default contextual suggestions based on Positif / Negatif
    const defaults = jenisPerilaku === 'Positif'
      ? ["Siswa aktif bertanya", "Berinisiatif piket", "Santun kepada guru", "Disiplin tepat waktu", "Rajin berjamaah", "Membantu teman", "Fokus menyimak"]
      : ["Siswa mengganggu teman", "Terlambat masuk kelas", "Lupa membawa perlengkapan", "Kurang fokus", "Sering bergurau", "Belum selesaikan tugas"];

    defaults.forEach(d => keywordsSet.add(d));
    return Array.from(keywordsSet);
  };

  const handleAddKeywordToDesc = (kw: string) => {
    const appendKw = (prevText: string) => {
      if (!prevText || !prevText.trim()) return kw + '.';
      const trimmed = prevText.trim();
      if (trimmed.endsWith('.')) return trimmed + ' ' + kw + '.';
      return trimmed + ', ' + kw + '.';
    };

    setDescPerilaku(prev => appendKw(prev));

    if (isPersonalizedPerStudent) {
      setIndividualDescs(prevMap => {
        const updated = { ...prevMap };
        Object.keys(updated).forEach(id => {
          updated[id] = appendKw(updated[id] || '');
        });
        return updated;
      });
    }
  };

  const handleOpenPrintModal = () => {
    const defaultKls = authClasses[0] || '';
    setPrintSelectedKelas(defaultKls);
    setPrintSelectedStudentId('all');
    setIsPrintModalOpen(true);
  };

  const handlePrintSingleStudent = async (studentId: string) => {
    const st = siswa.find(s => s.id_siswa === studentId);
    if (!st) return;
    const studentPerkembangan = (perkembangan || []).filter(p => p.id_siswa === studentId);
    const studentPerilaku = (perilaku || []).filter(p => p.id_siswa === studentId);
    await generateRingkasanKonsultasiPDF(st, studentPerkembangan, studentPerilaku);
  };

  const handlePrintBatch = async () => {
    setIsGeneratingPdf(true);
    try {
      if (printSelectedStudentId && printSelectedStudentId !== 'all') {
        await handlePrintSingleStudent(printSelectedStudentId);
      } else {
        const classStudents = siswa.filter(s => s.kelas === printSelectedKelas);
        for (const st of classStudents) {
          const studentPerkembangan = (perkembangan || []).filter(p => p.id_siswa === st.id_siswa);
          const studentPerilaku = (perilaku || []).filter(p => p.id_siswa === st.id_siswa);
          await generateRingkasanKonsultasiPDF(st, studentPerkembangan, studentPerilaku);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    } finally {
      setIsGeneratingPdf(false);
      setIsPrintModalOpen(false);
    }
  };

  const getFilteredData = () => {
    if (type === 'perkembangan') {
      let list = perkembangan || [];
      if (user.role !== 'admin' && user.role !== 'pengawas') {
        const authSiswaIds = siswa.filter(s => authClasses.includes(s.kelas)).map(s => s.id_siswa);
        list = list.filter(p => authSiswaIds.includes(p.id_siswa) || p.nama_guru === user.nama_lengkap);
      }
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return list.filter(p => {
          const s = siswa.find(x => x.id_siswa === p.id_siswa);
          return (
            p.mata_pelajaran.toLowerCase().includes(q) ||
            p.nama_guru.toLowerCase().includes(q) ||
            p.deskripsi_perkembangan.toLowerCase().includes(q) ||
            (s && s.nama_siswa.toLowerCase().includes(q))
          );
        });
      }
      return list;
    } else {
      let list = perilaku || [];
      if (user.role !== 'admin' && user.role !== 'pengawas') {
        const authSiswaIds = siswa.filter(s => authClasses.includes(s.kelas)).map(s => s.id_siswa);
        list = list.filter(p => authSiswaIds.includes(p.id_siswa) || p.nama_guru === user.nama_lengkap);
      }
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return list.filter(p => {
          const s = siswa.find(x => x.id_siswa === p.id_siswa);
          return (
            p.jenis_perilaku.toLowerCase().includes(q) ||
            p.nama_guru.toLowerCase().includes(q) ||
            p.deskripsi_perilaku.toLowerCase().includes(q) ||
            (s && s.nama_siswa.toLowerCase().includes(q))
          );
        });
      }
      return list;
    }
  };

  const filteredData = getFilteredData();

  const handleOpenAdd = () => {
    setEditingId(null);
    setTanggal(new Date().toISOString().substring(0, 10));
    setSelectedKelas(authClasses[0] || '');
    setTargetStudentIds([]);
    setMapel(teacherMapels[0] || '');
    setKategori('Akademik');
    setDescPerkembangan('');
    setTemplateSel('');
    setJenisPerilaku('Positif');
    setTemplatePerilakuSel('Siswa Aktif & Membantu Diskusi');
    setSelectedPerilakuTemplates(['Siswa Aktif & Membantu Diskusi']);
    setDescPerilaku(templatePerilakuPositif['Siswa Aktif & Membantu Diskusi'].desc);
    setTindakLanjut(templatePerilakuPositif['Siswa Aktif & Membantu Diskusi'].tindak);
    setIsPersonalizedPerStudent(false);
    setIndividualDescs({});
    setIndividualTindaks({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingId(item.id_catatan);
    setTanggal(item.tanggal.substring(0, 10));
    const s = siswa.find(x => x.id_siswa === item.id_siswa);
    setSelectedKelas(s ? s.kelas : '');
    setTargetStudentIds([item.id_siswa]);
    setMapel(item.mata_pelajaran || '');
    setIsPersonalizedPerStudent(false);
    setIndividualDescs({});
    setIndividualTindaks({});
    if (type === 'perkembangan') {
      setKategori(item.kategori);
      setDescPerkembangan(item.deskripsi_perkembangan);
      setTemplateSel('');
    } else {
      setJenisPerilaku(item.jenis_perilaku);
      setDescPerilaku(item.deskripsi_perilaku);
      setTindakLanjut(item.tindak_lanjut);
      setTemplatePerilakuSel('');
      setSelectedPerilakuTemplates([]);
    }
    setIsModalOpen(true);
  };

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = siswa.filter(s => s.kelas === selectedKelas).map(s => s.id_siswa);
      setTargetStudentIds(allIds);
    } else {
      setTargetStudentIds([]);
    }
  };

  const handleStudentCheckbox = (id: string, checked: boolean) => {
    if (checked) {
      setTargetStudentIds(prev => [...prev, id]);
    } else {
      setTargetStudentIds(prev => prev.filter(x => x !== id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (targetStudentIds.length === 0) {
      alert("Silakan pilih minimal 1 santri!");
      return;
    }

    setLoading(true);
    try {
      if (type === 'perkembangan') {
        if (!descPerkembangan) return;
        let count = 0;
        for (const sId of targetStudentIds) {
          const st = siswa.find(x => x.id_siswa === sId);
          const studentFirstName = st ? st.nama_siswa.split(' ')[0] : 'Santri';
          
          let finalDesc = descPerkembangan;
          if (isPersonalizedPerStudent && individualDescs[sId]) {
            finalDesc = individualDescs[sId];
          } else if (targetStudentIds.length > 1) {
            finalDesc = descPerkembangan.replace(/Ananda/g, `Ananda ${studentFirstName}`);
          }

          const payload: CatatanPerkembangan = {
            id_catatan: editingId && targetStudentIds.length === 1 ? editingId : 'PK' + Date.now() + count,
            tanggal: new Date(tanggal).toISOString(),
            id_siswa: sId,
            nama_guru: editingId ? (perkembangan.find(x => x.id_catatan === editingId)?.nama_guru || user.nama_lengkap) : user.nama_lengkap,
            mata_pelajaran: mapel,
            kategori: kategori,
            deskripsi_perkembangan: finalDesc
          };

          if (editingId && targetStudentIds.length === 1) {
            await onEditPerkembangan(payload);
          } else {
            await onAddPerkembangan(payload);
          }
          count++;
        }
      } else {
        if (!descPerilaku || !tindakLanjut) return;
        let count = 0;
        for (const sId of targetStudentIds) {
          const st = siswa.find(x => x.id_siswa === sId);
          const studentFirstName = st ? st.nama_siswa.split(' ')[0] : 'Santri';

          let finalDesc = descPerilaku;
          let finalTindak = tindakLanjut;

          if (isPersonalizedPerStudent && individualDescs[sId]) {
            finalDesc = individualDescs[sId];
            finalTindak = individualTindaks[sId] || tindakLanjut;
          } else if (targetStudentIds.length > 1) {
            finalDesc = descPerilaku.replace(/Ananda/g, `Ananda ${studentFirstName}`);
          }

          const payload: CatatanPerilaku = {
            id_catatan: editingId && targetStudentIds.length === 1 ? editingId : 'PR' + Date.now() + count,
            tanggal: new Date(tanggal).toISOString(),
            id_siswa: sId,
            nama_guru: editingId ? (perilaku.find(x => x.id_catatan === editingId)?.nama_guru || user.nama_lengkap) : user.nama_lengkap,
            mata_pelajaran: mapel,
            jenis_perilaku: jenisPerilaku,
            deskripsi_perilaku: finalDesc,
            tindak_lanjut: finalTindak
          };

          if (editingId && targetStudentIds.length === 1) {
            await onEditPerilaku(payload);
          } else {
            await onAddPerilaku(payload);
          }
          count++;
        }
      }
      if (editingId) {
        setSavedEvalTitle(type === 'perkembangan' ? "Evaluasi Capaian Berhasil Diubah" : "Catatan Adab Berhasil Diubah");
      } else {
        setSavedEvalTitle(type === 'perkembangan' ? "Evaluasi Capaian Berhasil Direkam" : "Catatan Adab Berhasil Direkam");
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
            {type === 'perkembangan' ? (
              <>
                <Award className="text-blue-500 w-7 h-7" /> Evaluasi Perkembangan Akademik
              </>
            ) : (
              <>
                <Smile className="text-pink-500 w-7 h-7" /> Catatan Perilaku &amp; Adab
              </>
            )}
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            {type === 'perkembangan'
              ? 'Laporan naratif kompetensi, akademik, dan hafalan santri.'
              : 'Pemantauan sikap dan pembinaan akhlak santri.'}
          </p>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Pencarian Data..."
              className={`pl-11 pr-4 py-3.5 border border-slate-200 rounded-xl text-sm w-full focus:ring-2 outline-none shadow-sm font-medium bg-white ${
                type === 'perkembangan' ? 'focus:ring-blue-400' : 'focus:ring-pink-400'
              }`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <button
            onClick={handleOpenPrintModal}
            className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-3.5 rounded-xl font-extrabold shadow-md transition transform hover:-translate-y-0.5 flex items-center gap-2 text-sm cursor-pointer shrink-0"
            title="Cetak Ringkasan Evaluasi & Adab Santri (PDF) untuk Konsultasi Orang Tua"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>Cetak Ringkasan PDF</span>
          </button>

          {!isReadOnly && (
            <button
              onClick={handleOpenAdd}
              className={`text-white px-6 py-3.5 rounded-xl font-black shadow-md transition transform hover:-translate-y-0.5 flex items-center gap-2 text-sm cursor-pointer shrink-0 ${
                type === 'perkembangan' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-pink-500 hover:bg-pink-600'
              }`}
            >
              <Plus className="w-4 h-4" /> Input {type === 'perkembangan' ? 'Evaluasi' : 'Adab'}
            </button>
          )}
        </div>
      </div>

      {/* Grid Table */}
      <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-slate-100">
        <table className="w-full text-sm text-left">
          {type === 'perkembangan' ? (
            <>
              <thead className="bg-slate-50 text-slate-500 font-black border-b border-slate-100">
                <tr>
                  <th className="px-6 py-5 uppercase tracking-wider text-[11px]">Tanggal</th>
                  <th className="px-6 py-5 uppercase tracking-wider text-[11px]">Nama Santri</th>
                  <th className="px-6 py-5 uppercase tracking-wider text-[11px]">Mata Pelajaran</th>
                  <th className="px-6 py-5 uppercase tracking-wider text-[11px]">Kategori</th>
                  <th className="px-6 py-5 uppercase tracking-wider text-[11px]">Deskripsi Evaluasi</th>
                  <th className="px-6 py-5 uppercase tracking-wider text-[11px]">Penginput</th>
                  <th className="px-6 py-5 uppercase tracking-wider text-[11px] text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-400 font-medium italic">
                      Tidak ada data evaluasi perkembangan.
                    </td>
                  </tr>
                ) : (
                  (filteredData as CatatanPerkembangan[]).map((p) => {
                    const sI = siswa.find(s => s.id_siswa === p.id_siswa);
                    const isAuthor = user.role === 'admin' || p.nama_guru === user.nama_lengkap;
                    return (
                      <tr key={p.id_catatan} className="hover:bg-blue-50/10 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-bold text-slate-700">{formatDateID(p.tanggal)}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-black text-slate-800">{sI ? sI.nama_siswa : p.id_siswa}</span>
                          <br />
                          <span className="text-[10px] text-blue-700 font-black uppercase tracking-wider bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md mt-1 inline-block">
                            KLS {sI?.kelas || ''}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-bold text-slate-700">{p.mata_pelajaran || '-'}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100">
                            {p.kategori}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="truncate w-56 text-sm font-medium text-slate-600" title={p.deskripsi_perkembangan}>
                            {p.deskripsi_perkembangan}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-xs font-bold text-slate-700">{p.nama_guru}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handlePrintSingleStudent(p.id_siswa)}
                              className="text-slate-400 hover:text-blue-600 transition p-1 cursor-pointer"
                              title="Cetak Ringkasan Konsultasi Santri Ini (PDF)"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            {!isReadOnly && isAuthor && (
                              <>
                                <button
                                  onClick={() => handleOpenEdit(p)}
                                  className="text-emerald-500 hover:text-emerald-700 transition p-1 cursor-pointer"
                                  title="Edit Catatan"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => onDeletePerkembangan(p.id_catatan)}
                                  className="text-slate-300 hover:text-red-500 transition p-1 cursor-pointer"
                                  title="Hapus Catatan"
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
            </>
          ) : (
            <>
              <thead className="bg-slate-50 text-slate-500 font-black border-b border-slate-100">
                <tr>
                  <th className="px-6 py-5 uppercase tracking-wider text-[11px]">Tanggal</th>
                  <th className="px-6 py-5 uppercase tracking-wider text-[11px]">Nama Santri</th>
                  <th className="px-6 py-5 uppercase tracking-wider text-[11px]">Mapel/Konteks</th>
                  <th className="px-6 py-5 uppercase tracking-wider text-[11px]">Jenis</th>
                  <th className="px-6 py-5 uppercase tracking-wider text-[11px]">Uraian Kejadian</th>
                  <th className="px-6 py-5 uppercase tracking-wider text-[11px]">Tindak Lanjut</th>
                  <th className="px-6 py-5 uppercase tracking-wider text-[11px] text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-400 font-medium italic">
                      Tidak ada catatan perilaku santri.
                    </td>
                  </tr>
                ) : (
                  (filteredData as CatatanPerilaku[]).map((p) => {
                    const sI = siswa.find(s => s.id_siswa === p.id_siswa);
                    const isAuthor = user.role === 'admin' || p.nama_guru === user.nama_lengkap;
                    const isPos = p.jenis_perilaku === 'Positif';
                    return (
                      <tr key={p.id_catatan} className="hover:bg-pink-50/10 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-bold text-slate-700">{formatDateID(p.tanggal)}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-black text-slate-800">{sI ? sI.nama_siswa : p.id_siswa}</span>
                          <br />
                          <span className="text-[10px] text-pink-700 font-black uppercase tracking-wider bg-pink-50 border border-pink-100 px-2 py-0.5 rounded-md mt-1 inline-block">
                            KLS {sI?.kelas || ''}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-bold text-slate-700">{p.mata_pelajaran || '-'}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                              isPos
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {p.jenis_perilaku}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="truncate w-48 text-sm font-medium text-slate-700" title={p.deskripsi_perilaku}>
                            {p.deskripsi_perilaku}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="truncate w-40 text-[11px] text-slate-500 font-bold bg-slate-100 px-2 py-1 rounded" title={p.tindak_lanjut}>
                            {p.tindak_lanjut}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handlePrintSingleStudent(p.id_siswa)}
                              className="text-slate-400 hover:text-pink-600 transition p-1 cursor-pointer"
                              title="Cetak Ringkasan Konsultasi Santri Ini (PDF)"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            {!isReadOnly && isAuthor && (
                              <>
                                <button
                                  onClick={() => handleOpenEdit(p)}
                                  className="text-emerald-500 hover:text-emerald-700 transition p-1 cursor-pointer"
                                  title="Edit Catatan"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => onDeletePerilaku(p.id_catatan)}
                                  className="text-slate-300 hover:text-red-500 transition p-1 cursor-pointer"
                                  title="Hapus Catatan"
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
            </>
          )}
        </table>
      </div>

      {/* Input Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9990] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl flex flex-col p-6 max-h-[90vh] overflow-y-auto animate-fade-in my-auto">
            <h3 className="font-extrabold text-xl text-slate-800 mb-6 border-b border-slate-100 pb-4">
              {editingId ? 'Edit Catatan Evaluasi' : `Input Catatan ${type === 'perkembangan' ? 'Akademik' : 'Perilaku & Adab'} Baru`}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-xs font-black text-slate-500 block mb-2 uppercase tracking-wider">
                  Tanggal Kejadian/Evaluasi
                </label>
                <input
                  type="date"
                  required
                  className="w-full border border-slate-200 p-4 rounded-xl font-bold bg-slate-50 text-slate-700 outline-none"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div>
                  <label className="text-xs font-black text-slate-500 block mb-2 uppercase tracking-wider">
                    Pilih Kelas
                  </label>
                  {editingId ? (
                    <input
                      type="text"
                      className="w-full border border-slate-200 p-4 rounded-xl font-bold bg-slate-100 text-slate-500 outline-none"
                      value={`Kelas ${selectedKelas}`}
                      readOnly
                    />
                  ) : (
                    <select
                      required
                      className="w-full border border-slate-200 p-4 rounded-xl font-bold bg-white text-slate-700 outline-none focus:ring-2 focus:ring-blue-400 shadow-sm"
                      value={selectedKelas}
                      onChange={(e) => {
                        setSelectedKelas(e.target.value);
                        setTargetStudentIds([]);
                      }}
                    >
                      <option value="">-- Pilih Kelas --</option>
                      {authClasses.map(c => (
                        <option key={c} value={c}>Kelas {c}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col">
                  <div className="flex justify-between items-center mb-3 border-b border-slate-200 pb-2">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1">
                      <CheckSquare className="w-3.5 h-3.5 text-blue-500" /> Target Santri
                    </label>
                    {!editingId && selectedKelas && (
                      <label className="text-[10px] font-bold text-blue-600 cursor-pointer bg-blue-100 px-2 py-1 rounded hover:bg-blue-200 transition flex items-center gap-1">
                        <input
                          type="checkbox"
                          onChange={(e) => handleToggleSelectAll(e.target.checked)}
                          checked={
                            selectedKelas !== '' &&
                            targetStudentIds.length === siswa.filter(s => s.kelas === selectedKelas).length
                          }
                        />
                        Pilih Semua
                      </label>
                    )}
                  </div>
                  <div className="h-40 overflow-y-auto pr-1 bg-white rounded-xl border border-slate-100 shadow-inner p-2">
                    {!selectedKelas ? (
                      <p className="text-xs text-slate-400 font-medium italic text-center pt-12">
                        Pilih kelas terlebih dahulu...
                      </p>
                    ) : (
                      siswa
                        .filter(s => s.kelas === selectedKelas && !s.kelas.includes('Lulus') && !s.kelas.includes('Alumni'))
                        .map(s => {
                          const isChecked = targetStudentIds.includes(s.id_siswa);
                          return (
                            <label
                              key={s.id_siswa}
                              className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-50 transition cursor-pointer text-xs"
                            >
                              <input
                                type="checkbox"
                                disabled={!!editingId}
                                checked={isChecked}
                                onChange={(e) => handleStudentCheckbox(s.id_siswa, e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                              />
                              <span className="font-bold text-slate-700">{s.nama_siswa} <span className="text-[10px] text-slate-400 font-medium">(Kelas {s.kelas})</span></span>
                            </label>
                          );
                        })
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 block mb-2 uppercase tracking-wider">
                  Mata Pelajaran / Konteks
                </label>
                {teacherMapels.length > 0 ? (
                  <select
                    className="w-full border border-slate-200 p-4 rounded-xl focus:ring-2 focus:ring-blue-400 bg-white font-semibold text-slate-700 outline-none"
                    value={mapel}
                    onChange={(e) => handleMapelChange(e.target.value)}
                    required
                  >
                    <option value="">-- Pilih Mapel --</option>
                    {teacherMapels.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    className="w-full border border-slate-200 p-4 rounded-xl font-bold bg-white text-slate-700 focus:ring-2 focus:ring-blue-400 outline-none shadow-sm"
                    placeholder="Contoh: Matematika, IPA"
                    value={mapel}
                    onChange={(e) => handleMapelChange(e.target.value)}
                  />
                )}
              </div>

              {type === 'perkembangan' ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                    <div>
                      <label className="text-xs font-black text-slate-500 block mb-2 uppercase tracking-wider">
                        Kategori Evaluasi
                      </label>
                      <select
                        required
                        className="w-full border border-slate-200 p-4 rounded-xl font-bold bg-white text-slate-700 outline-none"
                        value={kategori}
                        onChange={(e) => handleKategoriChange(e.target.value as any)}
                      >
                        <option value="Akademik">Tulis / Akademik Dasar</option>
                        <option value="Keterampilan">Praktik / Keterampilan</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-black text-indigo-500 block mb-2 uppercase tracking-wider flex items-center gap-1">
                        🪄 Template Cepat ({kategori === 'Keterampilan' ? 'Praktik' : 'Akademik Dasar'})
                      </label>
                      <select
                        className="w-full border border-indigo-200 p-4 rounded-xl font-bold bg-indigo-50 text-indigo-900 outline-none cursor-pointer"
                        value={templateSel}
                        onChange={(e) => handleTemplateChange(e.target.value, mapel, kategori)}
                      >
                        <option value="">-- Ketuk Pilih Template ({kategori === 'Keterampilan' ? 'Praktik' : 'Akademik Dasar'}) --</option>
                        <option value="Sangat Baik">Template: Sangat Baik ({kategori === 'Keterampilan' ? 'Praktik' : 'Teori'})</option>
                        <option value="Baik">Template: Baik ({kategori === 'Keterampilan' ? 'Praktik' : 'Teori'})</option>
                        <option value="Perlu Bimbingan">Template: Perlu Bimbingan ({kategori === 'Keterampilan' ? 'Praktik' : 'Teori'})</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-500 block mb-2 uppercase tracking-wider">
                      Deskripsi Naratif Evaluasi
                    </label>
                    <textarea
                      rows={5}
                      required
                      className="w-full border border-slate-200 p-4 rounded-xl font-medium bg-white focus:ring-2 focus:ring-blue-400 outline-none transition text-slate-700"
                      value={descPerkembangan}
                      onChange={(e) => setDescPerkembangan(e.target.value)}
                      placeholder="Jelaskan secara naratif capaian kompetensi santri..."
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-5">
                    <label className="text-xs font-black text-slate-500 block mb-2 uppercase tracking-wider">
                      Jenis Catatan Perilaku
                    </label>
                    <select
                      required
                      className="w-full border border-slate-200 p-4 rounded-xl font-black bg-white shadow-sm outline-none text-slate-700"
                      value={jenisPerilaku}
                      onChange={(e) => handleJenisPerilakuChange(e.target.value as any)}
                    >
                      <option value="Positif">👍 SIKAP POSITIF</option>
                      <option value="Negatif">⚠️ INDISIPLINER (NEGATIF)</option>
                    </select>
                  </div>

                  <div className="mb-5 bg-pink-50/40 p-4 rounded-2xl border border-pink-100">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-black text-pink-700 uppercase tracking-wider flex items-center gap-1">
                        <span>🪄 Pilih 1 atau Lebih Template Uraian ({jenisPerilaku}):</span>
                      </label>
                      {selectedPerilakuTemplates.length > 1 && (
                        <span className="text-[10px] font-black text-pink-600 bg-pink-100 px-2.5 py-0.5 rounded-full">
                          {selectedPerilakuTemplates.length} Template Tergabung
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                      {Object.keys(jenisPerilaku === 'Positif' ? templatePerilakuPositif : templatePerilakuNegatif).map(key => {
                        const isSelected = selectedPerilakuTemplates.includes(key);
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => handleTogglePerilakuTemplate(key)}
                            className={`text-xs font-bold px-3 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 border active:scale-95 ${
                              isSelected
                                ? 'bg-pink-600 text-white border-pink-600 shadow-sm'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-pink-50 hover:border-pink-300'
                            }`}
                          >
                            <span className="font-black text-xs">{isSelected ? '✓' : '+'}</span>
                            <span>{key}</span>
                          </button>
                        );
                      })}
                    </div>

                    <select
                      className="w-full border border-pink-200 p-3 rounded-xl font-bold bg-white text-pink-900 outline-none text-xs cursor-pointer"
                      value={templatePerilakuSel}
                      onChange={(e) => handlePerilakuTemplateChange(e.target.value, jenisPerilaku)}
                    >
                      <option value="">-- Pilih / Tambah Template Dari Dropdown ({jenisPerilaku}) --</option>
                      {Object.keys(jenisPerilaku === 'Positif' ? templatePerilakuPositif : templatePerilakuNegatif).map(key => (
                        <option key={key} value={key}>Template: {key}</option>
                      ))}
                    </select>
                  </div>

                  {/* Saran Kata Kunci (Keywords) Otomatis Berdasarkan Riwayat / Sikap */}
                  <div className="mb-5 bg-pink-50/60 p-4 rounded-2xl border border-pink-100 shadow-3xs">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-black text-pink-800 uppercase tracking-wider flex items-center gap-1.5">
                        <span>🏷️ Saran Kata Kunci Otomatis (Ketuk untuk Menyisipkan):</span>
                      </label>
                      {targetStudentIds.length > 0 && (
                        <span className="text-[10px] font-black text-pink-600 bg-pink-100/80 border border-pink-200 px-2.5 py-0.5 rounded-full">
                          Berdasarkan Riwayat Santri ({targetStudentIds.length} Terpilih)
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {getStudentSuggestedKeywords().map((kw, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleAddKeywordToDesc(kw)}
                          className="text-xs font-bold bg-white text-pink-700 hover:bg-pink-600 hover:text-white border border-pink-200 px-3 py-1.5 rounded-xl transition-all shadow-2xs cursor-pointer active:scale-95 flex items-center gap-1.5"
                          title="Klik untuk menyisipkan kata kunci ini ke uraian"
                        >
                          <span className="font-black text-pink-500 hover:text-white">+</span> {kw}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-5">
                    <label className="text-xs font-black text-slate-500 block mb-2 uppercase tracking-wider">
                      Uraian Kejadian Secara Spesifik (Dapat Diedit Guru)
                    </label>
                    <textarea
                      rows={5}
                      required
                      placeholder="Sebutkan detail kronologis atau tindakan santri..."
                      className="w-full border border-slate-200 p-4 rounded-xl font-medium bg-white shadow-sm focus:ring-2 focus:ring-pink-400 outline-none text-slate-700"
                      value={descPerilaku}
                      onChange={(e) => setDescPerilaku(e.target.value)}
                    />
                    <p className="text-[10px] text-slate-400 font-bold mt-1.5 flex items-center gap-1">
                      💡 Template di atas dapat diedit, disesuaikan, atau ditambahkan rincian kronologis kejadian secara spesifik oleh guru.
                    </p>
                  </div>

                  <div className="mb-6">
                    <label className="text-xs font-black text-slate-500 block mb-2 uppercase tracking-wider">
                      Penanganan / Tindak Lanjut Guru
                    </label>
                    <textarea
                      rows={2}
                      required
                      placeholder="Tindakan yang telah Anda lakukan..."
                      className="w-full border border-slate-200 p-4 rounded-xl font-medium bg-white shadow-sm focus:ring-2 focus:ring-pink-400 outline-none text-slate-700"
                      value={tindakLanjut}
                      onChange={(e) => setTindakLanjut(e.target.value)}
                    />
                  </div>

                  {/* Opsi Personalisasi Deskripsi Per Santri */}
                  {targetStudentIds.length > 0 && (
                    <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isPersonalizedPerStudent}
                            onChange={(e) => handleTogglePersonalized(e.target.checked)}
                            className="w-4.5 h-4.5 text-pink-600 rounded cursor-pointer"
                          />
                          <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                            👤 Personalisasi Deskripsi Tiap Santri ({targetStudentIds.length} Terpilih)
                          </span>
                        </label>
                        {isPersonalizedPerStudent && (
                          <button
                            type="button"
                            onClick={generatePersonalizedEntries}
                            className="text-xs font-bold text-pink-600 hover:text-pink-700 underline cursor-pointer self-start sm:self-auto"
                          >
                            🔄 Re-generate Nama &amp; Variasi Unik
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium mt-1">
                        {isPersonalizedPerStudent
                          ? "Setiap santri akan memiliki uraian deskripsi khusus dengan nama mereka dan catatan unik yang dapat Anda edit per individu di bawah."
                          : "Aktifkan agar setiap santri memiliki uraian nama & catatan individual yang berbeda."}
                      </p>

                      {isPersonalizedPerStudent && (
                        <div className="mt-4 space-y-3.5 max-h-80 overflow-y-auto pr-1 border-t border-slate-200 pt-3">
                          {targetStudentIds.map((sId) => {
                            const st = siswa.find(x => x.id_siswa === sId);
                            return (
                              <div key={sId} className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                                    <span>👤</span> {st?.nama_siswa} <span className="text-slate-400 font-normal">({st?.kelas})</span>
                                  </span>
                                  <span className="text-[10px] font-black text-pink-600 bg-pink-50 border border-pink-100 px-2 py-0.5 rounded-full">
                                    Catatan Khusus Santri Ini
                                  </span>
                                </div>
                                <textarea
                                  rows={3}
                                  className="w-full text-xs font-medium border border-slate-200 p-2.5 rounded-lg outline-none focus:ring-1 focus:ring-pink-400 bg-slate-50/50"
                                  value={individualDescs[sId] || ''}
                                  onChange={(e) => setIndividualDescs({ ...individualDescs, [sId]: e.target.value })}
                                  placeholder="Deskripsi khusus untuk santri ini..."
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </>
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
                  className={`flex-1 text-white font-black text-base py-4 rounded-xl shadow-xl transition transform active:scale-95 disabled:opacity-50 cursor-pointer ${
                    type === 'perkembangan' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-pink-500 hover:bg-pink-600'
                  }`}
                >
                  {loading ? 'Menyimpan...' : (editingId ? 'SIMPAN PERUBAHAN' : 'REKAM EVALUASI')}
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
              <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-md animate-bounce bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="w-10 h-10" />
              </div>
            </div>

            <h3 className="text-2xl font-black mb-3 text-slate-800 tracking-tight">
              {savedEvalTitle}
            </h3>
            
            <p className="text-slate-500 mb-8 text-sm leading-relaxed font-semibold">
              {type === 'perkembangan'
                ? "Catatan evaluasi perkembangan akademik & kompetensi santri berhasil disimpan dengan aman ke sistem."
                : "Catatan adab & perilaku harian santri berhasil direkam dengan aman ke sistem."}
            </p>

            <button
              onClick={handleCloseSuccessPopup}
              className={`w-full text-white font-black text-base py-4.5 rounded-2xl shadow-xl transition transform active:scale-95 cursor-pointer ${
                type === 'perkembangan' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-pink-500 hover:bg-pink-600'
              }`}
            >
              OK, SAYA MENGERTI
            </button>
          </div>
        </div>
      )}

      {/* Modal Cetak Ringkasan PDF */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9990] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg p-6 animate-fade-in my-auto border border-slate-100">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
                  <Printer className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-800">
                    Cetak Ringkasan Konsultasi PDF
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Laporan Catatan Akademik &amp; Adab Santri
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-black text-slate-500 block mb-1.5 uppercase tracking-wider">
                  Pilih Rombel Kelas
                </label>
                <select
                  value={printSelectedKelas}
                  onChange={(e) => {
                    setPrintSelectedKelas(e.target.value);
                    setPrintSelectedStudentId('all');
                  }}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-400 outline-none bg-slate-50"
                >
                  {authClasses.map((kls) => (
                    <option key={kls} value={kls}>
                      Kelas {kls}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 block mb-1.5 uppercase tracking-wider">
                  Pilih Target Santri
                </label>
                <select
                  value={printSelectedStudentId}
                  onChange={(e) => setPrintSelectedStudentId(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-400 outline-none bg-slate-50"
                >
                  <option value="all">-- Semua Santri Kelas {printSelectedKelas} --</option>
                  {siswa
                    .filter((s) => s.kelas === printSelectedKelas)
                    .map((st) => (
                      <option key={st.id_siswa} value={st.id_siswa}>
                        {st.nama_siswa} (ID: {st.id_siswa})
                      </option>
                    ))}
                </select>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
                <div className="font-bold text-slate-700 flex items-center justify-between">
                  <span>Komponen Laporan PDF:</span>
                  <span className="text-emerald-700 font-extrabold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    PDF Siap Dicetak
                  </span>
                </div>
                <ul className="text-slate-600 space-y-1 list-disc pl-4 font-medium">
                  <li>Identitas Santri &amp; Rombel Lengkap</li>
                  <li>Catatan Evaluasi Perkembangan Akademik &amp; Keterampilan</li>
                  <li>Catatan Adab, Akhlak, &amp; Karakter Perilaku Santri</li>
                  <li>Seksi Catatan Kesimpulan Konsultasi &amp; Tanda Tangan Wali</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handlePrintBatch}
                disabled={isGeneratingPdf}
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isGeneratingPdf ? (
                  <>Memproses PDF...</>
                ) : (
                  <>
                    <Printer className="w-4 h-4" /> Unduh PDF Ringkasan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
