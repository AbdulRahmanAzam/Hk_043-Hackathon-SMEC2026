import React from 'react';
import { Task, TaskStatus } from '../types';
import { Clock, DollarSign, Calendar, User, ArrowUpRight, MessageSquare, TrendingUp, AlertCircle } from 'lucide-react';

interface TaskCardProps {
  task: Task;
}

const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
  const isCompleted = task.status === TaskStatus.COMPLETED;
  const isInProgress = task.status === TaskStatus.IN_PROGRESS;
  const isOpen = task.status === TaskStatus.OPEN;

  // Calculate urgency based on deadline
  const daysUntilDeadline = Math.ceil((new Date(task.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const isUrgent = daysUntilDeadline <= 3 && daysUntilDeadline >= 0;
  const isPastDeadline = daysUntilDeadline < 0;

  return (
    <div 
      onClick={() => window.location.hash = `task/${task.id}`}
      className="group bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_-4px_rgba(6,81,237,0.1)] hover:shadow-[0_8px_30px_-12px_rgba(6,81,237,0.2)] hover:border-violet-100 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col relative overflow-hidden"
    >
      {/* Decorative colored top line */}
      <div className={`absolute top-0 left-0 w-full h-1 ${
        isCompleted ? 'bg-slate-300' : 
        isInProgress ? 'bg-blue-500' : 
        isUrgent ? 'bg-orange-500' : 
        'bg-violet-500'
      }`}></div>

      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-3 py-1 rounded-full bg-slate-50 border border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-500">
             {task.category}
          </div>
          {isUrgent && isOpen && (
            <div className="px-2 py-1 rounded-full bg-orange-50 border border-orange-200 text-[10px] font-bold uppercase tracking-wider text-orange-600 flex items-center gap-1 animate-pulse">
              <Clock className="w-3 h-3" /> Urgent
            </div>
          )}
        </div>
        {task.status !== TaskStatus.OPEN && (
           <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${
               isCompleted ? 'bg-slate-100 text-slate-600' : 'bg-blue-50 text-blue-600'
           }`}>
               {isCompleted ? 'Closed' : 'Active'}
           </span>
        )}
      </div>

      <h3 className="text-lg font-bold text-slate-900 mb-2 leading-tight group-hover:text-violet-700 transition-colors line-clamp-2">
        {task.title}
      </h3>
      
      <p className="text-sm text-slate-500 line-clamp-2 mb-6 flex-1">
        {task.description}
      </p>

      {/* Bids and Poster Info */}
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
        <div className="flex items-center gap-1">
          <User className="w-3.5 h-3.5" />
          <span className="font-medium">{task.posterName}</span>
        </div>
        {isOpen && task.bidsCount > 0 && (
          <>
            <span className="text-slate-300">•</span>
            <div className="flex items-center gap-1 text-violet-600 font-semibold">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{task.bidsCount} {task.bidsCount === 1 ? 'bid' : 'bids'}</span>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-50">
         <div className="flex flex-col">
             <span className="text-xs text-slate-400 font-medium mb-0.5">Budget</span>
             <div className="flex items-center gap-1">
               <DollarSign className="w-4 h-4 text-emerald-500" />
               <span className="text-xl font-extrabold text-slate-900 tracking-tight">{task.budget}</span>
             </div>
         </div>
         
         <div className="text-right">
           <span className="text-xs text-slate-400 font-medium block mb-0.5">Deadline</span>
           <div className={`flex items-center gap-1 text-xs font-semibold ${
             isPastDeadline ? 'text-red-600' : isUrgent ? 'text-orange-600' : 'text-slate-600'
           }`}>
              <Calendar className="w-3.5 h-3.5" />
              {task.deadline}
           </div>
         </div>
      </div>

      {/* Hover Arrow Indicator */}
      <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
          <ArrowUpRight className="w-4 h-4 text-violet-600" />
        </div>
      </div>
    </div>
  );
};

export default TaskCard;