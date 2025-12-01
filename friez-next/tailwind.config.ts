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
                brand: {
                    red: "#e71e26",
                    khaki: "#fbae29",
                    salmon: "#ff9686",
                    dark: "#050505",
                    grey: "#2f2f2f",
                    white: "#ffffff",
                },
            },
            fontFamily: {
                fraunces: ["Fraunces", "serif"],
                oswald: ["Oswald", "sans-serif"],
                montserrat: ["Montserrat", "sans-serif"],
            },
        },
    },
    plugins: [],
};
export default config;
