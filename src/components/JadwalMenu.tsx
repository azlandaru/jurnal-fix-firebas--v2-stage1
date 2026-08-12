import React, { useState } from 'react';
import { Jadwal, User, Siswa, Jurnal, MadrasahEvent, getTeacherClasses } from '../types';
import { Calendar, Plus, Trash2, ShieldCheck, Clock, Check, Bell, BellOff, ChevronLeft, ChevronRight, Tag, AlertTriangle } from 'lucide-react';

export interface JadwalConflict {
  type: 'guru' | 'kelas';
  offendingJadwal: Jadwal;
  jamKeys: string[];
}

export const getHourKeys = (jamKeStr: string): string[] => {
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

export const detectConflicts = (target: Jadwal, allJadwal: Jadwal[]): JadwalConflict[] => {
  const targetHours = getHourKeys(target.jam_ke);
  if (targetHours.length === 0) return [];

  const conflicts: JadwalConflict[] = [];

  allJadwal.forEach(other => {
    if (other.id_jadwal === target.id_jadwal) return;
    if (other.hari !== target.hari) return;

    const otherHours = getHourKeys(other.jam_ke);
    const overlappingHours = targetHours.filter(h => otherHours.includes(h));

    if (overlappingHours.length > 0) {
      if (other.nama_guru === target.nama_guru) {
        conflicts.push({
          type: 'guru',
          offendingJadwal: other,
          jamKeys: overlappingHours
        });
      } else if (other.kelas === target.kelas) {
        conflicts.push({
          type: 'kelas',
          offendingJadwal: other,
          jamKeys: overlappingHours
        });
      }
    }
  });

  return conflicts;
};

export const getAvailableHoursForBoth = (guru: string, kelas: string, hari: string, allJadwal: Jadwal[], ignoreId?: string): string[] => {
  const getTeacherBusyHours = (g: string, h: string): string[] => {
    const busy: string[] = [];
    allJadwal.forEach(j => {
      if (j.id_jadwal === ignoreId) return;
      if (j.nama_guru === g && j.hari === h) {
        busy.push(...getHourKeys(j.jam_ke));
      }
    });
    return [...new Set(busy)];
  };

  const getClassBusyHours = (k: string, h: string): string[] => {
    const busy: string[] = [];
    allJadwal.forEach(j => {
      if (j.id_jadwal === ignoreId) return;
      if (j.kelas === k && j.hari === h) {
        busy.push(...getHourKeys(j.jam_ke));
      }
    });
    return [...new Set(busy)];
  };

  const teacherBusy = getTeacherBusyHours(guru, hari);
  const classBusy = getClassBusyHours(kelas, hari);
  const allHours = ['1', '2', '3', '4', '5', '6', '7', '8'];
  return allHours.filter(h => !teacherBusy.includes(h) && !classBusy.includes(h));
};

interface JadwalMenuProps {
  user: User;
  siswa: Siswa[];
  jurnal: Jurnal[];
  jadwal: Jadwal[];
  users: User[];
  events: MadrasahEvent[];
  onAddJadwal: (j: Jadwal) => Promise<void>;
  onEditJadwal?: (j: Jadwal) => Promise<void>;
  onDeleteJadwal: (id: string) => Promise<void>;
  onToggleReminder: (id: string, status: 'Aktif' | 'Nonaktif') => Promise<void>;
  onAddEvent: (e: MadrasahEvent) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
}

export const JadwalMenu: React.FC<JadwalMenuProps> = ({
  user,
  siswa,
  jurnal,
  jadwal,
  users,
  events = [],
  onAddJadwal,
  onEditJadwal,
  onDeleteJadwal,
  onToggleReminder,
  onAddEvent,
  onDeleteEvent
}) => {
  const [loading, setLoading] = useState(false);
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [rescheduleJamKe, setRescheduleJamKe] = useState<string[]>([]);

  // Form states
  const [namaGuru, setNamaGuru] = useState('');
  const [hari, setHari] = useState('Senin');
  const [jamKe, setJamKe] = useState<string[]>([]);
  const [kelas, setKelas] = useState('7A');
  const [mapel, setMapel] = useState('');
  const [statusReminder, setStatusReminder] = useState<'Aktif' | 'Nonaktif'>('Aktif');

  // Filter states
  const [filterHari, setFilterHari] = useState('Semua');
  const [filterKelas, setFilterKelas] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');

  // Auto-fill teacher name if user is a teacher
  React.useEffect(() => {
    if (user.role === 'guru' || user.role === 'wali_kelas') {
      if (user.nama_lengkap) {
        setNamaGuru(user.nama_lengkap);
      }
    }
  }, [user]);

  const teachers = users.filter(u => ['guru', 'wali_kelas'].includes(u.role));
  const listHari = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Sabtu', 'Ahad'];
  const listJam = [
    "1 (07.30 - 08.10)",
    "2 (08.10 - 08.50)",
    "3 (08.50 - 09.30)",
    "4 (10.00 - 10.40)",
    "5 (10.40 - 11.20)",
    "6 (11.20 - 12.00)",
    "7 (13.15 - 13.55)",
    "8 (13.55 - 14.35)"
  ];

  const getAuthorizedClassesForJadwal = (): string[] => {
    const activeClasses = ([...new Set(siswa.map(s => s.kelas))]
      .filter(Boolean)
      .filter(k => typeof k === 'string' && !k.includes('Lulus') && !k.includes('Alumni'))
      .sort()) as string[];

    if (['admin', 'pengawas'].includes(user.role)) {
      return activeClasses;
    }

    if (['guru', 'wali_kelas'].includes(user.role)) {
      const teacherClasses = getTeacherClasses(user);
      const filtered = activeClasses.filter(k => teacherClasses.includes(k));
      if (filtered.length > 0) return filtered;
      return teacherClasses.filter(k => !k.includes('Lulus') && !k.includes('Alumni'));
    }

    return activeClasses;
  };

  const allAvailableClasses = getAuthorizedClassesForJadwal();

  React.useEffect(() => {
    if (allAvailableClasses.length > 0 && (!kelas || !allAvailableClasses.includes(kelas))) {
      setKelas(allAvailableClasses[0]);
    }
  }, [allAvailableClasses]);

  // Live form conflicts
  const currentFormJadwal: Jadwal = {
    id_jadwal: 'TEMP',
    nama_guru: namaGuru,
    hari: hari,
    jam_ke: jamKe.join(', '),
    mata_pelajaran: mapel,
    kelas: kelas,
    status_reminder: 'Aktif'
  };
  const formConflicts = (namaGuru && jamKe.length > 0) ? detectConflicts(currentFormJadwal, jadwal) : [];
  const formSuggestions = (namaGuru && kelas && hari) ? getAvailableHoursForBoth(namaGuru, kelas, hari, jadwal) : [];

  const handleToggleJamCheckbox = (jam: string, checked: boolean) => {
    if (checked) {
      setJamKe(prev => [...prev, jam]);
    } else {
      setJamKe(prev => prev.filter(x => x !== jam));
    }
  };

  const checkJurnalStatus = (guru: string, kls: string, mPl: string) => {
    const todayStr = new Date().toISOString().substring(0, 10);
    return jurnal.some(j => {
      const jDate = j.tanggal.substring(0, 10);
      return (
        jDate === todayStr &&
        j.nama_guru === guru &&
        j.kelas === kls &&
        j.mata_pelajaran.toLowerCase().trim() === mPl.toLowerCase().trim()
      );
    });
  };

  const isScheduleTimePassed = (j: Jadwal) => {
    const days = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const now = new Date();
    const todayDayName = days[now.getDay()];
    
    const dayIndexMap: Record<string, number> = {
      'Ahad': 0, 'Senin': 1, 'Selasa': 2, 'Rabu': 3, 'Kamis': 4, 'Jumat': 5, 'Sabtu': 6
    };
    
    const schedDayIndex = dayIndexMap[j.hari];
    const todayDayIndex = now.getDay();
    
    if (schedDayIndex !== undefined) {
      if (schedDayIndex < todayDayIndex) {
        return true;
      } else if (schedDayIndex === todayDayIndex) {
        const hourKeys = getHourKeys(j.jam_ke);
        if (hourKeys.length === 0) return false;
        const lastHour = Math.max(...hourKeys.map(h => parseInt(h, 10))).toString();
        
        const TIMINGS: Record<string, string> = {
          '1': '08.10',
          '2': '08.50',
          '3': '09.30',
          '4': '10.40',
          '5': '11.20',
          '6': '12.00',
          '7': '13.55',
          '8': '14.35'
        };
        
        const endTimeStr = TIMINGS[lastHour];
        if (!endTimeStr) return false;
        const parts = endTimeStr.split(/[\.:]/).map(x => parseInt(x, 10));
        const endHour = parts[0];
        const endMin = parts[1];
        
        const currentHour = now.getHours();
        const currentMin = now.getMinutes();
        
        if (currentHour > endHour || (currentHour === endHour && currentMin >= endMin)) {
          return true;
        }
      }
    }
    return false;
  };

  const countJurnalHariIni = () => {
    const todayStr = new Date().toISOString().substring(0, 10);
    return jurnal.filter(j => j.tanggal.substring(0, 10) === todayStr).length;
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaGuru || jamKe.length === 0 || !kelas || !mapel) {
      alert("Harap lengkapi semua kolom!");
      return;
    }

    setLoading(true);
    try {
      const payload: Jadwal = {
        id_jadwal: 'JDL' + Date.now(),
        nama_guru: namaGuru,
        hari: hari,
        jam_ke: jamKe.join(', '),
        mata_pelajaran: mapel.trim(),
        kelas: kelas,
        status_reminder: statusReminder
      };

      await onAddJadwal(payload);
      setNamaGuru('');
      setJamKe([]);
      setMapel('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
      {/* Schedule Input Form Column */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100 xl:col-span-1">
        <h3 className="text-lg font-black text-slate-800 mb-6 border-b border-slate-100 pb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-500" /> Plotting Jadwal &amp; Jam
        </h3>
        
        <form onSubmit={handleAddSubmit} className="space-y-5">
          <div>
            <label className="text-xs font-black text-slate-500 block mb-2 uppercase">Pilih Guru</label>
            <select
              required
              className="w-full border border-slate-200 p-4 rounded-xl font-bold text-slate-700 bg-slate-50 focus:ring-2 focus:ring-blue-400 outline-none"
              value={namaGuru}
              onChange={(e) => setNamaGuru(e.target.value)}
            >
              <option value="">-- Pilih Guru --</option>
              {teachers.map(g => (
                <option key={g.id_user} value={g.nama_lengkap}>{g.nama_lengkap}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-black text-slate-500 block mb-2 uppercase">Hari</label>
            <select
              required
              className="w-full border border-slate-200 p-4 rounded-xl font-bold text-slate-700 bg-slate-50 focus:ring-2 focus:ring-blue-400 outline-none"
              value={hari}
              onChange={(e) => setHari(e.target.value)}
            >
              {listHari.map(h => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-black text-slate-500 block mb-3 uppercase">Pilih Jam Mengajar</label>
            <div className="grid grid-cols-2 gap-2 h-44 overflow-y-auto border border-slate-100 rounded-xl p-3 bg-slate-50/50 shadow-inner">
              {listJam.map((jam, idx) => {
                const checked = jamKe.includes(jam);
                return (
                  <label
                    key={idx}
                    className="flex items-start gap-2 border border-slate-200 p-2 rounded-lg hover:bg-blue-50 cursor-pointer bg-white transition shadow-sm"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => handleToggleJamCheckbox(jam, e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded cursor-pointer mt-0.5"
                    />
                    <div className="flex flex-col text-[10px]">
                      <span className="font-black text-slate-800">Jam Ke-{idx + 1}</span>
                      <span className="text-[9px] text-slate-400">{jam.split(' (')[1]?.replace(')', '')}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-slate-500 block mb-2 uppercase">Kelas</label>
              <select
                required
                className="w-full border border-slate-200 p-4 rounded-xl font-bold text-slate-700 bg-slate-50 focus:ring-2 focus:ring-blue-400 outline-none"
                value={kelas}
                onChange={(e) => setKelas(e.target.value)}
              >
                {allAvailableClasses.map(k => (
                  <option key={k} value={k}>Kelas {k}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-black text-slate-500 block mb-2 uppercase">Mapel</label>
              <input
                type="text"
                required
                placeholder="Matematika..."
                className="w-full border border-slate-200 p-4 rounded-xl font-bold text-slate-700 bg-slate-50 focus:ring-2 focus:ring-blue-400 outline-none"
                value={mapel}
                onChange={(e) => setMapel(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-black text-slate-500 block mb-2 uppercase">Pengingat Sistem</label>
            <select
              className="w-full border border-emerald-200 p-4 rounded-xl bg-emerald-50 text-emerald-800 font-black outline-none shadow-sm text-sm"
              value={statusReminder}
              onChange={(e) => setStatusReminder(e.target.value as any)}
            >
              <option value="Aktif">ON (Aktif)</option>
              <option value="Nonaktif">OFF (Mati)</option>
            </select>
          </div>

          {formConflicts.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-800 space-y-2">
              <div className="font-black flex items-center gap-1 text-xs">
                <span>⚠️ Deteksi Tabrakan Jadwal:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 font-bold">
                {formConflicts.map((c, i) => (
                  <li key={i}>
                    Jam Ke-{c.jamKeys.join(', ')} bertabrakan dengan{' '}
                    <span className="font-extrabold text-amber-950">
                      {c.type === 'guru'
                        ? `jadwal Guru di Kelas ${c.offendingJadwal.kelas} (${c.offendingJadwal.mata_pelajaran})`
                        : `jadwal Kelas ${c.offendingJadwal.kelas} oleh ${c.offendingJadwal.nama_guru} (${c.offendingJadwal.mata_pelajaran})`}
                    </span>
                  </li>
                ))}
              </ul>
              {formSuggestions.length > 0 && (
                <div className="mt-2 pt-2 border-t border-amber-100">
                  <p className="font-bold mb-1 text-slate-700">Rekomendasi Jam Kosong (Bebas Tabrakan):</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {formSuggestions.map(h => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => {
                          const fullJam = listJam.find(j => j.startsWith(h));
                          if (fullJam) {
                            setJamKe([fullJam]);
                          }
                        }}
                        className="px-2 py-1 bg-white border border-amber-200 text-amber-700 font-black rounded-lg hover:bg-amber-100 transition text-[10px] cursor-pointer"
                      >
                        Jam Ke-{h}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white font-black text-base py-4 rounded-xl hover:bg-blue-700 shadow-md transition transform active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Menyimpan...' : 'SIMPAN PLOT JADWAL'}
          </button>
        </form>
      </div>

      {/* Monitoring Schedules Listing */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100 xl:col-span-2 flex flex-col">
        <h3 className="text-lg font-black text-slate-800 mb-2 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-500" /> Live Monitoring Kepatuhan Jurnal
        </h3>
        <p className="text-sm font-medium text-slate-500 mb-6">
          Sistem otomatis memantau kesesuaian Jurnal mengajar yang diisi hari ini dengan plot jadwal.
        </p>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl text-center">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-wider">Total Plot Jadwal</p>
            <h4 className="text-3xl font-black text-blue-700 mt-1">{jadwal.length}</h4>
          </div>
          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-center">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-wider">Terisi Hari Ini</p>
            <h4 className="text-3xl font-black text-emerald-700 mt-1">{countJurnalHariIni()}</h4>
          </div>
          <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-center">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-wider">Reminder ON</p>
            <h4 className="text-3xl font-black text-rose-700 mt-1">
              {jadwal.filter(j => j.status_reminder === 'Aktif').length}
            </h4>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4 bg-slate-50 p-3 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={filterHari}
              onChange={(e) => setFilterHari(e.target.value)}
              className="border border-slate-200 bg-white font-bold text-xs text-slate-700 px-3 py-2 rounded-xl outline-none"
            >
              <option value="Semua">Semua Hari</option>
              {listHari.map(h => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>

            <select
              value={filterKelas}
              onChange={(e) => setFilterKelas(e.target.value)}
              className="border border-slate-200 bg-white font-bold text-xs text-slate-700 px-3 py-2 rounded-xl outline-none"
            >
              <option value="Semua">Semua Kelas</option>
              {allAvailableClasses.map(k => (
                <option key={k} value={k}>Kelas {k}</option>
              ))}
            </select>
          </div>

          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="Cari Guru / Mapel..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-slate-200 bg-white font-medium text-xs px-3.5 py-2 rounded-xl outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>

        {/* Schedule list */}
        <div className="flex-1 overflow-x-auto border-t border-slate-100 pt-4">
          <table className="w-full text-sm text-left">
            <thead className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3">Guru</th>
                <th className="py-3">Waktu</th>
                <th className="py-3">Kelas &amp; Mapel</th>
                <th className="py-3 text-center">Status Jurnal</th>
                <th className="py-3 text-center">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(() => {
                const filteredJadwal = jadwal.filter(j => {
                  if (filterHari !== 'Semua' && j.hari !== filterHari) return false;
                  if (filterKelas !== 'Semua' && j.kelas !== filterKelas) return false;
                  if (searchQuery) {
                    const q = searchQuery.toLowerCase();
                    return j.nama_guru.toLowerCase().includes(q) || j.mata_pelajaran.toLowerCase().includes(q) || j.kelas.toLowerCase().includes(q);
                  }
                  return true;
                });

                if (filteredJadwal.length === 0) {
                  return (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400 font-medium italic">
                        Belum ada plot jadwal guru sesuai filter.
                      </td>
                    </tr>
                  );
                }

                return filteredJadwal.map((j) => {
                  const conflicts = detectConflicts(j, jadwal);
                  const isFilled = checkJurnalStatus(j.nama_guru, j.kelas, j.mata_pelajaran);
                  const isPassedAndUnfilled = isScheduleTimePassed(j) && !isFilled;
                  const reminderOn = j.status_reminder === 'Aktif';
                  const isRescheduling = reschedulingId === j.id_jadwal;
                  const suggestions = getAvailableHoursForBoth(j.nama_guru, j.kelas, j.hari, jadwal, j.id_jadwal);

                  return (
                    <React.Fragment key={j.id_jadwal}>
                      <tr className={`${
                        isPassedAndUnfilled 
                          ? 'bg-amber-50/70 hover:bg-amber-100/75 border-l-4 border-amber-500 font-medium' 
                          : conflicts.length > 0 
                            ? 'bg-rose-50/30 hover:bg-rose-50/50' 
                            : 'hover:bg-slate-50'
                      } transition`}>
                        <td className="py-3 font-bold text-slate-800 pl-2">
                          <div>{j.nama_guru}</div>
                          {conflicts.length > 0 && (
                            <span className="text-[9px] bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded-full font-black inline-block mt-0.5 uppercase tracking-wider">
                              ⚠️ Tabrakan
                            </span>
                          )}
                          {isPassedAndUnfilled && (
                            <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full font-black inline-block mt-0.5 uppercase tracking-wider">
                              ⏰ Terlewat
                            </span>
                          )}
                        </td>
                        <td className="py-3 font-medium text-slate-600">
                          {j.hari}, {j.jam_ke.length > 25 ? `${j.jam_ke.substring(0, 22)}...` : j.jam_ke}
                        </td>
                        <td className="py-3 whitespace-nowrap">
                          <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-black text-[10px] mr-1">
                            {j.kelas}
                          </span>
                          <b className="text-slate-700 text-xs">{j.mata_pelajaran}</b>
                        </td>
                        <td className="py-3 text-center whitespace-nowrap">
                          {isFilled ? (
                            <span className="bg-green-100 text-green-800 px-2.5 py-1 rounded-md font-black text-[10px] inline-flex items-center gap-1 shadow-sm">
                              <Check className="w-3 h-3" /> Telah Diisi
                            </span>
                          ) : isPassedAndUnfilled ? (
                            <span className="bg-rose-100 text-rose-800 px-2 py-1 rounded-md font-black text-[10px] inline-flex items-center gap-1 border border-rose-200 shadow-sm animate-pulse">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" /> Terlewat & Belum Diisi ⚠️
                            </span>
                          ) : (
                            <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-md font-black text-[10px] inline-flex items-center gap-1 animate-pulse shadow-sm">
                              <Clock className="w-3 h-3" /> Menunggu
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-3">
                            {conflicts.length > 0 && onEditJadwal && (
                              <button
                                onClick={() => {
                                  if (isRescheduling) {
                                    setReschedulingId(null);
                                  } else {
                                    setReschedulingId(j.id_jadwal);
                                  }
                                }}
                                className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black px-2 py-1 rounded-lg transition shadow-sm cursor-pointer"
                                title="Alihkan jam ke waktu lain"
                              >
                                {isRescheduling ? 'Batal' : 'Alihkan'}
                              </button>
                            )}
                            <button
                              onClick={() => onToggleReminder(j.id_jadwal, reminderOn ? 'Nonaktif' : 'Aktif')}
                              className={`font-black text-xs hover:underline cursor-pointer flex items-center gap-1 ${
                                reminderOn ? 'text-emerald-600' : 'text-slate-400'
                              }`}
                              title="Toggle Alarm Reminder"
                            >
                              {reminderOn ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                              {reminderOn ? 'ON' : 'OFF'}
                            </button>
                            <button
                              onClick={() => onDeleteJadwal(j.id_jadwal)}
                              className="text-slate-300 hover:text-red-500 transition cursor-pointer"
                              title="Hapus"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {(conflicts.length > 0 || isRescheduling) && (
                        <tr className="bg-slate-50/40">
                          <td colSpan={5} className="px-4 py-3 text-xs border-b border-slate-100">
                            {conflicts.length > 0 && (
                              <div className="text-rose-700 font-bold mb-2">
                                <b className="text-rose-800 uppercase text-[10px] tracking-wide block mb-0.5">⚠️ Deteksi Bentrokan Jadwal:</b>
                                Waktu ini bertabrakan dengan jadwal:{' '}
                                {conflicts.map((c, i) => (
                                  <span key={i} className="bg-rose-100 text-rose-900 px-2 py-0.5 rounded ml-1 text-[10px] font-black">
                                    {c.type === 'guru'
                                      ? `Kelas ${c.offendingJadwal.kelas} (${c.offendingJadwal.mata_pelajaran})`
                                      : `${c.offendingJadwal.nama_guru} (${c.offendingJadwal.mata_pelajaran})`} (Jam Ke-{c.jamKeys.join(',')})
                                  </span>
                                ))}
                              </div>
                            )}

                            {isRescheduling && (
                              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-emerald-800">
                                <p className="font-extrabold mb-1.5 text-xs text-emerald-950">🛠️ Alihkan Jam Mengajar ke Jam Kosong (Bebas Tabrakan):</p>
                                {suggestions.length === 0 ? (
                                  <p className="text-[10px] text-slate-500 italic font-medium">Tidak ada jam kosong bersama untuk Guru & Kelas pada hari {j.hari}. Silakan hapus atau ubah jadwal secara manual.</p>
                                ) : (
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-[10px] font-bold text-slate-500">Pilih Jam Alternatif:</span>
                                    {suggestions.map(h => {
                                      const fullJam = listJam.find(lj => lj.startsWith(h));
                                      return (
                                        <button
                                          key={h}
                                          onClick={async () => {
                                            if (onEditJadwal && fullJam) {
                                              await onEditJadwal({
                                                ...j,
                                                jam_ke: fullJam
                                              });
                                              setReschedulingId(null);
                                            }
                                          }}
                                          className="bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-100 font-black px-2 py-1 rounded-lg transition text-[10px] shadow-sm cursor-pointer"
                                        >
                                          Jam Ke-{h}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
