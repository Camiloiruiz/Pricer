
import React, { useState } from 'react';
import { Product, ListItem } from '../types';
import BannerAd from './Ads/BannerAd';

interface Props {
  list: ListItem[];
  products: Product[];
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  onToggle: (id: string) => void;
}

const GroceryList: React.FC<Props> = ({ list, products, onAdd, onRemove, onToggle }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
    !list.some(li => li.productId === p.id)
  );

  const activeItems = list.filter(i => !i.purchased);
  const completedItems = list.filter(i => i.purchased);

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20">
      <header className="flex flex-col gap-4">
        <h2 className="text-3xl font-bold text-slate-800">Shopping List</h2>
        <div className="relative group">
          <input 
            type="text" 
            placeholder="Search items to add (e.g. Milk, Eggs...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-6 py-4 rounded-3xl bg-white border border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all pl-14"
          />
          <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl group-focus-within:scale-110 transition-transform">🔍</span>
          
          {searchTerm && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 z-10 max-h-60 overflow-y-auto">
              {filteredProducts.length > 0 ? filteredProducts.map(p => (
                <button 
                  key={p.id}
                  onClick={() => { onAdd(p.id); setSearchTerm(''); }}
                  className="w-full px-6 py-4 text-left hover:bg-slate-50 flex items-center justify-between group"
                >
                  <div>
                    <span className="font-bold text-slate-800">{p.name}</span>
                    <span className="ml-2 text-xs text-slate-400 uppercase tracking-wider">{p.category}</span>
                  </div>
                  <span className="text-indigo-600 opacity-0 group-hover:opacity-100 font-bold transition-opacity">Add +</span>
                </button>
              )) : (
                <div className="p-6 text-center text-slate-400">
                  <p>Item not found? Scan a price tag to add it!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <section className="space-y-4">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest px-4">Remaining ({activeItems.length})</h3>
        <div className="space-y-2">
          {activeItems.map(item => {
            const product = products.find(p => p.id === item.productId);
            return (
              <div key={item.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => onToggle(item.id)}
                    className="w-7 h-7 rounded-full border-2 border-slate-200 flex items-center justify-center hover:border-indigo-500 transition-colors"
                  >
                  </button>
                  <div>
                    <h4 className="font-bold text-slate-800">{product?.name}</h4>
                    <p className="text-xs text-slate-400">{product?.category} • {item.quantity} {product?.unit}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                   <button 
                    onClick={() => onRemove(item.id)}
                    className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
          {activeItems.length === 0 && (
            <div className="p-10 text-center border-2 border-dashed border-slate-200 rounded-3xl text-slate-400">
              <p className="text-4xl mb-2">🛒</p>
              <p>Your list is empty. Time to plan your trip!</p>
            </div>
          )}
        </div>
      </section>

      <BannerAd />

      {completedItems.length > 0 && (
        <section className="space-y-4 opacity-60">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest px-4">Completed ({completedItems.length})</h3>
          <div className="space-y-2">
            {completedItems.map(item => {
              const product = products.find(p => p.id === item.productId);
              return (
                <div key={item.id} className="bg-slate-100 p-4 rounded-3xl flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => onToggle(item.id)}
                      className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center"
                    >
                      <span className="text-white text-xs">✓</span>
                    </button>
                    <h4 className="font-medium text-slate-500 line-through">{product?.name}</h4>
                  </div>
                  <button onClick={() => onRemove(item.id)} className="text-slate-400 hover:text-red-500 transition-colors">🗑️</button>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};

export default GroceryList;
