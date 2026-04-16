import React, { useState, useRef, useEffect } from 'react';
import { CloseIcon } from './Icons';

interface SpinHistoryItem {
  nonce: number;
  bet: number;
  win: number;
  timestamp: number;
}

interface SpinHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: SpinHistoryItem[];
}

const INITIAL_LOAD_COUNT = 10;
const LOAD_MORE_COUNT = 20;

const SpinHistoryModal: React.FC<SpinHistoryModalProps> = ({
  isOpen,
  onClose,
  history
}) => {
  const [visibleCount, setVisibleCount] = useState(INITIAL_LOAD_COUNT);
  const [showingAll, setShowingAll] = useState(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Reset visible count when modal opens
    if (isOpen) {
      setVisibleCount(INITIAL_LOAD_COUNT);
      setShowingAll(false);
    }
  }, [isOpen]);

  const handleScroll = () => {
    if (!tableContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = tableContainerRef.current;
    
    // Load more when scrolled near bottom (within 100px)
    if (scrollHeight - scrollTop - clientHeight < 100 && !showingAll) {
      const newCount = Math.min(visibleCount + LOAD_MORE_COUNT, history.length);
      setVisibleCount(newCount);
      
      if (newCount >= history.length) {
        setShowingAll(true);
      }
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const totalProfit = history.reduce((sum, item) => sum + (item.win - item.bet), 0);
  
  // Show most recent spins first (reversed)
  const reversedHistory = [...history].reverse();
  const visibleItems = reversedHistory.slice(0, visibleCount);
  const hasMore = visibleCount < history.length;

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content spin-history-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <CloseIcon />
        </button>
        <h2 className="modal-title">SPIN HISTORY</h2>
        
        <div className="spin-history-stats">
          <div className="spin-history-stat">
            <span className="spin-history-stat-label">Total Spins:</span>
            <span className="spin-history-stat-value">{history.length}</span>
          </div>
          <div className="spin-history-stat">
            <span className="spin-history-stat-label">Net Profit:</span>
            <span className={`spin-history-stat-value ${totalProfit >= 0 ? 'profit' : 'loss'}`}>
              {totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(2)}
            </span>
          </div>
        </div>

        <div 
          className="spin-history-table-container"
          ref={tableContainerRef}
          onScroll={handleScroll}
        >
          <table className="spin-history-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Time</th>
                <th>Bet</th>
                <th>Win</th>
                <th>Profit</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.length > 0 ? (
                visibleItems.map((item) => (
                  <tr key={item.nonce}>
                    <td className="spin-history-nonce">{item.nonce}</td>
                    <td className="spin-history-time">{formatTimestamp(item.timestamp)}</td>
                    <td className="spin-history-bet">${item.bet.toFixed(2)}</td>
                    <td className="spin-history-win">${item.win.toFixed(2)}</td>
                    <td className={`spin-history-profit ${item.win - item.bet >= 0 ? 'profit' : 'loss'}`}>
                      {item.win - item.bet >= 0 ? '+' : ''}${(item.win - item.bet).toFixed(2)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="spin-history-empty">
                    No spin history yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          
          {hasMore && (
            <div className="spin-history-load-more">
              <span className="load-more-text">Scroll down to load more...</span>
              <div className="load-more-spinner"></div>
            </div>
          )}
          
          {!hasMore && history.length > INITIAL_LOAD_COUNT && (
            <div className="spin-history-all-loaded">
              <span className="all-loaded-text">All spins loaded</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpinHistoryModal;
