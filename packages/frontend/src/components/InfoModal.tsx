import React from 'react';
import { CloseIcon } from './Icons';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content info-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <CloseIcon />
        </button>
        <h2 className="modal-title">GAME INFO</h2>

        <div className="info-section">
          <h3 className="info-section-title">MAX WIN</h3>
          <div className="info-max-win">
            <span className="info-max-win-value">5,000x</span>
            <span className="info-max-win-label">Bet</span>
          </div>
        </div>

        <div className="info-section">
          <h3 className="info-section-title">GAME LOGIC</h3>
          <p className="info-description">
            Match 6+ adjacent symbols (multipliers act as wilds). Cascading wins with sticky multipliers in free spins.
          </p>
        </div>

        <div className="info-section">
          <h3 className="info-section-title">RTP</h3>
          <div className="info-rtp">
            <div className="info-rtp-item">
              <span className="info-rtp-label">Combined</span>
              <span className="info-rtp-value">96.07%*</span>
            </div>
          </div>
        </div>

        <div className="info-section">
          <h3 className="info-section-title">PAYTABLE</h3>
          <div className="info-symbols-grid">
            <div className="info-symbol-item">
              <img src="/saphire2.png" alt="Sapphire" className="info-symbol-image" />
              <div className="info-symbol-details">
                <span className="info-symbol-name">Sapphire</span>
                <span className="info-symbol-value">0.228x</span>
              </div>
            </div>
            <div className="info-symbol-item">
              <img src="/ruby2.png" alt="Ruby" className="info-symbol-image" />
              <div className="info-symbol-details">
                <span className="info-symbol-name">Ruby</span>
                <span className="info-symbol-value">0.326x</span>
              </div>
            </div>
            <div className="info-symbol-item">
              <img src="/emerald2.png" alt="Emerald" className="info-symbol-image" />
              <div className="info-symbol-details">
                <span className="info-symbol-name">Emerald</span>
                <span className="info-symbol-value">0.439x</span>
              </div>
            </div>
            <div className="info-symbol-item">
              <img src="/topaz2.png" alt="Topaz" className="info-symbol-image" />
              <div className="info-symbol-details">
                <span className="info-symbol-name">Topaz</span>
                <span className="info-symbol-value">0.558x</span>
              </div>
            </div>
            <div className="info-symbol-item">
              <img src="/quartz2.png" alt="Quartz" className="info-symbol-image" />
              <div className="info-symbol-details">
                <span className="info-symbol-name">Quartz</span>
                <span className="info-symbol-value">0.687x</span>
              </div>
            </div>
            <div className="info-symbol-item">
              <img src="/pearl2.png" alt="Pearl" className="info-symbol-image" />
              <div className="info-symbol-details">
                <span className="info-symbol-name">Pearl</span>
                <span className="info-symbol-value">0.825x</span>
              </div>
            </div>
            <div className="info-symbol-item">
              <img src="/scatter2.png" alt="Scatter" className="info-symbol-image" />
              <div className="info-symbol-details">
                <span className="info-symbol-name">Scatter</span>
                <span className="info-symbol-value">3-4: 10-12 FS</span>
              </div>
            </div>
            <div className="info-symbol-item">
              <img src="/2x2.png" alt="2x" className="info-symbol-image" />
              <div className="info-symbol-details">
                <span className="info-symbol-name">2x Wild</span>
                <span className="info-symbol-value">Sticky in FS</span>
              </div>
            </div>
            <div className="info-symbol-item">
              <img src="/5x2.png" alt="5x" className="info-symbol-image" />
              <div className="info-symbol-details">
                <span className="info-symbol-name">5x Wild</span>
                <span className="info-symbol-value">Sticky in FS</span>
              </div>
            </div>
            <div className="info-symbol-item">
              <img src="/10x2.png" alt="10x" className="info-symbol-image" />
              <div className="info-symbol-details">
                <span className="info-symbol-name">10x Wild</span>
                <span className="info-symbol-value">Sticky in FS</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfoModal;
