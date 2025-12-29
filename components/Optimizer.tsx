
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ListItem, Product, Store, OptimizationResult } from '../types';

interface Props {
  list: ListItem[];
  products: Product[];
  stores: Store[];
}

const Optimizer: React.FC<Props> = ({ list, products, stores }) => {
  const navigate = useNavigate();

  // Logic to simulate finding the best store based on "Value"
  // Value = Cost (50%) + Distance (30%) + Efficiency (20%)
  const results: OptimizationResult[] = useMemo(() => {
    return stores.map(store => {
      let totalCost = 0;
      let availableCount = 0;
      const itemsList = list.map(li => {
        const product = products.find(p => p.id === li.productId);
        // Simulated pricing variance
        const storeIdNum = parseInt(store.id.replace(/\D/g, '')) || 1;
        const storeVariance = (storeIdNum * 0.1) - 0.2;
        const basePrice = (product?.name.length || 10) * 0.5;
        const price = basePrice * (1 + storeVariance);
        
        const available = Math.random() > 0.05; // 95% availability
        if (available) {
          totalCost += price * li.quantity;
          availableCount++;
        }

        return {
          name: product?.name || 'Unknown',
          price,
          available
        };
      });

      // Value Score Calculation (Lower is better)
      const valueScore = (store.distanceKm * 3) + (totalCost / 2) - (availableCount * 2);

      return {
        storeId: store.id,
        storeName: store.name,
        totalCost,
        distance: store.distanceKm,
        itemsAvailable: availableCount,
        valueScore,
        itemsList
      };
    }).sort((a, b) => a.valueScore - b.valueScore);
  }, [list, products, stores]);

  if (list.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center text-slate-400 bg-white rounded-[3rem] shadow-sm border border-slate-100">
        <span className="text-6xl mb-6">🛰️</span>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Optimizer Offline</h2>
        <p className="max-w-xs mx-auto">Add items to your list first so we can analyze the best stores for your trip.</p>
        <button 
          onClick={() => navigate('/list')}
          className="mt-8 px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:shadow-lg transition-all"
        >
          Go to List
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in zoom-in-95 duration-500">
      <header>
        <h2 className="text-3xl font-bold text-slate-800">Trip Optimizer</h2>
        <p className="text-slate-500">We've calculated the best value based on distance, price, and stock.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {results.map((res, i) => (
          <div key={res.storeId} className={`glass rounded-[2.5rem] p-8 shadow-sm transition-all border-2 ${
            i === 0 ? 'border-indigo-600 bg-indigo-50/30' : 'border-transparent'
          }`}>
            <div className="flex justify-between items-start mb-6">
              <div>
                {i === 0 && <span className="bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3 inline-block">Recommended</span>}
                <h3 className="text-2xl font-bold text-slate-800">{res.storeName}</h3>
                <p className="text-sm text-slate-500">📍 {res.distance} km away</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-slate-900">${res.totalCost.toFixed(2)}</p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Total Cost</p>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Availability</span>
                <span className="font-bold text-slate-800">{res.itemsAvailable} / {list.length} items</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-indigo-600 h-full transition-all duration-1000" style={{ width: `${(res.itemsAvailable / list.length) * 100}%` }}></div>
              </div>
            </div>

            <div className="space-y-3 mb-8 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {res.itemsList.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm py-2 border-b border-slate-100 last:border-0">
                  <span className={item.available ? 'text-slate-700 font-medium' : 'text-slate-300 line-through'}>{item.name}</span>
                  <span className="font-bold text-slate-900">${item.price.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <button className={`w-full py-4 rounded-2xl font-bold transition-all ${
              i === 0 ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 hover:bg-indigo-700' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
            }`}>
              {i === 0 ? 'Start Navigation' : 'Select Store'}
            </button>
          </div>
        ))}
      </div>

      <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
          <div className="flex-1">
            <h3 className="text-2xl font-bold mb-4">Multi-Stop Strategy</h3>
            <p className="text-slate-400 leading-relaxed mb-6">
              Our analysis shows you could save an additional <span className="text-indigo-400 font-bold">$12.45</span> by splitting this trip between 
              <span className="text-white font-bold"> FreshMart</span> and <span className="text-white font-bold"> SuperSaver</span>.
            </p>
            <button className="px-8 py-4 bg-white text-slate-900 rounded-2xl font-bold hover:bg-indigo-50 transition-colors">
              Plan Multi-Stop Route
            </button>
          </div>
          <div className="hidden md:block w-64 h-64 bg-indigo-500/20 rounded-full border border-indigo-500/30 flex items-center justify-center backdrop-blur-sm">
            <span className="text-6xl animate-pulse">🛣️</span>
          </div>
        </div>
        <div className="absolute bottom-0 right-0 -m-20 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl"></div>
      </div>
    </div>
  );
};

export default Optimizer;
