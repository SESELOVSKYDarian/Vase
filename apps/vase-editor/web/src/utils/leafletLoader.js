let leafletPromise = null;

const LEAFLET_SCRIPT_ID = 'teflon-leaflet-script';
const LEAFLET_STYLES_ID = 'teflon-leaflet-styles';
const LEAFLET_JS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const LEAFLET_CSS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';

const appendStyles = () => {
    if (document.getElementById(LEAFLET_STYLES_ID)) return;
    const link = document.createElement('link');
    link.id = LEAFLET_STYLES_ID;
    link.rel = 'stylesheet';
    link.href = LEAFLET_CSS_URL;
    document.head.appendChild(link);
};

export const loadLeaflet = async () => {
    if (typeof window === 'undefined') {
        throw new Error('leaflet_window_unavailable');
    }

    if (window.L?.map) {
        return window.L;
    }

    if (leafletPromise) {
        return leafletPromise;
    }

    leafletPromise = new Promise((resolve, reject) => {
        appendStyles();

        const existingScript = document.getElementById(LEAFLET_SCRIPT_ID);
        if (existingScript && window.L?.map) {
            resolve(window.L);
            return;
        }

        if (existingScript) {
            existingScript.addEventListener(
                'load',
                () => {
                    if (window.L?.map) {
                        resolve(window.L);
                        return;
                    }
                    leafletPromise = null;
                    reject(new Error('leaflet_load_failed'));
                },
                { once: true },
            );
            existingScript.addEventListener(
                'error',
                () => {
                    leafletPromise = null;
                    reject(new Error('leaflet_script_failed'));
                },
                { once: true },
            );
            return;
        }

        const script = document.createElement('script');
        script.id = LEAFLET_SCRIPT_ID;
        script.src = LEAFLET_JS_URL;
        script.async = true;
        script.onload = () => {
            if (window.L?.map) {
                resolve(window.L);
                return;
            }
            leafletPromise = null;
            reject(new Error('leaflet_load_failed'));
        };
        script.onerror = () => {
            leafletPromise = null;
            reject(new Error('leaflet_script_failed'));
        };

        document.head.appendChild(script);
    });

    return leafletPromise;
};
