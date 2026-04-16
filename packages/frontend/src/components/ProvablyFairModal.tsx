import React, { useState } from 'react';
import { CloseIcon } from './Icons';
import { seededRandom } from '../utils/crypto';

interface ProvablyFairModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSeedRotate: () => void;
  clientSeed: string;
  nonce: number;
}

const ProvablyFairModal: React.FC<ProvablyFairModalProps> = ({
  isOpen,
  onClose,
  onSeedRotate,
  clientSeed,
  nonce
}) => {
  const [verifyNonce, setVerifyNonce] = useState(nonce);
  const [verifyIndex, setVerifyIndex] = useState(0);
  const [verifyResult, setVerifyResult] = useState<number | null>(null);
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async () => {
    if (!clientSeed) return;
    
    setVerifying(true);
    try {
      const result = await seededRandom(clientSeed, verifyNonce, verifyIndex);
      setVerifyResult(result);
    } catch (error) {
      console.error('Verification error:', error);
    } finally {
      setVerifying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content provably-fair-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <CloseIcon />
        </button>
        <h2 className="modal-title">PROVABLY FAIR</h2>
        
        <div className="info-section">
          <h3 className="info-section-title">CURRENT SEED</h3>
          <div className="seed-info">
            <div className="seed-item">
              <span className="seed-label">Client Seed:</span>
              <span className="seed-value">{clientSeed || 'Not set'}</span>
            </div>
            <div className="seed-item">
              <span className="seed-label">Current Nonce:</span>
              <span className="seed-value">{nonce}</span>
            </div>
          </div>
        </div>

        <div className="info-section">
          <h3 className="info-section-title">SEED MANAGEMENT</h3>
          <button 
            className="provably-fair-button"
            onClick={onSeedRotate}
          >
            Rotate Seed
          </button>
          <p className="info-description" style={{ marginTop: '8px', fontSize: '12px' }}>
            Generate a new client seed and reset nonce for maximum fairness.
          </p>
        </div>

        <div className="info-section">
          <h3 className="info-section-title">VERIFY RESULT</h3>
          <div className="verify-inputs">
            <div className="verify-input-group">
              <label className="verify-label">Nonce:</label>
              <input
                type="number"
                className="verify-input"
                value={verifyNonce}
                onChange={(e) => setVerifyNonce(parseInt(e.target.value) || 0)}
                min="0"
              />
            </div>
            <div className="verify-input-group">
              <label className="verify-label">Index:</label>
              <input
                type="number"
                className="verify-input"
                value={verifyIndex}
                onChange={(e) => setVerifyIndex(parseInt(e.target.value) || 0)}
                min="0"
              />
            </div>
          </div>
          <button 
            className="provably-fair-button"
            onClick={handleVerify}
            disabled={!clientSeed || verifying}
          >
            {verifying ? 'Verifying...' : 'Verify'}
          </button>
          {verifyResult !== null && (
            <div className="verify-result">
              <span className="verify-result-label">Random Value:</span>
              <span className="verify-result-value">{verifyResult.toFixed(8)}</span>
            </div>
          )}
        </div>

        <div className="info-section">
          <h3 className="info-section-title">HOW IT WORKS</h3>
          <div className="info-description" style={{ fontSize: '13px', lineHeight: '1.5' }}>
            <p style={{ marginBottom: '8px' }}>
              <strong>1. Auto-Generated Seed:</strong> A cryptographically secure seed is generated and stored locally.
            </p>
            <p style={{ marginBottom: '8px' }}>
              <strong>2. Nonce Increment:</strong> Each spin increments the nonce, ensuring unique results.
            </p>
            <p style={{ marginBottom: '8px' }}>
              <strong>3. Verification:</strong> Use your seed + nonce to verify any spin result.
            </p>
            <p>
              <strong>4. Rotate:</strong> Generate a new seed anytime for fresh randomness.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProvablyFairModal;
