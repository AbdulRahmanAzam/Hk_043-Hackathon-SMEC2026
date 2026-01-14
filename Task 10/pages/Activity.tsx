
import React, { useState } from 'react';
import { Transaction, TransactionType, User, Review } from '../types';
import { Calendar, Clock, AlertCircle, ArrowRight, User as UserIcon, RefreshCcw, MessageCircle, Star, CheckCircle, X, Hourglass, ThumbsUp, ThumbsDown } from 'lucide-react';

interface ActivityProps {
  transactions: Transaction[];
  currentUser: User;
  onContactUser: (userId: string) => void;
  onCompleteTransaction?: (transactionId: string, review?: Review) => void;
  onApproveRequest?: (transactionId: string) => void;
  onRejectRequest?: (transactionId: string) => void;
}

export const Activity: React.FC<ActivityProps> = ({ transactions, currentUser, onContactUser, onCompleteTransaction, onApproveRequest, onRejectRequest }) => {
  const [view, setView] = useState<'borrowing' | 'lending'>('borrowing');
  const [reviewingTransaction, setReviewingTransaction] = useState<Transaction | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  // Filter transactions based on view
  const activeTransactions = transactions.filter(t => 
    t.status === 'ACTIVE' && (view === 'borrowing' ? t.borrowerId === currentUser.id : t.lenderId === currentUser.id)
  );
  
  const completedTransactions = transactions.filter(t => 
    t.status === 'COMPLETED' && (view === 'borrowing' ? t.borrowerId === currentUser.id : t.lenderId === currentUser.id)
  );

  // Pending requests - for the item owner to approve/reject
  const pendingRequests = transactions.filter(t => 
    t.status === 'REQUESTED' && t.lenderId === currentUser.id
  );

  // My requests - requests I've made that are waiting for approval
  const myRequests = transactions.filter(t => 
    t.status === 'REQUESTED' && t.borrowerId === currentUser.id
  );

  // Rejected requests
  const rejectedRequests = transactions.filter(t => 
    t.status === 'REJECTED' && t.borrowerId === currentUser.id
  );

  // Logic to calculate days
  const calculateTime = (startDateStr: string | undefined, endDateStr: string | undefined, price: number = 0) => {
    if (!startDateStr || !endDateStr) {
      return { totalDuration: 0, daysElapsed: 0, daysRemaining: 0, progress: 0, currentCost: 0, estimatedTotalCost: 0, isOverdue: false };
    }
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    const now = new Date();

    const totalDuration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const daysElapsed = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = totalDuration - daysElapsed;
    const progress = Math.min(Math.max((daysElapsed / totalDuration) * 100, 0), 100);
    
    // Cost logic
    const currentCost = Math.max(daysElapsed, 0) * price;
    const estimatedTotalCost = totalDuration * price;

    return { 
      totalDuration, 
      daysElapsed: Math.max(daysElapsed, 0), 
      daysRemaining, 
      progress,
      currentCost,
      estimatedTotalCost,
      isOverdue: daysRemaining < 0
    };
  };

  const handleReturnItem = (transaction: Transaction) => {
    setReviewingTransaction(transaction);
    setReviewRating(5);
    setReviewComment('');
  };

  const submitReview = () => {
    if (!reviewingTransaction || !onCompleteTransaction) return;
    
    const review: Review = {
      id: `review_${Date.now()}`,
      reviewerId: currentUser.id,
      reviewerName: currentUser.name,
      rating: reviewRating,
      comment: reviewComment,
      date: new Date().toISOString().split('T')[0]
    };
    
    onCompleteTransaction(reviewingTransaction.id, review);
    setReviewingTransaction(null);
  };

  const skipReview = () => {
    if (!reviewingTransaction || !onCompleteTransaction) return;
    onCompleteTransaction(reviewingTransaction.id);
    setReviewingTransaction(null);
  };

  // Star rating component
  const StarRating = ({ rating, onRate, interactive = false }: { rating: number, onRate?: (r: number) => void, interactive?: boolean }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => interactive && onRate?.(star)}
          className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
        >
          <Star 
            className={`w-6 h-6 ${star <= rating ? 'text-amber-400 fill-amber-400' : 'text-stone-300'}`} 
          />
        </button>
      ))}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto animate-fade-in pb-20 space-y-8 px-4 sm:px-6 lg:px-8 pt-28 md:pt-32">
      
      {/* Review Modal */}
      {reviewingTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-stone-900 font-heading">Leave a Review</h3>
              <button onClick={() => setReviewingTransaction(null)} className="p-2 hover:bg-stone-100 rounded-full">
                <X className="w-5 h-5 text-stone-500" />
              </button>
            </div>
            
            <div className="flex items-center gap-4 p-4 bg-stone-50 rounded-2xl mb-6">
              <img src={reviewingTransaction.itemImage} alt="" className="w-16 h-16 rounded-xl object-cover" />
              <div>
                <p className="font-bold text-stone-900">{reviewingTransaction.itemTitle}</p>
                <p className="text-sm text-stone-500">
                  {view === 'borrowing' ? `From ${reviewingTransaction.lenderName}` : `To ${reviewingTransaction.borrowerName}`}
                </p>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-3">Your Rating</label>
              <StarRating rating={reviewRating} onRate={setReviewRating} interactive />
            </div>

            <div className="mb-6">
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-3">Your Feedback</label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="How was your experience? (Optional)"
                className="w-full p-4 bg-stone-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-stone-900 outline-none transition-all resize-none h-28"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={skipReview}
                className="flex-1 py-4 border-2 border-stone-200 text-stone-600 font-bold rounded-2xl hover:bg-stone-50 transition-colors"
              >
                Skip
              </button>
              <button
                onClick={submitReview}
                className="flex-1 py-4 bg-stone-900 text-white font-bold rounded-2xl hover:bg-stone-800 transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" /> Submit Review
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
           <h1 className="text-3xl md:text-4xl font-bold text-stone-900 mb-2 font-heading">Active Swaps</h1>
           <p className="text-stone-500 text-base md:text-lg">Track items you are holding or lending out.</p>
        </div>
        
        {/* Toggle Switch */}
        <div className="bg-white p-1.5 rounded-full border border-stone-200 flex shadow-sm w-full md:w-auto overflow-x-auto">
           <button 
             onClick={() => setView('borrowing')}
             className={`flex-1 md:flex-none px-6 py-3 rounded-full text-sm font-bold transition-all whitespace-nowrap ${view === 'borrowing' ? 'bg-stone-900 text-white shadow-md' : 'text-stone-500 hover:text-stone-900'}`}
           >
             Borrowing ({transactions.filter(t => t.borrowerId === currentUser.id).length})
           </button>
           <button 
             onClick={() => setView('lending')}
             className={`flex-1 md:flex-none px-6 py-3 rounded-full text-sm font-bold transition-all whitespace-nowrap ${view === 'lending' ? 'bg-stone-900 text-white shadow-md' : 'text-stone-500 hover:text-stone-900'}`}
           >
             Lending ({transactions.filter(t => t.lenderId === currentUser.id).length})
           </button>
        </div>
      </div>

      {/* Pending Requests - Owner needs to approve */}
      {pendingRequests.length > 0 && (
        <div className="bg-amber-50 rounded-[2.5rem] p-6 md:p-8 border-2 border-amber-200">
          <h2 className="text-xl font-bold text-amber-900 mb-4 font-heading flex items-center gap-2">
            <Hourglass className="w-5 h-5 text-amber-600" /> Pending Requests ({pendingRequests.length})
          </h2>
          <p className="text-amber-700 text-sm mb-6">People want to borrow your items. Contact them and approve to start the rental.</p>
          <div className="space-y-4">
            {pendingRequests.map(t => (
              <div key={t.id} className="bg-white rounded-2xl p-5 border border-amber-100 shadow-sm">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                  <img src={t.itemImage} alt="" className="w-20 h-20 rounded-xl object-cover" />
                  <div className="flex-1">
                    <p className="font-bold text-stone-900 text-lg">{t.itemTitle}</p>
                    <p className="text-sm text-stone-500 mb-1">Requested by <span className="font-semibold text-stone-700">{t.borrowerName}</span></p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-lg">
                        {t.requestedDays || 7} days requested
                      </span>
                      {t.type === TransactionType.RENTAL && t.pricePerDay && (
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg">
                          Rs {t.pricePerDay}/day
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    <button
                      onClick={() => onContactUser(t.borrowerId)}
                      className="px-4 py-2.5 border-2 border-stone-200 text-stone-700 font-bold rounded-xl hover:bg-stone-50 transition-colors text-sm flex items-center justify-center gap-2"
                    >
                      <MessageCircle className="w-4 h-4" /> Contact
                    </button>
                    <button
                      onClick={() => onApproveRequest?.(t.id)}
                      className="px-4 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors text-sm flex items-center justify-center gap-2"
                    >
                      <ThumbsUp className="w-4 h-4" /> Approve
                    </button>
                    <button
                      onClick={() => onRejectRequest?.(t.id)}
                      className="px-4 py-2.5 bg-rose-500 text-white font-bold rounded-xl hover:bg-rose-600 transition-colors text-sm flex items-center justify-center gap-2"
                    >
                      <ThumbsDown className="w-4 h-4" /> Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My Requests - Waiting for owner approval */}
      {myRequests.length > 0 && (
        <div className="bg-blue-50 rounded-[2.5rem] p-6 md:p-8 border-2 border-blue-200">
          <h2 className="text-xl font-bold text-blue-900 mb-4 font-heading flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" /> My Requests ({myRequests.length})
          </h2>
          <p className="text-blue-700 text-sm mb-6">Waiting for the owner to approve your request.</p>
          <div className="space-y-4">
            {myRequests.map(t => (
              <div key={t.id} className="bg-white rounded-2xl p-5 border border-blue-100 shadow-sm">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                  <img src={t.itemImage} alt="" className="w-20 h-20 rounded-xl object-cover" />
                  <div className="flex-1">
                    <p className="font-bold text-stone-900 text-lg">{t.itemTitle}</p>
                    <p className="text-sm text-stone-500 mb-1">From <span className="font-semibold text-stone-700">{t.lenderName}</span></p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-lg">
                        {t.requestedDays || 7} days requested
                      </span>
                      {t.type === TransactionType.RENTAL && t.pricePerDay && (
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg">
                          Rs {t.pricePerDay}/day • Est. Rs {(t.pricePerDay * (t.requestedDays || 7))}
                        </span>
                      )}
                      <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-lg animate-pulse">
                        Awaiting Approval
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => onContactUser(t.lenderId)}
                    className="px-4 py-2.5 border-2 border-stone-200 text-stone-700 font-bold rounded-xl hover:bg-stone-50 transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" /> Contact Owner
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rejected Requests */}
      {rejectedRequests.length > 0 && (
        <div className="bg-rose-50 rounded-[2rem] p-6 border border-rose-200">
          <h2 className="text-lg font-bold text-rose-900 mb-4 font-heading flex items-center gap-2">
            <X className="w-5 h-5 text-rose-600" /> Rejected Requests
          </h2>
          <div className="space-y-3">
            {rejectedRequests.map(t => (
              <div key={t.id} className="bg-white rounded-xl p-4 border border-rose-100 flex items-center gap-4 opacity-75">
                <img src={t.itemImage} alt="" className="w-12 h-12 rounded-lg object-cover grayscale" />
                <div className="flex-1">
                  <p className="font-bold text-stone-700">{t.itemTitle}</p>
                  <p className="text-xs text-stone-500">Request was declined by {t.lenderName}</p>
                </div>
                <span className="px-3 py-1 bg-rose-100 text-rose-700 text-xs font-bold rounded-full">
                  Rejected
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Transactions List */}
      <div className="space-y-6">
        {activeTransactions.map(t => {
          const { daysElapsed, daysRemaining, progress, currentCost, estimatedTotalCost, isOverdue, totalDuration } = calculateTime(t.startDate, t.endDate, t.pricePerDay || 0);

          return (
            <div key={t.id} className="bg-white rounded-[2.5rem] p-6 md:p-8 border border-stone-100 shadow-lg hover:shadow-xl transition-shadow flex flex-col md:flex-row gap-6 md:gap-8 items-start relative overflow-hidden group">
               
               {/* Overdue/Status Badge */}
               {isOverdue && (
                 <div className="absolute top-0 right-0 bg-rose-500 text-white text-[10px] font-bold px-4 py-2 rounded-bl-2xl uppercase tracking-widest flex items-center z-10">
                    <AlertCircle className="w-3 h-3 mr-1" /> Overdue
                 </div>
               )}
               
               {/* Image */}
               <div className="w-full md:w-48 aspect-square rounded-[1.5rem] bg-stone-100 overflow-hidden shrink-0 shadow-inner">
                  <img src={t.itemImage} alt={t.itemTitle} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
               </div>

               {/* Content */}
               <div className="flex-1 w-full">
                  <div className="flex justify-between items-start mb-2">
                     <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${t.type === TransactionType.RENTAL ? 'bg-emerald-100 text-emerald-800' : 'bg-violet-100 text-violet-800'}`}>
                            {t.type}
                          </span>
                        </div>
                        <h3 className="text-xl md:text-2xl font-bold text-stone-900 font-heading leading-tight">{t.itemTitle}</h3>
                     </div>
                  </div>

                  {/* Partner Info */}
                  <div className="flex items-center gap-3 mb-6 p-3 bg-stone-50 rounded-2xl w-full md:w-fit border border-stone-100">
                     <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center shrink-0">
                        <UserIcon className="w-4 h-4 text-stone-500" />
                     </div>
                     <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">{view === 'borrowing' ? 'Owner' : 'Borrower'}</span>
                        <span className="text-sm font-bold text-stone-900">{view === 'borrowing' ? t.lenderName : t.borrowerName}</span>
                     </div>
                  </div>

                  {/* Progress & Time Logic */}
                  <div className="space-y-4">
                     <div className="flex justify-between text-sm font-medium mb-1">
                        <span className="text-stone-500 flex items-center text-xs md:text-sm"><Calendar className="w-4 h-4 mr-1.5" /> Started {new Date(t.startDate).toLocaleDateString()}</span>
                        <span className={`${isOverdue ? 'text-rose-500 font-bold' : 'text-stone-900 font-bold'} flex items-center text-xs md:text-sm`}>
                           <Clock className="w-4 h-4 mr-1.5" /> {isOverdue ? 'Action Required' : `${daysRemaining} days left`}
                        </span>
                     </div>
                     
                     <div className="h-4 bg-stone-100 rounded-full overflow-hidden border border-stone-200/50">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ease-out ${isOverdue ? 'bg-rose-500' : 'bg-stone-900'}`} 
                          style={{ width: `${isOverdue ? 100 : progress}%` }}
                        ></div>
                     </div>

                     {t.type === TransactionType.RENTAL && (
                       <div className="flex justify-between items-center pt-4 border-t border-dashed border-stone-200 mt-4">
                          <div className="flex flex-col">
                             <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Accumulated Cost</span>
                             <span className="text-lg md:text-xl font-bold text-stone-900">Rs {currentCost}</span>
                          </div>
                          <div className="text-right">
                             <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Est. Total</span>
                             <p className="text-sm font-bold text-stone-500">Rs {estimatedTotalCost} <span className="font-normal text-xs">({totalDuration} days)</span></p>
                          </div>
                       </div>
                     )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-3 mt-6">
                    {view === 'borrowing' ? (
                        <>
                          <button 
                             onClick={() => handleReturnItem(t)}
                             className="flex-1 bg-stone-900 text-white font-bold py-3.5 rounded-xl hover:bg-stone-800 transition-colors shadow-lg shadow-stone-200 text-sm md:text-base flex items-center justify-center gap-2"
                          >
                             <CheckCircle className="w-4 h-4" /> Return Item
                          </button>
                          <button 
                             onClick={() => onContactUser(t.lenderId)}
                             className="px-6 py-3.5 border-2 border-stone-200 font-bold rounded-xl hover:bg-stone-50 transition-colors flex items-center justify-center text-stone-700 text-sm md:text-base"
                          >
                             Contact Owner
                          </button>
                        </>
                    ) : (
                        <>
                          <button 
                             onClick={() => handleReturnItem(t)}
                             className="flex-1 bg-emerald-600 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-700 transition-colors shadow-lg text-sm md:text-base flex items-center justify-center gap-2"
                          >
                             <CheckCircle className="w-4 h-4" /> Mark as Returned
                          </button>
                          <button 
                             onClick={() => onContactUser(t.borrowerId)}
                             className="px-6 py-3.5 bg-white border-2 border-stone-200 text-stone-900 font-bold rounded-xl hover:bg-stone-50 transition-colors flex items-center justify-center text-sm md:text-base"
                          >
                             <MessageCircle className="w-4 h-4 mr-2" />
                             Contact {t.borrowerName.split(' ')[0]}
                          </button>
                        </>
                    )}
                  </div>
               </div>
            </div>
          );
        })}

        {activeTransactions.length === 0 && (
          <div className="bg-stone-50 rounded-[2.5rem] p-10 md:p-16 text-center border-2 border-dashed border-stone-200">
             <div className="bg-white p-4 rounded-full w-fit mx-auto mb-4 shadow-sm">
                <RefreshCcw className="w-8 h-8 text-stone-300" />
             </div>
             <p className="text-stone-500 font-bold text-lg mb-2">No active {view} transactions.</p>
             <p className="text-stone-400 text-sm">Head to the market to find items.</p>
          </div>
        )}
      </div>

      {/* Completed Transactions */}
      {completedTransactions.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-stone-900 mb-4 font-heading flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" /> Completed
          </h2>
          <div className="space-y-4">
            {completedTransactions.map(t => (
              <div key={t.id} className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100 flex items-center gap-4">
                <img src={t.itemImage} alt="" className="w-16 h-16 rounded-xl object-cover" />
                <div className="flex-1">
                  <p className="font-bold text-stone-900">{t.itemTitle}</p>
                  <p className="text-sm text-stone-500">
                    {view === 'borrowing' ? `From ${t.lenderName}` : `To ${t.borrowerName}`}
                  </p>
                </div>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full uppercase">
                  Completed
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
