import React from 'react';
import { AlertTriangle, Check, HelpCircle } from 'lucide-react';

interface NotificationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  isError?: boolean;
  isConfirm?: boolean;
  onConfirm?: () => void;
  onClose: () => void;
  showPreviewOption?: boolean;
  onActivatePreview?: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  title,
  message,
  isError = false,
  isConfirm = false,
  onConfirm,
  onClose,
  showPreviewOption = false,
  onActivatePreview
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-opacity animate-fade-in">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden flex flex-col p-6 text-center">
        <div className="mx-auto mb-5">
          {isConfirm ? (
            <div className="w-16 h-16 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center text-3xl shadow-sm">
              <HelpCircle className="w-8 h-8" />
            </div>
          ) : isError ? (
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center text-3xl shadow-sm">
              <AlertTriangle className="w-8 h-8" />
            </div>
          ) : (
            <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center text-3xl shadow-sm">
              <Check className="w-8 h-8" />
            </div>
          )}
        </div>

        <h3 className="text-2xl font-black mb-2 text-slate-800 tracking-tight">{title}</h3>
        <p className="text-slate-500 mb-8 text-sm whitespace-pre-wrap font-medium">{message}</p>

        {isConfirm ? (
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 bg-slate-100 text-slate-700 font-bold py-4 rounded-xl hover:bg-slate-200 transition text-sm cursor-pointer"
            >
              Batal
            </button>
            <button
              onClick={() => {
                if (onConfirm) onConfirm();
                onClose();
              }}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-md transition transform active:scale-95 text-sm cursor-pointer"
            >
              Ya, Lanjutkan
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <button
              onClick={onClose}
              className="w-full bg-blue-600 text-white font-black text-base py-4 rounded-xl hover:bg-blue-700 shadow-md transition transform active:scale-95 cursor-pointer"
            >
              OK, Mengerti
            </button>
            {showPreviewOption && onActivatePreview && (
              <button
                onClick={() => {
                  onActivatePreview();
                  onClose();
                }}
                className="w-full mt-2 bg-amber-500 text-white font-bold py-4 rounded-xl hover:bg-amber-600 transition shadow-md text-sm cursor-pointer"
              >
                Gunakan Mode Preview
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
