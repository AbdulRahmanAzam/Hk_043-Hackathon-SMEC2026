
import React, { useState } from 'react';
import { Item } from '../types';
import { ItemCard } from '../components/ItemCard';
import { Search, SlidersHorizontal, ArrowUpRight } from 'lucide-react';

interface MarketplaceProps {
  items: Item[];
  onItemClick: (item: Item) => void;
}

export const Marketplace: React.FC<MarketplaceProps> = ({ items, onItemClick }) => {
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = ['All', 'Electronics', 'Tools', 'Outdoors', 'Home', 'Fashion'];
  
  const filteredItems = items.filter(i => {
    const matchesCategory = filter === 'All' || i.category === filter;
    const matchesSearch = i.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          i.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="animate-fade-in pb-20">
      {/* Immersive Hero - Edge to edge */}
      <div className="relative overflow-hidden bg-stone-900 text-white shadow-2xl isolate">
         <img 
            src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80&w=2000" 
            alt="Hero" 
            className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay"
         />
         <div className="absolute inset-0 bg-gradient-to-r from-stone-900 via-stone-900/80 to-transparent"></div>
         
         <div className="relative z-10 p-6 md:p-20 max-w-7xl mx-auto pt-28 md:pt-36">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-emerald-300 text-xs font-bold uppercase tracking-widest mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Pakistan's Sharing Community
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold mb-6 leading-[0.95] md:leading-[0.9] tracking-tight font-heading">
              Own less.<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">Experience more.</span>
            </h1>
            <p className="text-lg md:text-xl text-stone-300 max-w-xl leading-relaxed mb-10">
              Why buy expensive gear for one-time use? Connect with people across Pakistan to rent, lend, and swap quality items securely.
            </p>

            {/* Contextual Search Bar */}
            <div className="bg-white p-2 rounded-2xl md:rounded-[1.5rem] shadow-xl max-w-2xl flex flex-col md:flex-row items-stretch md:items-center gap-2 transform transition-all focus-within:scale-[1.01]">
               <div className="flex-1 w-full relative">
                 <Search className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                 <input 
                    type="text"
                    placeholder="Try 'Camping tent'..."
                    className="w-full pl-12 md:pl-14 pr-4 py-3 md:py-4 rounded-xl bg-transparent text-stone-900 placeholder-stone-400 font-medium outline-none text-base md:text-lg"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                 />
               </div>
               <div className="h-px md:h-8 w-full md:w-px bg-stone-200 md:block"></div>
               <button className="w-full md:w-auto bg-stone-900 hover:bg-stone-800 text-white px-8 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm md:text-base">
                 Find Gear <ArrowUpRight className="w-4 h-4" />
               </button>
            </div>
         </div>
      </div>

      {/* Filter Chips */}
      <div className="sticky top-24 md:top-28 z-30 py-4 bg-stone-50/90 backdrop-blur-xl supports-[backdrop-filter]:bg-stone-50/60 border-b border-stone-200/50 md:border-none">
        <div className="flex justify-between items-center max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex overflow-x-auto gap-3 hide-scrollbar pb-1 md:pb-2 w-full md:w-auto px-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-5 md:px-6 py-2 md:py-2.5 rounded-full whitespace-nowrap text-xs md:text-sm font-bold transition-all border flex-shrink-0 ${
                  filter === cat 
                    ? 'bg-stone-900 text-white border-stone-900 shadow-md' 
                    : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <button className="hidden md:flex items-center gap-2 px-4 py-2 text-sm font-bold text-stone-600 hover:bg-stone-200 rounded-full transition-colors ml-4 shrink-0">
             <SlidersHorizontal className="w-4 h-4" /> Filters
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
          {filteredItems.map(item => (
            <ItemCard key={item.id} item={item} onClick={() => onItemClick(item)} />
          ))}
        </div>
      </div>
      
      {filteredItems.length === 0 && (
         <div className="flex flex-col items-center justify-center py-32 text-center opacity-60 max-w-7xl mx-auto px-4">
            <div className="bg-stone-200 p-6 rounded-full mb-6">
              <Search className="w-12 h-12 text-stone-400" />
            </div>
            <h3 className="text-2xl font-bold text-stone-900 mb-2">No results found</h3>
            <p className="text-stone-500">Try adjusting your search terms or filters.</p>
         </div>
      )}
    </div>
  );
};
