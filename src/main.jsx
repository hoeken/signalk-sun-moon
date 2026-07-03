import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App.jsx';
import './styles.css';

// React 18 root API (createRoot). React 18's runtime is fine on Chromium 69 —
// it dropped IE11, not 2018-era Chromium (§6.1).
const root = createRoot(document.getElementById('root'));
root.render(<App />);
