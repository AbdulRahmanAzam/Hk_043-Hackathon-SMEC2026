import React from 'react';
import { motion } from 'framer-motion';
import { FaHeart, FaGithub, FaLinkedin } from 'react-icons/fa';

const Footer = () => {
  return (
    <motion.footer 
      className="footer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
    >
      <div className="footer-content">
        <div className="footer-left">
          <p>
            Made with <FaHeart className="heart-icon" /> for SMEC 2026 Hackathon
          </p>
        </div>
        <div className="footer-center">
          <p>YouTube Lyrics Extractor & Word Cloud Generator</p>
        </div>
        <div className="footer-right">
          <motion.a 
            href="https://github.com" 
            target="_blank" 
            rel="noopener noreferrer"
            whileHover={{ scale: 1.2, color: '#6366f1' }}
          >
            <FaGithub />
          </motion.a>
          <motion.a 
            href="https://linkedin.com" 
            target="_blank" 
            rel="noopener noreferrer"
            whileHover={{ scale: 1.2, color: '#0077b5' }}
          >
            <FaLinkedin />
          </motion.a>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© 2025 Task 8 - All Rights Reserved</p>
      </div>
    </motion.footer>
  );
};

export default Footer;
