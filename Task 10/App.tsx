
import React, { useState } from 'react';
import { 
  ShieldCheck,
  RefreshCcw,
  X
} from 'lucide-react';
import { Item, User, Transaction, TransactionType } from './types';
import { MOCK_ITEMS, MOCK_TRANSACTIONS, MOCK_USERS } from './services/mockData';

// Import components
import { Navbar } from './components/Navbar';
import { Marketplace } from './pages/Marketplace';
import { Profile } from './pages/Profile';
import { PublicProfile } from './pages/PublicProfile';
import { AuthScreen } from './pages/AuthScreen';
import { AddItem } from './pages/AddItem';
import { Dashboard } from './pages/Dashboard';
import { ItemDetail } from './pages/ItemDetail';
import { Activity } from './pages/Activity';

// --- Main App Component ---

const App = () => {
  const [items, setItems] = useState<Item[]>(MOCK_ITEMS);
  const [transactions, setTransactions] = useState<Transaction[]>(MOCK_TRANSACTIONS);
  const [activeTab, setActiveTab] = useState('market');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  const myItems = currentUser 
    ? items.filter(i => i.ownerId === currentUser.id)
    : [];

  // --- Actions ---

  const handleNavigation = (tab: string) => {
    // Protected Routes Check
    if ((tab === 'activity' || tab === 'dashboard' || tab === 'add' || tab === 'profile') && !currentUser) {
       setShowAuthModal(true);
       return;
    }

    if (tab === activeTab) return;

    // Instant navigation without loading spinner
    setActiveTab(tab);
    setSelectedItem(null);
    setViewingUser(null);
    window.scrollTo(0, 0);
  };

  const handleAddItem = (newItem: Item) => {
    setItems([newItem, ...items]);
    handleNavigation('dashboard');
  };

  const handleUpdateItem = (updatedItem: Item) => {
    setItems(items.map(i => i.id === updatedItem.id ? updatedItem : i));
    setSelectedItem(updatedItem); 
  };

  const handleDeleteItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
    if (selectedItem?.id === id) {
      setSelectedItem(null);
    }
  };

  const handleCreateTransaction = (item: Item, type: TransactionType, requestedDays: number = 7) => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }

    // Prevent self-transaction
    if (item.ownerId === currentUser.id) {
      alert("You cannot rent or swap your own item!");
      return;
    }

    // Create a REQUEST (not active yet - owner needs to approve)
    const newTransaction: Transaction = {
      id: `tx_${Date.now()}`,
      itemId: item.id,
      itemTitle: item.title,
      itemImage: item.images[0],
      lenderId: item.ownerId,
      lenderName: item.ownerName,
      borrowerId: currentUser.id,
      borrowerName: currentUser.name,
      requestDate: new Date().toISOString(),
      status: 'REQUESTED',
      type: type,
      pricePerDay: type === TransactionType.RENTAL ? item.rentalPricePerDay : 0,
      requestedDays: requestedDays
    };

    setTransactions([newTransaction, ...transactions]);
    handleNavigation('activity');
  };

  const handleApproveRequest = (transactionId: string) => {
    setTransactions(transactions.map(t => {
      if (t.id === transactionId) {
        const startDate = new Date().toISOString();
        const endDate = new Date(Date.now() + (t.requestedDays || 7) * 24 * 60 * 60 * 1000).toISOString();
        return { ...t, status: 'ACTIVE' as const, startDate, endDate };
      }
      return t;
    }));
  };

  const handleRejectRequest = (transactionId: string) => {
    setTransactions(transactions.map(t => 
      t.id === transactionId ? { ...t, status: 'REJECTED' as const } : t
    ));
  };

  const handleCompleteTransaction = (transactionId: string, review?: { id: string; reviewerId: string; reviewerName: string; rating: number; comment: string; date: string }) => {
    // Update transaction status
    setTransactions(transactions.map(t => 
      t.id === transactionId ? { ...t, status: 'COMPLETED' as const } : t
    ));

    // Add review to the other party if provided
    if (review && currentUser) {
      const transaction = transactions.find(t => t.id === transactionId);
      if (transaction) {
        // Determine who to add the review for (the other party)
        const revieweeId = transaction.borrowerId === currentUser.id 
          ? transaction.lenderId 
          : transaction.borrowerId;
        
        // Update the MOCK_USERS array or user state with the new review
        // For now, we log it (in a real app, this would go to a database)
        console.log(`Review added for user ${revieweeId}:`, review);
      }
    }
  };

  const handleContactUser = (userId: string) => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }

    const user = MOCK_USERS.find(u => u.id === userId);
    if (user) {
      setViewingUser(user);
    }
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setShowAuthModal(false);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('market');
    setSelectedItem(null);
    setViewingUser(null);
  };

  // --- Rendering ---

  const renderContent = () => {
    // 1. Viewing another user's profile
    if (viewingUser) {
      const hasTransactionHistory = transactions.some(t => 
        (currentUser && t.lenderId === currentUser.id && t.borrowerId === viewingUser.id) ||
        (currentUser && t.borrowerId === currentUser.id && t.lenderId === viewingUser.id)
      );
      
      return (
        <PublicProfile 
           user={viewingUser} 
           onBack={() => setViewingUser(null)} 
           showContactInfo={hasTransactionHistory} 
        />
      );
    }

    // 2. Viewing Item Detail
    if (selectedItem) {
      return (
        <ItemDetail 
          item={selectedItem} 
          currentUser={currentUser || { id: 'guest', name: 'Guest', email: '', avatar: '', trustScore: 0, itemsListed: 0, reviews: [] }}
          onBack={() => setSelectedItem(null)} 
          onUpdate={handleUpdateItem}
          onDelete={() => handleDeleteItem(selectedItem.id)}
          onRent={(days) => handleCreateTransaction(selectedItem, TransactionType.RENTAL, days)}
          onSwap={() => handleCreateTransaction(selectedItem, TransactionType.BARTER)}
          onViewProfile={(userId) => handleContactUser(userId)}
          isEditable={false}
        />
      );
    }

    // 3. Tab Navigation
    switch (activeTab) {
      case 'market':
        return <Marketplace items={items} currentUser={currentUser} onItemClick={(item) => { setSelectedItem(item); window.scrollTo(0,0); }} />;
      case 'activity':
        return <Activity 
          transactions={transactions} 
          currentUser={currentUser!} 
          onContactUser={handleContactUser} 
          onCompleteTransaction={handleCompleteTransaction}
          onApproveRequest={handleApproveRequest}
          onRejectRequest={handleRejectRequest}
        />;
      case 'dashboard':
        return <Dashboard transactions={transactions} currentUser={currentUser!} />;
      case 'profile':
        return <Profile user={currentUser!} onUpdate={setCurrentUser} onLogout={handleLogout} />;
      case 'add':
        return <AddItem onAdd={handleAddItem} onCancel={() => handleNavigation('market')} currentUser={currentUser!} />;
      default:
        return <Marketplace items={items} currentUser={currentUser} onItemClick={setSelectedItem} />;
    }
  };

  // Construct a unique key for the animation wrapper to force re-render on view change
  const viewKey = viewingUser ? `user-${viewingUser.id}` : selectedItem ? `item-${selectedItem.id}` : `tab-${activeTab}`;

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#FAFAF9] font-sans selection:bg-emerald-200 selection:text-emerald-900 overflow-x-hidden">
      <style>{`
        @keyframes pageSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .page-enter {
          animation: pageSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
      
      {/* Auth Modal Overlay */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl animate-scale-in overflow-hidden">
             <button 
               onClick={() => setShowAuthModal(false)}
               className="absolute top-4 right-4 z-50 p-2 bg-stone-100 hover:bg-stone-200 rounded-full transition-colors"
             >
               <X className="w-5 h-5 text-stone-500" />
             </button>
             <AuthScreen onLogin={handleLogin} />
          </div>
        </div>
      )}

      <Navbar 
        activeTab={activeTab} 
        setActiveTab={handleNavigation} 
        user={currentUser} 
        onLoginClick={() => setShowAuthModal(true)}
      />
      
      <main className="flex-1 w-full">
        <div key={viewKey} className="page-enter">
          {renderContent()}
        </div>
      </main>

      <footer className="border-t border-stone-200 bg-white w-full mt-auto flex-shrink-0">
         <div className="max-w-7xl mx-auto px-4 py-16 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-3">
               <div className="bg-stone-900 p-2 rounded-xl">
                  <RefreshCcw className="w-5 h-5 text-white" />
               </div>
               <div>
                 <span className="font-bold text-stone-900 text-lg font-heading">SwapSync</span>
                 <p className="text-xs text-stone-500">© 2024</p>
               </div>
            </div>
            <div className="flex gap-8 text-stone-400">
               <ShieldCheck className="w-5 h-5 hover:text-emerald-600 cursor-pointer transition-colors" />
            </div>
         </div>
      </footer>
    </div>
  );
};

export default App;
