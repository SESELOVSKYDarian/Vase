import React, { useEffect, useState } from 'react';
import { ArrowUp, Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function StoreFloatingControls() {
    const { mode, toggleMode } = useTheme();
    const [showTop, setShowTop] = useState(false);
    useEffect(() => {
        const onScroll = () => setShowTop((current) => {
            const next = window.scrollY > 400;
            return current === next ? current : next;
        });
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
        return () => window.removeEventListener('scroll', onScroll);
    }, []);
    return <>
        <button type="button" onClick={toggleMode} aria-label={mode === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'} className="fixed bottom-4 left-4 z-[60] flex h-11 w-11 items-center justify-center rounded-full border border-[#dab6a6] bg-[#fffaf6]/95 text-[#1a1614] shadow-lg backdrop-blur transition-colors duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#ff4d00] dark:bg-[#241d1a] dark:text-[#fffaf6]">
            {mode === 'dark' ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}
        </button>
        {showTop ? <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Volver arriba" className="fixed bottom-4 right-4 z-[60] flex h-11 w-11 items-center justify-center rounded-full bg-[#ff4d00] text-white shadow-lg transition-transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#1a1614]"><ArrowUp size={19} aria-hidden="true" /></button> : null}
    </>;
}
