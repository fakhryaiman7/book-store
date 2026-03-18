import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import './i18n';

// Apply stored theme if exists
const theme = localStorage.getItem('theme') || 'light';
if (theme === 'dark') {
  document.documentElement.classList.add('dark');
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
