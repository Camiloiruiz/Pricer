
export interface Product {
  id: string;
  name: string;
  category: string;
  unit: string;
  basePrice?: number;
}

export interface StoreProduct {
  productId: string;
  storeId: string;
  price: number;
  lastUpdated: string;
}

export interface Store {
  id: string;
  name: string;
  distanceKm: number;
  address: string;
}

export interface ListItem {
  id: string;
  productId: string;
  quantity: number;
  purchased: boolean;
}

export interface OptimizationResult {
  storeId: string;
  storeName: string;
  totalCost: number;
  distance: number;
  itemsAvailable: number;
  valueScore: number;
  itemsList: { name: string; price: number; available: boolean }[];
}

export interface AdPerk {
  id: string;
  name: string;
  description: string;
  activeUntil: number | null;
  type: 'contribution_boost' | 'extra_savings_insight' | 'priority_support';
}

export interface UserProfile {
  name: string;
  email: string;
  isPremium: boolean;
  contributions: number;
  twoFactorEnabled: boolean;
  activePerks: string[]; // IDs of active AdPerks
}
