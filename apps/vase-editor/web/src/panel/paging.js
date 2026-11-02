// Números de página a mostrar: siempre la primera, la última y las vecinas de la actual.
export function pageWindow(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
    const pages = new Set([1, total, current - 1, current, current + 1]);
    const list = [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);
    const out = [];
    list.forEach((page, index) => {
        if (index && page - list[index - 1] > 1) out.push('…');
        out.push(page);
    });
    return out;
}
