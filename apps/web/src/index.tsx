import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app';
import { AuthBoundary } from './auth/auth-boundary';
import './globals.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthBoundary>
      <App />
    </AuthBoundary>
  </React.StrictMode>,
);
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.register('/sw.js').catch(() => {});
}
