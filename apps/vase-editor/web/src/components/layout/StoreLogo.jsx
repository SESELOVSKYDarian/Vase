// Logo de la tienda, legible en modo claro y oscuro.
// - Logo claro (blanco): en modo claro va sobre una placa oscura; en modo oscuro se ve directo.
// - Si no se pudo medir el logo: en modo claro lleva una sombra fina para que no se pierda sobre blanco.
import { useLogoIsLight } from '../../utils/logoTone';

/**
 * @param {string} src Dirección del logo.
 * @param {string} alt Nombre del negocio.
 * @param {string} [className] Tamaño de la imagen (alto y ancho máximo).
 * @param {boolean} [onDark] true si siempre va sobre fondo oscuro (por ejemplo el pie): ahí no hace falta placa.
 */
export default function StoreLogo({ src, alt, className = 'h-12 w-auto max-w-[220px]', onDark = false }) {
    const isLight = useLogoIsLight(onDark ? null : src);
    const image = <img src={src} alt={alt} className={`${className} object-contain`} />;

    if (onDark) return image;
    if (isLight === true) {
        return (
            <span className="inline-flex items-center rounded-xl bg-[#181411] px-3 py-1.5 shadow-sm ring-1 ring-black/5 transition-colors dark:bg-transparent dark:px-0 dark:py-0 dark:shadow-none dark:ring-0">
                {image}
            </span>
        );
    }
    if (isLight === null) {
        return (
            <span className="inline-flex [filter:drop-shadow(0_0_1px_rgba(0,0,0,0.55))_drop-shadow(0_1px_2px_rgba(0,0,0,0.2))] dark:[filter:none]">
                {image}
            </span>
        );
    }
    return image;
}
