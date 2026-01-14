import React, { useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import { makeQRPayload } from '../../utils/qrHelpers';
import toast from 'react-hot-toast';

const QRGenerator = ({ user }) => {
  const value = useMemo(() => makeQRPayload(user, true), [user]);
  const createdAt = useMemo(() => format(new Date(), 'PPpp'), []);

  const handleShare = async () => {
    try {
      const shareData = {
        title: 'Connect with me',
        text: `Scan to connect with ${user?.name}`,
        url: process.env.REACT_APP_BASE_URL || window.location.origin,
      };
      if (navigator.share) {
        await navigator.share(shareData);
        toast.success('Shared successfully');
      } else {
        await navigator.clipboard.writeText(value);
        toast.success('QR payload copied to clipboard');
      }
    } catch (e) {
      console.error('Share failed', e);
      toast.error('Unable to share');
    }
  };

  const handleSaveImage = () => {
    try {
      const svg = document.querySelector('.qr-generator svg');
      if (!svg) return toast.error('QR not available');
      const xml = new XMLSerializer().serializeToString(svg);
      const svg64 = btoa(unescape(encodeURIComponent(xml)));
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const png = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = png;
        a.download = `${user?.username || 'qr'}.png`;
        a.click();
        toast.success('Saved QR as image');
      };
      img.src = 'data:image/svg+xml;base64,' + svg64;
    } catch (e) {
      console.error('save image failed', e);
      toast.error('Unable to save image');
    }
  };

  return (
    <div className="qr-generator" role="region" aria-label="Your QR code">
      <div className="qr-meta">
        <div className="qr-username">{user?.username}</div>
        <div className="qr-info">Generated {createdAt}</div>
      </div>
      <QRCodeSVG value={value} size={220} includeMargin={true} aria-hidden="true" />
      <div className="qr-actions" style={{display:'flex',gap:8,marginTop:12}}>
        <button className="share-btn" onClick={handleShare} aria-label="Share your QR code">Share</button>
        <button className="share-btn" onClick={handleSaveImage} aria-label="Save QR as image">Save Image</button>
      </div>
    </div>
  );
};

export default QRGenerator;