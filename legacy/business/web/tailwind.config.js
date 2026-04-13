/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                primary: 'var(--color-primary, #6366f1)', // Default to Indigo Vivid
                'zinc-dark': '#09090b',
                'evolution-indigo': '#6366f1',
                border: 'rgba(255, 255, 255, 0.1)',
                background: {
                    DEFAULT: '#09090b',
                    light: '#ffffff',
                    dark: '#09090b',
                },
                accent: {
                    DEFAULT: '#6366f1',
                    foreground: '#ffffff',
                },
            },
            fontFamily: {
                sans: ['Inter', 'Geist Sans', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            backdropBlur: {
                xs: '2px',
            },
            boxShadow: {
                'glow': '0 0 15px -3px rgba(99, 102, 241, 0.3)',
            },
        },
    },
    plugins: [
        require("tailwindcss-animate"),
    ],
}
