
import React, { useState } from 'react';
import { User } from '../types';
import { ArrowRight, ShieldCheck, MapPin, Star, Phone, Mail, Lock } from 'lucide-react';

// Helper to calculate membership duration
const getMemberDuration = (dateStr?: string): string => {
  if (!dateStr) return '< 1y';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30));
  
  if (diffMonths < 1) return '< 1m';
  if (diffMonths < 12) return `${diffMonths}m`;
  const years = Math.floor(diffMonths / 12);
  return `${years}y`;
};

interface PublicProfileProps {
  user: User;
  onBack: () => void;
  showContactInfo: boolean;
}

export const PublicProfile: React.FC<PublicProfileProps> = ({ user, onBack, showContactInfo }) => {
  const StarRating = ({ rating }: { rating: number }) => (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star key={i} className={`w-4 h-4 ${i < rating ? 'text-amber-400 fill-amber-400' : 'text-stone-300'}`} />
      ))}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto animate-fade-in pb-20 px-4 sm:px-6 lg:px-8 pt-28 md:pt-32">
      {/* Header / Nav */}
      <div className="mb-6 md:mb-8">
        <button onClick={onBack} className="flex items-center text-sm font-bold text-stone-500 hover:text-stone-900 transition-colors bg-white px-4 py-2 rounded-full shadow-sm border border-stone-100 w-fit group">
          <ArrowRight className="w-4 h-4 rotate-180 mr-2 group-hover:-translate-x-1 transition-transform" /> Back
        </button>
      </div>

      <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-xl border border-stone-100 overflow-hidden relative">
        {/* Banner */}
        <div className="h-32 md:h-48 bg-stone-900 relative overflow-hidden">
           <div className="absolute inset-0 bg-gradient-to-br from-stone-800 to-stone-900 opacity-90"></div>
           <div className="absolute -bottom-10 -right-10 opacity-10">
              <ShieldCheck className="w-48 h-48 md:w-64 md:h-64 text-emerald-400 rotate-12" />
           </div>
        </div>

        {/* Profile Content */}
        <div className="px-6 md:px-12 pb-10 relative">
           {/* Avatar */}
           <div className="relative -mt-12 md:-mt-16 mb-6 inline-block">
              <img src={user.avatar} alt={user.name} className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white shadow-lg object-cover bg-stone-200" />
              <div className="absolute bottom-1 right-1 md:bottom-2 md:right-2 bg-emerald-500 text-white p-1 md:p-1.5 rounded-full border-2 border-white" title="Verified User">
                 <ShieldCheck className="w-3 h-3 md:w-4 md:h-4" />
              </div>
           </div>

           <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
              <div className="w-full">
                 <h1 className="text-3xl md:text-4xl font-bold text-stone-900 font-heading mb-2">{user.name}</h1>
                 <div className="flex flex-wrap items-center gap-4 text-stone-500 font-medium mb-6">
                    <span className="flex items-center text-sm md:text-base"><MapPin className="w-4 h-4 mr-1.5 text-stone-400" /> {user.city || 'San Francisco, CA'}</span>
                    <span className="hidden md:block w-1.5 h-1.5 rounded-full bg-stone-300"></span>
                    <span className="flex items-center text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md text-xs uppercase tracking-wide">Trust Score: {user.trustScore}</span>
                 </div>
                 
                 <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100 max-w-xl mb-8">
                    <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">About</h3>
                    <p className="text-stone-700 leading-relaxed text-sm md:text-base">{user.bio || `Hi, I'm ${user.name}! I love sharing items with the community.`}</p>
                 </div>
              </div>

              {/* Contact Actions */}
              <div className="flex flex-col gap-3 w-full lg:w-auto shrink-0">
                 {showContactInfo ? (
                    user.phoneNumber ? (
                      <a href={`tel:${user.phoneNumber}`} className="flex items-center justify-center px-8 py-4 bg-stone-900 text-white font-bold rounded-xl shadow-lg hover:bg-stone-800 transition-all hover:-translate-y-0.5 min-w-[200px]">
                          <Phone className="w-4 h-4 mr-3" /> Call Now
                      </a>
                    ) : null
                 ) : (
                    <div className="flex items-center justify-center px-8 py-4 bg-stone-100 text-stone-400 font-bold rounded-xl border border-stone-200 min-w-[200px] cursor-not-allowed select-none">
                       <Lock className="w-4 h-4 mr-3" /> Number Hidden
                    </div>
                 )}
                 
                 <a href={`mailto:${user.email}`} className="flex items-center justify-center px-8 py-4 bg-white border-2 border-stone-200 text-stone-900 font-bold rounded-xl hover:bg-stone-50 transition-all min-w-[200px]">
                    <Mail className="w-4 h-4 mr-3" /> Send Email
                 </a>
              </div>
           </div>

           {/* Stats & Reviews */}
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mt-8 pt-8 border-t border-stone-100">
              <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100/50">
                 <p className="text-3xl font-bold text-emerald-800 mb-1">{user.itemsListed}</p>
                 <p className="text-xs font-bold text-emerald-600/70 uppercase tracking-widest">Active Listings</p>
              </div>
              <div className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100/50">
                 <div className="flex items-center gap-2 mb-1">
                    <span className="text-3xl font-bold text-amber-900">{user.reviews.length > 0 ? (user.reviews.reduce((acc, r) => acc + r.rating, 0) / user.reviews.length).toFixed(1) : 'N/A'}</span>
                    {user.reviews.length > 0 && <StarRating rating={Math.round(user.reviews.reduce((acc, r) => acc + r.rating, 0) / user.reviews.length)} />}
                 </div>
                 <p className="text-xs font-bold text-amber-700/70 uppercase tracking-widest">{user.reviews.length} Reviews</p>
              </div>
              <div className="bg-violet-50/50 p-6 rounded-2xl border border-violet-100/50">
                 <p className="text-3xl font-bold text-violet-900 mb-1">{getMemberDuration(user.joinedAt)}</p>
                 <p className="text-xs font-bold text-violet-700/70 uppercase tracking-widest">Member Since</p>
              </div>
           </div>

           {/* Recent Reviews Preview */}
           <div className="mt-12">
              <h3 className="text-lg font-bold text-stone-900 mb-6 font-heading">Recent Feedback</h3>
              <div className="space-y-4">
                 {user.reviews.length > 0 ? user.reviews.map(review => (
                    <div key={review.id} className="flex gap-4 p-4 rounded-2xl hover:bg-stone-50 transition-colors">
                       <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center font-bold text-stone-500 text-sm shrink-0">
                          {review.reviewerName.charAt(0)}
                       </div>
                       <div>
                          <div className="flex items-center gap-2 mb-1">
                             <span className="font-bold text-stone-900 text-sm">{review.reviewerName}</span>
                             <StarRating rating={review.rating} />
                          </div>
                          <p className="text-sm text-stone-600">"{review.comment}"</p>
                          <span className="text-xs text-stone-400 mt-1 block">{review.date}</span>
                       </div>
                    </div>
                 )) : (
                    <p className="text-stone-400 italic text-sm">No reviews visible.</p>
                 )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
