import React from 'react';
import ReactDOM from 'react-dom/client';

// =========================================================================
// CORREZIONE FONDAMENTALE:
// 1. Importiamo il file CSS principale per "accendere" gli stili globali.
// 2. Usiamo il percorso corretto ('./App') per trovare il componente App.
// =========================================================================
import './index.css'; 
import App from "../App.tsx";
import { ErrorBoundary } from "./ErrorBoundary";

// Il resto del codice resta invariato perché è corretto
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
