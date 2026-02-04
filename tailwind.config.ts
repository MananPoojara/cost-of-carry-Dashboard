import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        'bloomberg-cyan': '#00e5ff',
        'bloomberg-amber': '#ffab00',
        'bloomberg-emerald': '#00ffa3',
        'bloomberg-ruby': '#ff3d71',
        'glass-bg': 'rgba(13, 17, 23, 0.7)',
        'glass-border': 'rgba(255, 255, 255, 0.05)',
      },
    },
  },
  plugins: [],
};
export default config;
