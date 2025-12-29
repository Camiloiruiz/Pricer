
import React, { useState } from 'react';
import { UserProfile } from '../types';
import RewardedAd from './Ads/RewardedAd';

interface Props {
  user: UserProfile;
  setUser: React.Dispatch<React.SetStateAction<UserProfile>>;
  onGrantPerk?: (perkId: string) => void;
}

const Profile: React.FC<Props> = ({ user, setUser, onGrantPerk }) => {
  const [showAd, setShowAd] = useState(false);

  const handleClaimPerk = () => {
    setShowAd(true);
  };

  const handleAdComplete = () => {
    setShowAd(false);
    if (onGrantPerk) {
      onGrantPerk('contribution_boost');
      alert("Success! Your Contribution Boost is now active for 24 hours.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-500">
      {showAd && (
        <RewardedAd 
          perkName="Double Contribution Points" 
          onComplete={handleAdComplete} 
          onClose={() => setShowAd(false)} 
        />
      )}

      <header className="flex items-center gap-8">
        <div className="w-32 h-32 rounded-[2.5rem] bg-indigo-100 flex items-center justify-center text-5xl shadow-inner border-4 border-white">
          🧔
        </div>
        <div>
          <h2 className="text-4xl font-black text-slate-800">{user.name}</h2>
          <p className="text-slate-500 font-medium mb-4">{user.email}</p>
          <div className="flex gap-2">
            <span className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-full uppercase tracking-widest shadow-lg shadow-indigo-200">
              {user.isPremium ? 'Premium Pro' : 'Free Tier'}
            </span>
            <span className="px-4 py-1.5 bg-slate-200 text-slate-600 text-xs font-bold rounded-full uppercase tracking-widest">
              Level {Math.floor(user.contributions / 10) + 1} Contributor
            </span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="glass rounded-[2.5rem] p-10 space-y-8">
          <h3 className="text-xl font-bold border-b border-slate-100 pb-4">Security & 2FA</h3>
          <div className="flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
            <div>
              <p className="font-bold text-slate-800">Two-Factor Authentication</p>
              <p className="text-sm text-slate-500">Protect your account with extra security</p>
            </div>
            <button 
              onClick={() => setUser(u => ({ ...u, twoFactorEnabled: !u.twoFactorEnabled }))}
              className={`w-14 h-8 rounded-full p-1 transition-colors ${user.twoFactorEnabled ? 'bg-green-500' : 'bg-slate-300'}`}
            >
              <div className={`w-6 h-6 bg-white rounded-full transition-transform ${user.twoFactorEnabled ? 'translate-x-6' : 'translate-x-0'} shadow-sm`} />
            </button>
          </div>
          <button className="w-full py-4 text-indigo-600 font-bold hover:bg-indigo-50 rounded-2xl transition-colors">
            Reset Password
          </button>
        </section>

        <section className="glass rounded-[2.5rem] p-10 space-y-8 flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-bold border-b border-slate-100 pb-4 mb-6">Rewards & Perks</h3>
            <p className="text-sm text-slate-500 leading-relaxed mb-6">
              Unlock temporary premium benefits by supporting our partners. Earn boosts for your contributions or access advanced shopping insights.
            </p>
          </div>
          
          <div className="bg-indigo-600 p-6 rounded-[2rem] shadow-xl shadow-indigo-100 text-white">
            <div className="mb-4">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Available Now</p>
              <h4 className="text-lg font-bold leading-tight">Contribution Boost</h4>
              <p className="text-xs text-indigo-100 mt-1">Earn double points for 24 hours.</p>
            </div>
            <button 
              onClick={handleClaimPerk}
              className="w-full py-3 bg-white text-indigo-600 rounded-xl text-sm font-bold hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
            >
              <span>📺</span> Watch Ad to Unlock
            </button>
          </div>
        </section>
      </div>

      <section className="glass rounded-[2.5rem] p-10 space-y-8">
        <h3 className="text-xl font-bold border-b border-slate-100 pb-4">Contribution Analytics</h3>
        <div className="space-y-6">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-3xl font-black text-slate-800">{user.contributions}</p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Price Tags Verified</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-green-600">+12%</p>
              <p className="text-xs text-slate-400">From last month</p>
            </div>
          </div>
          <div className="flex gap-1 items-end h-24">
            {[40, 70, 45, 90, 65, 80, 50, 60, 95, 75, 85, 100].map((h, i) => (
              <div key={i} className="flex-1 bg-indigo-100 rounded-t-lg hover:bg-indigo-500 transition-colors" style={{ height: `${h}%` }}></div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white rounded-[3rem] p-12 shadow-sm border border-slate-100 text-center">
        <h3 className="text-2xl font-bold mb-4">The Future of Grocery Shopping</h3>
        <p className="text-slate-500 max-w-2xl mx-auto mb-8 leading-relaxed">
          PantryPulse is built to scale. Our upcoming integration with <span className="text-indigo-600 font-bold">Google Maps Grounding</span> will provide real-time traffic 
          adjustments and parking availability, ensuring your "value score" is accurate down to the minute.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <div className="px-6 py-4 rounded-3xl bg-slate-50 border border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Architecture</p>
            <p className="font-bold">Containerized Docker</p>
          </div>
          <div className="px-6 py-4 rounded-3xl bg-slate-50 border border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Database</p>
            <p className="font-bold">PostgreSQL Vector</p>
          </div>
          <div className="px-6 py-4 rounded-3xl bg-slate-50 border border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase mb-1">API Hub</p>
            <p className="font-bold">Gemini 3 Pro Core</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Profile;
