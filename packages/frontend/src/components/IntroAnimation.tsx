import React, { useEffect, useState } from 'react';
import './IntroAnimation.css';

const IntroAnimation: React.FC = () => {
  const [showIntro, setShowIntro] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    // Simulate faster loading progress
    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + Math.random() * 8;
      });
    }, 120);

    // Hide intro after loading completes (faster)
    const timer = setTimeout(() => {
      setShowIntro(false);
    }, 3500);

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
        <div className="loading-bar-container">
          <div className="loading-bar" style={{ width: `${Math.min(loadingProgress, 100)}%` }}></div>
        </div>
        <div className="loading-progress">{Math.floor(Math.min(loadingProgress, 100))}%</div>
      </div>
    </div>
  );
};

export default IntroAnimation;
