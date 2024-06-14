import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import Engine from './Engine';
// import Test from './Test';
// import Search from './components/search.jsx';
// import Map from './components/map.jsx';
// import App from './App';
import reportWebVitals from './reportWebVitals';


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  // <React.StrictMode>
  // <App />
  <Engine/>
  // <Test/>
  // </React.StrictMode>
);
reportWebVitals();