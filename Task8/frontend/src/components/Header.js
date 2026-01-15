import React from 'react';
import { motion } from 'framer-motion';
import { FaGithub, FaHistory, FaSun, FaMoon, FaKeyboard } from 'react-icons/fa';

const Header = ({ isDark, onThemeToggle, onHistoryOpen }) => {
  return (
    <header className="header">
      <motion.div 
        className="logo-section"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="logo">
          <motion.span 
            className="logo-icon"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            🎵
          </motion.span>
          <h1>LyricCloud</h1>
        </div>
        <p className="tagline">Extract lyrics from any YouTube song & create beautiful word clouds</p>
      </motion.div>

      <motion.nav 
        className="nav-links"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <motion.button
          className="nav-btn"
          onClick={onHistoryOpen}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="View history"
        >
          <FaHistory /> History
        </motion.button>
        
        <motion.button
          className="nav-btn theme-btn"
          onClick={onThemeToggle}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <FaSun /> : <FaMoon />}
        </motion.button>
        
        <div className="keyboard-hint" title="Keyboard shortcuts: Ctrl+Enter to submit, Ctrl+D to download, Esc to reset">
          <FaKeyboard />
        </div>
        
        <a 
          href="https://github.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className="nav-link"
        >
          <FaGithub /> GitHub
        </a>
      </motion.nav>
    </header>
  );
};

export default Header;
