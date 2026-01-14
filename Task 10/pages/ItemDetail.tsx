
import React, { useState } from 'react';
import { Item, User } from '../types';
import { MOCK_USERS } from '../services/mockData';
import { ArrowRight, MapPin, RefreshCcw, Sparkles, Star, Edit3, Save, X, Trash2 } from 'lucide-react';

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

interface ItemDetailProps {
  item: Item;
  currentUser: User;
  onBack: () => void;
  onUpdate: (item: Item) => void;
  onDelete: () => void;
  onRent: (days: number) => void;
  onSwap: () => void;
  onViewProfile: (userId: string) => void;
}

export const ItemDetail: React.FC<ItemDetailProps> = ({ 
  item, 
  currentUser,
  onBack, 
  onUpdate,
  onDelete,
  onRent,
  onSwap,
  onViewProfile
}) => {
  const isGuest = currentUser.id === 'guest';
  const isOwner = !isGuest && currentUser.id === item.ownerId;
  const owner = isOwner ? currentUser : (MOCK_USERS.find(u => u.id === item.ownerId) || MOCK_USERS[0]);
  
  const [isEditing, setIsEditing] = useState(false);
  const [rentalDays, setRentalDays] = useState(7);
  const [editForm, setEditForm] = useState({
    title: item.title,
    description: item.description,
    estimatedValue: item.estimatedValue,
    rentalPricePerDay: item.rentalPricePerDay || 0,
    wantedItems: item.wantedItems || ''
  });

  const handleSave = () => {
    onUpdate({
      ...item,
      title: editForm.title,
      description: editForm.description,
      estimatedValue: Number(editForm.estimatedValue),
      rentalPricePerDay: Number(editForm.rentalPricePerDay),
      wantedItems: editForm.wantedItems
    });
    setIsEditing(false);
  };

  const StarRating = ({ rating }: { rating: number }) => (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star key={i} className={`w-3.5 h-3.5 ${i < rating ? 'text-amber-400 fill-amber-400' : 'text-stone-300'}`} />
      ))}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto animate-fade-in-up pb-20 px-4 sm:px-6 lg:px-8 pt-28 md:pt-32">
      <div className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="flex items-center text-sm font-bold text-stone-500 hover:text-stone-900 transition-colors bg-white px-4 py-2 rounded-full shadow-sm border border-stone-100 w-fit group">
          <ArrowRight className="w-4 h-4 rotate-180 mr-2 group-hover:-translate-x-1 transition-transform" /> Back to Market
        </button>

        {isOwner && !isEditing && (
           <div className="flex gap-2">
             <button 
               onClick={() => setIsEditing(true)} 
               className="flex items-center text-sm font-bold text-stone-600 bg-white px-4 py-2 rounded-full shadow-sm border border-stone-100 hover:bg-stone-50"
             >
               <Edit3 className="w-4 h-4 mr-2" /> Edit Item
             </button>
             <button 
               onClick={onDelete} 
               className="flex items-center text-sm font-bold text-rose-600 bg-rose-50 px-4 py-2 rounded-full shadow-sm border border-rose-100 hover:bg-rose-100"
             >
               <Trash2 className="w-4 h-4 mr-2" /> Delete
             </button>
           </div>
        )}
        
        {isOwner && isEditing && (
           <div className="flex gap-2">
             <button 
               onClick={handleSave} 
               className="flex items-center text-sm font-bold text-white bg-emerald-600 px-4 py-2 rounded-full shadow-sm hover:bg-emerald-700"
             >
               <Save className="w-4 h-4 mr-2" /> Save
             </button>
             <button 
               onClick={() => setIsEditing(false)} 
               className="flex items-center text-sm font-bold text-stone-600 bg-white px-4 py-2 rounded-full shadow-sm border border-stone-100 hover:bg-stone-50"
             >
               <X className="w-4 h-4 mr-2" /> Cancel
             </button>
           </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column - Visuals */}
        <div className="lg:col-span-7 space-y-6">
          <div className="aspect-[4/3] w-full rounded-[3rem] overflow-hidden bg-stone-200 relative shadow-2xl">
             <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
             <div className="absolute top-6 left-6">
                <span className="bg-white/90 backdrop-blur-md text-stone-900 px-5 py-2.5 rounded-full text-xs font-bold shadow-lg border border-white/50 uppercase tracking-wider">
                   {item.category}
                </span>
             </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
             {[1,2,3].map(i => (
                <div key={i} className="aspect-square rounded-[1.5rem] bg-stone-100 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity border-2 border-transparent hover:border-emerald-500">
                   <img src={item.images[0]} className="w-full h-full object-cover grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all" alt="Gallery" />
                </div>
             ))}
          </div>
        </div>

        {/* Right Column - Info */}
        <div className="lg:col-span-5 flex flex-col h-full py-2">
           <div>
             {isEditing ? (
               <input 
                 className="text-4xl lg:text-5xl font-bold text-stone-900 leading-[1.1] mb-4 font-heading w-full bg-stone-50 border-b-2 border-stone-200 outline-none focus:border-emerald-500"
                 value={editForm.title}
                 onChange={e => setEditForm({...editForm, title: e.target.value})}
               />
             ) : (
               <h1 className="text-4xl lg:text-5xl font-bold text-stone-900 leading-[1.1] mb-4 font-heading">{item.title}</h1>
             )}
             
             <div className="flex items-center gap-6 mb-10 text-stone-500 font-medium text-sm">
               <span className="flex items-center"><MapPin className="w-4 h-4 mr-2 text-emerald-600" /> {item.location || owner.city || 'San Francisco, CA'}</span>
               <span className="w-1.5 h-1.5 rounded-full bg-stone-300"></span>
               <span>Posted {getRelativeTime(item.createdAt)}</span>
             </div>

             <div className="flex gap-4 mb-10">
                <div className="bg-stone-50 px-8 py-6 rounded-[2rem] border border-stone-100 flex-1">
                   <p className="text-stone-400 text-[10px] font-bold uppercase tracking-widest mb-2">Est. Value (Rs)</p>
                   {isEditing ? (
                     <input 
                       type="number"
                       className="text-3xl font-bold text-stone-900 font-heading bg-transparent w-full outline-none border-b border-stone-300"
                       value={editForm.estimatedValue}
                       onChange={e => setEditForm({...editForm, estimatedValue: Number(e.target.value)})}
                     />
                   ) : (
                     <p className="text-3xl font-bold text-stone-900 font-heading">Rs {item.estimatedValue}</p>
                   )}
                </div>
                
                <div className="bg-emerald-50 px-8 py-6 rounded-[2rem] border border-emerald-100 flex-1">
                    <p className="text-emerald-700/60 text-[10px] font-bold uppercase tracking-widest mb-2">Rental Rate (Rs/Day)</p>
                    {isEditing ? (
                     <input 
                       type="number"
                       className="text-3xl font-bold text-emerald-800 font-heading bg-transparent w-full outline-none border-b border-emerald-300"
                       value={editForm.rentalPricePerDay}
                       onChange={e => setEditForm({...editForm, rentalPricePerDay: Number(e.target.value)})}
                     />
                   ) : (
                    <p className="text-3xl font-bold text-emerald-800 font-heading">Rs {item.rentalPricePerDay || 0}<span className="text-sm text-emerald-600 font-bold ml-1">/day</span></p>
                   )}
                </div>
             </div>

             <div className="prose prose-stone prose-lg mb-10">
               <h3 className="text-xl font-bold text-stone-900 mb-4 font-heading">About this item</h3>
               {isEditing ? (
                 <textarea 
                   className="w-full h-32 p-3 bg-stone-50 rounded-xl border border-stone-200 outline-none resize-none text-base"
                   value={editForm.description}
                   onChange={e => setEditForm({...editForm, description: e.target.value})}
                 />
               ) : (
                 <p className="text-stone-600 leading-relaxed">{item.description}</p>
               )}
             </div>
             
             {(item.wantedItems || isEditing) && (
               <div className="mb-10 bg-violet-50 p-8 rounded-[2rem] border border-violet-100 relative overflow-hidden">
                  <div className="absolute -right-6 -top-6 p-4 opacity-5">
                     <RefreshCcw className="w-40 h-40 text-violet-900" />
                  </div>
                  <h3 className="text-xs font-extrabold text-violet-900 mb-3 uppercase tracking-widest flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> Open to trading for
                  </h3>
                  {isEditing ? (
                    <input 
                      className="text-violet-900 font-bold text-xl relative z-10 leading-snug bg-transparent w-full border-b border-violet-300 outline-none"
                      value={editForm.wantedItems}
                      placeholder="e.g. Drone, Camping Gear"
                      onChange={e => setEditForm({...editForm, wantedItems: e.target.value})}
                    />
                  ) : (
                    <p className="text-violet-900 font-bold text-xl relative z-10 leading-snug">{item.wantedItems}</p>
                  )}
               </div>
             )}
           </div>

           <div className="mt-auto border-t border-stone-100 pt-10">
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-4">
                    <img src={owner.avatar} alt={owner.name} className="w-14 h-14 rounded-full object-cover ring-4 ring-stone-50" />
                    <div>
                       <p className="font-bold text-stone-900 text-lg leading-none mb-1">{owner.name}</p>
                       <div className="flex items-center text-xs text-stone-500 font-medium">
                          <StarRating rating={4} /> 
                          <span className="ml-2 text-emerald-600">Verified Owner</span>
                       </div>
                    </div>
                 </div>
                 <button 
                   onClick={() => onViewProfile(owner.id)}
                   className="text-sm font-bold text-stone-400 hover:text-stone-900 transition-colors"
                 >
                   View Profile
                 </button>
              </div>

              {!isOwner && (
                <div className="space-y-4">
                   {item.rentalPricePerDay && (
                     <div className="flex items-center gap-4 p-4 bg-stone-50 rounded-2xl border border-stone-100">
                       <label className="text-sm font-bold text-stone-700">Rental Duration:</label>
                       <select 
                         value={rentalDays} 
                         onChange={(e) => setRentalDays(Number(e.target.value))}
                         className="px-4 py-2 bg-white border-2 border-stone-200 rounded-xl font-bold text-stone-900 focus:border-stone-900 outline-none"
                       >
                         {[1, 3, 5, 7, 14, 30].map(d => (
                           <option key={d} value={d}>{d} {d === 1 ? 'day' : 'days'}</option>
                         ))}
                       </select>
                       <span className="text-emerald-700 font-bold ml-auto">
                         Est. Total: Rs {(item.rentalPricePerDay * rentalDays).toLocaleString()}
                       </span>
                     </div>
                   )}
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <button 
                     onClick={() => onRent(rentalDays)}
                     disabled={!item.rentalPricePerDay}
                     className="py-5 px-6 rounded-2xl bg-stone-900 text-white font-bold hover:bg-stone-800 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 flex justify-center items-center text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                      Request Rental
                   </button>
                   <button 
                     onClick={onSwap}
                     className="py-5 px-6 rounded-2xl border-2 border-stone-200 text-stone-900 font-bold hover:border-violet-500 hover:text-violet-700 hover:bg-violet-50 transition-all flex justify-center items-center text-lg"
                   >
                      <RefreshCcw className="w-5 h-5 mr-2" /> Swap
                   </button>
                </div>
                </div>
              )}
           </div>
        </div>
      </div>
      
      {/* Reviews Section */}
      <div className="mt-20 border-t border-stone-200 pt-16">
         <h3 className="text-3xl font-bold text-stone-900 mb-10 font-heading">Community Trust</h3>
         <div className="grid md:grid-cols-2 gap-8">
            {owner.reviews.length > 0 ? owner.reviews.map(review => (
               <div key={review.id} className="bg-white p-8 rounded-[2rem] border border-stone-100 shadow-sm">
                  <div className="flex justify-between items-start mb-6">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-sm font-bold text-stone-600">
                           {review.reviewerName.charAt(0)}
                        </div>
                        <span className="font-bold text-stone-900">{review.reviewerName}</span>
                     </div>
                     <span className="text-xs font-bold text-stone-400 uppercase tracking-wide">{review.date}</span>
                  </div>
                  <StarRating rating={review.rating} />
                  <p className="text-stone-600 mt-4 text-base leading-relaxed">"{review.comment}"</p>
               </div>
            )) : (
              <div className="col-span-1 md:col-span-2 text-center py-10 bg-stone-50 rounded-[2rem]">
                 <p className="text-stone-400 italic font-medium">No reviews yet for this user.</p>
              </div>
            )}
         </div>
      </div>
    </div>
  );
};
