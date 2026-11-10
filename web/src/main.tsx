import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles/theme.css';
import { App } from './App';
import { ThemeProvider } from './theme';
import { SnackbarProvider } from './ui';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <SnackbarProvider>
        <BrowserRouter><App /></BrowserRouter>
      </SnackbarProvider>
    </ThemeProvider>
  </StrictMode>,
);
