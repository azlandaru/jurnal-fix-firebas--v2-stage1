import React, { useState, useEffect } from 'react';
import { CatatanPerkembangan, CatatanPerilaku, User, Siswa } from '../types';
import { Award, Smile, BookOpen, Calendar, ChevronDown, ChevronUp, SlidersHorizontal, RefreshCw } from 'lucide-react';
import { formatDateID } from '../utils/pdfGenerator';

interface LaporanWaliProps {
  user: User;
  siswa: Siswa[];
  perkembangan: CatatanPerkembangan[];
  perilaku: CatatanPerilaku[];
  type: 'perkembangan' | 'perilaku';
}

export const LaporanWali: React.FC<LaporanWaliProps> = ({
  user,
  siswa,
  perkembangan,
  perilaku,
  type
}) => {
  const childIds = user.id_referensi ? user.id_referensi.split(',').map(x => x.trim()) : [];
  const myChildren = siswa.filter(s => childIds.includes(s.id_siswa));

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [viewMode, setViewMode] = useState<'detail' | 'compact'>('detail');
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  // Get raw filtered data based on children
  const getRawData = () => {
    if (type === 'perkembangan') {
      return perkembangan.filter(p => childIds.includes(p.id_siswa));
    } else {
      return perilaku.filter(p => childIds.includes(p.id_siswa));
    }
  };

  const rawData = getRawData();

  // Apply filters
  const getFilteredData = () => {
    let list = [...rawData];
    if (startDate) {
      list = list.filter(item => item.tanggal >= startDate);
    }
    if (endDate) {
      list = list.filter(item => item.tanggal <= endDate);
    }
    return list.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  };

  const filteredData = getFilteredData();

  // Automatically switch viewMode to 'compact' if there are many entries (> 3)
  useEffect(() => {
    if (filteredData.length > 3) {
      setViewMode('compact');
    } else {
      setViewMode('detail');
    }
  }, [filteredData.length]);

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const setDatePreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  };

  const resetFilters = () => {
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b border-slate-100 pb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            {type === 'perkembangan' ? (
              <>
                <Award className="text-blue-500 w-8 h-8" /> Laporan Perkembangan Akademik Ananda
              </>
            ) : (
              <>
                <Smile className="text-pink-500 w-8 h-8" /> Laporan Adab &amp; Perilaku Ananda
              </>
            )}
          </h2>
          <p className="text-sm text-slate-500 mt-2 font-medium">
            Daftar rekam jejak capaian ananda santri dari dewan guru MTs Ibad Ar Rahman.
          </p>
        </div>

        {/* View Mode Toggle */}
        {filteredData.length > 0 && (
          <div className="flex bg-slate-100 p-1 rounded-xl self-start md:self-center border border-slate-200/40">
            <button
              onClick={() => setViewMode('detail')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'detail'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Detail
            </button>
            <button
              onClick={() => setViewMode('compact')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'compact'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Ringkas ({filteredData.length})
            </button>
          </div>
        )}
      </div>

      {/* Date Filters Controls */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-slate-700 font-extrabold text-xs uppercase tracking-wider">
          <SlidersHorizontal className="w-4 h-4 text-slate-500" />
          Filter Tanggal Laporan
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tanggal Mulai</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-slate-200 p-3 rounded-2xl text-xs font-semibold bg-slate-50 text-slate-700 outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tanggal Akhir</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border border-slate-200 p-3 rounded-2xl text-xs font-semibold bg-slate-50 text-slate-700 outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={resetFilters}
              disabled={!startDate && !endDate}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-50 py-3 rounded-2xl text-xs font-black transition flex items-center justify-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reset
            </button>
          </div>
        </div>

        {/* Quick presets */}
        <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100/60">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest self-center mr-1">Preset:</span>
          <button
            onClick={() => setDatePreset(0)}
            className="bg-slate-50 hover:bg-slate-100 border border-slate-200/50 text-slate-600 px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer"
          >
            Hari Ini
          </button>
          <button
            onClick={() => setDatePreset(7)}
            className="bg-slate-50 hover:bg-slate-100 border border-slate-200/50 text-slate-600 px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer"
          >
            7 Hari Terakhir
          </button>
          <button
            onClick={() => setDatePreset(30)}
            className="bg-slate-50 hover:bg-slate-100 border border-slate-200/50 text-slate-600 px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer"
          >
            30 Hari Terakhir
          </button>
        </div>
      </div>

      {/* Main List Display */}
      {filteredData.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center">
          <BookOpen className="w-12 h-12 text-slate-200 mb-4" />
          <p className="text-slate-500 font-bold">Belum ada data laporan yang tercatat sesuai filter.</p>
        </div>
      ) : viewMode === 'detail' ? (
        /* Detailed card view */
        <div className="space-y-6">
          {type === 'perkembangan' ? (
            (filteredData as CatatanPerkembangan[]).map((i) => {
              const childName = myChildren.find(s => s.id_siswa === i.id_siswa)?.nama_siswa || i.id_siswa;
              return (
                <div
                  key={i.id_catatan}
                  className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden transition hover:shadow-md"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-2 bg-blue-500"></div>
                  
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-3">
                    <div>
                      <span className="bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg">
                        {i.kategori}
                      </span>
                      <h3 className="ml-3 inline font-black text-slate-800 text-xl tracking-tight">
                        {childName}
                      </h3>
                    </div>
                    
                    <div className="text-xs font-bold text-blue-600 flex items-center gap-1 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                      <Calendar className="w-3.5 h-3.5" /> {formatDateID(i.tanggal)}
                    </div>
                  </div>

                  <p className="text-sm font-semibold text-slate-700 leading-relaxed bg-slate-50/50 p-4 rounded-xl border border-slate-50">
                    {i.deskripsi_perkembangan}
                  </p>

                  <div className="mt-6 pt-5 border-t border-slate-100 flex justify-between items-center text-xs">
                    <p className="font-bold text-slate-400 uppercase tracking-wider">
                      ✍ Oleh: {i.nama_guru}
                    </p>
                    <p className="font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 uppercase tracking-wider">
                      {i.mata_pelajaran}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            (filteredData as CatatanPerilaku[]).map((i) => {
              const childName = myChildren.find(s => s.id_siswa === i.id_siswa)?.nama_siswa || i.id_siswa;
              const isPos = i.jenis_perilaku === 'Positif';
              const color = isPos ? 'emerald' : 'rose';
              return (
                <div
                  key={i.id_catatan}
                  className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden transition hover:shadow-md"
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-2 bg-${color}-500`}></div>

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-3">
                    <div>
                      <span
                        className={`bg-${color}-50 border border-${color}-100 text-${color}-700 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg`}
                      >
                        {i.jenis_perilaku}
                      </span>
                      <h3 className="ml-3 inline font-black text-slate-800 text-xl tracking-tight">
                        {childName}
                      </h3>
                    </div>

                    <div className="text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> {formatDateID(i.tanggal)}
                    </div>
                  </div>

                  <p className="text-sm font-bold text-slate-800 leading-relaxed border-l-4 border-slate-200 pl-4 py-1 mb-4">
                    {i.deskripsi_perilaku}
                  </p>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-sm text-slate-600 font-medium">
                    <b className="text-slate-800 text-[10px] uppercase tracking-widest block mb-2 opacity-50">
                      Tindak Lanjut &amp; Arahan Guru:
                    </b>
                    {i.tindak_lanjut}
                  </div>

                  <div className="mt-6 pt-5 border-t border-slate-100 flex justify-between items-center text-xs">
                    <p className="font-bold text-slate-400 uppercase tracking-wider">
                      ✍ Pelapor: {i.nama_guru}
                    </p>
                    <p className="font-black text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg uppercase tracking-wider text-[10px]">
                      {i.mata_pelajaran || 'Umum'}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Compact interactive accordion list view */
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-100">
          {type === 'perkembangan' ? (
            (filteredData as CatatanPerkembangan[]).map((i) => {
              const childName = myChildren.find(s => s.id_siswa === i.id_siswa)?.nama_siswa || i.id_siswa;
              const isExpanded = !!expandedItems[i.id_catatan];
              return (
                <div
                  key={i.id_catatan}
                  className="hover:bg-slate-50/50 transition duration-150"
                >
                  {/* Row Header */}
                  <div
                    onClick={() => toggleExpand(i.id_catatan)}
                    className="p-4 flex items-center justify-between gap-4 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="shrink-0 bg-blue-50 border border-blue-100 text-blue-700 text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded">
                        {i.kategori}
                      </span>
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-slate-800 text-sm truncate">{childName}</h4>
                        <p className="text-[11px] text-slate-400 font-medium truncate sm:hidden">
                          {i.deskripsi_perkembangan}
                        </p>
                      </div>
                      <p className="hidden sm:block text-xs text-slate-500 truncate max-w-md font-medium pl-2">
                        {i.deskripsi_perkembangan}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-[11px] font-bold text-slate-500">
                      <span className="hidden md:inline font-semibold text-slate-400">Mapel: {i.mata_pelajaran}</span>
                      <span>{formatDateID(i.tanggal)}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-6 pb-5 pt-1 text-xs space-y-3 bg-blue-50/10">
                      <div className="bg-white p-4 rounded-2xl border border-slate-100 font-semibold text-slate-700 leading-relaxed shadow-sm">
                        {i.deskripsi_perkembangan}
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-slate-500">
                        <span>✍ Diinput oleh: <strong className="text-slate-700">{i.nama_guru}</strong></span>
                        <span>Mata Pelajaran: <strong className="text-blue-600 uppercase tracking-wider">{i.mata_pelajaran}</strong></span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            (filteredData as CatatanPerilaku[]).map((i) => {
              const childName = myChildren.find(s => s.id_siswa === i.id_siswa)?.nama_siswa || i.id_siswa;
              const isPos = i.jenis_perilaku === 'Positif';
              const color = isPos ? 'emerald' : 'rose';
              const isExpanded = !!expandedItems[i.id_catatan];
              return (
                <div
                  key={i.id_catatan}
                  className="hover:bg-slate-50/50 transition duration-150"
                >
                  {/* Row Header */}
                  <div
                    onClick={() => toggleExpand(i.id_catatan)}
                    className="p-4 flex items-center justify-between gap-4 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className={`shrink-0 bg-${color}-50 border border-${color}-100 text-${color}-700 text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded`}>
                        {i.jenis_perilaku}
                      </span>
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-slate-800 text-sm truncate">{childName}</h4>
                        <p className="text-[11px] text-slate-400 font-medium truncate sm:hidden">
                          {i.deskripsi_perilaku}
                        </p>
                      </div>
                      <p className="hidden sm:block text-xs text-slate-500 truncate max-w-md font-medium pl-2">
                        {i.deskripsi_perilaku}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-[11px] font-bold text-slate-500">
                      <span className="hidden md:inline font-semibold text-slate-400">Oleh: {i.nama_guru}</span>
                      <span>{formatDateID(i.tanggal)}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className={`px-6 pb-5 pt-1 text-xs space-y-3 bg-${color}-50/5`}>
                      <div className="bg-white p-4 rounded-2xl border border-slate-100 text-slate-800 leading-relaxed shadow-sm font-bold">
                        {i.deskripsi_perilaku}
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 block mb-1">Tindak Lanjut &amp; Arahan Guru:</span>
                        <p className="text-slate-600 font-medium leading-relaxed">{i.tindak_lanjut}</p>
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-slate-500">
                        <span>✍ Dilaporkan oleh: <strong className="text-slate-700">{i.nama_guru}</strong></span>
                        <span>Mata Pelajaran: <strong className="text-slate-700">{i.mata_pelajaran || 'Umum'}</strong></span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
