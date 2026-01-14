import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import ErrorBoundary from './components/ErrorBoundary';
import UserProfile from './components/UserProfile';
import Scanner from './components/Scanner';
import QRDisplay from './components/QRDisplay';
import ConnectionsList from './components/ConnectionsList';
import { loadUser, saveUser, loadConnections, saveConnections } from './utils/storage';

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
    setScanning(true);
    setShowMyQR(false);
  };

  const handleDetected = (data) => {
    setScanning(false);
    // Expected format: qrconnect://user/{id}
    try {
      let id = data;
      if (data.startsWith('qrconnect://user/')) {
        id = data.replace('qrconnect://user/', '');
      }
      const newConn = {
        id: `conn_${Date.now()}`,
        name: `Friend ${id.slice(-6)}`,
        username: `@${id}`,
        connectedDate: new Date().toISOString().split('T')[0],
        avatar: id.slice(0,2).toUpperCase()
      };
      setConnections(prev => [newConn, ...prev]);
      alert(`Connected with ${newConn.name}`);
    } catch (e) {
      console.error('Failed to parse QR data', e);
      alert('Scanned data is invalid');
    }
  };

  const handleCancelScan = () => setScanning(false);

  const handleShowMyQR = () => {
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
          </div>

          <div className="action-buttons" role="group" aria-label="actions">
            <button className="action-btn scan-btn" onClick={handleStartScan} aria-label="Open scanner">📱 Scan QR Code</button>
            <button className="action-btn qr-btn" onClick={handleShowMyQR} aria-expanded={showMyQR} aria-controls="my-qr">🎫 My QR Code</button>
          </div>

          {scanning && (
            <section id="scanner" aria-live="polite">
              <Scanner onDetected={handleDetected} onCancel={handleCancelScan} />
            </section>
          )}

          {showMyQR && (
            <section id="my-qr">
              <QRDisplay user={currentUser} />
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