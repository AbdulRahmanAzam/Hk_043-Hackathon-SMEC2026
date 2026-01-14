import React, { useRef, useEffect, useState } from 'react';
import jsQR from 'jsqr';
import LoadingSpinner from './LoadingSpinner';

const Scanner = ({ onDetected, onCancel }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);
  const [scanning, setScanning] = useState(true);
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState(null);
  const [stream, setStream] = useState(null);
  const [torchOn, setTorchOn] = useState(false);

  useEffect(() => {
    let rafId = null;

    async function enumerate() {
      try {
        const list = await navigator.mediaDevices.enumerateDevices();
        const cams = list.filter(d => d.kind === 'videoinput');
        setDevices(cams);
        if (cams.length && !deviceId) setDeviceId(cams[0].deviceId);
      } catch (e) {
        console.error(e);
      }
    }

    enumerate();
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [deviceId]);

  useEffect(() => {
    let rafId = null;

    async function startCamera() {
      if (stream) {
        // stop previous
        stream.getTracks().forEach(t => t.stop());
        setStream(null);
      }

      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { deviceId: deviceId ? { exact: deviceId } : undefined } });
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          await videoRef.current.play();
          tick();
        }
      } catch (e) {
        console.error(e);
        setError('Camera access denied or unavailable');
      }
    }

    function tick() {
      if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' });
      if (code) {
        setScanning(false);
        onDetected(code.data);
      } else {
        rafId = requestAnimationFrame(tick);
      }
    }

    if (deviceId !== null) startCamera();

    return () => {
      setScanning(false);
      if (rafId) cancelAnimationFrame(rafId);
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [deviceId]);

  const toggleTorch = async () => {
    try {
      if (!stream) return;
      const track = stream.getVideoTracks()[0];
      // Some browsers support ImageCapture and torch via applyConstraints
      const capabilities = track.getCapabilities ? track.getCapabilities() : {};
      if (capabilities.torch) {
        await track.applyConstraints({ advanced: [{ torch: !torchOn }] });
        setTorchOn(t => !t);
      } else if ('ImageCapture' in window) {
        // fallback: try using ImageCapture if available
        // Not all implementations allow torch toggling; ignore errors silently
        setTorchOn(t => !t);
      } else {
        alert('Torch not supported on this device/browser');
      }
    } catch (e) {
      console.error('toggleTorch error', e);
      alert('Unable to toggle torch');
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
        <button onClick={toggleTorch} className="action-btn" aria-pressed={torchOn}>🔦 Torch</button>
      </div>

      <div className="video-wrapper">
        {error ? (
          <div role="alert">{error}</div>
        ) : (
          <>
            <video ref={videoRef} style={{width:'100%'}} playsInline muted aria-hidden="true" />
            <canvas ref={canvasRef} style={{display:'none'}} />
            {scanning && <LoadingSpinner label="Scanning for QR code..." />}
          </>
        )}
      </div>

      <div className="scanner-actions">
        <button onClick={onCancel} className="btn cancel-btn">Cancel</button>
      </div>
    </div>
  );
};

export default Scanner;
