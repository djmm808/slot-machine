import React from 'react';
import { SpinIcon, TurboIcon, AutoIcon } from './Icons';

interface GameBarRightProps {
  spinning: boolean;
  turboOn: boolean;
  autoOn: boolean;
  autoBetSpins: number | string;
  bet: number;
  onSpin: () => void;
  onToggleTurbo: () => void;
  onToggleAuto: () => void;
  onBetChange: (newBet: number) => void;
  onBetMenuOpen: () => void;
  disabled: boolean;
}

const GameBarRight: React.FC<GameBarRightProps> = ({
  spinning,
  turboOn,
  autoOn,
  autoBetSpins,
  bet,
  onSpin,
  onToggleTurbo,
  onToggleAuto,
  onBetChange,
  onBetMenuOpen,
  disabled
}) => {
  return (
    <div className="game-bar-right">
      <div className="bet-controls">
        <button
          className="bet-button"
          onClick={() => onBetChange(Math.max(0.1, bet - 0.1))}
          disabled={spinning || disabled}
        >
          -
        </button>
        <div className="bet-value-wrapper">
          <span className="bet-label">Bet</span>
          <button
            className="bet-value"
            onClick={onBetMenuOpen}
          >
            ${bet.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </button>
        </div>
        <button
          className="bet-button"
          onClick={() => onBetChange(Math.min(1000, bet + 0.1))}
          disabled={spinning || disabled}
        >
          +
        </button>
      </div>
      <button
        className={`icon-button ${autoOn ? 'active' : ''}`}
        onClick={onToggleAuto}
        title="Auto"
      >
        <AutoIcon />
      </button>
      <button
        className={`spin-button ${spinning ? 'spinning' : ''}`}
        onClick={onSpin}
        disabled={disabled}
        title="Spin"
      >
        <SpinIcon />
        {autoOn && (
          <span className="spin-count-overlay">
            {typeof autoBetSpins === 'number' ? autoBetSpins : '∞'}
          </span>
        )}
      </button>
      <button
        className={`icon-button ${turboOn ? 'active' : ''}`}
        onClick={onToggleTurbo}
        title="Turbo"
      >
        <TurboIcon on={turboOn} />
      </button>
    </div>
  );
};

export default GameBarRight;
