import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/index.css';

// Defense-in-depth dark-class application (D-19).
// index.html already sets class="dark" on <html> for first-paint correctness;
// this line ensures the class is present even if the HTML attribute is stripped
// by a future build optimization. Plan 01-03 folds this into a larger initApp().
document.documentElement.classList.add('dark');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
