
import React from 'react';

interface BannerAdProps {
  className?: string;
}

const BannerAd: React.FC<BannerAdProps> = ({ className = "" }) => {
  return (
    <div className={`bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center justify-between gap-4 overflow-hidden relative group cursor-pointer hover:border-indigo-200 transition-all ${className}`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-xl shrink-0">
          🛍️
        </div>
        <div>
          <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-0.5">Sponsored</p>
          <h4 className="text-sm font-bold text-slate-800">Fresh Produce Delivery</h4>
          <p className="text-xs text-slate-500">Get 20% off your first organic basket.</p>
        </div>
      </div>
      <button className="px-4 py-2 bg-indigo-600 text-white text-[10px] font-bold rounded-lg uppercase tracking-wider group-hover:scale-105 transition-transform shrink-0">
        Claim Offer
      </button>
      <div className="absolute -right-4 -bottom-4 w-12 h-12 bg-indigo-500/5 rounded-full blur-xl group-hover:bg-indigo-500/10 transition-colors"></div>
    </div>
  );
};

export default BannerAd;
