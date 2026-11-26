// Hace aparecer una sección con un movimiento suave (sube y se aclara) cuando entra en pantalla.
// Si la persona pidió menos movimiento en su sistema, o el navegador no sabe avisar cuándo algo
// entra en pantalla, la sección se muestra directo, sin animación.
import { useEffect, useRef, useState } from 'react';

function prefersReducedMotion() {
    return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/**
 * @param {boolean} [disabled] Mostrar sin animación (por ejemplo en la vista previa del editor).
 * @param {number} [delay] Demora en milisegundos antes de aparecer.
 */
export default function Reveal({ children, disabled = false, delay = 0 }) {
    const ref = useRef(null);
    const [visible, setVisible] = useState(() => disabled || prefersReducedMotion() || typeof IntersectionObserver === 'undefined');
    // Cuando termina de aparecer se sacan las clases de animación: un transform que queda puesto
    // rompería elementos fijos o pegajosos dentro de la sección.
    const [settled, setSettled] = useState(visible);

    useEffect(() => {
        if (!visible || settled) return undefined;
        const timer = setTimeout(() => setSettled(true), 800 + delay);
        return () => clearTimeout(timer);
    }, [visible, settled, delay]);

    useEffect(() => {
        if (visible || !ref.current) return undefined;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    setVisible(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
        );
        observer.observe(ref.current);
        return () => observer.disconnect();
    }, [visible]);

    return (
        <div
            ref={ref}
            className={settled ? undefined : `transition-[opacity,transform] duration-700 ease-out ${visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}
            style={!settled && delay ? { transitionDelay: `${delay}ms` } : undefined}
        >
            {children}
        </div>
    );
}
