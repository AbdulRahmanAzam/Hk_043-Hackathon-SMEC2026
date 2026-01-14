import React, { useRef, useEffect, useState } from 'react';
import jsQR from 'jsqr';
import LoadingSpinner from './LoadingSpinner';

const Scanner = ({ onDetected, onCancel }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);
  const [scanning, setScanning] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    let stream = null;
    let rafId = null;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          tick();
        }
      } catch (e) {
        console.error(e);
        setError('Camera access denied or unavailable');
        setPermissionDenied(true);
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

    startCamera();

    return () => {
      setScanning(false);
      if (rafId) cancelAnimationFrame(rafId);
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [onDetected]);

  return (
    <div className="scanner-component" role="region" aria-label="QR scanner">
      <div className="video-wrapper">
        {error ? (
          <div role="alert">{error}</div>
        ) : (
          <>
            <video ref={videoRef} style={{width:'100%'}} aria-hidden="true" />
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
