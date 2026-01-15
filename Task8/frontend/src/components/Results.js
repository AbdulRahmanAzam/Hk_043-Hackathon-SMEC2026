import React from 'react';
import { motion } from 'framer-motion';
import { FaDownload, FaMusic, FaCloud, FaFileAlt, FaChartBar, FaRedo, FaHeart, FaGlobe, FaShare, FaCopy, FaFileCode } from 'react-icons/fa';
import { toast } from 'react-toastify';

const Results = ({ status, videoInfo, onDownload, onReset, apiBase, jobId }) => {
  const wordStats = status?.word_stats || {};
  const sentiment = status?.sentiment || {};
  const language = status?.language || {};
  const topWords = wordStats.top_words ? Object.entries(wordStats.top_words) : [];

  const copyToClipboard = () => {
    const lyrics = status?.lyrics || '';
    navigator.clipboard.writeText(lyrics);
    toast.success('📋 Lyrics copied to clipboard!');
  };

  const shareResults = async () => {
    const shareData = {
      title: videoInfo?.title || 'Song Lyrics',
      text: `Check out the lyrics for "${videoInfo?.title}"`,
      url: window.location.href
    };
    
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        toast.success('🔗 Shared successfully!');
      } catch (err) {
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  return (
    <section className="results-section">
      {/* Video Info Card */}
      {videoInfo && (
        <motion.div 
          className="video-info-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="video-info-content">
            {videoInfo.thumbnail && (
              <img 
                src={videoInfo.thumbnail} 
                alt="Video thumbnail" 
                className="video-thumbnail"
              />
            )}
            <div className="video-details">
              <h3 className="video-title">{videoInfo.title}</h3>
              <p className="video-channel">{videoInfo.channel}</p>
              <p className="video-duration">
                Duration: {Math.floor(videoInfo.duration / 60)}:{(videoInfo.duration % 60).toString().padStart(2, '0')}
              </p>
              {language?.name && (
                <p className="video-language">
                  <FaGlobe /> Language: <strong>{language.name}</strong>
                  {language.confidence && ` (${language.confidence}% confidence)`}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Word Cloud Card */}
      <motion.div 
        className="result-card wordcloud-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="card-header">
          <h3><FaCloud /> Word Cloud</h3>
          <motion.button 
            className="download-btn"
            onClick={() => onDownload('wordcloud')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaDownload /> Download PNG
          </motion.button>
        </div>
        <div className="wordcloud-container">
          <img 
            src={`${apiBase}/download/wordcloud/${jobId}`} 
            alt="Word Cloud" 
            className="wordcloud-image"
          />
        </div>
      </motion.div>

      {/* Stats Cards Row */}
      <div className="stats-row">
        {/* Word Statistics */}
        <motion.div 
          className="result-card stats-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3><FaChartBar /> Lyrics Statistics</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-value">{wordStats.total_words || 0}</span>
              <span className="stat-label">Total Words</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{wordStats.unique_words || 0}</span>
              <span className="stat-label">Unique Words</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{wordStats.vocabulary_richness || 0}%</span>
              <span className="stat-label">Vocabulary Richness</span>
            </div>
          </div>
        </motion.div>

        {/* Sentiment Analysis */}
        <motion.div 
          className="result-card sentiment-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3><FaHeart /> Sentiment Analysis</h3>
          <div className="sentiment-content">
            <div className={`sentiment-badge ${sentiment.label || 'neutral'}`}>
              {sentiment.label === 'positive' && '😊'}
              {sentiment.label === 'negative' && '😢'}
              {sentiment.label === 'neutral' && '😐'}
              <span>{(sentiment.label || 'neutral').toUpperCase()}</span>
            </div>
            <div className="sentiment-details">
              <p>Positive words: <strong>{sentiment.positive_count || 0}</strong></p>
              <p>Negative words: <strong>{sentiment.negative_count || 0}</strong></p>
              {sentiment.emotions && (
                <p>Mood: <strong>{sentiment.emotions.join(', ')}</strong></p>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Top Words */}
      {topWords.length > 0 && (
        <motion.div 
          className="result-card top-words-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h3><FaMusic /> Top Words</h3>
          <div className="top-words-container">
            {topWords.slice(0, 10).map(([word, count], index) => (
              <motion.div 
                key={word}
                className="word-chip"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.05 * index }}
                whileHover={{ scale: 1.1 }}
              >
                <span className="word-rank">#{index + 1}</span>
                <span className="word-text">{word}</span>
                <span className="word-count">{count}x</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Lyrics Card */}
      <motion.div 
        className="result-card lyrics-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="card-header">
          <h3><FaFileAlt /> Extracted Lyrics</h3>
          <div className="header-actions">
            <motion.button 
              className="download-btn"
              onClick={copyToClipboard}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Copy lyrics"
            >
              <FaCopy />
            </motion.button>
            <motion.button 
              className="download-btn"
              onClick={shareResults}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Share"
            >
              <FaShare />
            </motion.button>
            <motion.button 
              className="download-btn primary"
              onClick={() => onDownload('pdf')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FaDownload /> PDF
            </motion.button>
          </div>
        </div>
        <div className="lyrics-container">
          <pre className="lyrics-text">{status?.lyrics || 'No lyrics found'}</pre>
        </div>
      </motion.div>

      {/* Export Options */}
      <motion.div 
        className="result-card export-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
      >
        <h3><FaFileCode /> Export Options</h3>
        <div className="export-buttons">
          <motion.button 
            className="export-btn"
            onClick={() => onDownload('txt')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaFileAlt /> TXT
          </motion.button>
          <motion.button 
            className="export-btn"
            onClick={() => onDownload('json')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaFileCode /> JSON
          </motion.button>
          <motion.button 
            className="export-btn"
            onClick={() => onDownload('wordcloud')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaCloud /> PNG
          </motion.button>
          <motion.button 
            className="export-btn primary"
            onClick={() => onDownload('pdf')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaDownload /> PDF Report
          </motion.button>
        </div>
      </motion.div>

      {/* Action Buttons */}
      <motion.div 
        className="action-buttons"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <motion.button 
          className="new-extract-btn"
          onClick={onReset}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <FaRedo /> Extract Another Song
        </motion.button>
      </motion.div>
    </section>
  );
};

export default Results;
