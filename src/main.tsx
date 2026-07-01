import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { getTelegramUser, readyApp, expandApp } from './lib/telegram';
import { useAppStore } from './store/useAppStore';

// Global error handlers
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  event.preventDefault();
});

window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

readyApp();
expandApp();

const tgUser = getTelegramUser();
if (tgUser?.id) {
  useAppStore.getState().setTelegramUserId(tgUser.id);
  import('./lib/supabase/hooks').then(({ userQueries }) => {
    userQueries.upsert(tgUser.id, {
      first_name: tgUser.first_name || '',
      username: tgUser.username || null,
      language: tgUser.language_code || 'ru',
    }).catch(() => {});
  }).catch(() => {});
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
