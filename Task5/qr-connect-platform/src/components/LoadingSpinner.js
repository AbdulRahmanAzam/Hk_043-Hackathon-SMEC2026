import React from 'react';

const LoadingSpinner = ({ label = 'Loading...' }) => (
  <div aria-busy="true" aria-live="polite" style={{display:'flex',alignItems:'center',gap:8}}>
    <svg width="24" height="24" viewBox="0 0 50 50" aria-hidden="true">
      <circle cx="25" cy="25" r="20" strokeWidth="5" stroke="#555" strokeDasharray="31.4 31.4" fill="none">
        <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="1s" repeatCount="indefinite" />
      </circle>
    </svg>
    <span>{label}</span>
  </div>
);

export default LoadingSpinner;
