import React from 'react';
import './StatusBar.css';

export const StatusBar: React.FC = () => {
  return (
    <footer className="status-bar">
      <div className="status-bar-left">
        <span>Ready</span>
      </div>
      <div className="status-bar-right">
        <span>Electron + React + Python</span>
      </div>
    </footer>
  );
};
