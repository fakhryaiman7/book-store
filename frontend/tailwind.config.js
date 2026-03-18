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
        primary: "#6C3EB8",       // deep purple — main brand
        "primary-light": "#8B5CF6", // violet — hover states
        "primary-pale": "#F3EEFF", // very pale purple — hero bg / tints
        "primary-mid": "#DDD6FE",  // medium lavender — decorative blocks
        secondary: "#F97316",      // orange — CTA accent
        accent: "#F59E0B",
      },
      fontFamily: {
        sans: ["'Outfit'", "Inter", "ui-sans-serif", "system-ui"],
      },
      boxShadow: {
        card: "0 2px 20px 0 rgba(108, 62, 184, 0.08)",
        "card-hover": "0 8px 32px 0 rgba(108, 62, 184, 0.16)",
      },
    },
  },
  plugins: [],
}
