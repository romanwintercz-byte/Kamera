import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

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
    if (rootElement) {
      rootElement.innerHTML = `<div style="padding: 20px; color: red; font-family: sans-serif;">
        <h1 style="font-size: 18px;">Chyba při startu aplikace</h1>
        <pre style="background: #fee; padding: 10px; border-radius: 4px;">${e instanceof Error ? e.message : 'Neznámá chyba'}</pre>
        <p style="font-size: 14px; color: #666;">Zkontrolujte konzoli v nástrojích pro vývojáře (F12).</p>
      </div>`;
    }
  }
}