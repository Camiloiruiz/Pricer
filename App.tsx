
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import GroceryList from './components/GroceryList';
import Scanner from './components/Scanner';
import Optimizer from './components/Optimizer';
import Profile from './components/Profile';
import { Product, Store, ListItem, UserProfile } from './types';

// Mock Data Initializer
const INITIAL_STORES: Store[] = [
  { id: 's1', name: 'FreshMart', distanceKm: 1.2, address: '123 Main St' },
  { id: 's2', name: 'SuperSaver', distanceKm: 4.5, address: '789 Oak Ave' },
  { id: 's3', name: 'WholeFoodies', distanceKm: 2.8, address: '456 Pine Rd' },
];

const INITIAL_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Organic Milk', category: 'Dairy', unit: 'Gal' },
  { id: 'p2', name: 'Whole Wheat Bread', category: 'Bakery', unit: 'Loaf' },
  { id: 'p3', name: 'Dozen Eggs', category: 'Dairy', unit: 'Pack' },
  { id: 'p4', name: 'Chicken Breast', category: 'Meat', unit: 'lb' },
  { id: 'p5', name: 'Bananas', category: 'Produce', unit: 'lb' },
];

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile>({
    name: 'Alex Johnson',
    email: 'alex@example.com',
    isPremium: false,
    contributions: 12,
    twoFactorEnabled: false,
    activePerks: []
  });

  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [list, setList] = useState<ListItem[]>([]);
  const [stores] = useState<Store[]>(INITIAL_STORES);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const location = useLocation();

  // Close menu on route change (mobile)
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  // Load from LocalStorage
  useEffect(() => {
    const savedList = localStorage.getItem('pp_list');
    if (savedList) setList(JSON.parse(savedList));
  }, []);

  useEffect(() => {
    localStorage.setItem('pp_list', JSON.stringify(list));
  }, [list]);

  const addToList = (productId: string) => {
    setList(prev => {
      const existing = prev.find(i => i.productId === productId);
      if (existing) {
        return prev.map(i => i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { id: Date.now().toString(), productId, quantity: 1, purchased: false }];
    });
  };

  const removeFromList = (id: string) => {
    setList(prev => prev.filter(i => i.id !== id));
  };

  const togglePurchased = (id: string) => {
    setList(prev => prev.map(i => i.id === id ? { ...i, purchased: !i.purchased } : i));
  };

  const grantPerk = (perkId: string) => {
    setUser(u => ({
      ...u,
      activePerks: [...u.activePerks, perkId]
    }));
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 text-slate-900">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 glass sticky top-0 z-[60] shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-200">
            <span className="text-white font-bold text-lg">P</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">PantryPulse</h1>
        </div>
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          aria-label="Toggle menu"
        >
          {isMenuOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </header>

      {/* Mobile Backdrop */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Navigation - Sidebar */}
      <nav className={`
        fixed inset-y-0 left-0 w-72 glass z-50 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:w-64 md:h-screen md:flex flex-col p-6
        ${isMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
      `}>
        <div className="hidden md:flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <span className="text-white font-bold text-xl">P</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">PantryPulse</h1>
        </div>
        
        <div className="flex flex-col gap-2 mt-12 md:mt-0">
          <NavLink to="/" icon="📊" label="Dashboard" isActive={location.pathname === '/'} />
          <NavLink to="/list" icon="📝" label="My List" isActive={location.pathname === '/list'} />
          <NavLink to="/optimize" icon="🎯" label="Optimizer" isActive={location.pathname === '/optimize'} />
          <NavLink to="/scan" icon="📷" label="Scan Prices" isActive={location.pathname === '/scan'} />
          <NavLink to="/profile" icon="👤" label="Profile" isActive={location.pathname === '/profile'} />
        </div>

        <div className="mt-auto pt-6 border-t border-slate-100 md:border-none">
          {user.activePerks.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {user.activePerks.map(p => (
                <span key={p} className="px-2 py-1 bg-green-50 text-green-600 text-[9px] font-black rounded uppercase tracking-tighter">Active: {p.replace('_', ' ')}</span>
              ))}
            </div>
          )}
          <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
            <p className="text-xs font-semibold text-indigo-600 uppercase mb-1">Status</p>
            <p className="text-sm font-medium text-indigo-900">{user.isPremium ? 'Premium Active' : 'Free Plan'}</p>
            {!user.isPremium && (
              <Link to="/scan" className="block mt-2 text-xs text-indigo-700 font-bold hover:underline">
                Unlock Premium via Contributions
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-10 max-w-6xl mx-auto w-full overflow-x-hidden">
        <Routes>
          <Route path="/" element={<Dashboard user={user} list={list} products={products} />} />
          <Route path="/list" element={<GroceryList list={list} products={products} onAdd={addToList} onRemove={removeFromList} onToggle={togglePurchased} />} />
          <Route path="/optimize" element={<Optimizer list={list} products={products} stores={stores} />} />
          <Route path="/scan" element={<Scanner onPriceUpdate={(newProducts) => setProducts(p => [...p, ...newProducts])} />} />
          <Route path="/profile" element={<Profile user={user} setUser={setUser} onGrantPerk={grantPerk} />} />
        </Routes>
      </main>
    </div>
  );
};

// Wrap the App component with HashRouter to provide location context
const RootApp: React.FC = () => (
  <HashRouter>
    <App />
  </HashRouter>
);

const NavLink: React.FC<{ to: string, icon: string, label: string, isActive: boolean }> = ({ to, icon, label, isActive }) => {
  return (
    <Link 
      to={to} 
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 whitespace-nowrap ${
        isActive 
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <span className="text-xl">{icon}</span>
      <span className="font-semibold">{label}</span>
    </Link>
  );
};

export default RootApp;
