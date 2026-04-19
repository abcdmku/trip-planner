import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppProviders } from './AppProviders';
import { AppRouter } from './AppRouter';
import '@/index.css';

export function renderApp() {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <AppProviders>
        <AppRouter />
      </AppProviders>
    </React.StrictMode>,
  );
}
