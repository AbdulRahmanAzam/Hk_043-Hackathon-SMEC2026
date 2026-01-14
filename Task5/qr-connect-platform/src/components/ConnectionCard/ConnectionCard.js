import React from 'react';
import { formatDate } from '../../services/connectionService';

const ConnectionCard = ({ conn, onRemove, onView }) => {
  return (
    <li className="connection-card" role="listitem">
      <div className="avatar" aria-hidden>{conn.avatar}</div>
      <div className="meta">
        <div className="name" onClick={() => onView?.(conn)} style={{cursor:'pointer'}}>{conn.name}</div>
        <div className="username">{conn.username}</div>
        <div className="date">{formatDate(conn.connectedDate)}</div>
      </div>
      <div style={{display:'flex',gap:8,marginLeft:'auto'}}>
        <button className="remove-btn" onClick={() => onRemove(conn.id)} aria-label={`Remove ${conn.name}`}>Remove</button>
      </div>
    </li>
  );
};

export default ConnectionCard;