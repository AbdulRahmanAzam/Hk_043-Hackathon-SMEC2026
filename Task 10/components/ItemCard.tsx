import React from 'react';
import { Item, TransactionType } from '../types';
import { MapPin, RefreshCcw, TrendingUp, Heart } from 'lucide-react';

interface ItemCardProps {
  item: Item;
  onClick: () => void;
}

// Helper to calculate relative time
const getRelativeTime = (dateStr?: string): string => {
  if (!dateStr) return 'Recently';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
};

export const ItemCard: React.FC<ItemCardProps> = ({ item, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className="group bg-white rounded-[2rem] shadow-sm hover:shadow-xl hover:shadow-stone-200/50 hover:-translate-y-1 transition-all duration-500 overflow-hidden border border-stone-100 cursor-pointer flex flex-col h-full relative"
    >
      <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0 duration-300">
        <button className="p-2.5 bg-white/90 backdrop-blur-md rounded-full shadow-sm hover:bg-white text-stone-400 hover:text-rose-500 transition-colors">
          <Heart className="w-5 h-5 stroke-[2.5px]" />
        </button>
      </div>

      <div className="relative h-72 w-full overflow-hidden bg-stone-100">
        <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-60"></div>
        
        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
          <div className="flex gap-2 flex-wrap">
            {item.type.includes(TransactionType.BARTER) && (
              <span className="bg-violet-600/90 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg border border-white/20 flex items-center uppercase tracking-wider">
                <RefreshCcw className="w-3 h-3 mr-1.5" /> Swap
              </span>
            )}
            {item.type.includes(TransactionType.RENTAL) && (
              <span className="bg-emerald-600/90 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg border border-white/20 flex items-center uppercase tracking-wider">
                <TrendingUp className="w-3 h-3 mr-1.5" /> Rent
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-2">
           <h3 className="text-lg font-bold text-stone-900 leading-snug group-hover:text-emerald-700 transition-colors font-heading">{item.title}</h3>
        </div>
        
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-stone-100 text-stone-600 uppercase tracking-wider">{item.category}</span>
          <div className="w-1 h-1 rounded-full bg-stone-300"></div>
          <span className="text-xs text-stone-500 flex items-center font-medium"><MapPin className="w-3.5 h-3.5 mr-1" /> {item.location || 'Nearby'}</span>
        </div>

        <p className="text-stone-500 text-sm line-clamp-2 mb-6 flex-grow leading-relaxed">{item.description}</p>
        
        <div className="pt-5 border-t border-dashed border-stone-200 flex items-center justify-between mt-auto">
          <div className="flex items-center gap-2.5">
             <div className="relative">
               <div className="w-8 h-8 rounded-full bg-gradient-to-br from-stone-200 to-stone-300 flex items-center justify-center text-xs font-bold text-stone-600 ring-2 ring-white">
                 {item.ownerName.charAt(0)}
               </div>
               <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></div>
             </div>
             <div className="flex flex-col">
               <span className="text-xs font-bold text-stone-900">{item.ownerName}</span>
               <span className="text-[10px] text-stone-400 font-medium">Verified Owner</span>
             </div>
          </div>
          <div className="text-right">
             {item.rentalPricePerDay ? (
               <div className="flex flex-col items-end">
                 <span className="text-lg font-bold text-emerald-700 leading-none">Rs {item.rentalPricePerDay}</span>
                 <span className="text-[10px] text-stone-400 uppercase font-bold">Per Day</span>
               </div>
             ) : (
               <div className="flex flex-col items-end">
                  <span className="text-lg font-bold text-violet-700 leading-none">Trade</span>
                  <span className="text-[10px] text-stone-400 uppercase font-bold">Only</span>
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};