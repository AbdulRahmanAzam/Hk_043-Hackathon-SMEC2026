
import React, { useState } from 'react';
import { 
  LayoutGrid, 
  Plus, 
  RefreshCcw, 
  Menu,
  X,
  User as UserIcon,
  Clock,
  LogIn,
  History
} from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (t: string) => void;
  user: User | null;
  onLoginClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, user, onLoginClick }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Helper for the pill navigation
  const NavPill = ({ id, icon: Icon, label }: { id: string, icon: any, label: string }) => {
    const isActive = activeTab === id;
    return (
      <button 
        onClick={() => setActiveTab(id)}
        className={`
          relative flex items-center px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ease-out z-10
          ${isActive ? 'text-white' : 'text-stone-500 hover:text-stone-900 hover:bg-white/50'}
        `}
      >
        {isActive && (
          <div className="absolute inset-0 bg-stone-900 rounded-full shadow-lg shadow-stone-900/20 -z-10 animate-fade-in" />
        )}
        <Icon className={`w-4 h-4 mr-2 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} /> 
        {label}
      </button>
    );
  };

  return (
    <nav className="fixed top-0 inset-x-0 z-50 px-4 py-4 pointer-events-none">
      {/* Floating Island Container */}
      <div className="max-w-7xl mx-auto pointer-events-auto">
        <div className="bg-white/90 backdrop-blur-2xl border border-white/40 shadow-2xl shadow-stone-200/50 rounded-[2rem] px-4 md:px-6 h-20 flex items-center justify-between relative overflow-visible">
          
          {/* Logo Section */}
          <div className="flex items-center cursor-pointer group" onClick={() => setActiveTab('market')}>
            <div className="bg-stone-900 text-emerald-400 rounded-full p-2.5 mr-3 group-hover:rotate-180 transition-transform duration-700 ease-out shadow-lg shadow-stone-900/20">
              <RefreshCcw className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-stone-900 tracking-tight font-heading leading-none">SwapSync</span>
            </div>
          </div>
          
          {/* Desktop Navigation - Centered Pill */}
          <div className="hidden md:flex items-center bg-stone-100/80 p-1.5 rounded-full border border-stone-200/50 backdrop-blur-md absolute left-1/2 -translate-x-1/2 shadow-inner">
            <NavPill id="market" icon={LayoutGrid} label="Market" />
            <NavPill id="activity" icon={Clock} label="Activity" />
            <NavPill id="dashboard" icon={History} label="History" />
          </div>

          {/* Right Actions */}
          <div className="hidden md:flex items-center gap-3">
             <button 
               onClick={() => setActiveTab('add')}
               className="bg-emerald-500 hover:bg-emerald-400 text-stone-900 px-6 py-3 rounded-full text-sm font-bold flex items-center shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5 hover:shadow-emerald-500/40 group active:scale-95"
             >
               <Plus className="w-4 h-4 mr-2 stroke-[3px] group-hover:rotate-90 transition-transform" /> List Item
             </button>

             <div className="h-8 w-px bg-stone-200 mx-1"></div>

             {user ? (
               <div 
                 className="flex items-center gap-3 pl-1 pr-1 py-1 cursor-pointer hover:bg-stone-50 rounded-full transition-all border border-transparent hover:border-stone-100 group" 
                 onClick={() => setActiveTab('profile')}
               >
                  <div className="relative">
                    <img src={user.avatar} alt="Me" className="h-10 w-10 rounded-full object-cover ring-2 ring-stone-100 group-hover:ring-emerald-200 transition-all" />
                    <div className="absolute bottom-0 right-0 bg-emerald-500 w-3 h-3 rounded-full border-2 border-white"></div>
                  </div>
                  <div className="text-left hidden lg:block pr-2">
                    <p className="text-sm font-bold text-stone-900 leading-none group-hover:text-emerald-700 transition-colors">{user.name}</p>
                  </div>
               </div>
             ) : (
               <button 
                 onClick={onLoginClick}
                 className="flex items-center gap-2 px-5 py-3 rounded-full text-stone-600 font-bold hover:bg-stone-100 transition-colors"
               >
                 <LogIn className="w-4 h-4" /> Sign In
               </button>
             )}
          </div>

          {/* Mobile Toggle */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-3 rounded-full bg-stone-100 text-stone-900 hover:bg-stone-200 transition-colors"
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown - Detached style */}
      {isOpen && (
        <div className="max-w-7xl mx-auto mt-2 pointer-events-auto px-2 md:hidden relative z-50">
          <div className="bg-white/95 backdrop-blur-xl border border-white/50 rounded-[2rem] shadow-2xl overflow-hidden p-2 animate-in slide-in-from-top-4 fade-in duration-200">
             <div className="grid gap-1">
               {['market', 'activity', 'dashboard'].map((tab) => (
                 <button 
                   key={tab}
                   onClick={() => { setActiveTab(tab); setIsOpen(false); }} 
                   className={`
                     w-full text-left px-6 py-4 rounded-3xl font-bold flex items-center justify-between transition-colors
                     ${activeTab === tab ? 'bg-stone-900 text-white' : 'hover:bg-stone-50 text-stone-600'}
                   `}
                 >
                   <span className="flex items-center capitalize">
                       {tab === 'market' ? <LayoutGrid className="w-5 h-5 mr-3" /> :
                       tab === 'activity' ? <Clock className="w-5 h-5 mr-3" /> :
                       <History className="w-5 h-5 mr-3" />}
                      {tab === 'dashboard' ? 'History' : tab}
                   </span>
                   {activeTab === tab && <div className="w-2 h-2 rounded-full bg-emerald-400" />}
                 </button>
               ))}
               
               <div className="h-px bg-stone-100 my-1"></div>

               <button 
                 onClick={() => { setActiveTab('add'); setIsOpen(false); }}
                 className="w-full text-left px-6 py-4 rounded-3xl font-bold flex items-center text-emerald-600 hover:bg-emerald-50 transition-colors"
               >
                 <Plus className="w-5 h-5 mr-3" /> List New Item
               </button>

               {user ? (
                 <button 
                   onClick={() => { setActiveTab('profile'); setIsOpen(false); }}
                   className="w-full text-left px-6 py-4 rounded-3xl font-bold flex items-center text-stone-600 hover:bg-stone-50 transition-colors"
                 >
                    <UserIcon className="w-5 h-5 mr-3" /> Profile
                 </button>
               ) : (
                 <button 
                   onClick={() => { onLoginClick(); setIsOpen(false); }}
                   className="w-full text-left px-6 py-4 rounded-3xl font-bold flex items-center text-stone-600 hover:bg-stone-50 transition-colors"
                 >
                    <LogIn className="w-5 h-5 mr-3" /> Sign In
                 </button>
               )}
             </div>
          </div>
        </div>
      )}
    </nav>
  );
};
