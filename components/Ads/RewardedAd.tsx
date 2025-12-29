
import React, { useState, useEffect } from 'react';

interface RewardedAdProps {
  onComplete: () => void;
  onClose: () => void;
  perkName: string;
}

const RewardedAd: React.FC<RewardedAdProps> = ({ onComplete, onClose, perkName }) => {
  const [timeLeft, setTimeLeft] = useState(5);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setIsFinished(true);
    }
  }, [timeLeft]);

  const handleFinish = () => {
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="max-w-md w-full glass p-8 rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
        {/* Ad Content */}
        <div className="w-full aspect-video bg-slate-800 rounded-3xl mb-6 relative overflow-hidden flex items-center justify-center">
           <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20"></div>
           <span className="text-6xl animate-bounce">📦</span>
           <div className="absolute bottom-4 left-4 right-4 h-1 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-500 transition-all duration-1000 ease-linear" 
                style={{ width: `${((5 - timeLeft) / 5) * 100}%` }}
              ></div>
           </div>
        </div>

        <h3 className="text-2xl font-bold text-slate-800 mb-2">Premium Partner Spot</h3>
        <p className="text-slate-500 text-sm mb-6">
          Support PantryPulse by watching this short video to unlock: <br/>
          <span className="text-indigo-600 font-bold">{perkName}</span>
        </p>

        {isFinished ? (
          <button 
            onClick={handleFinish}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all animate-in zoom-in-90"
          >
            Claim Reward
          </button>
        ) : (
          <div className="w-full py-4 bg-slate-100 text-slate-400 rounded-2xl font-bold">
            Unlocks in {timeLeft}s...
          </div>
        )}

        {!isFinished && (
          <button 
            onClick={onClose}
            className="mt-4 text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest"
          >
            Close & Skip Reward
          </button>
        )}
        
        <div className="absolute top-0 right-0 -m-8 w-40 h-40 bg-indigo-100 rounded-full blur-3xl opacity-30"></div>
      </div>
    </div>
  );
};

export default RewardedAd;
