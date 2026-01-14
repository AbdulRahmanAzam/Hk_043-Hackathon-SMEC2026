import React, { useState, useEffect } from 'react';
import { Task, Bid, User, TaskStatus } from '../types';
import * as api from '../services/api';
import { socketService } from '../services/socket';
import { DollarSign, Clock, ArrowLeft, CheckCircle, User as UserIcon, Calendar, MessageSquare, Send, Shield, AlertCircle, TrendingUp, Award, Loader } from 'lucide-react';

interface TaskDetailProps {
  taskId: string;
  currentUser: User;
}

const TaskDetail: React.FC<TaskDetailProps> = ({ taskId, currentUser }) => {
  const [task, setTask] = useState<Task | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [bidSort, setBidSort] = useState<'lowest' | 'highest' | 'recent'>('lowest');
  
  const [bidAmount, setBidAmount] = useState('');
  const [bidTime, setBidTime] = useState('');
  const [bidMsg, setBidMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshData = async () => {
    try {
      const [taskData, bidsData] = await Promise.all([
        api.getTaskById(taskId),
        api.getTaskBids(taskId)
      ]);
      setTask(taskData);
      setBids(bidsData);
    } catch (error: any) {
      console.error('Failed to fetch task details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
    
    // Join task room for real-time updates
    socketService.joinTaskRoom(taskId);
    
    // Set up socket listeners
    const handleBidCreated = (data: { taskId: string; bid: Bid }) => {
      if (data.taskId === taskId) {
        setBids(prev => [data.bid, ...prev]);
      }
    };
    
    const handleTaskUpdated = (updatedTask: Partial<Task>) => {
      if (updatedTask.id === taskId) {
        setTask(prev => prev ? { ...prev, ...updatedTask } : null);
      }
    };
    
    socketService.on('bid:created', handleBidCreated);
    socketService.on('task:updated', handleTaskUpdated);
    
    return () => {
      socketService.leaveTaskRoom(taskId);
      socketService.off('bid:created', handleBidCreated);
      socketService.off('task:updated', handleTaskUpdated);
    };
  }, [taskId]);

  if (loading || !task) return (
    <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
    </div>
  );

  const isPoster = task.posterId === currentUser.id;
  const hasAlreadyBid = bids.some(b => b.bidderId === currentUser.id);
  const lowestBid = bids.length > 0 ? Math.min(...bids.map(b => b.amount)) : null;
  const averageBid = bids.length > 0 ? Math.round(bids.reduce((sum, b) => sum + b.amount, 0) / bids.length) : null;

  const handlePlaceBid = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bidAmount || !bidTime || !bidMsg) {
      alert('Please fill in all fields');
      return;
    }
    
    if (bidMsg.length < 20) {
      alert('Please provide a more detailed message (at least 20 characters)');
      return;
    }
    
    setSubmitting(true);
    try {
      await api.submitBid(task.id, {
        amount: Number(bidAmount),
        timeEstimate: bidTime,
        message: bidMsg,
      });
      setBidAmount('');
      setBidTime('');
      setBidMsg('');
      // Bid will be added via socket event
    } catch (error: any) {
      alert(error.message || 'Failed to place bid');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptBid = async (bid: Bid) => {
    if (!window.confirm(`Award this project to ${bid.bidderName}?`)) return;
    try {
      await api.acceptBid(task.id, bid.id);
      // Task status will update via socket event
    } catch (error: any) {
      alert(error.message || 'Failed to accept bid');
    }
  };

  const handleCompleteTask = async () => {
    if (!window.confirm("Confirm task completion?")) return;
    try {
      await api.completeTask(task.id);
      // Task status will update via socket event
    } catch (error: any) {
      alert(error.message || 'Failed to complete task');
    }
  };

  return (
    <div>
      <div className="mb-6">
        <button 
          onClick={() => window.location.hash = '#'}
          className="group flex items-center gap-3 px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-full shadow-sm hover:shadow-md hover:text-violet-700 hover:border-violet-100 transition-all"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Gig Board
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Main Content (Task Info + Bids) */}
        <div className="lg:col-span-8 space-y-8">
           <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
               <div className="flex items-center gap-3 mb-6">
                 <span className="px-3 py-1 rounded-full bg-violet-50 text-violet-700 text-xs font-bold uppercase tracking-wider">
                   {task.category}
                 </span>
                 <span className="text-slate-400 text-sm font-medium">Posted {new Date(task.createdAt).toLocaleDateString()}</span>
               </div>
               
               <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-6 leading-tight">{task.title}</h1>
               
               <div className="prose prose-slate prose-lg max-w-none mb-10 text-slate-600">
                 <p>{task.description}</p>
               </div>

               {/* Meta Data Grid */}
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                 <div>
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Budget</p>
                    <p className="text-xl font-bold text-slate-900 flex items-center">
                        <DollarSign className="w-4 h-4 text-emerald-500" />{task.budget}
                    </p>
                 </div>
                 <div>
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Deadline</p>
                    <p className="text-lg font-bold text-slate-900">{task.deadline}</p>
                 </div>
                 <div className="col-span-2">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Poster</p>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold">{task.posterName[0]}</div>
                        <p className="text-lg font-bold text-slate-900">{task.posterName}</p>
                    </div>
                 </div>
               </div>
           </div>

           {/* Action Banner for Poster */}
           {isPoster && task.status === TaskStatus.IN_PROGRESS && (
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                      <div className="p-3 bg-white/20 rounded-full">
                        <Clock className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg">Work in Progress</h4>
                        <p className="text-blue-100 text-sm">Your hired student is working. Mark as done when satisfied.</p>
                      </div>
                  </div>
                  <button 
                      onClick={handleCompleteTask}
                      className="bg-white text-blue-600 px-6 py-3 rounded-xl font-bold hover:bg-blue-50 transition-colors shadow-md"
                  >
                      Complete & Pay
                  </button>
              </div>
           )}
           
           {task.status === TaskStatus.COMPLETED && (
             <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 flex items-center gap-4">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
                <div>
                   <h4 className="text-lg font-bold text-emerald-900">Project Completed</h4>
                   <p className="text-emerald-700">Funds have been released.</p>
                </div>
             </div>
           )}

           {/* Bids Section */}
           <div>
             <div className="flex items-center justify-between mb-6">
               <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                 Proposals 
                 <span className="px-3 py-1 bg-violet-100 text-violet-700 rounded-xl text-sm font-bold">
                   {bids.length}
                 </span>
               </h3>
               
               {bids.length > 1 && (
                 <div className="flex items-center gap-2">
                   <span className="text-xs text-slate-500 font-medium">Sort by:</span>
                   <select
                     value={bidSort}
                     onChange={(e) => setBidSort(e.target.value as any)}
                     className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-violet-500/20"
                   >
                     <option value="lowest">Lowest Price</option>
                     <option value="highest">Highest Price</option>
                     <option value="recent">Most Recent</option>
                   </select>
                 </div>
               )}
             </div>

             {/* Bid Statistics */}
             {bids.length > 0 && (
               <div className="grid grid-cols-2 gap-4 mb-6">
                 <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                   <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Lowest Bid</p>
                   <p className="text-2xl font-black text-emerald-700">${lowestBid}</p>
                 </div>
                 <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                   <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Average Bid</p>
                   <p className="text-2xl font-black text-blue-700">${averageBid}</p>
                 </div>
               </div>
             )}
             
             <div className="space-y-4">
               {bids.length === 0 ? (
                 <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                   <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                   <p className="text-slate-400 font-medium">No bids yet. Be the first to apply!</p>
                 </div>
               ) : (
                 bids
                   .sort((a, b) => {
                     switch(bidSort) {
                       case 'highest': return b.amount - a.amount;
                       case 'recent': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                       case 'lowest':
                       default: return a.amount - b.amount;
                     }
                   })
                   .map((bid, index) => {
                     const isLowestBid = bid.amount === lowestBid;
                     const isSelected = task.status !== TaskStatus.OPEN && task.assignedToId === bid.bidderId;
                     
                     return (
                   <div key={bid.id} className={`bg-white border rounded-2xl p-6 transition-all ${
                     isSelected ? 'border-emerald-300 bg-emerald-50/30 ring-2 ring-emerald-200' :
                     isLowestBid ? 'border-violet-200 bg-violet-50/30' :
                     'border-slate-200 hover:shadow-md'
                   }`}>
                     <div className="flex justify-between items-start mb-4">
                       <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center font-bold text-lg">
                            {bid.bidderName[0]}
                         </div>
                         <div>
                           <div className="flex items-center gap-2">
                             <p className="font-bold text-slate-900">{bid.bidderName}</p>
                             {isLowestBid && !isSelected && (
                               <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-[10px] font-bold uppercase rounded flex items-center gap-1">
                                 <TrendingUp className="w-3 h-3" /> Best Price
                               </span>
                             )}
                           </div>
                           <p className="text-xs font-semibold text-slate-400">Applied {new Date(bid.createdAt).toLocaleDateString()}</p>
                         </div>
                       </div>
                       <div className="text-right">
                         <p className="text-xl font-black text-slate-900">${bid.amount}</p>
                         <p className="text-xs font-bold text-slate-500 flex items-center gap-1 justify-end">
                           <Clock className="w-3 h-3" />{bid.timeEstimate}
                         </p>
                       </div>
                     </div>
                     
                     <div className="bg-slate-50 p-4 rounded-xl text-slate-600 text-sm mb-4">
                        <p className="italic">"{bid.message}"</p>
                     </div>
                     
                     {isPoster && task.status === TaskStatus.OPEN && (
                         <div className="flex justify-end pt-2 border-t border-slate-100">
                             <button 
                                 onClick={() => handleAcceptBid(bid)}
                                 className="text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all hover:-translate-y-0.5 shadow-lg shadow-violet-500/20"
                             >
                                 <Award className="w-4 h-4" /> Accept & Hire
                             </button>
                         </div>
                     )}
                     {isSelected && (
                       <div className="flex justify-end">
                          <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-1.5">
                            <CheckCircle className="w-4 h-4" /> Selected Winner
                          </span>
                       </div>
                     )}
                   </div>
                     );
                   })
               )}
             </div>
           </div>
        </div>

        {/* Sidebar: Action Box */}
        <div className="lg:col-span-4">
          <div className="sticky top-24 space-y-6">
             {!isPoster && task.status === TaskStatus.OPEN && !hasAlreadyBid ? (
               <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 overflow-hidden relative">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 to-fuchsia-500"></div>
                 <h3 className="text-xl font-extrabold text-slate-900 mb-2">Submit Proposal</h3>
                 <p className="text-sm text-slate-500 mb-6">Stand out with a competitive price.</p>
                 
                 <form onSubmit={handlePlaceBid} className="space-y-4">
                    <div>
                      <label className="text-xs font-bold uppercase text-slate-400 mb-1 block">Your Bid Price</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                        <input 
                          required 
                          type="number" 
                          value={bidAmount} 
                          onChange={e => setBidAmount(e.target.value)} 
                          className="w-full pl-8 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all font-bold text-slate-900" 
                          placeholder="0"
                          min="1"
                        />
                      </div>
                      {lowestBid && bidAmount && Number(bidAmount) < lowestBid && (
                        <p className="text-xs text-emerald-600 font-semibold mt-1.5 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" /> Lowest bid so far!
                        </p>
                      )}
                      {lowestBid && (
                        <p className="text-xs text-slate-500 mt-1.5">Current lowest: ${lowestBid}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase text-slate-400 mb-1 block">Timeline</label>
                      <input required type="text" value={bidTime} onChange={e => setBidTime(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all font-medium" placeholder="e.g. 2 days" />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase text-slate-400 mb-1 block">Pitch</label>
                      <textarea 
                        required 
                        value={bidMsg} 
                        onChange={e => setBidMsg(e.target.value)} 
                        rows={4} 
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all font-medium resize-none" 
                        placeholder="Why you're the best fit for this task..."
                        minLength={20}
                      />
                      <p className="text-xs text-slate-400 mt-1">Min 20 characters</p>
                    </div>
                    <button 
                      type="submit" 
                      disabled={submitting}
                      className="w-full py-4 bg-violet-600 text-white rounded-xl font-bold hover:bg-violet-700 shadow-lg shadow-violet-500/25 hover:-translate-y-0.5 transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {submitting ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" /> Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" /> Send Bid
                        </>
                      )}
                    </button>
                 </form>
               </div>
             ) : (
               <div className="bg-slate-50 rounded-3xl border border-slate-200 p-8 text-center">
                 {isPoster ? (
                    <div className="flex flex-col items-center">
                        <Shield className="w-12 h-12 text-slate-300 mb-3" />
                        <h4 className="font-bold text-slate-900">Manage Your Gig</h4>
                        <p className="text-slate-500 text-sm mt-1">Review the proposals on the left to hire someone.</p>
                    </div>
                 ) : hasAlreadyBid ? (
                    <div className="flex flex-col items-center">
                       <CheckCircle className="w-12 h-12 text-emerald-500 mb-3" />
                       <h4 className="font-bold text-slate-900">Bid Sent</h4>
                       <p className="text-slate-500 text-sm mt-1">Good luck! You'll be notified if selected.</p>
                    </div>
                 ) : (
                    <div className="flex flex-col items-center">
                       <AlertCircle className="w-12 h-12 text-slate-300 mb-3" />
                       <h4 className="font-bold text-slate-900">Bidding Closed</h4>
                       <p className="text-slate-500 text-sm mt-1">This task is no longer accepting new proposals.</p>
                    </div>
                 )}
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetail;