import '@ant-design/v5-patch-for-react-19';
import '@tronweb3/tronwallet-adapter-react-ui/style.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './style.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
