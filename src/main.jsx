import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './figma.css';
import './styles.css';

const params = new URLSearchParams(location.search);
const FinalGame = React.lazy(() => import('./final/FinalGame.jsx'));
const View = params.get('version') === 'mvp' || params.has('endingPreview') ? App : FinalGame;
createRoot(document.getElementById('root')).render(<React.StrictMode><React.Suspense fallback={null}><View /></React.Suspense></React.StrictMode>);
