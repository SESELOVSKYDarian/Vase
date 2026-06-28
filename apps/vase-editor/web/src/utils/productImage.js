const escapeSvgText = (value) =>
    String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const toDataUri = (svg) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;

export const createPlaceholderImage = ({
    label = 'Producto',
    width = 600,
    height = 600,
    background = '#f5f2f0',
    foreground = '#8a7560',
} = {}) => {
    const safeLabel = escapeSvgText(label);
    const safeWidth = Number(width) || 600;
    const safeHeight = Number(height) || safeWidth;
    const fontSize = Math.max(18, Math.round(Math.min(safeWidth, safeHeight) * 0.09));

    return toDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" width="${safeWidth}" height="${safeHeight}" viewBox="0 0 ${safeWidth} ${safeHeight}">
            <rect width="100%" height="100%" fill="${background}" />
            <text
                x="50%"
                y="50%"
                fill="${foreground}"
                font-family="Arial, sans-serif"
                font-size="${fontSize}"
                font-weight="700"
                text-anchor="middle"
                dominant-baseline="middle"
            >
                ${safeLabel}
            </text>
        </svg>
    `);
};

export const PRODUCT_PLACEHOLDER_IMAGE = createPlaceholderImage({ label: 'Producto', width: 600, height: 600 });
