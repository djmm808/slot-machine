import React, { useEffect, useState } from 'react';
import './IntroAnimation.css';

const IntroAnimation: React.FC = () => {
  const [showIntro, setShowIntro] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    // Simulate slower loading progress
    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + Math.random() * 5;
      });
    }, 150);

    // Hide intro after loading completes (slower)
    const timer = setTimeout(() => {
      setShowIntro(false);
    }, 5000);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(timer);
    };
  }, []);

  if (!showIntro) return null;

  return (
    <div className="intro-animation">
      <div className="intro-content">
        <div className="intro-logo">MEGA</div>
        <div className="loading-spinner"></div>
        <div className="loading-progress">{Math.floor(Math.min(loadingProgress, 100))}%</div>
      </div>
    </div>
  );
};

export default IntroAnimation;
