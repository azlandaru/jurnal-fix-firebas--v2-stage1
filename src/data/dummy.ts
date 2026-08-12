import { Siswa, User, Jurnal, CatatanPerkembangan, CatatanPerilaku, HomeVisit, Dokumentasi, Administrasi, Jadwal, SystemSettings, Prestasi } from '../types';

export const masterDataCSV: Record<string, string[]> = {
  "7A": [
    "Ahmadinezad Reza Firdaus",
    "Airlangga Ardhanaputra",
    "Alaric Fathir Ibrahim",
    "Aldebaran Kandra Susnanda",
    "Arga Atharizz Calief",
    "Athaya Arfa Alfalah",
    "Atthar Aqilla Achmad",
    "Fadhly Adhyastha Aldric",
    "Lalu Qean Al Zafran Rais",
    "Maulana Satria Pradita",
    "Muhammad Harun Al Rasyid Al Baar",
    "Muhammad Massa Prayatayusuf Utomo",
    "Muhammad Nafiazul Khoir",
    "Muhammad Zhafran Mulia",
    "Nauval Rayhanda Afriand",
    "Rasydan Kamal Barran",
    "Zaidan Muhammad Harraz"
  ],
  "7B": [
    "Abid Adnan Zahid",
    "Abiyan Ziyad Ulumuddin",
    "Agam Alvaro Pratama",
    "Hekal Ramdani",
    "Kenzie Alviansyah Putra",
    "M. Althaf Sirli Arrasyid",
    "Muhamad Dzahwan Firjatullah",
    "Muhammad Akmal El Azzam",
    "Muhammad Ashif",
    "Muhammad Faishal Syafiiq Mumtaaz",
    "Muhammad Khairi Nafi",
    "Muhammad Sakti Saputra",
    "Muhammad Thoriq Hasan",
    "Rayyan Barlian Darmawan",
    "Yazid Maher Ariqin",
    "Zafiral Athar Nugraha",
    "Ziaul Haq"
  ],
  "7C": [
    "Akhmad Syamil Altamis",
    "Albha Yusuf Alfaridzi",
    "Alby Umam Farsya Eldina",
    "Alqindi Haristsidqi",
    "Bima Wijayanto",
    "Dayyan Zakir Arkhan",
    "Faat Puji Radithya",
    "Fadeel Muharram",
    "Hafiizh Yusuf Habibie",
    "Harits Assaadiq",
    "Huda Aqila Haidar",
    "Mughnii Ibrahim Ramadhan",
    "Muhammad Hafizh Arkana",
    "Rizki Aghniyya Muflih",
    "Tubagus Nizam Syamil Hussein",
    "Widaad Alfahreyzi Jaenuri"
  ],
  "7D": [
    "Alissa Khaira Wilda",
    "Afsheena Raudotumadina Siddiqi",
    "Alya Ghaniya Koswara",
    "Asyifa Sabila Putri Prawira",
    "Athifa Fakhriyah Zildji",
    "Ayra Khansa",
    "Ayyuha Syafeeya Ramadhani",
    "Dzakira Aftani Zahra",
    "Elvira Amira Maharani",
    "Farhanah Ruqwani Ihwan",
    "Fayruz Azka Akbar",
    "Khanza Tsabitha Octavia",
    "Kiraniya Putri Maharani",
    "Maleeka Khaliluna",
    "Nasyitha Aida Noor",
    "Nur Alisha Dwi Kisworo",
    "Queena Dzakira Syaputri"
  ],
  "7E": [
    "Alnaira Princetta Melandri",
    "Anindita Drajat",
    "Ashadia Shasmin Lashira",
    "Delisha Qaireen Shazia",
    "Hana Aisya Salma",
    "Kayla Zahra Khairunnisa",
    "Khalda Nur Aurum Firmansyah",
    "Khansa Hafidzah Anwar",
    "Khansa Jihan Hafizah",
    "Latifa Safiya Azzahra",
    "Najiha Adzakira",
    "Nazwa Ayla Rahman",
    "Nura Azzahra Faradisa",
    "Syahla Azalea Althafunissa",
    "Syaqila Almahyra Mirza",
    "Zhafira Novia Setiani"
  ],
  "8A": [
    "Abdul Gofur Abassi",
    "Ahmad Fatih Qalqasyandi",
    "Ahmad Fauzi Nugroho",
    "Aldrich Hugo Kayana Hasania",
    "Arka Wijaya Pratama",
    "Bahara Ladala",
    "Djabbar Putra Al Bahri",
    "Elghifari Kaisar Syamil",
    "Ezza Fawaz Al Khalifa",
    "Fayyadh Kenzie Safaraz",
    "Hasbi Anggara",
    "Kenzie Ahza Hidayat",
    "Muhammad Albaihaqi Adha",
    "Muhammad Azkhia Algifari",
    "Moch. Fatih Faizullah",
    "Muhammad Satya Prabu",
    "Muhammad Sulthan Syahid",
    "Naufal Radhitya",
    "Raizel Abdillah Tsaniy Alkhalifi",
    "Reysha Fakhri Rasyid"
  ],
  "8B": [
    "Achmad Aqeela Danishwara",
    "Akbar Nur Azmi",
    "Akbar Rizki Pranata",
    "Alkhalifi Zikri I'tisham",
    "Ashlan Fawwaz Athaillah",
    "Daffa Nailul Adha",
    "Dhysa Rasyid Hidayat",
    "Gazza Al Gibran Gifarry",
    "Gilang Zidane Abdul Yusuf",
    "Ismail Tadhiyatulhaq Alhanif",
    "Mikail Islami Jaya Baya",
    "Muhammad Alvaro Andi Putra",
    "Muhammad Azka Al-Mi'raj",
    "Muhammad Faatih Adhyaksa",
    "Muhammad Fathir Al-Farabi",
    "Muhammad Hafiz Hibatul Baqi",
    "Muhammad Kamal Al Azami",
    "Muhammad Tsaqif Zidane",
    "Raden Satria Kusuma Negara",
    "Tristan Hafidz Wicaksono"
  ],
  "8C": [
    "Aldira Anastasya Fadillah",
    "Afra Belinda Lestari",
    "Aleni Kilua Noegraha",
    "Alya Syakira Kurnia Sudarto",
    "Assyila Nur Amalia Pasaribu",
    "Azzalea Latieshia Agatha",
    "Fatimah Zahrotul Ihwan",
    "Hilda Ainussyifa",
    "Kurnia Salama Tsabita",
    "Meylani Sanjaska",
    "Nabila Putri Efhelin",
    "Natasya Azalea Rizky",
    "Ratu Syafira Octaviani"
  ],
  "8D": [
    "Alya Zhaafirah",
    "Arissa Esta Fahima",
    "Khansa Adzra Mahira",
    "Medina Rhizkya Audityarini",
    "Naraya Aqila Hefinalika",
    "Naura Nurul Ramadhani",
    "Qonita Aini Putri",
    "Vellini Al Maidera Saputri",
    "Zainab Zafirah",
    "Zealisyka Al Khiyam",
    "Zhafira Alvina Jasmine"
  ],
  "9A": [
    "Abdullah",
    "Abid Fadel Al Abyan",
    "Daffa Atha Rizki",
    "Daffa Hadi Permana",
    "Faesya Muhammad Nahl",
    "Faiq Rafif Andritya",
    "Farras Muhammad Al Rayyan",
    "Gathan Zhiandra Rafisqy",
    "Hanif Surya Manggala",
    "Ihsan Kamal Ibrahim",
    "Maulidiansyah Azka Putra Kurniatama",
    "Moch. Ilham Maliki",
    "Muhamad Akmal Dzaki",
    "Mohammad Abrisam Rizqullah",
    "Muhammad Arsavin Ramadhan",
    "Muhammad Aryan Dzikri",
    "Naizar Dzakwan Najib",
    "Rasya Aldebaran Syaghaf",
    "Reyza Alvaro Putra Prasetyo",
    "Yazhar Ziyanur Rohman"
  ],
  "9B": [
    "Afif Romeita Hamdi",
    "Aikal Faiq Alatas",
    "Elvan Zavier Zhafran",
    "Fabian Aulia Ramadhan",
    "Fathan El Azzam Ruhiyat",
    "Ghaizan Falah Sanjaya",
    "Hanif Faishal Ibrahim",
    "Kiandra Akmal Aisyar",
    "Muammar Robbi Al Farisi",
    "Muhamad Azka Fahlevi",
    "Muhamad Daffa Ar Rasyid",
    "Muhamad Fawazul Ihwan",
    "Muhammad Falih Sabiq",
    "Muhammad Faqih Alaqsa",
    "Muhammad Zaki Alfatih Kurnia S",
    "Rafassa Azka Atharayhan",
    "Safaraz Rayshiva Fernanda"
  ],
  "9C": [
    "Alif Dzunnurain Al Faruq",
    "Altair Bariq Haryanto",
    "Athaillah Raihan Sofwan",
    "Aviccena Ahza Argani",
    "Emir Khaeran Adlen Pramono",
    "Faiq Al Kayyis",
    "Fathan Maisan Zhafran",
    "Fathir Ahza Argani",
    "Hardika Aries Putra",
    "Muhamad Raihan Putra Kusmana",
    "Muhammad Alkhalifi Anzati",
    "Muhammad Angga Yudha Prawira",
    "Muhammad Azzam Ar Rabbani",
    "Muhammad Izdihar Afaza Asnasyukri",
    "Muhammad Rafa Muzakki",
    "Raffasya Atharrayhan",
    "Sayyid Dzaki Althaf",
    "Sulthan Zaki Al Fayyadh",
    "Zulfaqar Adlan Hakim"
  ],
  "9D": [
    "Andi Assyiffa Dzikra",
    "Aulia Satriani",
    "Cahaya Suci Ramadhani",
    "Deaida Jasmine Mumtazah",
    "Fariesha Batriesyia Nur Mutaqin",
    "Hana Savitri",
    "Kalyca Jinan Azmi Harahap",
    "Khansa Fatihatul Hikmah",
    "Khansa Najlaa Septiani",
    "Kianna Dzikra Izzatunnisa",
    "Naila Afiqah Inaya",
    "Qoyimatul Adilah",
    "Rihani Nazhifah Sofwan",
    "Sabrina Azzahra Ciptadi",
    "Shabira Andini",
    "Shasa Kersa Mukti",
    "Zayna Queensa Rachman",
    "Nadine Zhafira Az Zahra"
  ]
};

export function generateSiswaFromCSV(): Siswa[] {
  const gen: Siswa[] = [];
  Object.keys(masterDataCSV).forEach(kelas => {
    masterDataCSV[kelas].forEach((nama, i) => {
      gen.push({
        id_siswa: `${kelas}-${(i + 1).toString().padStart(2, '0')}`,
        nama_siswa: nama,
        kelas: kelas,
        kelas_asal: kelas
      });
    });
  });
  return gen;
}

export const initialDummyUsers: User[] = [
  {
    id_user: "U01",
    username: "admin",
    password: "admin2026",
    role: "admin",
    nama_lengkap: "Administrator Sistem",
    status: "Aktif",
    id_referensi: ""
  },
  {
    id_user: "U02",
    username: "guru_ahmad",
    password: "guru123",
    role: "wali_kelas",
    nama_lengkap: "Ahmad Fauzi, S.Pd.",
    status: "Aktif",
    id_referensi: "WALI:7C|AJAR:7A,7B,7C|MAPEL:Matematika"
  },
  {
    id_user: "U03",
    username: "wali_fatih",
    password: "wali123",
    role: "wali",
    nama_lengkap: "Bapak H. Budiono",
    status: "Aktif",
    id_referensi: "7A-01,7A-02"
  }
];

export const initialDummySettings: SystemSettings = {
  tahun_ajaran: "2025/2026",
  batas_waktu_administrasi: "2026-06-30",
  semester: "Ganjil",
  nama_kepala_madrasah: "Ustadz H. Ahmad Hambali, Lc.",
  disabledMenusGuru: [],
  disabledMenusWaliKelas: []
};

export const initialDummyJurnal: Jurnal[] = [
  {
    id_jurnal: "JRN01",
    tanggal: "2026-06-23T08:00:00.000Z",
    nama_guru: "Ahmad Fauzi, S.Pd.",
    mata_pelajaran: "Matematika",
    kelas: "7C",
    jam_ke: "1 (07.30 - 08.10), 2 (08.10 - 08.50)",
    materi: "Bilangan Pecahan",
    uraian_pembelajaran: "Mempelajari operasi penjumlahan dan perkalian pecahan biasa dengan penyebut berbeda. Siswa mengerjakan latihan di papan tulis dengan sangat antusias.",
    siswa_sakit: "1 (Nabila Putri)",
    siswa_izin: "1 (Natasya Azalea)",
    siswa_alpa: "-",
    catatan: "Kondisi kelas kondusif, ananda sangat aktif.",
    foto_1: ""
  },
  {
    id_jurnal: "JRN02",
    tanggal: "2026-06-24T08:00:00.000Z",
    nama_guru: "Ahmad Fauzi, S.Pd.",
    mata_pelajaran: "Matematika",
    kelas: "7A",
    jam_ke: "3 (08.50 - 09.30), 4 (09.30 - 10.10)",
    materi: "Aljabar Sederhana",
    uraian_pembelajaran: "Mempelajari pengenalan variabel x dan y serta penyederhanaan bentuk aljabar linear. Santri aktif bertanya dan berdiskusi.",
    siswa_sakit: "-",
    siswa_izin: "1 (Arka Wijaya)",
    siswa_alpa: "-",
    catatan: "Penjelasan diulang dua kali untuk memantapkan konsep dasar persamaan variabel linear.",
    foto_1: ""
  }
];

export const initialDummyPerkembangan: CatatanPerkembangan[] = [
  {
    id_catatan: "PK01",
    tanggal: "2026-06-23T08:00:00.000Z",
    id_siswa: "7C-11", // Nabila Putri
    nama_guru: "Ahmad Fauzi, S.Pd.",
    mata_pelajaran: "Matematika",
    kategori: "Akademik",
    deskripsi_perkembangan: "Ananda Nabila menunjukkan penguasaan yang sangat baik terhadap konsep operasi matematika pecahan, menyelesaikan latihan dengan mandiri."
  },
  {
    id_catatan: "PK02",
    tanggal: "2026-06-24T08:00:00.000Z",
    id_siswa: "7A-01", // Ahmad Fatih Qalqasyandi
    nama_guru: "Ahmad Fauzi, S.Pd.",
    mata_pelajaran: "Matematika",
    kategori: "Akademik",
    deskripsi_perkembangan: "Ananda Ahmad Fatih menunjukkan ketertarikan tinggi pada pembahasan aljabar dan berhasil menyelesaikan soal tantangan dengan sangat cepat."
  }
];

export const initialDummyPerilaku: CatatanPerilaku[] = [
  {
    id_catatan: "PR01",
    tanggal: "2026-06-23T08:00:00.000Z",
    id_siswa: "7C-12", // Natasya Azalea
    nama_guru: "Ahmad Fauzi, S.Pd.",
    mata_pelajaran: "Matematika",
    jenis_perilaku: "Positif",
    deskripsi_perilaku: "Menawarkan diri untuk membantu membersihkan papan tulis dan merapikan meja guru setelah sesi pelajaran selesai.",
    tindak_lanjut: "Diberikan apresiasi poin sikap positif dan pujian di depan kelas."
  },
  {
    id_catatan: "PR02",
    tanggal: "2026-06-24T08:00:00.000Z",
    id_siswa: "7A-01", // Ahmad Fatih Qalqasyandi
    nama_guru: "Ahmad Fauzi, S.Pd.",
    mata_pelajaran: "Matematika",
    jenis_perilaku: "Positif",
    deskripsi_perilaku: "Sangat khusyuk saat berdoa bersama sebelum belajar dan berinisiatif merapikan saf shalat berjamaah dhuha.",
    tindak_lanjut: "Diberikan apresiasi poin karakter positif dan dicatat di mutaba'ah adab."
  },
  {
    id_catatan: "PR03",
    tanggal: "2026-06-25T08:00:00.000Z",
    id_siswa: "7A-02", // Ahmad Fauzi Nugroho
    nama_guru: "Ahmad Fauzi, S.Pd.",
    mata_pelajaran: "Matematika",
    jenis_perilaku: "Positif",
    deskripsi_perilaku: "Membantu menjelaskan materi aljabar ke teman sebangkunya yang masih kesulitan memahami rumus.",
    tindak_lanjut: "Diberikan pujian karena peduli dan senang berbagi pemahaman ilmu dengan sesama teman."
  }
];

export const initialDummyHomeVisit: HomeVisit[] = [
  {
    id_kunjungan: "HV01",
    tanggal: "2026-06-24T09:00:00.000Z",
    id_siswa: "7A-01",
    nama_guru: "Ahmad Fauzi, S.Pd.",
    alasan_kunjungan: "Koordinasi mengenai capaian hafalan Al-Qur'an dan peningkatan jam murojaah di rumah.",
    hasil_kunjungan: "Orang tua berkomitmen penuh untuk mengawasi murojaah ananda setiap setelah Maghrib.",
    tindak_lanjut: "Guru akan memantau buku mutaba'ah mingguan santri."
  }
];

export const initialDummyDokumentasi: Dokumentasi[] = [];

export const initialDummyAdministrasi: Administrasi[] = [
  {
    id_file: "ADM01",
    tanggal: "2026-06-15T07:00:00.000Z",
    nama_guru: "Ahmad Fauzi, S.Pd.",
    nama_file: "RPP Matematika Semester Genap KLS 7",
    jenis_file: "pdf",
    url_file: "https://example.com/mock-rpp.pdf"
  }
];

export const initialDummyJadwal: Jadwal[] = [
  {
    id_jadwal: "JDL01",
    nama_guru: "Ahmad Fauzi, S.Pd.",
    hari: "Senin",
    jam_ke: "1 (07.30 - 08.10), 2 (08.10 - 08.50)",
    mata_pelajaran: "Matematika",
    kelas: "7C",
    status_reminder: "Aktif"
  }
];

export const initialDummyActivityLogs: any[] = [
  {
    id_log: "LOG01",
    timestamp: "2026-07-04T08:30:00.000Z",
    id_user: "U02",
    nama_user: "Ahmad Fauzi, S.Pd.",
    role: "wali_kelas",
    aksi: "Mengisi Jurnal",
    rincian: "Mengisi jurnal harian Kelas 7C Mata Pelajaran Matematika"
  },
  {
    id_log: "LOG02",
    timestamp: "2026-07-03T14:15:00.000Z",
    id_user: "U02",
    nama_user: "Ahmad Fauzi, S.Pd.",
    role: "wali_kelas",
    aksi: "Mengunggah Administrasi",
    rincian: "Mengunggah file administrasi 'RPP Matematika Semester Genap KLS 7'"
  },
  {
    id_log: "LOG03",
    timestamp: "2026-07-03T09:00:00.000Z",
    id_user: "U01",
    nama_user: "Administrator Sistem",
    role: "admin",
    aksi: "Sinkronisasi Google Sheets",
    rincian: "Melakukan ekspor seluruh database ke Google Sheets"
  }
];

export const initialDummyPrestasi: Prestasi[] = [
  {
    id_prestasi: "PRST-01",
    nama_kompetisi: "Lomba Robotik Madrasah Nasional",
    penyelenggara: "Kementerian Agama RI (Kemenag)",
    kategori: "Robotik",
    nama_siswa: "Ahmad Fatih Qalqasyandi",
    id_siswa: "7A-01",
    kelas: "7A",
    tanggal: "2026-06-15",
    kategori_juara: "Juara 2 Utama",
    tingkat: "Nasional",
    sertifikat_url: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d",
    deskripsi: "Berhasil menciptakan prototipe robot pembersih sampah otomatis di lingkungan madrasah berbasis sensor ultrasonik.",
    created_by: "guru_ahmad"
  },
  {
    id_prestasi: "PRST-02",
    nama_kompetisi: "Musabaqah Hifzhil Qur'an (MHQ) 3 Juz",
    penyelenggara: "Lembaga Pengembangan Tilawatil Qur'an (LPTQ)",
    kategori: "Tahfidz",
    nama_siswa: "Nabila Putri",
    id_siswa: "7C-11",
    kelas: "7C",
    tanggal: "2026-06-20",
    kategori_juara: "Juara 1",
    tingkat: "Kabupaten",
    sertifikat_url: "",
    deskripsi: "Meraih predikat Mumtaz dengan kelancaran hafalan tajwid, makhorijul huruf, serta irama tilawah yang sangat tenang.",
    created_by: "admin"
  },
  {
    id_prestasi: "PRST-03",
    nama_kompetisi: "National Science & Olympiad Challenge",
    penyelenggara: "Pusat Olimpiade Sains Indonesia (POSI)",
    kategori: "Sains",
    nama_siswa: "Kenzie Ahza",
    id_siswa: "7A-12",
    kelas: "7A",
    tanggal: "2026-05-10",
    kategori_juara: "Medali Emas (Gold Medal)",
    tingkat: "Nasional",
    sertifikat_url: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173",
    deskripsi: "Menyelesaikan 40 soal analisis Fisika Terapan dan Matematika Logika dalam waktu kurang dari 90 menit dengan tingkat akurasi 95%.",
    created_by: "admin"
  }
];

