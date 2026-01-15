import React from 'react';
import { motion } from 'framer-motion';
import { FaSpinner, FaMusic, FaCheck, FaClock, FaDownload, FaWifi } from 'react-icons/fa';

const ProcessingStatus = ({ status, videoInfo }) => {
  const stages = [
    { key: 'downloading', label: 'Downloading Audio', icon: FaMusic },
    { key: 'transcribing', label: 'Transcribing Lyrics', icon: FaSpinner },
    { key: 'processing', label: 'Analyzing Words', icon: FaSpinner },
    { key: 'generating', label: 'Creating Word Cloud', icon: FaSpinner },
    { key: 'complete', label: 'Complete!', icon: FaCheck },
  ];

  // Get status message from status object
  const statusMessage = status?.message || status?.status || 'Initializing...';
  const downloadProgress = status?.download_progress;

  const getCurrentStageIndex = () => {
    const statusLower = (statusMessage || '').toLowerCase();
    if (statusLower.includes('download')) return 0;
    if (statusLower.includes('transcrib')) return 1;
    if (statusLower.includes('process') || statusLower.includes('analyz')) return 2;
    if (statusLower.includes('generat') || statusLower.includes('cloud')) return 3;
    if (statusLower.includes('complete') || statusLower.includes('done')) return 4;
    return 0;
  };

  const currentIndex = getCurrentStageIndex();
  
  // Calculate progress based on stage (0-100%)
  const progress = Math.min(((currentIndex + 1) / stages.length) * 100, 95);

  return (
    <motion.section 
      className="processing-section"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Video Preview */}
      {videoInfo && (
        <motion.div 
          className="processing-video-info"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          {videoInfo.thumbnail && (
            <img 
              src={videoInfo.thumbnail} 
              alt="Video thumbnail" 
              className="processing-thumbnail"
            />
          )}
          <div className="processing-video-details">
            <h3>{videoInfo.title}</h3>
            <p>{videoInfo.channel}</p>
          </div>
        </motion.div>
      )}

      {/* Processing Status Card */}
      <motion.div 
        className="processing-card"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        {/* Animated Loader */}
        <div className="loader-container">
          <motion.div 
            className="loader-ring"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <div className="ring-outer" />
            <div className="ring-inner" />
          </motion.div>
          <motion.div 
            className="loader-center"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <FaMusic />
          </motion.div>
        </div>

        {/* Status Text */}
        <motion.h2 
          className="processing-title"
          key={statusMessage}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {statusMessage}
        </motion.h2>

        {/* Progress Bar */}
        <div className="progress-container">
          <div className="progress-bar">
            <motion.div 
              className="progress-fill"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <span className="progress-text">{Math.round(progress)}%</span>
        </div>

        {/* Download Progress Details */}
        {downloadProgress && (
          <motion.div 
            className="download-details"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="download-stats">
              <div className="download-stat">
                <FaDownload className="stat-icon" />
                <div className="stat-info">
                  <span className="stat-label">Progress</span>
                  <span className="stat-value">{downloadProgress.percent}%</span>
                </div>
              </div>
              
              <div className="download-stat">
                <FaWifi className="stat-icon" />
                <div className="stat-info">
                  <span className="stat-label">Speed</span>
                  <span className="stat-value">{downloadProgress.speed}</span>
                </div>
              </div>
              
              <div className="download-stat">
                <FaClock className="stat-icon" />
                <div className="stat-info">
                  <span className="stat-label">Time Left</span>
                  <span className="stat-value">{downloadProgress.eta}</span>
                </div>
              </div>
              
              <div className="download-stat">
                <FaMusic className="stat-icon" />
                <div className="stat-info">
                  <span className="stat-label">Size</span>
                  <span className="stat-value">
                    {downloadProgress.downloaded_mb}/{downloadProgress.total_mb} MB
                  </span>
                </div>
              </div>
            </div>
            
            {/* Download Progress Bar */}
            <div className="download-progress-bar">
              <motion.div 
                className="download-progress-fill"
                initial={{ width: 0 }}
                animate={{ width: `${downloadProgress.percent}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>
        )}

        {/* Stage Indicators */}
        <div className="stages-container">
          {stages.map((stage, index) => {
            const isComplete = index < currentIndex;
            const isCurrent = index === currentIndex;
            
            return (
              <motion.div 
                key={stage.key}
                className={`stage-item ${isComplete ? 'complete' : ''} ${isCurrent ? 'current' : ''}`}
                initial={{ opacity: 0.5 }}
                animate={{ 
                  opacity: isCurrent || isComplete ? 1 : 0.5,
                  scale: isCurrent ? 1.05 : 1
                }}
              >
                <div className={`stage-icon ${isComplete ? 'complete' : ''} ${isCurrent ? 'current' : ''}`}>
                  {isComplete ? <FaCheck /> : isCurrent ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <FaSpinner />
                    </motion.div>
                  ) : <FaClock />}
                </div>
                <span className="stage-label">{stage.label}</span>
              </motion.div>
            );
          })}
        </div>

        {/* Fun Tip */}
        <motion.p 
          className="processing-tip"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          💡 Tip: Better audio quality = more accurate lyrics extraction!
        </motion.p>
      </motion.div>
    </motion.section>
  );
};

export default ProcessingStatus;
