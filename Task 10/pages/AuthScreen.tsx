
import React, { useState } from 'react';
import { RefreshCcw, User as UserIcon, Mail, Lock, MapPin, ArrowRight, Phone } from 'lucide-react';
import { User } from '../types';
import { MOCK_USERS } from '../services/mockData';

interface AuthScreenProps {
  onLogin: (user: User) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      const user = MOCK_USERS.find(u => u.email.toLowerCase() === email.toLowerCase()) 
                || MOCK_USERS.find(u => u.name.toLowerCase().includes(email.split('@')[0].toLowerCase())) 
                || MOCK_USERS[0];
      onLogin(user);
    } else {
      const newUser: User = {
        id: `user_${Date.now()}`,
        name: name,
        email: email,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
        trustScore: 50,
        itemsListed: 0,
        reviews: [],
        city: city || 'Unknown City',
        bio: 'Just joined SwapSync!',
        phoneNumber: phone,
        address: '',
        joinedAt: new Date().toISOString()
      };
      onLogin(newUser);
    }
  };

  return (
    <div className="p-6 md:p-10 w-full bg-white">
       {/* Compact Header */}
       <div className="text-center mb-6 md:mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-stone-100 rounded-2xl mb-4 shadow-sm">
             <RefreshCcw className="w-6 h-6 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-stone-900 font-heading">
             {isLogin ? 'Welcome Back' : 'Join SwapSync'}
          </h2>
          <p className="text-stone-500 text-sm mt-2">
             {isLogin ? 'Enter your details to access your account.' : 'Connect with your local sharing economy.'}
          </p>
       </div>
       
       <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
             <>
               <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider ml-1">Name</label>
                    <div className="relative">
                       <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                       <input 
                          required 
                          type="text" 
                          className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-stone-900 focus:ring-1 focus:ring-stone-900 outline-none transition-all font-medium text-sm"
                          placeholder="Jane"
                          value={name}
                          onChange={e => setName(e.target.value)}
                       />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider ml-1">City</label>
                    <div className="relative">
                       <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                       <input 
                          required 
                          type="text" 
                          className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-stone-900 focus:ring-1 focus:ring-stone-900 outline-none transition-all font-medium text-sm"
                          placeholder="Seattle"
                          value={city}
                          onChange={e => setCity(e.target.value)}
                       />
                    </div>
                  </div>
               </div>
               <div className="space-y-1">
                  <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider ml-1">Phone</label>
                  <div className="relative">
                     <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                     <input 
                        required 
                        type="tel" 
                        className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-stone-900 focus:ring-1 focus:ring-stone-900 outline-none transition-all font-medium text-sm"
                        placeholder="+1 (555) 000-0000"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                     />
                  </div>
                </div>
             </>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider ml-1">Email</label>
            <div className="relative">
               <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
               <input 
                  required 
                  type="email" 
                  className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-stone-900 focus:ring-1 focus:ring-stone-900 outline-none transition-all font-medium text-sm"
                  placeholder="jane@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
               />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider ml-1">Password</label>
            <div className="relative">
               <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
               <input 
                  required 
                  type="password" 
                  className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-stone-900 focus:ring-1 focus:ring-stone-900 outline-none transition-all font-medium text-sm"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
               />
            </div>
          </div>

          <button type="submit" className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg mt-4 flex items-center justify-center gap-2 group hover:-translate-y-0.5">
             {isLogin ? 'Sign In' : 'Create Account'}
             <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
       </form>

       <div className="mt-8 text-center pt-6 border-t border-stone-100">
          <p className="text-stone-500 font-medium text-sm">
             {isLogin ? "Don't have an account?" : "Already a member?"}{' '}
             <button 
                onClick={() => setIsLogin(!isLogin)}
                className="text-emerald-600 font-bold hover:underline"
             >
                {isLogin ? 'Sign Up' : 'Log In'}
             </button>
          </p>
       </div>
    </div>
  );
};
