import React, { useState } from 'react';
import { saveConnections } from '../utils/storage';
import LoadingSpinner from './LoadingSpinner';

const ConnectionsList = ({ connections, setConnections }) => {
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const removeConnection = (id) => {
    const ok = window.confirm('Remove this connection? This cannot be undone.');
    if (!ok) return;
    setLoading(true);
    setTimeout(() => {
      setConnections(prev => {
        const next = prev.filter(c => c.id !== id);
        saveConnections(next);
        return next;
      });
      setLoading(false);
    }, 600);
  };

  const list = showAll ? connections : connections.slice(0, 4);

  return (
    <section aria-label="Connections list" className="connections-list-component">
      <div className="connections-header">
        <h2>Recent Connections</h2>
        <button onClick={() => setShowAll(s => !s)} className="see-all-btn" aria-pressed={showAll}>{showAll ? 'Show Less' : 'See All'}</button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : list.length === 0 ? (
        <div className="empty-state">
          <p>No connections yet</p>
        </div>
      ) : (
        <ul className="connections-list" aria-live="polite">
          {list.map(c => (
            <li key={c.id} className="connection-item">
              <div className="avatar" aria-hidden>{c.avatar}</div>
              <div className="meta">
                <div className="name">{c.name}</div>
                <div className="username">{c.username}</div>
                <div className="date">Connected on {c.connectedDate}</div>
              </div>
              <button className="remove-btn" onClick={() => removeConnection(c.id)} aria-label={`Remove ${c.name}`}>Remove</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default ConnectionsList;
