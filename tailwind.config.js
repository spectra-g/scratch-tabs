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
        // Main content area (editor, active tab)
        '.bg-themed': {
          '@apply bg-white dark:bg-gray-800': {},
        },
        // Hover states need to be visible
        '.bg-themed-hover': {
          '@apply hover:bg-slate-100 dark:hover:bg-gray-700': {},
        },
        // Sidebars, modals - off-white to separate from main content
        '.bg-themed-secondary': {
          '@apply bg-slate-50 dark:bg-gray-700': {},
        },
        // Tab bar, secondary surfaces - needs more contrast
        '.bg-themed-tertiary': {
          '@apply bg-slate-200 dark:bg-gray-800': {},
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
      });
    },
  ],
};
