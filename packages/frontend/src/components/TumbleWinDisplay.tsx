import React, { useEffect, useState } from 'react';

interface TumbleWinDisplayProps {
  currentTumbleWin: number;
  clusterPositions?: [number, number][];
}

const TumbleWinDisplay: React.FC<TumbleWinDisplayProps> = ({ currentTumbleWin, clusterPositions }) => {
  const [showPopup, setShowPopup] = useState(false);
  const [displayWin, setDisplayWin] = useState(0);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 50, left: 50 });

  useEffect(() => {
    if (currentTumbleWin > 0 && clusterPositions && clusterPositions.length > 0) {
      setDisplayWin(currentTumbleWin);
      
      // Calculate center of cluster
      const avgCol = clusterPositions.reduce((sum, [col]) => sum + col, 0) / clusterPositions.length;
      const avgRow = clusterPositions.reduce((sum, [, row]) => sum + row, 0) / clusterPositions.length;
      
      // Convert to pixel positions (reel width: 95px, symbol height: 85px, padding: 6px)
      const left = avgCol * 95 + 47.5 + 6;
      const top = avgRow * 85 + 42.5 + 6;
      
      setPosition({ top, left });
      setShowPopup(true);
      
      // Auto-hide after 500ms
      const timer = setTimeout(() => {
        setShowPopup(false);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [currentTumbleWin, clusterPositions]);

  if (!showPopup || displayWin === 0) return null;

  return (
    <div 
      className="win-popup-overlay"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        opacity: showPopup ? 1 : 0,
        transform: showPopup ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, -50%) scale(0.8)',
      }}
    >
      <div className="win-popup-amount">${displayWin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
    </div>
  );
};

export default TumbleWinDisplay;
