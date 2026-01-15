import React from 'react';
import { motion } from 'framer-motion';
import { FaYoutube, FaRocket, FaCog } from 'react-icons/fa';

const URLInput = ({ url, setUrl, onSubmit, isProcessing, modelSize, setModelSize }) => {
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isProcessing) {
      onSubmit();
    }
  };

  return (
    <motion.section 
      className="input-section"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="input-card">
        <h2 className="section-title">
          <FaYoutube className="youtube-icon" /> Paste YouTube URL
        </h2>
        
        <div className="input-wrapper">
          <div className="input-container">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="https://youtube.com/watch?v=..."
              className="url-input"
              disabled={isProcessing}
            />
            <motion.button
              className="submit-btn"
              onClick={onSubmit}
              disabled={isProcessing}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isProcessing ? (
                <>
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <FaCog />
                  </motion.span>
                  Processing...
                </>
              ) : (
                <>
                  <FaRocket /> Extract Lyrics
                </>
              )}
            </motion.button>
          </div>
        </div>

        <div className="model-selector">
          <label className="model-label">
            <FaCog /> Whisper Model:
          </label>
          <div className="model-options">
            {['tiny', 'base', 'small', 'medium'].map((size) => (
              <motion.button
                key={size}
                className={`model-btn ${modelSize === size ? 'active' : ''}`}
                onClick={() => setModelSize(size)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={isProcessing}
              >
                {size.charAt(0).toUpperCase() + size.slice(1)}
                <span className="model-desc">
                  {size === 'tiny' && '(Fast)'}
                  {size === 'base' && '(Balanced)'}
                  {size === 'small' && '(Recommended)'}
                  {size === 'medium' && '(Accurate)'}
                </span>
              </motion.button>
            ))}
          </div>
        </div>

        <p className="input-hint">
          Supports YouTube video URLs (youtube.com/watch?v=... or youtu.be/...)
        </p>
      </div>
    </motion.section>
  );
};

export default URLInput;
