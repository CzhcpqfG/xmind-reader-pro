import React from 'react';
import { createRoot } from 'react-dom/client';
import { PopupApp } from './App.js';

const root = createRoot(document.getElementById('root')!);
root.render(<PopupApp />);
