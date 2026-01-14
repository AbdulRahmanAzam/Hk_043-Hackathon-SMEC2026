
import React, { useState } from 'react';
import { Transaction, TransactionType, User } from '../types';
import { Calendar, RefreshCcw, CheckCircle, Clock, TrendingUp, ArrowRight } from 'lucide-react';

interface DashboardProps {
  transactions: Transaction[];
  currentUser: User;
  onViewTransaction?: (transaction: Transaction) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ transactions, currentUser, onViewTransaction }) => {
  const [filter, setFilter] = useState<'all' | 'rented' | 'bartered' | 'completed'>('all');

  // Get user's transactions (as borrower or lender)
  const userTransactions = transactions.filter(t => 
    t.borrowerId === currentUser.id || t.lenderId === currentUser.id
  );

  // Filter transactions
  const filteredTransactions = userTransactions.filter(t => {
    if (filter === 'all') return true;
    if (filter === 'rented') return t.type === TransactionType.RENTAL;
    if (filter === 'bartered') return t.type === TransactionType.BARTER;
    if (filter === 'completed') return t.status === 'COMPLETED';
    return true;
  });

  // Statistics
  const stats = {
    totalTransactions: userTransactions.length,
    completedTransactions: userTransactions.filter(t => t.status === 'COMPLETED').length,
    activeRentals: userTransactions.filter(t => t.status === 'ACTIVE' && t.type === TransactionType.RENTAL).length,
    totalBarters: userTransactions.filter(t => t.type === TransactionType.BARTER).length,
    totalEarnings: userTransactions
      .filter(t => t.lenderId === currentUser.id && t.type === TransactionType.RENTAL && t.status === 'COMPLETED')
      .reduce((sum, t) => {
        const daysRented = t.startDate && t.endDate 
          ? Math.ceil((new Date(t.endDate).getTime() - new Date(t.startDate).getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        return sum + ((t.pricePerDay || 0) * daysRented);
      }, 0)
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-emerald-100 text-emerald-800';
      case 'ACTIVE': return 'bg-blue-100 text-blue-800';
      case 'REQUESTED': return 'bg-amber-100 text-amber-800';
      case 'REJECTED': return 'bg-rose-100 text-rose-800';
      default: return 'bg-stone-100 text-stone-800';
    }
  };

  const getTransactionRole = (t: Transaction) => {
    if (t.borrowerId === currentUser.id) return 'Borrowed';
    if (t.lenderId === currentUser.id) return 'Lent';
    return 'Unknown';
  };

  return (
    <div className="max-w-6xl mx-auto animate-fade-in pb-20 px-4 sm:px-6 lg:px-8 pt-28 md:pt-32">
      
      {/* Statistics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-8 md:mb-12">
        <div className="bg-white rounded-[1rem] md:rounded-[1.5rem] p-4 md:p-6 border border-stone-100 shadow-sm">
          <div className="flex items-center justify-between mb-2 md:mb-3">
            <p className="text-[9px] md:text-xs font-bold text-stone-500 uppercase tracking-wider line-clamp-2">Total</p>
            <div className="p-1.5 md:p-2 bg-stone-100 rounded-lg shrink-0">
              <TrendingUp className="w-3 md:w-4 h-3 md:h-4 text-stone-600" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-stone-900">{stats.totalTransactions}</p>
        </div>

        <div className="bg-white rounded-[1rem] md:rounded-[1.5rem] p-4 md:p-6 border border-stone-100 shadow-sm">
          <div className="flex items-center justify-between mb-2 md:mb-3">
            <p className="text-[9px] md:text-xs font-bold text-stone-500 uppercase tracking-wider line-clamp-2">Complete</p>
            <div className="p-1.5 md:p-2 bg-emerald-100 rounded-lg shrink-0">
              <CheckCircle className="w-3 md:w-4 h-3 md:h-4 text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-emerald-600">{stats.completedTransactions}</p>
        </div>

        <div className="bg-white rounded-[1rem] md:rounded-[1.5rem] p-4 md:p-6 border border-stone-100 shadow-sm">
          <div className="flex items-center justify-between mb-2 md:mb-3">
            <p className="text-[9px] md:text-xs font-bold text-stone-500 uppercase tracking-wider line-clamp-2">Active</p>
            <div className="p-1.5 md:p-2 bg-blue-100 rounded-lg shrink-0">
              <Clock className="w-3 md:w-4 h-3 md:h-4 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-blue-600">{stats.activeRentals}</p>
        </div>

        <div className="bg-white rounded-[1rem] md:rounded-[1.5rem] p-4 md:p-6 border border-stone-100 shadow-sm">
          <div className="flex items-center justify-between mb-2 md:mb-3">
            <p className="text-[9px] md:text-xs font-bold text-stone-500 uppercase tracking-wider line-clamp-2">Earning</p>
            <div className="p-1.5 md:p-2 bg-violet-100 rounded-lg shrink-0">
              <TrendingUp className="w-3 md:w-4 h-3 md:h-4 text-violet-600" />
            </div>
          </div>
          <p className="text-lg md:text-3xl font-bold text-violet-600">Rs {stats.totalEarnings > 999 ? (stats.totalEarnings / 1000).toFixed(1) + 'K' : stats.totalEarnings}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 md:gap-3 mb-6 md:mb-8 overflow-x-auto pb-2 hide-scrollbar">
        {(['all', 'rented', 'bartered', 'completed'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 md:px-6 py-2 md:py-2.5 rounded-full text-xs md:text-sm font-bold whitespace-nowrap transition-all flex-shrink-0 ${
              filter === tab
                ? 'bg-stone-900 text-white shadow-md'
                : 'bg-white text-stone-600 border-2 border-stone-200 hover:border-stone-300'
            }`}
          >
            {tab === 'all' ? 'All' : 
             tab === 'rented' ? 'Rent' :
             tab === 'bartered' ? 'Barter' : 'Done'}
          </button>
        ))}
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] border border-stone-100 shadow-sm overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="p-8 md:p-16 text-center">
            <Calendar className="w-10 md:w-12 h-10 md:h-12 text-stone-300 mx-auto mb-3 md:mb-4" />
            <p className="text-stone-500 font-bold text-base md:text-lg mb-1 md:mb-2">No transactions found</p>
            <p className="text-stone-400 text-xs md:text-sm">Start renting or bartering items to build your history.</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {filteredTransactions.map((transaction) => {
              const isLender = transaction.lenderId === currentUser.id;
              const role = getTransactionRole(transaction);

              return (
                <div
                  key={transaction.id}
                  className="p-3 md:p-6 hover:bg-stone-50 transition-colors flex flex-col gap-3 md:gap-4 md:flex-row md:items-center md:justify-between"
                >
                  {/* Item Info */}
                  <div className="flex items-start gap-3 md:gap-4 flex-1 min-w-0">
                    <img
                      src={transaction.itemImage}
                      alt={transaction.itemTitle}
                      className="w-14 md:w-16 h-14 md:h-16 rounded-lg object-cover shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-stone-900 text-sm md:text-base truncate">{transaction.itemTitle}</p>
                      <p className="text-xs md:text-sm text-stone-500 mb-1.5 md:mb-2 line-clamp-1">
                        {role === 'Lent' ? `Lent to ${transaction.borrowerName}` : `Borrowed from ${transaction.lenderName}`}
                      </p>
                      <div className="flex flex-wrap gap-1.5 md:gap-2">
                        <span className={`px-2 md:px-2.5 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider ${
                          transaction.type === TransactionType.RENTAL ? 'bg-emerald-100 text-emerald-800' : 'bg-violet-100 text-violet-800'
                        }`}>
                          {transaction.type === TransactionType.RENTAL ? 'Rent' : 'Barter'}
                        </span>
                        <span className={`px-2 md:px-2.5 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider ${getStatusColor(transaction.status)}`}>
                          {transaction.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Price/Details - Mobile stacked */}
                  <div className="text-left md:text-right min-w-fit flex items-center justify-between md:flex-col">
                    {transaction.type === TransactionType.RENTAL && transaction.pricePerDay ? (
                      <>
                        <p className="text-sm md:text-lg font-bold text-stone-900">Rs {transaction.pricePerDay}</p>
                        <p className="text-[10px] md:text-xs text-stone-500">/day</p>
                      </>
                    ) : (
                      <p className="text-xs md:text-sm font-bold text-violet-600">Barter</p>
                    )}
                  </div>

                  {/* Action Button */}
                  {onViewTransaction && (
                    <button
                      onClick={() => onViewTransaction(transaction)}
                      className="w-full md:w-auto p-2.5 md:p-3 bg-stone-900 hover:bg-stone-800 text-white rounded-lg transition-colors flex items-center justify-center gap-2 text-sm md:text-base h-10 md:h-auto"
                    >
                      <ArrowRight className="w-3.5 md:w-4 h-3.5 md:h-4" />
                      <span className="font-bold">View</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
