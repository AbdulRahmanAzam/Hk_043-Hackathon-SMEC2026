import React, { useState, useEffect } from 'react';
import { User } from './types';
import * as api from './services/api';
import { socketService } from './services/socket';
import Auth from './components/Auth';
import Layout from './components/Layout';
import TaskBoard from './components/TaskBoard';
import Portfolio from './components/Portfolio';
import TaskDetail from './components/TaskDetail';
import { ToastProvider } from './components/ToastContainer';

// Simple Hash Router for SPA feel without server config
const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentRoute, setCurrentRoute] = useState<string>('home');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  useEffect(() => {
    // Check for existing token and fetch user
    const token = localStorage.getItem('token');
    if (token) {
      api.getCurrentUser()
        .then(currentUser => {
          setUser(currentUser);
          socketService.connect(token);
        })
        .catch(() => {
          // Token invalid, clear it
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        });
    }

    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash.startsWith('task/')) {
        setSelectedTaskId(hash.split('/')[1]);
        setCurrentRoute('task-detail');
      } else if (hash === 'portfolio') {
        setCurrentRoute('portfolio');
        setSelectedTaskId(null);
      } else {
        setCurrentRoute('home');
        setSelectedTaskId(null);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Initial check

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentRoute, selectedTaskId]);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    window.location.hash = '#';
  };

  const handleLogout = async () => {
    await api.logout();
    socketService.disconnect();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.hash = '#';
  };

  if (!user) {
    return (
      <ToastProvider>
        <Auth onLogin={handleLogin} />
      </ToastProvider>
    );
  }

  let content;
  switch (currentRoute) {
    case 'portfolio':
      content = <Portfolio user={user} onUserUpdate={setUser} />;
      break;
    case 'task-detail':
      content = selectedTaskId ? <TaskDetail taskId={selectedTaskId} currentUser={user} /> : <div>Task not found</div>;
      break;
    default:
      content = <TaskBoard currentUser={user} />;
      break;
  }

  return (
    <ToastProvider>
      <Layout user={user} onLogout={handleLogout}>
        <div 
          key={currentRoute + (selectedTaskId || '')} 
          className="animate-in fade-in slide-in-from-bottom-8 duration-500 ease-out fill-mode-both"
        >
          {content}
        </div>
      </Layout>
    </ToastProvider>
  );
};

export default App;