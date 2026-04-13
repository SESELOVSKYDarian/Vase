import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

window.onerror = function (message, source, lineno, colno, error) {
    const errorMsg = `ERROR: ${message} at ${source}:${lineno}:${colno}`;
    console.error(errorMsg);
    if (document.getElementById('root')) {
        document.getElementById('root').innerHTML = `<div style="padding: 20px; background: #fff5f5; color: #c53030; font-family: sans-serif;">
            <h1 style="margin: 0 0 10px 0;">Runtime Error</h1>
            <p style="margin: 0; font-family: monospace; font-size: 14px;">${errorMsg}</p>
        </div>`;
    }
};

window.onunhandledrejection = function (event) {
    console.error("Unhandled Rejection:", event.reason);
};

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
