import React from 'react';
import ReactDOM from 'react-dom/client';
import { Amplify } from 'aws-amplify';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { awsConfig } from './config';
import './index.css';

Amplify.configure(awsConfig);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
