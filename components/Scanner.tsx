
import React, { useState, useRef } from 'react';
import { extractPriceData } from '../geminiService';
import { Product } from '../types';

interface Props {
  onPriceUpdate: (products: Product[]) => void;
}

const Scanner: React.FC<Props> = ({ onPriceUpdate }) => {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        processImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async (base64: string) => {
    setLoading(true);
    setResults(null);
    try {
      // Remove data:image/jpeg;base64, prefix for Gemini
      const cleanBase64 = base64.split(',')[1];
      const data = await extractPriceData(cleanBase64);
      setResults(data);
      
      const newProducts: Product[] = data.map((d: any) => ({
        id: `scanned-${Date.now()}-${Math.random()}`,
        name: d.name,
        category: d.category || 'General',
        unit: 'ea',
        basePrice: d.price
      }));
      onPriceUpdate(newProducts);
    } catch (err) {
      alert("Error scanning image. Please ensure price tag is clearly visible.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-right-10 duration-500">
      <header className="text-center">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Price Scanner</h2>
        <p className="text-slate-500">Snap a photo of price tags or receipts to update our crowd-sourced database.</p>
      </header>

      <div className="glass rounded-[3rem] p-10 border-2 border-dashed border-indigo-200 flex flex-col items-center justify-center gap-6 min-h-[400px]">
        {image ? (
          <div className="w-full space-y-6">
            <div className="relative w-full aspect-video rounded-3xl overflow-hidden shadow-2xl">
              <img src={image} alt="Scanned content" className="w-full h-full object-cover" />
              {loading && (
                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                  <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="font-bold text-lg animate-pulse">PantryPulse AI Extracting Prices...</p>
                </div>
              )}
            </div>
            
            {results && (
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-indigo-50 animate-in fade-in slide-in-from-bottom-4">
                <h3 className="font-bold text-lg mb-4 text-indigo-600 flex items-center gap-2">
                  <span>✅</span> Successfully Extracted
                </h3>
                <div className="space-y-3">
                  {results.map((r, i) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                      <span className="text-slate-800 font-medium">{r.name}</span>
                      <span className="font-bold text-slate-900">${r.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-6 text-xs text-center text-slate-400">Items have been added to the master list and your contribution score has increased!</p>
              </div>
            )}

            <button 
              onClick={() => { setImage(null); setResults(null); }}
              className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-colors"
            >
              Scan Another
            </button>
          </div>
        ) : (
          <>
            <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center text-5xl">📸</div>
            <div className="text-center">
              <p className="font-bold text-slate-800 text-xl mb-1">Upload Price Image</p>
              <p className="text-slate-400">Supports JPEG, PNG up to 10MB</p>
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-10 py-5 bg-indigo-600 text-white rounded-3xl font-black text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all hover:scale-105 active:scale-95"
            >
              Select Photo
            </button>
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileChange} 
            />
            <p className="text-xs text-slate-400 mt-4 max-w-xs text-center">
              Premium users can unlock real-time store comparison by contributing just 5 clear price tag photos per week.
            </p>
          </>
        )}
      </div>

      <div className="p-8 bg-blue-50 rounded-[2.5rem] border border-blue-100 flex gap-6 items-start">
        <span className="text-3xl">💡</span>
        <div>
          <h4 className="font-bold text-blue-900 mb-1">OCR Tips</h4>
          <ul className="text-sm text-blue-800 space-y-1 list-disc ml-4">
            <li>Ensure the store name is visible if scanning a receipt</li>
            <li>Make sure the text isn't blurry or obscured by glare</li>
            <li>Focus specifically on the price-per-unit for the best accuracy</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Scanner;
