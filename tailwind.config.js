/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gray: {
          850: "#1f2937", // Example: Between gray-800 and gray-900
        },
      },
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
    require("tailwind-scrollbar"),
    // Custom theme utilities plugin
    function ({ addUtilities }) {
      addUtilities({
        // --- BACKGROUNDS ---
        // Main canvas (Editor, Cards) - Pure White
        '.bg-themed': {
          '@apply bg-white dark:bg-gray-900': {},
        },
        // Hover states need to be visible
        '.bg-themed-hover': {
          '@apply hover:bg-slate-200 dark:hover:bg-gray-700': {},
        },
        // Chrome (Sidebars, Modals, Headers) - Distinct Gray
        '.bg-themed-secondary': {
          '@apply bg-slate-100 dark:bg-gray-800': {},
        },
        // Inputs, Active Items - Darker Gray
        '.bg-themed-tertiary': {
          '@apply bg-slate-200 dark:bg-gray-700': {},
        },

        // --- BORDERS ---
        // Light mode needs darker borders to be visible
        '.border-themed': {
          '@apply border-slate-300 dark:border-gray-700': {},
        },
        '.border-themed-light': {
          '@apply border-slate-200 dark:border-gray-600': {},
        },

        // --- TEXT ---
        // Avoid pure black - use slate-900 for softer contrast
        '.text-themed': {
          '@apply text-slate-900 dark:text-gray-200': {},
        },
        '.text-themed-secondary': {
          '@apply text-slate-600 dark:text-gray-300': {},
        },
        '.text-themed-tertiary': {
          '@apply text-slate-500 dark:text-gray-400': {},
        },
        '.text-themed-muted': {
          '@apply text-slate-400 dark:text-gray-500': {},
        },

        // --- ICONS ---
        '.icon-themed': {
          '@apply text-slate-500 dark:text-gray-400': {},
        },
        '.icon-themed-hover': {
          '@apply hover:text-slate-900 dark:hover:text-gray-300': {},
        },

        // --- INPUTS ---
        // Standardize inputs to avoid the "ghost input" look
        '.input-themed': {
          '@apply bg-white dark:bg-gray-900 border border-slate-300 dark:border-gray-600 text-slate-900 dark:text-gray-100 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent': {},
        },
      });
    },
  ],
};
