import React from 'react';
import { HamburgerIcon, BonusIcon } from './Icons';

interface GameBarLeftProps {
  onMenuClick: () => void;
  onBonusBuyClick: () => void;
}

const GameBarLeft: React.FC<GameBarLeftProps> = ({ onMenuClick, onBonusBuyClick }) => {
  return (
    <div className="game-bar-left">
      <button 
        className="icon-button" 
        onClick={onMenuClick}
        title="Menu"
      >
        <HamburgerIcon />
      </button>
      <button 
        className="icon-button" 
        onClick={onBonusBuyClick}
        title="Bonus Buy"
      >
        <BonusIcon />
      </button>
    </div>
  );
};

export default GameBarLeft;
