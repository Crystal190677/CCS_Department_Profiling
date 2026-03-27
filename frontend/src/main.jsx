import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { DarkModeProvider } from './context/DarkModeContext';
import App from './App';
import './index.css';
import './ccs-theme-gradients.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <DarkModeProvider>
        <App />
      </DarkModeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
