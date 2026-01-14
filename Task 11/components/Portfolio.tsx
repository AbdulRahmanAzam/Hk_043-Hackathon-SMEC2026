import React, { useEffect, useState } from 'react';
import { User, PortfolioItem } from '../types';
import * as api from '../services/api';
import { TrendingUp, Award, Briefcase, Star, Wallet, ArrowRight, LayoutGrid, Settings } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import ProfileEditModal from './ProfileEditModal';

interface PortfolioProps {
  user: User;
  onUserUpdate?: (updatedUser: User) => void;
}

const Portfolio: React.FC<PortfolioProps> = ({ user, onUserUpdate }) => {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [stats, setStats] = useState({
    totalEarned: 0,
    jobsCompleted: 0,
    avgEarningsPerJob: 0,
    averageRating: 0,
    reviewCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(user);

  const handleUserUpdate = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    if (onUserUpdate) {
      onUserUpdate(updatedUser);
    }
  };

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const data = await api.getPortfolio(currentUser.id);
        setItems(data.items);
        setStats(data.stats);
      } catch (error: any) {
        console.error('Failed to fetch portfolio:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPortfolio();
  }, [currentUser.id]);

  const highestPayout = items.length > 0 ? Math.max(...items.map(i => i.earned)) : 0;
  
  const chartData = items.map((item, idx) => ({
      name: `Job ${idx + 1}`,
      amount: item.earned,
      title: item.title
  }));

  const StatCard = ({ icon: Icon, label, value, subtext, colorClass }: any) => (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${colorClass}`}>
        <Icon className="w-6 h-6" />
      </div>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="text-3xl font-extrabold text-slate-900 mt-2">{value}</p>
      {subtext && <p className="text-xs text-slate-500 mt-1">{subtext}</p>}
    </div>
  );

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6 bg-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-violet-600 rounded-full mix-blend-screen filter blur-[80px] opacity-20 translate-x-1/3 -translate-y-1/3"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-600 rounded-full mix-blend-screen filter blur-[80px] opacity-10 -translate-x-1/3 translate-y-1/3"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6 w-full">
            <div className="relative">
                <img src={user.avatar} className="w-24 h-24 rounded-2xl border-4 border-slate-800 shadow-lg" alt="" />
                <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-slate-800">PRO</div>
            </div>
            <div className="flex-1">
                <h1 className="text-3xl font-extrabold mb-2">{user.name}</h1>
                <div className="flex flex-wrap gap-2 mb-3">
                    {user.skills.map(s => (
                        <span key={s} className="px-3 py-1 bg-white/10 rounded-lg text-xs font-medium backdrop-blur-sm border border-white/10">{s}</span>
                    ))}
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span className="font-bold">5.0</span>
                    <span className="text-slate-400">(0 reviews)</span>
                  </div>
                  <span className="text-slate-500">•</span>
                  <div className="text-slate-300">
                    Member since {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </div>
                </div>
            </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
            icon={Wallet} 
            label="Total Earnings" 
            value={`$${stats.totalEarned.toFixed(2)}`}
            subtext="Lifetime revenue"
            colorClass="bg-emerald-100 text-emerald-600" 
        />
        <StatCard 
            icon={Briefcase} 
            label="Jobs Completed" 
            value={stats.jobsCompleted}
            subtext="Tasks delivered"
            colorClass="bg-violet-100 text-violet-600" 
        />
        <StatCard 
            icon={TrendingUp} 
            label="Avg Per Job" 
            value={`$${stats.avgEarningsPerJob.toFixed(2)}`}
            subtext="Per project"
            colorClass="bg-blue-100 text-blue-600" 
        />
        <StatCard 
            icon={Award} 
            label="Success Rate" 
            value={`${stats.averageRating.toFixed(1)}/5.0`}
            subtext={`${stats.reviewCount} reviews`}
            colorClass="bg-yellow-100 text-yellow-600" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
            <div className="flex justify-between items-center mb-8">
                <h3 className="font-bold text-lg text-slate-900">Revenue Analytics</h3>
                <select className="bg-slate-50 border-none text-xs font-bold text-slate-500 rounded-lg py-1 px-3 outline-none">
                    <option>This Semester</option>
                </select>
            </div>
            <div className="h-64">
                {items.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" tick={false} axisLine={false} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                            <Tooltip 
                                cursor={{fill: '#f8fafc'}}
                                contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                            />
                            <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#7c3aed' : '#a78bfa'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
                      <p className="font-medium">No revenue data available yet.</p>
                      <button 
                        onClick={() => window.location.hash = '#'}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors"
                      >
                        <LayoutGrid className="w-4 h-4" /> Browse Active Gigs
                      </button>
                    </div>
                )}
            </div>
        </div>

        {/* History List */}
        <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm overflow-hidden flex flex-col">
            <h3 className="font-bold text-lg text-slate-900 mb-6">Recent History</h3>
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 max-h-80">
                {items.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-slate-400 text-sm mb-4">You haven't completed any jobs yet.</p>
                      <button 
                        onClick={() => window.location.hash = '#'}
                        className="w-full py-3 rounded-xl border-2 border-dashed border-slate-200 text-slate-500 font-bold text-sm hover:border-violet-500 hover:text-violet-600 transition-colors flex items-center justify-center gap-2"
                      >
                        Find your first gig <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                ) : (
                    items.map(item => (
                        <div key={item.taskId} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => window.location.hash = `task/${item.taskId}`}>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                    <TrendingUp className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-900 line-clamp-1">{item.title}</p>
                                    <p className="text-xs text-slate-400">{new Date(item.completedAt).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <span className="text-sm font-bold text-emerald-600">+${item.earned}</span>
                        </div>
                    ))
                )}
            </div>
        </div>
      </div>

      <ProfileEditModal
        user={currentUser}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onUpdate={handleUserUpdate}
      />
    </div>
  );
};

export default Portfolio;