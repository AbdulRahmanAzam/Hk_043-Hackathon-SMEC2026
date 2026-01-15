import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';
import Header from './components/Header';
import URLInput from './components/URLInput';
import ProcessingStatus from './components/ProcessingStatus';
import Results from './components/Results';
import Features from './components/Features';
import Footer from './components/Footer';
import History from './components/History';
import ParticleBackground from './components/ParticleBackground';
import SuccessCelebration from './components/SuccessCelebration';
import './App.css';

const API_BASE = 'http://localhost:8000';

function App() {
  const [url, setUrl] = useState('');
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [modelSize, setModelSize] = useState('small');
  const [videoInfo, setVideoInfo] = useState(null);
  const [isDark, setIsDark] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // Theme toggle
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    let interval;
    if (jobId && isProcessing) {
      interval = setInterval(async () => {
        try {
          const res = await axios.get(`${API_BASE}/api/status/${jobId}`);
          setStatus(res.data);
          
          if (res.data.video_info) {
            setVideoInfo(res.data.video_info);
          }
          
          if (res.data.status === 'done') {
            setIsProcessing(false);
            setShowCelebration(true);
            toast.success('🎉 Lyrics extracted successfully!');
            clearInterval(interval);
          } else if (res.data.status === 'failed') {
            setIsProcessing(false);
            toast.error(`❌ ${res.data.message}`);
            clearInterval(interval);
          }
        } catch (error) {
          console.error('Status check failed:', error);
        }
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [jobId, isProcessing]);

  const handleSubmit = useCallback(async () => {
    if (!url.trim()) {
      toast.warning('Please enter a YouTube URL');
      return;
    }
    
    if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
      toast.error('Please enter a valid YouTube URL');
      return;
    }

    try {
      setIsProcessing(true);
      setStatus(null);
      setVideoInfo(null);
      
      const res = await axios.post(`${API_BASE}/api/process`, { 
        url, 
        model_size: modelSize 
      });
      
      setJobId(res.data.job_id);
      toast.info('🚀 Processing started...');
    } catch (error) {
      setIsProcessing(false);
      toast.error('Failed to start processing. Make sure the backend is running.');
      console.error(error);
    }
  }, [url, modelSize]);

  const handleReset = useCallback(() => {
    setUrl('');
    setJobId(null);
    setStatus(null);
    setIsProcessing(false);
    setVideoInfo(null);
  }, []);

  const downloadFile = useCallback(async (type) => {
    if (!jobId) return;
    
    const endpoints = {
      'pdf': `${API_BASE}/download/pdf/${jobId}`,
      'wordcloud': `${API_BASE}/download/wordcloud/${jobId}`,
      'txt': `${API_BASE}/download/txt/${jobId}`,
      'json': `${API_BASE}/download/json/${jobId}`
    };
    
    const endpoint = endpoints[type];
    if (!endpoint) return;
    
    try {
      window.open(endpoint, '_blank');
      const typeNames = { pdf: 'PDF', wordcloud: 'Word Cloud', txt: 'Text file', json: 'JSON data' };
      toast.success(`📥 Downloading ${typeNames[type]}...`);
    } catch (error) {
      toast.error('Download failed');
    }
  }, [jobId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + Enter to submit
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !isProcessing && url) {
        handleSubmit();
      }
      // Escape to reset
      if (e.key === 'Escape' && status?.status === 'done') {
        handleReset();
      }
      // Ctrl/Cmd + D to download PDF
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && status?.status === 'done') {
        e.preventDefault();
        downloadFile('pdf');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [url, isProcessing, status, jobId, handleSubmit, downloadFile, handleReset]);

  const handleHistorySelect = (item) => {
    // Load job from history
    setJobId(item.job_id);
    setVideoInfo(item.video_info);
    setHistoryOpen(false);
    toast.info('Loading from history...');
    
    // Fetch full status
    axios.get(`${API_BASE}/api/status/${item.job_id}`)
      .then(res => {
        setStatus(res.data);
      })
      .catch(() => {
        toast.error('This item is no longer available');
      });
  };

  return (
    <div className={`app ${isDark ? 'dark' : 'light'}`}>
      {/* Particle Background */}
      <ParticleBackground />
      
      {/* Animated Background */}
      <div className="animated-bg">
        <motion.div 
          className="bg-gradient"
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        />
        <div className="bg-particles">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="particle" />
          ))}
        </div>
      </div>

      {/* Success Celebration */}
      <SuccessCelebration 
        show={showCelebration} 
        onComplete={() => setShowCelebration(false)} 
      />

      <Header 
        isDark={isDark} 
        onThemeToggle={() => setIsDark(!isDark)} 
        onHistoryOpen={() => setHistoryOpen(true)}
      />
      
      <main className="main-container">
        <AnimatePresence mode="wait">
          {!status?.status || status.status === 'failed' ? (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <URLInput
                url={url}
                setUrl={setUrl}
                onSubmit={handleSubmit}
                isProcessing={isProcessing}
                modelSize={modelSize}
                setModelSize={setModelSize}
              />
              
              {status?.status === 'failed' && (
                <motion.div 
                  className="error-message"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <p>❌ {status.message}</p>
                  <button onClick={handleReset} className="retry-btn">
                    Try Again
                  </button>
                </motion.div>
              )}
              
              <Features />
            </motion.div>
          ) : status.status === 'done' ? (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Results
                status={status}
                videoInfo={videoInfo}
                onDownload={downloadFile}
                onReset={handleReset}
                apiBase={API_BASE}
                jobId={jobId}
              />
            </motion.div>
          ) : (
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ProcessingStatus 
                status={status} 
                videoInfo={videoInfo}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer />

      <History 
        apiBase={API_BASE}
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onSelect={handleHistorySelect}
      />

      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
    </div>
  );
}

export default App;
