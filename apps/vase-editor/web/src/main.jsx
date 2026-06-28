import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

const RUNTIME_ERROR_OVERLAY_ID = 'runtime-error-overlay';

const renderRuntimeErrorOverlay = (errorMsg) => {
    const existing = document.getElementById(RUNTIME_ERROR_OVERLAY_ID);
    if (existing) {
        const messageNode = existing.querySelector('[data-runtime-error-message]');
        if (messageNode) {
            messageNode.textContent = errorMsg;
        }
        return;
    }

    const overlay = document.createElement('div');
    overlay.id = RUNTIME_ERROR_OVERLAY_ID;
    overlay.style.cssText = [
        'position: fixed',
        'inset: 0',
        'z-index: 2147483647',
        'padding: 20px',
        'background: rgba(0,0,0,0.35)',
        'display: flex',
        'align-items: flex-start',
        'justify-content: center',
        'pointer-events: none',
    ].join(';');

    const panel = document.createElement('div');
    panel.style.cssText = [
        'margin-top: 24px',
        'max-width: 980px',
        'width: 100%',
        'background: #fff5f5',
        'color: #c53030',
        'font-family: sans-serif',
        'border: 1px solid #feb2b2',
        'border-radius: 10px',
        'box-shadow: 0 10px 30px rgba(0,0,0,0.2)',
        'padding: 16px',
        'pointer-events: auto',
    ].join(';');

    const title = document.createElement('h1');
    title.textContent = 'Runtime Error';
    title.style.cssText = 'margin: 0 0 10px 0; font-size: 22px;';

    const message = document.createElement('p');
    message.setAttribute('data-runtime-error-message', 'true');
    message.textContent = errorMsg;
    message.style.cssText = 'margin: 0; font-family: monospace; font-size: 14px; white-space: pre-wrap;';

    panel.appendChild(title);
    panel.appendChild(message);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
};

window.onerror = function (message, source, lineno, colno, error) {
    const errorMsg = `ERROR: ${message} at ${source}:${lineno}:${colno}`;
    console.error(errorMsg);
    renderRuntimeErrorOverlay(errorMsg);
};

window.onunhandledrejection = function (event) {
    console.error("Unhandled Rejection:", event.reason);
};

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
