export interface User {
  id_user: string;
  username: string;
  password?: string;
  role: 'admin' | 'guru' | 'wali_kelas' | 'pengawas' | 'wali';
  nama_lengkap: string;
  id_referensi: string; // e.g. WALI:7A|AJAR:7A,7B|MAPEL:Matematika or student IDs for wali
  status: 'Aktif' | 'Nonaktif';
}

export interface Siswa {
  id_siswa: string;
  nama_siswa: string;
  kelas: string;
  kelas_asal?: string; // Original class before promotion (e.g. 7A, 7B, 7C, 7D, 7E)
  tahun_kenaikan?: string; // Academic year of last promotion e.g. "2025/2026"
  jenis_kelamin?: string;
  nama_wali?: string;
}

export interface Jurnal {
  id_jurnal: string;
  tanggal: string;
  nama_guru: string;
  mata_pelajaran: string;
  kelas: string;
  jam_ke: string; // e.g. "1 (07.30 - 08.10), 2 (08.10 - 08.50)"
  materi: string;
  uraian_pembelajaran: string;
  siswa_sakit: string; // e.g. "1 (Nabila Putri)" or "-"
  siswa_izin: string;  // e.g. "1 (Natasya Azalea)" or "-"
  siswa_alpa: string; // e.g. "-"
  catatan: string;
  foto_1?: string; // base64 or URL
  foto_2?: string; // base64 or URL
  foto_kehadiran?: string; // base64 or URL
}

export interface CatatanPerkembangan {
  id_catatan: string;
  tanggal: string;
  id_siswa: string;
  nama_guru: string;
  mata_pelajaran: string;
  kategori: 'Akademik' | 'Keterampilan';
  deskripsi_perkembangan: string;
}

export interface CatatanPerilaku {
  id_catatan: string;
  tanggal: string;
  id_siswa: string;
  nama_guru: string;
  mata_pelajaran: string;
  jenis_perilaku: 'Positif' | 'Negatif';
  deskripsi_perilaku: string;
  tindak_lanjut: string;
}

export interface HomeVisit {
  id_kunjungan: string;
  tanggal: string;
  id_siswa: string;
  nama_guru: string;
  alasan_kunjungan: string;
  hasil_kunjungan: string;
  tindak_lanjut: string;
  foto_1?: string;
  foto_2?: string;
}

export interface Dokumentasi {
  id_dokumentasi: string;
  tanggal: string;
  kelas: string;
  nama_kegiatan: string;
  foto: string; // base64 or URL
  fotos?: string[]; // Up to 4 photos
  nama_guru: string;
  isFromJournal?: boolean;
}

export interface Administrasi {
  id_file: string;
  tanggal: string;
  nama_guru: string;
  nama_file: string;
  jenis_file: 'pdf' | 'doc' | 'url';
  url_file: string;
}

export interface Jadwal {
  id_jadwal: string;
  nama_guru: string;
  hari: string;
  jam_ke: string;
  mata_pelajaran: string;
  kelas: string;
  status_reminder: 'Aktif' | 'Nonaktif';
}

export interface SystemSettings {
  tahun_ajaran: string;
  batas_waktu_administrasi: string;
  semester: 'Ganjil' | 'Genap';
  nama_kepala_madrasah?: string;
  disabledMenusGuru?: string[];
  disabledMenusWaliKelas?: string[];
}

export interface ActivityLog {
  id_log: string;
  timestamp: string;
  id_user: string;
  nama_user: string;
  role: string;
  aksi: string;
  rincian: string;
  sync_status?: 'Berhasil' | 'Gagal' | 'Tidak Aktif' | 'Proses';
}

export interface MadrasahEvent {
  id_event: string;
  tanggal: string; // YYYY-MM-DD
  nama_kegiatan: string;
  jenis: string;
  deskripsi?: string;
}

export interface Prestasi {
  id_prestasi: string;
  nama_kompetisi: string;
  penyelenggara: string;
  kategori: 'Akademik' | 'Non Akademik' | 'Teknologi' | 'Tahfidz' | 'Agama' | 'Sains' | 'Bahasa' | 'Robotik' | 'Design' | 'Lainnya' | string;
  nama_siswa: string;
  id_siswa: string;
  kelas: string;
  tanggal: string; // YYYY-MM-DD
  kategori_juara: string;
  tingkat: 'Sekolah' | 'Kecamatan' | 'Kabupaten' | 'Provinsi' | 'Nasional' | 'Internasional' | string;
  sertifikat_url?: string;
  deskripsi?: string;
  created_by: string; // Username of creator
  jenis?: 'Individu' | 'Kelompok';
  id_siswa_list?: string[];
  nama_siswa_list?: string[];
}

export function getTeacherClasses(user: User): string[] {
  if (!user) return [];
  const classes: string[] = [];
  if (user.id_referensi) {
    const parts = user.id_referensi.split('|');
    const w = parts.find(x => x.startsWith('WALI:'));
    if (w) {
      const waliClass = w.replace('WALI:', '').trim();
      if (waliClass) classes.push(waliClass);
    }
    const a = parts.find(x => x.startsWith('AJAR:'));
    if (a) {
      const ajarClasses = a.replace('AJAR:', '').split(',').map(x => x.trim()).filter(Boolean);
      classes.push(...ajarClasses);
    }
    if (!w && !a) {
      const simpleClasses = user.id_referensi.split(',').map(x => x.trim()).filter(Boolean);
      classes.push(...simpleClasses);
    }
  }

  if (classes.length === 0) {
    const textToMatch = `${user.username} ${user.nama_lengkap}`.toUpperCase();
    const matches = textToMatch.match(/(7[A-E]|8[A-E]|9[A-E])/g);
    if (matches) {
      classes.push(...matches);
    }
  }

  return Array.from(new Set(classes.filter(Boolean))).sort();
}


