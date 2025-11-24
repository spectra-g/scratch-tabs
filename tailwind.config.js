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
    // Custom theme utilities plugin
    function ({ addUtilities }) {
      addUtilities({
        // 1. SURFACES (The Containers)
        // Hierarchy: Toolbar (most gray/dark) → Sidebars (medium) → Content (white/lightest)
        // Light mode: slate-200 → slate-100 → white
        // Dark mode:  gray-900  → gray-850  → gray-800
        '.bg-canvas': {
          '@apply bg-white dark:bg-gray-950': {}, // The body background
        },
        '.bg-surface': {
          '@apply bg-white dark:bg-gray-800 border-slate-200 dark:border-gray-700': {}, // Main content areas (lightest)
        },
        '.bg-surface-secondary': {
          '@apply bg-slate-100 dark:bg-gray-850': {}, // Secondary panels (Sidebars/Headers) - Medium
        },
        '.bg-surface-raised': {
          '@apply bg-slate-200 dark:bg-gray-900': {}, // Top-level chrome (Toolbar) - Most contrast
        },
        '.bg-surface-highlight': {
          '@apply bg-slate-100 dark:bg-gray-800': {}, // Legacy - same as surface now
        },

        // 2. ELEMENTS (The things inside containers)
        '.bg-element': {
          '@apply bg-slate-100 dark:bg-gray-800 border-slate-200 dark:border-gray-700': {}, // Inputs, Secondary areas
        },
        '.bg-element-hover': {
          '@apply hover:bg-slate-200 dark:hover:bg-gray-700': {},
        },
        '.bg-element-active': {
          '@apply bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400': {}, // Active Tabs
        },

        // 3. ACTIONS (Buttons)
        '.bg-primary': {
          '@apply bg-blue-600 hover:bg-blue-700 text-white': {},
        },
        '.bg-info': {
          '@apply bg-cyan-600 hover:bg-cyan-700 text-white': {},
        },
        '.bg-danger': {
          '@apply bg-red-600 hover:bg-red-700 text-white': {},
        },

        // 4. STATUS (Badges & Alerts)
        // Note: We use opacity in dark mode to keep text readable
        '.bg-info-subtle': {
          '@apply bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-200 border border-cyan-200 dark:border-cyan-800': {},
        },
        '.bg-danger-subtle': {
          '@apply bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-200 border border-red-200 dark:border-red-800': {},
        },
        '.bg-success-subtle': {
          '@apply bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-200 border border-green-200 dark:border-green-800': {},
        },
        '.bg-warning-subtle': {
          '@apply bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-800': {},
        },

        // 5. TEXT
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

        // 6. BORDERS
        '.border-base': {
          '@apply border-slate-200 dark:border-gray-700': {},
        },
        '.border-focus': {
          '@apply border-blue-500 dark:border-blue-400': {},
        },
        '.border-info': {
          '@apply border-blue-200 dark:border-blue-800': {},
        },
        '.border-success': {
          '@apply border-green-200 dark:border-green-800': {},
        },
        '.border-warning': {
          '@apply border-yellow-200 dark:border-yellow-800': {},
        },
        '.border-danger': {
          '@apply border-red-200 dark:border-red-800': {},
        },
      });
    },
  ],
};