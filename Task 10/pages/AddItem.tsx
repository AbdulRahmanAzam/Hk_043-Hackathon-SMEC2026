
import React, { useState } from 'react';
import { Item, User, ItemStatus, TransactionType } from '../types';
import { ArrowRight, Camera } from 'lucide-react';

interface AddItemProps {
  onAdd: (item: Item) => void;
  onCancel: () => void;
  currentUser: User;
}

export const AddItem: React.FC<AddItemProps> = ({ onAdd, onCancel, currentUser }) => {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState('Electronics');
  const [value, setValue] = useState('');
  const [rentalPrice, setRentalPrice] = useState('');
  const [wants, setWants] = useState('');
  const [imageUrl, setImageUrl] = useState(`https://picsum.photos/seed/${Math.random()}/800/600`);
  const [offerRental, setOfferRental] = useState(true);
  const [offerBarter, setOfferBarter] = useState(true);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const validate = () => {
    const newErrors: {[key: string]: string} = {};
    if (!title.trim()) newErrors.title = 'Item name is required';
    if (Number(value) <= 0) newErrors.value = 'Value must be greater than 0';
    if (offerRental && Number(rentalPrice) <= 0) newErrors.rentalPrice = 'Rental price must be greater than 0';
    if (!offerRental && !offerBarter) newErrors.type = 'Select at least one listing type';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    const transactionTypes: TransactionType[] = [];
    if (offerBarter) transactionTypes.push(TransactionType.BARTER);
    if (offerRental) transactionTypes.push(TransactionType.RENTAL);
    
    const newItem: Item = {
      id: `item_${Date.now()}`,
      ownerId: currentUser.id,
      ownerName: currentUser.name,
      title,
      description: desc,
      category,
      estimatedValue: Number(value),
      rentalPricePerDay: offerRental ? Number(rentalPrice) : undefined,
      wantedItems: wants,
      images: [imageUrl],
      status: ItemStatus.AVAILABLE,
      type: transactionTypes,
      createdAt: new Date().toISOString(),
      location: currentUser.city || 'Unknown'
    };
    onAdd(newItem);
  };

  return (
    <div className="max-w-4xl mx-auto pb-20 animate-fade-in px-4 sm:px-6 lg:px-8 pt-28 md:pt-32">
      <div className="mb-8 md:mb-10 flex items-center justify-between">
        <div>
           <button onClick={onCancel} className="text-stone-500 hover:text-stone-900 flex items-center text-sm font-bold mb-4 uppercase tracking-wider transition-colors group">
             <ArrowRight className="w-4 h-4 rotate-180 mr-2 group-hover:-translate-x-1 transition-transform" /> Cancel
           </button>
           <h2 className="text-3xl md:text-4xl font-bold text-stone-900 font-heading">List an Item</h2>
        </div>
      </div>
      
      <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-xl border border-stone-100 overflow-hidden">
        <div className="grid md:grid-cols-12 h-full">
           {/* Image Upload Area */}
           <div className="md:col-span-5 bg-stone-50 p-6 md:p-10 border-b md:border-b-0 md:border-r border-stone-100 flex flex-col items-center justify-center text-center">
              <div className="w-full aspect-square bg-white rounded-[2rem] border-2 border-dashed border-stone-200 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/30 transition-all group p-4 relative overflow-hidden shadow-sm">
                 <img src={imageUrl} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" alt="Preview" />
                 <div className="relative z-10 bg-white/90 p-4 rounded-full backdrop-blur-sm shadow-md group-hover:scale-110 transition-transform">
                   <Camera className="w-6 h-6 text-stone-400 group-hover:text-emerald-600" />
                 </div>
                 <p className="mt-4 text-xs font-bold text-stone-500 relative z-10 uppercase tracking-wide">Change Photo</p>
              </div>
              <p className="mt-6 text-sm text-stone-500 font-medium">Click to upload. Good lighting helps your item stand out.</p>
           </div>

           {/* Form */}
           <div className="md:col-span-7 p-6 md:p-10">
              <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-stone-900 uppercase tracking-wide">Item Name</label>
                  <input required placeholder="e.g. Nikon DSLR D3500" type="text" className="w-full px-5 py-4 bg-stone-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-stone-900 outline-none transition-all font-medium text-lg" value={title} onChange={e => setTitle(e.target.value)} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                   <div className="space-y-2">
                     <label className="block text-xs font-bold text-stone-900 uppercase tracking-wide">Category</label>
                     <select className="w-full px-5 py-4 bg-stone-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-stone-900 outline-none font-medium appearance-none cursor-pointer" value={category} onChange={e => setCategory(e.target.value)}>
                       <option>Electronics</option>
                       <option>Tools</option>
                       <option>Outdoors</option>
                       <option>Fashion</option>
                       <option>Home</option>
                     </select>
                   </div>
                   <div className="space-y-2">
                     <label className="block text-xs font-bold text-stone-900 uppercase tracking-wide">Est. Value (Rs)</label>
                     <input required type="number" min="1" placeholder="0.00" className={`w-full px-5 py-4 bg-stone-50 border-2 rounded-2xl focus:bg-white outline-none transition-all font-medium ${errors.value ? 'border-rose-500' : 'border-transparent focus:border-stone-900'}`} value={value} onChange={e => setValue(e.target.value)} />
                     {errors.value && <p className="text-rose-500 text-xs mt-1">{errors.value}</p>}
                   </div>
                </div>

                {/* Listing Type Selection */}
                <div className="space-y-4">
                   <label className="block text-xs font-bold text-stone-900 uppercase tracking-wide">Listing Type</label>
                   <div className="flex flex-wrap gap-4">
                      <label className={`flex items-center gap-3 px-5 py-4 rounded-2xl border-2 cursor-pointer transition-all ${offerBarter ? 'bg-violet-50 border-violet-500' : 'bg-stone-50 border-transparent hover:border-stone-200'}`}>
                        <input type="checkbox" checked={offerBarter} onChange={e => setOfferBarter(e.target.checked)} className="w-5 h-5 rounded accent-violet-600" />
                        <span className="font-bold text-stone-900">Open for Barter/Swap</span>
                      </label>
                      <label className={`flex items-center gap-3 px-5 py-4 rounded-2xl border-2 cursor-pointer transition-all ${offerRental ? 'bg-emerald-50 border-emerald-500' : 'bg-stone-50 border-transparent hover:border-stone-200'}`}>
                        <input type="checkbox" checked={offerRental} onChange={e => setOfferRental(e.target.checked)} className="w-5 h-5 rounded accent-emerald-600" />
                        <span className="font-bold text-stone-900">Available for Rent</span>
                      </label>
                   </div>
                   {errors.type && <p className="text-rose-500 text-xs">{errors.type}</p>}
                </div>

                {/* Rental Price - Only show if rental is selected */}
                {offerRental && (
                  <div className="space-y-2 animate-fade-in">
                    <label className="block text-xs font-bold text-stone-900 uppercase tracking-wide">Rental Price (Rs/day)</label>
                    <input type="number" min="1" placeholder="e.g. 500" className={`w-full px-5 py-4 bg-emerald-50 border-2 rounded-2xl focus:bg-white outline-none transition-all font-medium ${errors.rentalPrice ? 'border-rose-500' : 'border-emerald-200 focus:border-emerald-500'}`} value={rentalPrice} onChange={e => setRentalPrice(e.target.value)} />
                    {errors.rentalPrice && <p className="text-rose-500 text-xs mt-1">{errors.rentalPrice}</p>}
                  </div>
                )}

                <div className="space-y-2">
                   <label className="block text-xs font-bold text-stone-900 uppercase tracking-wide">Description</label>
                   <textarea required placeholder="Describe condition, age, and features..." className="w-full px-5 py-4 bg-stone-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-stone-900 outline-none transition-all h-32 resize-none font-medium leading-relaxed" value={desc} onChange={e => setDesc(e.target.value)} />
                </div>

                {/* Wanted Items - Only show if barter is selected */}
                {offerBarter && (
                  <div className="space-y-2 animate-fade-in">
                     <label className="block text-xs font-bold text-stone-900 uppercase tracking-wide">Open to trading for...</label>
                     <input type="text" placeholder="e.g. Camping Gear, Guitar Lessons (Optional)" className="w-full px-5 py-4 bg-violet-50 border-2 border-violet-200 rounded-2xl focus:bg-white focus:border-violet-500 outline-none transition-all font-medium" value={wants} onChange={e => setWants(e.target.value)} />
                  </div>
                )}

                <div className="pt-8 flex items-center justify-end gap-4 border-t border-stone-100">
                  <button type="submit" className="px-10 py-4 bg-stone-900 text-white font-bold rounded-2xl hover:bg-stone-800 transition-all hover:shadow-xl hover:-translate-y-0.5 w-full md:w-auto">Publish Listing</button>
                </div>
              </form>
           </div>
        </div>
      </div>
    </div>
  );
};
