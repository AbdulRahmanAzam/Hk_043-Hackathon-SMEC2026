import React from 'react';
import { User } from '../types';
import { LayoutGrid, UserCircle, LogOut, Hexagon } from 'lucide-react';

interface LayoutProps {
  user: User;
  onLogout: () => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ user, onLogout, children }) => {
  const currentHash = window.location.hash || '#';
  
  // Active state logic: Home is active on root, #home, or #task/...
  const isHomeActive = currentHash === '#' || currentHash === '#home' || currentHash.startsWith('#task/');
  const isPortfolioActive = currentHash === '#portfolio';

  const NavItem = ({ href, icon: Icon, label, isActive }: any) => (
    <a
      href={href}
      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
        isActive 
          ? 'bg-violet-100 text-violet-700' 
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
      {label}
    </a>
  );

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-lg bg-white/80 border-b border-slate-200/60 supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            
            {/* Logo */}
            <div 
              className="flex items-center gap-2 cursor-pointer group" 
              onClick={() => window.location.hash = '#'}
            >
              <div className="relative">
                <Hexagon className="w-8 h-8 text-violet-600 fill-violet-600 group-hover:scale-110 transition-transform duration-300" />
                <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-xs">B</span>
              </div>
              <span className="font-extrabold text-xl tracking-tight text-slate-900 group-hover:text-violet-700 transition-colors">
                BidYourSkill
              </span>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-2">
              <NavItem 
                href="#" 
                icon={LayoutGrid} 
                label="Explore Gigs" 
                isActive={isHomeActive} 
              />
              <NavItem 
                href="#portfolio" 
                icon={UserCircle} 
                label="My Profile" 
                isActive={isPortfolioActive} 
              />
            </nav>

            {/* User Profile / Actions */}
            <div className="flex items-center gap-4">
              <a 
                href="#portfolio"
                className="flex items-center gap-3 group cursor-pointer"
                title="Go to Profile"
              >
                <div className="hidden sm:flex flex-col items-end mr-1">
                  <span className="text-sm font-bold text-slate-900 leading-none group-hover:text-violet-700 transition-colors">{user.name}</span>
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mt-1">Student</span>
                </div>
                
                <div className={`h-10 w-10 rounded-full p-0.5 bg-gradient-to-tr ${isPortfolioActive ? 'from-violet-600 to-emerald-500 scale-105 shadow-md' : 'from-violet-500 to-emerald-400'} transition-all duration-200`}>
                  <img
                    className="h-full w-full rounded-full border-2 border-white object-cover"
                    src={user.avatar}
                    alt={user.name}
                  />
                </div>
              </a>

              <div className="h-6 w-px bg-slate-200 mx-1"></div>

              <button
                onClick={onLogout}
                className="p-2 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Mobile Bottom Bar */}
      <div className="md:hidden fixed bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-slate-100 p-2 z-[60] flex justify-around items-center">
         <a 
           href="#" 
           className={`flex flex-col items-center p-2 rounded-xl w-16 transition-all ${isHomeActive ? 'text-violet-600 bg-violet-50' : 'text-slate-400'}`}
         >
           <LayoutGrid className="w-6 h-6" />
         </a>
         <div className="w-px h-8 bg-slate-200"></div>
         <a 
           href="#portfolio" 
           className={`flex flex-col items-center p-2 rounded-xl w-16 transition-all ${isPortfolioActive ? 'text-violet-600 bg-violet-50' : 'text-slate-400'}`}
         >
           <UserCircle className="w-6 h-6" />
         </a>
      </div>
    </div>
  );
};

export default Layout;