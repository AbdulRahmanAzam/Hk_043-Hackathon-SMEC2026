import React, { useState, useMemo } from 'react';
import { saveConnections } from '../utils/storage';
import LoadingSpinner from './LoadingSpinner';
import { formatDate } from '../services/connectionService';
import ConnectionCard from './ConnectionCard/ConnectionCard';

const ConnectionsList = ({ connections, setConnections }) => {
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState('');

  const removeConnection = async (id) => {
    const ok = window.confirm('Remove this connection? This cannot be undone.');
    if (!ok) return;
    setLoading(true);
    try {
      setConnections(prev => {
        const next = prev.filter(c => c.id !== id);
        saveConnections(next);
        return next;
      });
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!query) return connections;
    const q = query.toLowerCase();
    return connections.filter(c => (c.name || '').toLowerCase().includes(q) || (c.username || '').toLowerCase().includes(q));
  }, [connections, query]);

  const list = showAll ? filtered : filtered.slice(0, 6);
  const [selected, setSelected] = useState(null);

  const exportCSV = () => {
    const rows = [['Name', 'Username', 'ConnectedDate']];
    connections.forEach(c => rows.push([c.name, c.username, c.connectedDate]));
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'connections.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section aria-label="Connections list" className="connections-list-component">
      <div className="connections-header" style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
        <h2>Recent Connections</h2>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <input placeholder="Search connections" value={query} onChange={e => setQuery(e.target.value)} aria-label="Search connections" />
          <button onClick={() => setShowAll(s => !s)} className="see-all-btn" aria-pressed={showAll}>{showAll ? 'Show Less' : 'See All'}</button>
          <button onClick={exportCSV} className="action-btn">Export CSV</button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : list.length === 0 ? (
        <div className="empty-state">
          <p>No connections yet</p>
        </div>
      ) : (
        <>
          <ul className="connections-list" aria-live="polite">
            {list.map(c => (
              <ConnectionCard key={c.id} conn={c} onRemove={removeConnection} onView={setSelected} />
            ))}
          </ul>

          {selected && (
            <div className="modal" role="dialog" aria-label="Connection details">
              <div className="modal-content">
                <h3>{selected.name}</h3>
                <p>{selected.username}</p>
                <p>{formatDate(selected.connectedDate)}</p>
                <button onClick={() => setSelected(null)}>Close</button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default ConnectionsList;
