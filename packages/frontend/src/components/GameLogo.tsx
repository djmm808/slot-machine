import React from 'react';

// Game logo - cosmicgemslogoclear.png displayed to the left, outside, top-aligned of game board
const GameLogo: React.FC = () => {
  return (
    <img 
      src="/cosmicgemslogoclear.png" 
      alt="Cosmic Gems" 
      className="game-logo"
    />
  );
};

export default GameLogo;
