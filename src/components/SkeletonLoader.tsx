import React from 'react';

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 4 }) => {
  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3 animate-pulse">
      <div className="h-8 bg-slate-200/70 rounded-xl w-1/3 mb-4"></div>
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="flex gap-3 items-center py-2 border-b border-slate-100">
            {Array.from({ length: cols }).map((_, cIdx) => (
              <div
                key={cIdx}
                className="h-5 bg-slate-100 rounded-lg flex-1"
                style={{ width: `${Math.floor(Math.random() * 40) + 60}%` }}
              ></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-200 rounded-xl"></div>
            <div className="space-y-1.5 flex-1">
              <div className="h-4 bg-slate-200 rounded-md w-3/4"></div>
              <div className="h-3 bg-slate-100 rounded-md w-1/2"></div>
            </div>
          </div>
          <div className="h-16 bg-slate-100 rounded-xl w-full"></div>
          <div className="flex justify-between items-center pt-2">
            <div className="h-3 bg-slate-200 rounded-md w-20"></div>
            <div className="h-8 bg-slate-200 rounded-lg w-16"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const DashboardStatsSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 animate-pulse">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex justify-between items-center">
            <div className="h-3 bg-slate-200 rounded-md w-16"></div>
            <div className="w-8 h-8 bg-slate-200 rounded-lg"></div>
          </div>
          <div className="h-7 bg-slate-300 rounded-lg w-12"></div>
          <div className="h-2 bg-slate-100 rounded-md w-24"></div>
        </div>
      ))}
    </div>
  );
};
