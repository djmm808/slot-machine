import React from 'react';

interface GameBarMiddleProps {
  balance: number;
  winAmount: number;
  freeSpinsTotalWin?: number;
  freeSpinsActive?: boolean;
  limitReached?: boolean;
}

const GameBarMiddle: React.FC<GameBarMiddleProps> = ({ balance, winAmount, freeSpinsTotalWin = 0, freeSpinsActive = false, limitReached = false }) => {
  const displayWin = freeSpinsActive ? freeSpinsTotalWin : winAmount;
  const displayWinText = limitReached ? 'Limit Reached' : `$${displayWin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <>
      <div className="game-bar-balance">
        <span className="balance-label">Balance</span>
        <span className="balance-value">${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </div>
      <div className="game-bar-win">
        <span className="balance-label">Win:</span>
        <span className={`balance-value win ${limitReached ? 'limit-reached' : ''}`}>{displayWinText}</span>
      </div>
    </>
  );
};

export default GameBarMiddle;
