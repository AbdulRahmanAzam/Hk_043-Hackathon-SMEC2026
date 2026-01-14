import React, { useState, useEffect } from 'react';
import { Task, User, TaskStatus } from '../types';
import * as api from '../services/api';
import { socketService } from '../services/socket';
import { Plus, Search, Filter, Sparkles, X, TrendingUp, Clock, DollarSign, Calendar } from 'lucide-react';
import TaskCard from './TaskCard';

interface TaskBoardProps {
  currentUser: User;
}

const TaskBoard: React.FC<TaskBoardProps> = ({ currentUser }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // newest, budget_high, budget_low, deadline
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newBudget, setNewBudget] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [newCategory, setNewCategory] = useState('General');

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await api.getTasks({ 
        sortBy,
        search: searchQuery || undefined,
        status: filter !== 'ALL' && filter !== 'MY_GIGS' ? filter : undefined
      });
      
      let tasksToDisplay = response.tasks;
      
      // Handle MY_GIGS filter client-side
      if (filter === 'MY_GIGS') {
        tasksToDisplay = tasksToDisplay.filter(task => task.posterId === currentUser.id);
      }
      
      setTasks(tasksToDisplay);
    } catch (error: any) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    
    // Set up socket listeners for real-time updates
    const handleTaskCreated = (task: Task) => {
      setTasks(prev => [task, ...prev]);
    };
    
    const handleTaskUpdated = (updatedTask: Partial<Task>) => {
      setTasks(prev => prev.map(task => 
        task.id === updatedTask.id ? { ...task, ...updatedTask } : task
      ));
    };
    
    const handleTaskDeleted = (data: { id: string }) => {
      setTasks(prev => prev.filter(task => task.id !== data.id));
    };
    
    socketService.on('task:created', handleTaskCreated);
    socketService.on('task:updated', handleTaskUpdated);
    socketService.on('task:deleted', handleTaskDeleted);
    
    return () => {
      socketService.off('task:created', handleTaskCreated);
      socketService.off('task:updated', handleTaskUpdated);
      socketService.off('task:deleted', handleTaskDeleted);
    };
  }, [sortBy, searchQuery, filter, currentUser.id]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createTask({
        title: newTitle,
        description: newDesc,
        budget: Number(newBudget),
        deadline: newDeadline,
        category: newCategory,
      });
      
      setIsModalOpen(false);
      setNewTitle('');
      setNewDesc('');
      setNewBudget('');
      setNewDeadline('');
      setNewCategory('General');
      
      // Task will be added via socket event
    } catch (error: any) {
      alert(error.message || 'Failed to create task');
    }
  };

  const filteredTasks = tasks
    .filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            task.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });

  return (
    <div className="space-y-8 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">Gig Board</h1>
          <p className="text-slate-500 mt-2 text-lg">
            Discover opportunities or find help around campus.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="group flex items-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-xl font-bold shadow-xl shadow-slate-900/10 hover:bg-slate-800 hover:-translate-y-0.5 transition-all"
        >
          <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
          <span>Post a Gig</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-2 sticky top-20 z-30">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for skills (e.g. 'design', 'moving')..."
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all outline-none font-medium text-slate-700"
          />
        </div>
        
        <div className="flex gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl">
             {[
               { id: 'ALL', label: 'All' },
               { id: 'OPEN', label: 'Active' },
               { id: 'MY_GIGS', label: 'My Posts' }
             ].map(tab => (
               <button
                 key={tab.id}
                 onClick={() => setFilter(tab.id)}
                 className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                   filter === tab.id 
                     ? 'bg-white text-violet-700 shadow-sm' 
                     : 'text-slate-500 hover:text-slate-700'
                 }`}
               >
                 {tab.label}
               </button>
             ))}
          </div>

          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none px-4 py-2.5 pr-10 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold border-none focus:ring-2 focus:ring-violet-500/20 outline-none cursor-pointer"
            >
              <option value="newest">🕒 Newest</option>
              <option value="budget_high">💰 Budget: High</option>
              <option value="budget_low">💸 Budget: Low</option>
              <option value="deadline">⏰ Deadline</option>
            </select>
            <TrendingUp className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-20 mb-4"></div>
              <div className="h-6 bg-slate-200 rounded w-3/4 mb-3"></div>
              <div className="h-4 bg-slate-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-slate-200 rounded w-2/3 mb-6"></div>
              <div className="flex justify-between pt-4 border-t border-slate-100">
                <div className="h-6 bg-slate-200 rounded w-16"></div>
                <div className="h-6 bg-slate-200 rounded w-24"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTasks.length > 0 ? (
            filteredTasks.map(task => (
              <TaskCard key={task.id} task={task} />
            ))
          ) : (
            <div className="col-span-full py-20 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                <Sparkles className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">No gigs found</h3>
              <p className="text-slate-500 mb-6">Try changing your search filters or be the first to post!</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-xl font-bold hover:bg-violet-700 transition-all"
              >
                <Plus className="w-5 h-5" />
                Post First Gig
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">Create New Gig</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <form onSubmit={handleCreateTask} className="p-8 space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-500">Task Title</label>
                <input required type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all font-medium" placeholder="What do you need help with?" />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-500">Details</label>
                <textarea required rows={3} value={newDesc} onChange={e => setNewDesc(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all font-medium resize-none" placeholder="Describe the requirements..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1.5">
                   <label className="text-xs font-bold uppercase text-slate-500">Budget ($)</label>
                   <input required type="number" value={newBudget} onChange={e => setNewBudget(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all font-medium" placeholder="50" />
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-xs font-bold uppercase text-slate-500">Category</label>
                   <select value={newCategory} onChange={e => setNewCategory(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all font-medium bg-white">
                     <option>General</option>
                     <option>Development</option>
                     <option>Design</option>
                     <option>Tutoring</option>
                     <option>Labor</option>
                   </select>
                 </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-500">Deadline</label>
                <input required type="date" value={newDeadline} onChange={e => setNewDeadline(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all font-medium" />
              </div>

              <button type="submit" className="w-full py-4 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl shadow-lg shadow-violet-500/20 transition-all mt-4">
                Publish Gig
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskBoard;