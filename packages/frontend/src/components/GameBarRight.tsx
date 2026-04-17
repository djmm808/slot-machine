import React from 'react';
import { SpinIcon, TurboIcon, AutoIcon } from './Icons';

interface GameBarRightProps {
  spinning: boolean;
  turboOn: boolean;
  autoOn: boolean;
  autoBetSpins: number | string;
  bet: number;
  anteBetActive: boolean;
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
  anteBetActive,
  onSpin,
  onToggleTurbo,
  onToggleAuto,
  onBetChange,
  onBetMenuOpen,
  disabled
}) => {
  const effectiveBet = anteBetActive ? bet * 1.25 : bet;
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
            className={`bet-value ${anteBetActive ? 'ante-active' : ''}`}
            onClick={onBetMenuOpen}
          >
            ${effectiveBet.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
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
        style={{ padding: '0' }}
      >
        <AutoIcon />
      </button>
      <button
        className={`spin-button ${spinning ? 'spinning' : ''}`}
        onClick={onSpin}
        disabled={disabled}
        title="Spin"
        style={{ marginLeft: '4px', width: '80px', height: '80px' }}
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
        style={{ marginLeft: '0px', padding: '0' }}
      >
        <TurboIcon on={turboOn} />
      </button>
    </div>
  );
};

export default GameBarRight;
