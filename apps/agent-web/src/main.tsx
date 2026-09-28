import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { APP_BASE } from './basePath';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={APP_BASE || undefined}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
