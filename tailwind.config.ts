import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "#FDF6EC", // brand.cream
                foreground: "#1C1917", // brand.warm
                primary: {
                    DEFAULT: "#F59E0B", // brand.amber
                    hover: "#D97706",
                },
                surface: {
                    light: "#ffffff",
                    dark: "#f2efe9",
                },
                text: {
                    main: "#1C1917",
                    sub: "#475569", // brand.slate
                },
                brand: {
                    amber: '#F59E0B',
                    sage: '#6B7F6E',
                    slate: '#475569',
                    cream: '#FDF6EC',
                    warm: '#1C1917',
                }
            },
            fontFamily: {
                display: ["var(--font-dm-serif)", "serif"],
                body: ["var(--font-inter)", "sans-serif"],
            },
            boxShadow: {
                'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
                // Replacing 'float' cyan shadow with a neutral one to match flat design
                'float': '0 10px 40px -10px rgba(0, 0, 0, 0.1)',
            }
        },
    },
    plugins: [],
};
export default config;
