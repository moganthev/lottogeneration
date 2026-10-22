import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import './app/styles.css';

const url = new URL(window.location.href);
if (url.searchParams.get('refresh') === '1') {
  url.searchParams.delete('refresh');
  window.history.replaceState(window.history.state, '', url.href);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
