import React, { useState } from 'react';
import { User, Siswa } from '../types';
import { User as UserIcon, Key } from 'lucide-react';

interface ProfileMenuProps {
  user: User;
  siswa: Siswa[];
  onUpdateProfile: (data: Partial<User> & { anakUpdates?: string; password?: string }) => Promise<void>;
  onOpenChangePassword?: () => void;
}

export const ProfileMenu: React.FC<ProfileMenuProps> = ({
  user,
  siswa,
  onUpdateProfile,
  onOpenChangePassword
}) => {
  const [namaLengkap, setNamaLengkap] = useState(user.nama_lengkap);
  const [idReferensi, setIdReferensi] = useState(user.id_referensi || '');
  const [loading, setLoading] = useState(false);
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [password, setPassword] = useState('');

  // For Wali role, parent children can be edited
  const childIds = user.role === 'wali' ? (user.id_referensi ? user.id_referensi.split(',') : []) : [];
  const initialChildren = siswa.filter(s => childIds.includes(s.id_siswa));
  const [children, setChildren] = useState(initialChildren);

  const handleChildNameChange = (id: string, newName: string) => {
    setChildren(prev => prev.map(c => c.id_siswa === id ? { ...c, nama_siswa: newName } : c));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let anakUpdatesStr = '';
      if (user.role === 'wali') {
        const updates = children.map(c => ({ id: c.id_siswa, nama: c.nama_siswa }));
        anakUpdatesStr = JSON.stringify(updates);
      }
      
      const updatePayload: any = {
        id_user: user.id_user,
        role: user.role,
        nama_lengkap: namaLengkap,
        id_referensi: user.role !== 'wali' ? idReferensi : user.id_referensi,
        anakUpdates: anakUpdatesStr || undefined
      };

      if (password) {
        updatePayload.password = password;
      }

      await onUpdateProfile(updatePayload);
      setPassword('');
      setShowPasswordInput(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-slate-100 max-w-2xl mx-auto">
      <h2 className="text-2xl font-black text-slate-800 mb-6 border-b border-slate-100 pb-4 flex items-center gap-2">
        <UserIcon className="text-blue-500 w-7 h-7" /> Profil &amp; Personalisasi
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-2">
            Nama Lengkap Tampilan
          </label>
          <input
            type="text"
            className="w-full border border-slate-200 p-4 rounded-xl focus:ring-2 focus:ring-blue-400 font-bold outline-none shadow-sm text-slate-700 bg-white"
            value={namaLengkap}
            onChange={(e) => setNamaLengkap(e.target.value)}
            required
          />
        </div>

        {user.role === 'wali' ? (
          children.length > 0 ? (
            <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 mt-2">
              <h3 className="font-black text-indigo-950 mb-4 text-sm flex items-center uppercase tracking-wider gap-2">
                📂 Perbarui Nama Santri (Anak)
              </h3>
              <div className="space-y-4">
                {children.map((anak, idx) => (
                  <div key={anak.id_siswa} className="mb-4 last:mb-0">
                    <label className="text-[11px] font-black block mb-2 text-indigo-800 uppercase tracking-wide">
                      Anak ke-{idx + 1} - KLS {anak.kelas} ({anak.id_siswa})
                    </label>
                    <input
                      type="text"
                      className="w-full border border-indigo-200 p-4 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-400 font-bold shadow-sm text-slate-700"
                      value={anak.nama_siswa}
                      onChange={(e) => handleChildNameChange(anak.id_siswa, e.target.value)}
                      required
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-red-50 text-red-600 text-sm font-bold rounded-xl border border-red-100">
              ⚠️ Data santri belum tertaut ke akun ini. Hubungi Admin.
            </div>
          )
        ) : (
          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-2">
              Kode Referensi Akses (Pakar)
            </label>
            <input
              type="text"
              className="w-full border border-slate-200 p-4 rounded-xl font-mono text-sm bg-slate-50 focus:ring-2 focus:ring-blue-400 outline-none font-bold text-slate-700"
              value={idReferensi}
              onChange={(e) => setIdReferensi(e.target.value)}
              placeholder="AJAR:7A|MAPEL:MTK"
            />
            <p className="text-xs text-slate-500 font-medium mt-2 leading-relaxed">
              ⚠️ <b>Perhatian:</b> Mengubah format referensi akan berdampak langsung pada hak akses filter kelas Anda.
            </p>
          </div>
        )}

        {showPasswordInput && (
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 animate-fade-in mt-4">
            <label className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-2">
              Kata Sandi Baru
            </label>
            <input
              type="password"
              className="w-full border border-slate-200 p-4 rounded-xl focus:ring-2 focus:ring-blue-400 font-bold outline-none shadow-sm text-slate-700 bg-white"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password baru"
              required
            />
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-100 mt-6">
          <button
            type="button"
            onClick={onOpenChangePassword || (() => setShowPasswordInput(!showPasswordInput))}
            className="flex-1 py-4 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <Key className="w-4 h-4" /> {showPasswordInput ? 'Batal Ubah Password' : 'Ubah Password'}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white font-black text-base py-4 rounded-xl hover:bg-blue-700 shadow-md transition transform active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Menyimpan...' : 'SIMPAN PERUBAHAN'}
          </button>
        </div>
      </form>
    </div>
  );
};
