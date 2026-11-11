import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1rem", screens: { "2xl": "1360px" } },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        // Palet STARS (navy + teal, mengikuti logo)
        navy: {
          50: "#EEF3F9", 100: "#D6E2F0", 200: "#A9C0DD", 300: "#6F95C2", 400: "#3F6DA3",
          500: "#25507F", 600: "#173B63", 700: "#102E4F", 800: "#0B2545", 900: "#071A32", 950: "#04101F",
        },
        teal: {
          50: "#E8FAFA", 100: "#C5F2F2", 200: "#92E4E6", 300: "#5CD0D5", 400: "#2FB8BF",
          500: "#14A0A8", 600: "#0E8089", 700: "#0F666E", 800: "#11525A", 900: "#0F454B",
        },
      },
      borderRadius: { lg: "var(--radius)", md: "calc(var(--radius) - 2px)", sm: "calc(var(--radius) - 4px)" },
      fontFamily: { sans: ["var(--font-sans)", "system-ui", "sans-serif"] },
      boxShadow: { card: "0 1px 2px rgba(11,37,69,0.04), 0 4px 16px rgba(11,37,69,0.05)" },
    },
  },
  plugins: [animate],
};
export default config;
