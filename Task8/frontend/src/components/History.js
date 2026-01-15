import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaHistory, FaTimes, FaTrash, FaPlay } from 'react-icons/fa';
import axios from 'axios';

const History = ({ apiBase, onSelect, isOpen, onClose }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${apiBase}/api/history`);
        setHistory(res.data.history || []);
      } catch (error) {
        console.error('Failed to fetch history:', error);
      }
      setLoading(false);
    };

    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, apiBase]);

  const clearHistory = async () => {
    try {
      await axios.delete(`${apiBase}/api/history`);
      setHistory([]);
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  };

  const formatDate = (isoDate) => {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="history-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="history-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25 }}
          >
            <div className="history-header">
              <h2><FaHistory /> Recent Extractions</h2>
              <div className="history-actions">
                {history.length > 0 && (
                  <button className="clear-btn" onClick={clearHistory}>
                    <FaTrash /> Clear
                  </button>
                )}
                <button className="close-btn" onClick={onClose}>
                  <FaTimes />
                </button>
              </div>
            </div>

            <div className="history-content">
              {loading ? (
                <div className="history-loading">Loading...</div>
              ) : history.length === 0 ? (
                <div className="history-empty">
                  <p>No extraction history yet.</p>
                  <p>Extract lyrics from a YouTube video to see them here!</p>
                </div>
              ) : (
                <div className="history-list">
                  {history.map((item, index) => (
                    <motion.div
                      key={item.job_id}
                      className="history-item"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => onSelect(item)}
                    >
                      {item.video_info?.thumbnail && (
                        <img
                          src={item.video_info.thumbnail}
                          alt=""
                          className="history-thumb"
                        />
                      )}
                      <div className="history-info">
                        <h4>{item.video_info?.title || 'Unknown'}</h4>
                        <p>{item.video_info?.channel || ''}</p>
                        <div className="history-meta">
                          <span>{formatDate(item.timestamp)}</span>
                          {item.language?.name && (
                            <span className="history-lang">{item.language.name}</span>
                          )}
                        </div>
                      </div>
                      <button className="history-play">
                        <FaPlay />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default History;
