import React from 'react';

interface TumbleWinDisplayProps {
  currentTumbleWin: number;
}

const TumbleWinDisplay: React.FC<TumbleWinDisplayProps> = ({ currentTumbleWin }) => {
  if (currentTumbleWin === 0) return null;

  return (
    <div className="tumble-win-display">
      <div className="tumble-win-label">TUMBLE WIN</div>
      <div className="tumble-win-value">${currentTumbleWin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
    </div>
  );
};

export default TumbleWinDisplay;
