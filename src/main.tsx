import './utils/polyfills';
import './utils/deploymentBridge';
import {createRoot} from 'react-dom/client';
import { Suspense } from 'react';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <Suspense fallback={<div className='zain-page-loader'>Menyiapkan layanan ZAIN.NET...</div>}>
      <App />
    </Suspense>
  </ErrorBoundary>
);
