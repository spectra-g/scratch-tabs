/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gray: {
          850: "#1a202c", // Between gray-800 (#1f2937) and gray-900 (#111827)
        },
      },
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
    require("tailwind-scrollbar"),
    // tailwind.config.js plugins section

    function ({ addUtilities }) {
      addUtilities({
        // 1. SURFACES
        // Fix: Made secondary slightly darker (slate-100) to contrast with white surface
        '.bg-canvas': {
          '@apply bg-slate-50 dark:bg-gray-900': {}, // Light mode canvas is now off-white, not pure white
        },
        '.bg-surface': {
          '@apply bg-white dark:bg-gray-800 border-slate-200 dark:border-gray-700 shadow-sm dark:shadow-none': {}, // Added shadow for depth
        },
        '.bg-surface-secondary': {
          '@apply bg-slate-100 dark:bg-gray-850': {},
        },
        '.bg-surface-highlight': {
          '@apply bg-slate-200 dark:bg-gray-800': {}, // Used for Tab Bar background
        },
        // Toolbar specific - high contrast
        '.bg-surface-raised': {
          '@apply bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-800 shadow-sm z-10': {},
        },
        '.bg-surface-glass': {
          '@apply bg-slate-200/50 dark:bg-gray-800/30': {},
        },
        '.bg-surface-glass-hover': {
          '@apply hover:bg-slate-200/70 dark:hover:bg-gray-800/50': {},
        },

        // 2. ELEMENTS
        '.bg-element': {
          '@apply bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700': {}, // Inputs are white in light mode
        },
        '.bg-element-hover': {
          '@apply hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors cursor-pointer': {},
        },
        '.bg-element-active': {
          '@apply bg-white dark:bg-gray-700 text-slate-900 dark:text-blue-400 border-t-2 border-t-blue-500 dark:border-t-transparent shadow-sm': {},
        },

        // 3. TEXT
        '.text-main': {
          '@apply text-slate-900 dark:text-gray-100': {},
        },
        '.text-secondary': {
          '@apply text-slate-600 dark:text-gray-400': {},
        },
        '.text-muted': {
          '@apply text-slate-400 dark:text-gray-500': {},
        },
        '.text-info': {
          '@apply text-blue-600 dark:text-blue-400': {},
        },
        '.text-success': {
          '@apply text-green-600 dark:text-green-400': {},
        },
        '.text-warning': {
          '@apply text-yellow-600 dark:text-yellow-400': {},
        },
        '.text-danger': {
          '@apply text-red-600 dark:text-red-400': {},
        },

        // 4. BORDERS
        // Fix: Softened light mode borders to slate-200 (was 300) to reduce "grid" look
        '.border-base': {
          '@apply border-slate-200 dark:border-gray-700': {},
        },
        '.border-focus': {
          '@apply border-blue-500 ring-1 ring-blue-500': {},
        },

        // 5. BUTTONS (Action buttons with semantic meaning)
        '.bg-primary': {
          '@apply bg-blue-600 hover:bg-blue-700 text-white': {},
        },
        '.bg-danger': {
          '@apply bg-red-600 hover:bg-red-700 text-white': {},
        },
        '.bg-success': {
          '@apply bg-green-600 hover:bg-green-700 text-white': {},
        },
        '.bg-success-subtle': {
          '@apply bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200': {},
        },
        '.bg-danger-subtle': {
          '@apply bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200': {},
        },
        '.bg-warning-subtle': {
          '@apply bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200': {},
        },
        '.bg-info-subtle': {
          '@apply bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200': {},
        },

        // Semantic Borders
        '.border-danger': {
          '@apply border-red-600 dark:border-red-400': {},
        },
        '.border-success': {
          '@apply border-green-600 dark:border-green-400': {},
        },
        '.border-warning': {
          '@apply border-yellow-600 dark:border-yellow-400': {},
        },
        '.border-info': {
          '@apply border-blue-600 dark:border-blue-400': {},
        },

        // 6. INPUTS (Standardized)
        '.input-field': {
          '@apply bg-white dark:bg-gray-800 text-slate-900 dark:text-gray-100 border border-slate-300 dark:border-gray-700 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400': {},
        },
        '.input-themed': {
          '@apply bg-white dark:bg-gray-900 border border-slate-300 dark:border-gray-600 text-slate-900 dark:text-gray-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent': {},
        }
      });
    },
  ],
};