import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import Engine from './Engine';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  // <React.StrictMode>
    <Engine/>
  // </React.StrictMode>
);

reportWebVitals();
