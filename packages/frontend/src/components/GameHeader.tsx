import React, { useState, useEffect } from 'react';

interface GameHeaderProps {
  onDemoScatter?: () => void;
}

// Game title and live time display
const GameHeader: React.FC<GameHeaderProps> = ({ onDemoScatter }) => {
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      }));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="game-header">
      <span className="game-time">{currentTime}</span>
      <span className="time-separator">|</span>
      <span className="game-title">Cosmic Gems</span>
      <span className="mega-logo">MEGA</span>
      {onDemoScatter && (
        <button className="header-demo-btn" onClick={onDemoScatter}>
          Demo Scatter
        </button>
      )}
    </div>
  );
};

export default GameHeader;
