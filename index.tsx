import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Globální zachycení chyb pro debugging na produkci
window.onerror = (message, source, lineno, colno, error) => {
  console.error("Kritická chyba aplikace:", message, "na", source, ":", lineno);
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("Nepodařilo se najít 'root' element!");
} else {
  try {
    const root = createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (e) {
    console.error("Chyba při renderování aplikace:", e);
    rootElement.innerHTML = `<div style="padding: 20px; color: red;">Chyba při startu aplikace: ${e instanceof Error ? e.message : 'Neznámá chyba'}</div>`;
  }
}