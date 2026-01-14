
import React, { useState } from 'react';
import { User } from '../types';
import { Camera, LogOut, ShieldCheck, User as UserIcon, MapPin, Phone, Home, Save } from 'lucide-react';

interface ProfileProps {
  user: User;
  onUpdate: (u: User) => void;
  onLogout: () => void;
}

export const Profile: React.FC<ProfileProps> = ({ user, onUpdate, onLogout }) => {
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    phoneNumber: user.phoneNumber || '',
    address: user.address || '',
    city: user.city || '',
    bio: user.bio || ''
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      onUpdate({ ...user, ...formData });
      setIsSaving(false);
    }, 800);
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in pb-20 px-4 sm:px-6 lg:px-8 pt-28 md:pt-32">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 md:mb-8 gap-3 md:gap-4">
        <div>
           <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-stone-900 mb-1 md:mb-2 font-heading">Settings</h1>
           <p className="text-stone-500 text-xs md:text-base lg:text-lg line-clamp-2">Manage your public persona and trust level.</p>
        </div>
        <button onClick={onLogout} className="text-rose-600 font-bold bg-rose-50 hover:bg-rose-100 px-4 md:px-6 py-2.5 md:py-3 rounded-lg md:rounded-xl transition-colors flex items-center justify-center border border-rose-100 shadow-sm w-full sm:w-auto text-sm md:text-base h-10 md:h-auto whitespace-nowrap">
           <LogOut className="w-3.5 md:w-4 h-3.5 md:h-4 mr-1.5 md:mr-2" /> Sign Out
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-4 md:space-y-6">
           <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-stone-100 p-4 md:p-6 lg:p-8 flex flex-col items-center text-center relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-20 md:h-24 bg-gradient-to-br from-emerald-600 to-teal-800"></div>
               
               <div className="relative group mb-3 md:mb-4 mt-6 md:mt-8">
                  <div className="w-24 md:w-32 h-24 md:h-32 rounded-full p-1 bg-white shadow-xl">
                    <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
                  </div>
                  <button className="absolute bottom-0 right-0 bg-stone-900 text-white p-2 md:p-2.5 rounded-full shadow-lg hover:scale-110 transition-transform cursor-pointer border-3 md:border-4 border-white">
                    <Camera className="w-3 md:w-4 h-3 md:h-4" />
                  </button>
               </div>
               
               <h3 className="text-lg md:text-2xl font-bold text-stone-900 font-heading mt-2">{user.name}</h3>
               <p className="text-xs md:text-sm text-stone-500 font-medium mb-4 md:mb-6 truncate px-2">{user.email}</p>
               
               <div className="grid grid-cols-2 gap-2 md:gap-3 w-full">
                  <div className="bg-stone-50 p-3 md:p-4 rounded-xl md:rounded-2xl border border-stone-100">
                     <p className="text-2xl md:text-3xl font-bold text-emerald-600 font-heading">{user.trustScore}</p>
                     <p className="text-[8px] md:text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-1">Trust Score</p>
                  </div>
                  <div className="bg-stone-50 p-3 md:p-4 rounded-xl md:rounded-2xl border border-stone-100">
                     <p className="text-2xl md:text-3xl font-bold text-stone-900 font-heading">{user.itemsListed}</p>
                     <p className="text-[8px] md:text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-1">Listings</p>
                  </div>
               </div>
           </div>

           <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-[2rem] p-6 md:p-8 border border-emerald-100">
              <h4 className="font-bold text-emerald-900 mb-4 flex items-center text-lg"><ShieldCheck className="w-6 h-6 mr-2" /> Verification</h4>
              <ul className="space-y-4">
                 <li className="flex items-center text-emerald-800 font-medium">
                    <div className="w-6 h-6 rounded-full bg-emerald-200 flex items-center justify-center mr-3"><span className="text-emerald-700 font-bold text-xs">✓</span></div>
                    Email Verified
                 </li>
                 <li className="flex items-center text-emerald-800 font-medium">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 transition-colors ${formData.phoneNumber ? 'bg-emerald-200' : 'bg-stone-200'}`}>
                      {formData.phoneNumber ? <span className="text-emerald-700 font-bold text-xs">✓</span> : <span className="text-stone-400 font-bold text-xs">-</span>}
                    </div>
                    <span className={formData.phoneNumber ? 'opacity-100' : 'opacity-50'}>Phone Verified</span>
                 </li>
              </ul>
           </div>
        </div>

        {/* Main Form */}
        <div className="lg:col-span-8">
           <form onSubmit={handleSave} className="bg-white rounded-[2rem] shadow-lg shadow-stone-200/40 border border-stone-100 overflow-hidden">
              <div className="p-6 md:p-10 border-b border-stone-100">
                 <h4 className="text-lg font-bold text-stone-900 mb-6 flex items-center"><UserIcon className="w-5 h-5 mr-2 text-stone-400" /> Personal Details</h4>
                 <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="group">
                         <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 group-focus-within:text-emerald-600 transition-colors">Full Name</label>
                         <input 
                           name="name"
                           type="text" 
                           value={formData.name} 
                           onChange={handleChange}
                           className="w-full px-5 py-4 bg-stone-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-medium text-stone-900"
                         />
                       </div>
                       <div className="group">
                         <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Email Address</label>
                         <input 
                           name="email"
                           type="email" 
                           value={formData.email} 
                           onChange={handleChange}
                           className="w-full px-5 py-4 bg-stone-50 border-2 border-transparent rounded-2xl outline-none transition-all text-stone-400 font-medium cursor-not-allowed"
                           readOnly
                         />
                       </div>
                    </div>
                    
                    <div className="group">
                         <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 group-focus-within:text-emerald-600 transition-colors">Bio</label>
                         <textarea 
                           name="bio"
                           rows={4}
                           placeholder="Share your interests, what you like to swap, or your sustainability goals..."
                           value={formData.bio} 
                           onChange={handleChange}
                           className="w-full px-5 py-4 bg-stone-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all resize-none font-medium text-stone-900 leading-relaxed"
                         />
                       </div>
                 </div>
              </div>

              <div className="p-6 md:p-10 bg-stone-50/30">
                 <h4 className="text-lg font-bold text-stone-900 mb-6 flex items-center"><MapPin className="w-5 h-5 mr-2 text-stone-400" /> Location & Contact</h4>
                 <div className="space-y-6">
                    <div className="group">
                         <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 group-focus-within:text-emerald-600 transition-colors">Phone Number</label>
                         <div className="relative">
                            <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                            <input 
                              name="phoneNumber"
                              type="tel" 
                              placeholder="+1 (555) 000-0000"
                              value={formData.phoneNumber} 
                              onChange={handleChange}
                              className="w-full pl-14 pr-5 py-4 bg-white border-2 border-stone-100 rounded-2xl focus:border-emerald-500 outline-none transition-all font-medium"
                            />
                         </div>
                       </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="group">
                         <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 group-focus-within:text-emerald-600 transition-colors">Street Address</label>
                         <div className="relative">
                            <Home className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                            <input 
                              name="address"
                              type="text" 
                              placeholder="123 Green St"
                              value={formData.address} 
                              onChange={handleChange}
                              className="w-full pl-14 pr-5 py-4 bg-white border-2 border-stone-100 rounded-2xl focus:border-emerald-500 outline-none transition-all font-medium"
                            />
                         </div>
                       </div>
                       <div className="group">
                         <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 group-focus-within:text-emerald-600 transition-colors">City, State</label>
                         <input 
                           name="city"
                           type="text" 
                           placeholder="San Francisco, CA"
                           value={formData.city} 
                           onChange={handleChange}
                           className="w-full px-5 py-4 bg-white border-2 border-stone-100 rounded-2xl focus:border-emerald-500 outline-none transition-all font-medium"
                         />
                       </div>
                    </div>
                 </div>
              </div>

              <div className="p-6 md:px-10 md:py-8 border-t border-stone-100 flex justify-end bg-stone-50/50">
                 <button 
                    type="submit" 
                    disabled={isSaving}
                    className="w-full md:w-auto bg-stone-900 text-white font-bold py-4 px-10 rounded-2xl hover:bg-stone-800 hover:-translate-y-0.5 transition-all shadow-xl shadow-stone-300 disabled:opacity-50 disabled:transform-none flex items-center justify-center text-lg"
                 >
                    {isSaving ? <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full mr-3"></div> : <Save className="w-5 h-5 mr-3" />}
                    {isSaving ? 'Saving Changes...' : 'Save Profile'}
                 </button>
              </div>
           </form>
        </div>
      </div>
    </div>
  );
};
