import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import Konva from 'konva';
import App from '../../../src/App.jsx';
import '../../../src/index.css';
// Inspeção do canvas apenas nesta entrada de teste.
window.__stages = Konva.stages;
createRoot(document.getElementById('root')).render(<BrowserRouter basename="/__e2e"><App /></BrowserRouter>);
