import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw, CheckCircle2 } from 'lucide-react';

export const OfflineNotice: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [showReconnectedAlert, setShowReconnectedAlert] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnectedAlert(true);
      const timer = setTimeout(() => setShowReconnectedAlert(false), 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnectedAlert(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !showReconnectedAlert) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-[200] transition-all duration-300">
      {!isOnline ? (
        <div className="bg-amber-900/95 text-amber-100 p-4 rounded-2xl shadow-2xl border border-amber-700/50 backdrop-blur-md flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-800/80 flex items-center justify-center shrink-0 text-amber-300 animate-pulse">
              <WifiOff className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-amber-300">Mode Offline Aktif</p>
              <p className="text-xs text-amber-200 mt-0.5">Koneksi internet terputus. Anda masih bisa melihat data lokal.</p>
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-2 bg-amber-800 hover:bg-amber-700 text-amber-100 text-xs font-bold rounded-xl transition cursor-pointer shrink-0 flex items-center gap-1.5 min-h-[44px]"
            title="Muat Ulang"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Coba Lagi</span>
          </button>
        </div>
      ) : (
        <div className="bg-emerald-900/95 text-emerald-100 p-4 rounded-2xl shadow-2xl border border-emerald-700/50 backdrop-blur-md flex items-center gap-3 animate-bounce">
          <div className="w-10 h-10 rounded-xl bg-emerald-800/80 flex items-center justify-center shrink-0 text-emerald-300">
            <Wifi className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Internet Terhubung Kembali
            </p>
            <p className="text-xs text-emerald-200 mt-0.5">Semua fitur EduSantri siap digunakan secara langsung.</p>
          </div>
        </div>
      )}
    </div>
  );
};
