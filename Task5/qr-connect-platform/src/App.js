import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import ErrorBoundary from './components/ErrorBoundary';
import UserProfile from './components/UserProfile';
import QRScanner from './components/QRScanner/QRScanner';
import QRGenerator from './components/QRGenerator/QRGenerator';
import ConnectionsList from './components/ConnectionsList';
import { loadUser, saveUser, loadConnections, saveConnections } from './utils/storage';
import { parseQRPayload } from './utils/qrHelpers';
import toast, { Toaster } from 'react-hot-toast';

const sampleUser = {
  id: 'user_001',
  name: 'Alex Johnson',
  username: '@alexj',
  avatar: 'AJ',
  connections: 24
};

function App() {
  const [currentUser, setCurrentUser] = useState(() => loadUser() || sampleUser);
  const [connections, setConnectionsState] = useState(() => loadConnections());
  const [scanning, setScanning] = useState(false);
  const [showMyQR, setShowMyQR] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const onOnline = () => { setIsOnline(true); toast.success('You are online'); };
    const onOffline = () => { setIsOnline(false); toast.error('You are offline'); };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);
  useEffect(() => {
    saveUser(currentUser);
  }, [currentUser]);

  useEffect(() => {
    saveConnections(connections);
  }, [connections]);

  const setConnections = useCallback((updater) => {
    setConnectionsState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveConnections(next);
      return next;
    });
  }, []);

  const handleStartScan = () => {
    console.log('Start scan clicked');
    setScanning(true);
    setShowMyQR(false);
  };

  const handleDetected = (data) => {
    setScanning(false);
    try {
      const payload = parseQRPayload(data);
      let id, username, name;
      if (payload && (payload.userId || payload.id)) {
        id = payload.userId || payload.id;
        username = payload.username || `@${id}`;
        name = payload.name || `Friend ${String(id).slice(-6)}`;
      } else {
        // Fallback: accept legacy or raw id
        let raw = String(data || '');
        if (raw.startsWith('qrconnect://user/')) raw = raw.replace('qrconnect://user/', '');
        id = raw || `user_${Date.now()}`;
        username = `@${id}`;
        name = `Friend ${String(id).slice(-6)}`;
      }

      const newConn = {
        id: `conn_${Date.now()}`,
        name,
        username,
        connectedDate: new Date().toISOString(),
        avatar: String((username || '').slice(1,3)).toUpperCase()
      };
      setConnections(prev => [newConn, ...prev]);
      toast.success(`Connected with ${newConn.name}`);
    } catch (e) {
      console.error('Failed to handle scanned data', e);
      toast.error('Scanned data is invalid');
    }
  };

  const handleCancelScan = () => setScanning(false);

  const handleShowMyQR = () => {
    console.log('Show My QR clicked - previous:', showMyQR);
    setShowMyQR(s => !s);
    setScanning(false);
  };

  return (
    <ErrorBoundary>
      <div className="app">
        <header className="app-header">
          <div className="header-content">
            <h1>QR Connect</h1>
            <p className="tagline">Instant connections, no searching required</p>
          </div>
          <UserProfile user={currentUser} setUser={setCurrentUser} />
        </header>
        <Toaster position="top-right" />
        <main className="app-main">
          <div className="stats-card" role="region" aria-label="statistics">
            <div className="stat">
              <div className="stat-value">{connections.length}</div>
              <div className="stat-label">Connections</div>
            </div>
            <div className="stat">
              <div className="stat-value">{currentUser?.connections || 0}</div>
              <div className="stat-label">Total</div>
            </div>
            <div className="stat">
              <div className="stat-value" style={{fontSize:'0.9rem'}}>{isOnline ? 'Online' : 'Offline'}</div>
              <div className="stat-label">Network</div>
            </div>
          </div>

          <div className="action-buttons" role="group" aria-label="actions">
            <button className="action-btn scan-btn" onClick={handleStartScan} aria-label="Open scanner">📱 Scan QR Code</button>
            <button className="action-btn qr-btn" onClick={handleShowMyQR} aria-expanded={showMyQR} aria-controls="my-qr">🎫 My QR Code</button>
          </div>

          {scanning && (
            <section id="scanner" aria-live="polite">
              <QRScanner onDetected={handleDetected} onCancel={handleCancelScan} />
            </section>
          )}

          {showMyQR && (
            <section id="my-qr">
              <QRGenerator user={currentUser} />
            </section>
          )}

          <ConnectionsList connections={connections} setConnections={setConnections} />
        </main>

        <footer className="app-footer">
          <p>QR Connect © {new Date().getFullYear()} • Instant friend connections</p>
          <p className="footer-note">No usernames, no phone numbers, just scan and connect</p>
        </footer>
      </div>
    </ErrorBoundary>
  );
}

export default App;