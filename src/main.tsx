import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Plan 01-01 Task 1: minimal bootstrap. Tasks 2 & 3 add styles + dark-class wiring.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
