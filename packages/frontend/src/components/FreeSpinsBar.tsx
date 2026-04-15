import React from 'react';

interface FreeSpinsBarProps {
  freeSpins: number;
}

const FreeSpinsBar: React.FC<FreeSpinsBarProps> = ({ freeSpins }) => {
  return (
    <div className="free-spins-display">
      <div className="free-spins-display-label">FREE SPINS</div>
      <div className="free-spins-display-value">{freeSpins}</div>
    </div>
  );
};

export default FreeSpinsBar;
