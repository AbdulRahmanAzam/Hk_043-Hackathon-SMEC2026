import React, { useRef } from 'react';
import QRCode from 'qrcode.react';
import { QRCodeSVG } from 'qrcode.react';


const QRDisplay = ({ user }) => {
  const qrRef = useRef();
  const value = `qrconnect://user/${user?.id}`;

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Connect with me', text: `Connect with ${user.name}`, url: value });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(value);
        alert('Share link copied to clipboard');
      }
    } catch (e) {
      console.error('Share failed', e);
      alert('Unable to share');
    }
  };

  return (
    <div className="qr-display" aria-label="Your QR code">
      <QRCodeSVG value={value} size={200} includeMargin={true} ref={qrRef} aria-hidden="true" />
      <div className="qr-meta">
        <div className="qr-username">{user?.username}</div>
        <button className="share-btn" onClick={handleShare} aria-label="Share your QR code">Share</button>
      </div>
    </div>
  );
};

export default QRDisplay;
