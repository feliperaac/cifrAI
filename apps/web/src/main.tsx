import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import { App } from './app/App';
import { isServiceWorkerEnabled } from './config';
import { applyTheme, useThemeStore } from './theme/themeStore';
import './styles.css';

applyTheme(useThemeStore.getState().mode);

// autoUpdate: o SW novo assume na hora (skipWaiting + clientsClaim) e a pagina recarrega.
if (isServiceWorkerEnabled()) registerSW({ immediate: true });

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  );
}
