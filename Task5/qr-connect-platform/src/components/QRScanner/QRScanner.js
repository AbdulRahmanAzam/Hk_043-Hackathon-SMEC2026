import React, { useState } from 'react';
import useQRScanner from '../../hooks/useQRScanner';
import LoadingSpinner from '../LoadingSpinner';
import { parseQRPayload } from '../../utils/qrHelpers';
import toast from 'react-hot-toast';

const QRScanner = ({ onDetected, onCancel }) => {
  const [facingMode, setFacingMode] = useState('environment');
  const [isScanning, setIsScanning] = useState(true);

  const handleDecode = (text) => {
    try {
      setIsScanning(false);
      // mobile haptic feedback
      if ('vibrate' in navigator) navigator.vibrate(200);
      const parsed = parseQRPayload(text);
      const payload = parsed || { raw: text };
      onDetected(text, payload);
      toast.success('QR scanned');
    } catch (e) {
      console.error('Failed to handle scanned data', e);
      toast.error('Scanned data is invalid');
    }
  };
  const handleError = (e) => {
    console.error(e);
  };

  const { ref, devices, deviceId, setDeviceId, torch, permission } = useQRScanner({ onDecode: handleDecode, onError: handleError, facingMode });

  const toggleTorch = async () => {
    try {
      if (torch.isAvailable) {
        torch.isOn ? torch.off() : torch.on();
      } else {
        toast('Torch not supported on this device');
      }
    } catch (e) {
      console.error('torch toggle error', e);
      toast.error('Unable to toggle torch');
    }
  };

  return (
    <div className="scanner-component" role="region" aria-label="QR scanner">
      <div className="scanner-controls" style={{display:'flex',gap:8,marginBottom:8}}>
        <label>
          Camera:
          <select value={deviceId || ''} onChange={e => setDeviceId(e.target.value)} aria-label="Select camera">
            {devices.map(d => (
              <option key={d.deviceId} value={d.deviceId}>{d.label || d.deviceId}</option>
            ))}
          </select>
        </label>
        <button onClick={() => setFacingMode(m => m === 'environment' ? 'user' : 'environment')} className="action-btn">🔄 {facingMode === 'environment' ? 'Rear' : 'Front'}</button>
        <button onClick={toggleTorch} className="action-btn" aria-pressed={torch.isOn}>🔦 Torch</button>
      </div>

      {permission === 'denied' && <div role="alert">Camera permission denied</div>}

      <div className="video-wrapper">
        <video ref={ref} style={{width:'100%'}} autoPlay muted playsInline />
        {isScanning && <LoadingSpinner label="Scanning for QR code..." />}
      </div>

      <div className="scanner-actions">
        <button onClick={onCancel} className="btn cancel-btn">Cancel</button>
      </div>
    </div>
  );
};

export default QRScanner;