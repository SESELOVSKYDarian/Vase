// Detecta si un logo es claro (blanco o casi blanco). Un logo claro no se ve sobre fondo blanco,
// así que en modo claro la tienda lo muestra sobre una placa oscura.
import { useEffect, useState } from 'react';

const cache = new Map();

/**
 * Mira los píxeles visibles del logo (los transparentes no cuentan) y calcula cuán claros son.
 * Devuelve true si la mayoría son claros, false si no, y null si no se pudo leer la imagen
 * (por ejemplo, si el servidor de la imagen no permite leerla desde otra página).
 */
export function measureLogoTone(url) {
    if (!url || typeof window === 'undefined') return Promise.resolve(null);
    if (cache.has(url)) return cache.get(url);
    const job = new Promise((resolve) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => {
            try {
                const size = 64;
                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;
                const context = canvas.getContext('2d', { willReadFrequently: true });
                context.drawImage(image, 0, 0, size, size);
                const { data } = context.getImageData(0, 0, size, size);
                let visible = 0;
                let light = 0;
                for (let index = 0; index < data.length; index += 4) {
                    if (data[index + 3] < 60) continue;
                    visible += 1;
                    const luminance = 0.2126 * data[index] + 0.7152 * data[index + 1] + 0.0722 * data[index + 2];
                    if (luminance > 205) light += 1;
                }
                resolve(visible > 0 ? light / visible > 0.55 : null);
            } catch {
                resolve(null);
            }
        };
        image.onerror = () => resolve(null);
        image.src = url;
    });
    cache.set(url, job);
    return job;
}

/** Hook: true si el logo es claro, false si es oscuro o de color, null mientras no se sabe o si no se pudo medir. */
export function useLogoIsLight(url) {
    const [isLight, setIsLight] = useState(null);
    useEffect(() => {
        let active = true;
        setIsLight(null);
        measureLogoTone(url).then((value) => {
            if (active) setIsLight(value);
        });
        return () => {
            active = false;
        };
    }, [url]);
    return isLight;
}
