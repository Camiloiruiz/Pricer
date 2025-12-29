
import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { UserProfile, ListItem, Product } from '../types';
import { getSmartShoppingAdvice } from '../geminiService';
import BannerAd from './Ads/BannerAd';

interface Props {
  user: UserProfile;
  list: ListItem[];
  products: Product[];
}

const Dashboard: React.FC<Props> = ({ user, list, products }) => {
  const navigate = useNavigate();
  const [advice, setAdvice] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const activeItemsCount = list.filter(i => !i.purchased).length;
  const contributionPercent = Math.min((user.contributions / 50) * 100, 100);
  
  const radius = 40;
  const circumference = 2 * Math.PI * radius;

  // Extract first name if it exists
  const firstName = user.name?.trim().split(/\s+/)[0];

  useEffect(() => {
    if (list.length > 0 && advice.length === 0) {
      const fetchAdvice = async () => {
        setLoading(true);
        try {
          const names = list.map(li => products.find(p => p.id === li.productId)?.name || '');
          const res = await getSmartShoppingAdvice(names.filter(n => n !== ''));
          setAdvice(res);
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      };
      fetchAdvice();
    }
  }, [list, products, advice.length]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">
            Hello{firstName ? `, ${firstName}` : ''} 👋
          </h2>
          <p className="text-slate-500">Ready to save on your groceries today?</p>
        </div>
        <div className="flex gap-4">
          <div className="px-6 py-4 glass rounded-3xl shadow-sm flex flex-col items-center">
            <span className="text-2xl font-bold text-indigo-600">{activeItemsCount}</span>
            <span className="text-xs font-bold text-slate-400 uppercase">Items on List</span>
          </div>
          <div className="px-6 py-4 glass rounded-3xl shadow-sm flex flex-col items-center">
            <span className="text-2xl font-bold text-green-600">${(Math.random() * 40 + 10).toFixed(2)}</span>
            <span className="text-xs font-bold text-slate-400 uppercase">Est. Savings</span>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="glass p-8 rounded-[2rem] shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 -m-8 w-48 h-48 bg-indigo-100 rounded-full blur-3xl opacity-50 group-hover:opacity-80 transition-opacity"></div>
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <span className="text-2xl">✨</span> Shopping Insights
            </h3>
            {loading ? (
              <div className="flex items-center gap-3 text-slate-400">
                <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                Generating custom advice...
              </div>
            ) : (
              <div className="space-y-4">
                {advice.length > 0 ? advice.map((tip, i) => (
                  <div key={i} className="flex gap-4 items-start bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                      <span className="text-indigo-600 font-bold">{i+1}</span>
                    </div>
                    <p className="text-slate-700 leading-relaxed">{tip}</p>
                  </div>
                )) : (
                  <p className="text-slate-500 italic">Add some items to your list to get smart insights!</p>
                )}
              </div>
            )}
          </div>

          <BannerAd />
        </div>

        <div className="flex flex-col gap-6">
          <div className="glass p-6 rounded-[2rem] shadow-sm flex flex-col justify-between max-h-[350px]">
            <h3 className="text-lg font-bold mb-4">Premium Progress</h3>
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="relative w-28 h-28 mb-4">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle 
                    cx="50" cy="50" r={radius} 
                    stroke="currentColor" strokeWidth="6" fill="transparent" 
                    className="text-slate-100" 
                  />
                  <circle 
                    cx="50" cy="50" r={radius} 
                    stroke="currentColor" strokeWidth="6" fill="transparent" 
                    strokeDasharray={circumference} 
                    strokeDashoffset={circumference - (circumference * contributionPercent) / 100} 
                    strokeLinecap="round"
                    className="text-indigo-600 transition-all duration-1000" 
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold">{user.contributions}</span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase">Uploads</span>
                </div>
              </div>
              <p className="text-center text-xs text-slate-600 max-w-[180px] leading-relaxed">
                <span className="font-bold text-indigo-600">{50 - user.contributions} more</span> to unlock **Premium Pro** benefits!
              </p>
            </div>
            <button 
              onClick={() => navigate('/scan')}
              className="mt-6 w-full py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-md shadow-slate-200"
            >
              Upload Price Tag
            </button>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <h4 className="font-bold text-slate-800 mb-2">Smart Saving</h4>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              PantryPulse uses advanced AI to track your local stores. The more you contribute, the better our data becomes for everyone.
            </p>
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
              <span>🚀</span> Community Powered
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">Recent Price Drops</h3>
          <button className="text-sm font-bold text-indigo-600 hover:underline">View All</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: 'Organic Spinach', old: 4.99, new: 3.49, store: 'FreshMart' },
            { name: 'Greek Yogurt', old: 6.50, new: 4.99, store: 'SuperSaver' },
            { name: 'Avocados', old: 1.50, new: 0.89, store: 'FreshMart' },
            { name: 'Almond Milk', old: 5.25, new: 4.00, store: 'WholeFoodies' },
          ].map((item, i) => (
            <div key={i} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm group hover:border-indigo-200 transition-all">
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-bold px-2 py-1 bg-green-50 text-green-600 rounded-lg">-{Math.round((1 - item.new / item.old) * 100)}%</span>
                <span className="text-[10px] font-medium text-slate-400">{item.store}</span>
              </div>
              <h4 className="font-bold text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors">{item.name}</h4>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-slate-900">${item.new}</span>
                <span className="text-xs text-slate-400 line-through">${item.old}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
