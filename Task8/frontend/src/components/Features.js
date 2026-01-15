import React from 'react';
import { motion } from 'framer-motion';
import { FaCloud, FaFilePdf, FaChartPie, FaRobot, FaMagic, FaClock } from 'react-icons/fa';

const Features = () => {
  const features = [
    {
      icon: FaRobot,
      title: 'AI-Powered Transcription',
      description: 'Using OpenAI Whisper for accurate speech-to-text conversion',
      color: '#6366f1'
    },
    {
      icon: FaCloud,
      title: 'Beautiful Word Clouds',
      description: 'Stunning visualizations highlighting the most used words',
      color: '#8b5cf6'
    },
    {
      icon: FaChartPie,
      title: 'Sentiment Analysis',
      description: 'Understand the emotional tone and mood of the lyrics',
      color: '#ec4899'
    },
    {
      icon: FaFilePdf,
      title: 'PDF Export',
      description: 'Download professional PDF reports with all analysis',
      color: '#f43f5e'
    },
    {
      icon: FaClock,
      title: 'Timestamped Lyrics',
      description: 'Get lyrics with precise timing for each segment',
      color: '#f97316'
    },
    {
      icon: FaMagic,
      title: 'Word Statistics',
      description: 'Detailed stats including vocabulary richness & top words',
      color: '#eab308'
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <section className="features-section">
      <motion.h2 
        className="features-title"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        ✨ Powerful Features
      </motion.h2>
      <motion.p 
        className="features-subtitle"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        Extract, analyze, and visualize lyrics from any YouTube video
      </motion.p>

      <motion.div 
        className="features-grid"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <motion.div 
              key={index}
              className="feature-card"
              variants={itemVariants}
              whileHover={{ 
                scale: 1.05, 
                y: -5,
                boxShadow: `0 20px 40px ${feature.color}30`
              }}
            >
              <div 
                className="feature-icon"
                style={{ background: `linear-gradient(135deg, ${feature.color}, ${feature.color}80)` }}
              >
                <Icon />
              </div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
};

export default Features;
