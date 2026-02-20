
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
                background: "var(--background)",
                foreground: "var(--foreground)",
                primary: {
                    DEFAULT: "#1392ec",
                    hover: "#0e7ac7",
                },
                surface: {
                    light: "#ffffff",
                    dark: "#1c2b36",
                },
                text: {
                    main: "#0f172a",
                    sub: "#64748b",
                }
            },
            fontFamily: {
                display: ["var(--font-lexend)", "sans-serif"],
                body: ["var(--font-noto)", "sans-serif"],
            },
            boxShadow: {
                'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
                'float': '0 10px 40px -10px rgba(19, 146, 236, 0.4)',
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'gradient-conic':
                    'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
            },
        },
    },
    plugins: [],
};
export default config;
