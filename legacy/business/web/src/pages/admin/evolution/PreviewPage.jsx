import React, { useState, useEffect } from 'react';
import PageBuilder from '../../../components/PageBuilder';
import { useAuth } from '../../../context/AuthContext';
import { useTenant } from '../../../context/TenantContext';

const PreviewPage = () => {
    const [sections, setSections] = useState([]);
    const [settings, setSettings] = useState(null);

    useEffect(() => {
        const handleMessage = (event) => {
            // In a real app, you'd check event.origin for security
            const { type, data } = event.data;

            if (type === 'EVOLUTION_SYNC_SECTIONS') {
                setSections(data);
            } else if (type === 'EVOLUTION_SYNC_SETTINGS') {
                setSettings(data);
            }
        };

        window.addEventListener('message', handleMessage);

        // Signal that the preview is ready
        window.parent.postMessage({ type: 'EVOLUTION_PREVIEW_READY' }, '*');

        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // Apply basic theme from settings if available
    useEffect(() => {
        if (settings?.theme?.primary) {
            document.documentElement.style.setProperty('--primary', settings.theme.primary);
        }
    }, [settings]);

    return (
        <div className="preview-mode bg-white min-h-screen">
            <PageBuilder sections={sections} />
        </div>
    );
};

export default PreviewPage;
