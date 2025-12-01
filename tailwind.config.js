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
        // Semantic Design Tokens - Using CSS Variables for proper opacity modifier support
        // 1. SURFACES & ELEMENTS
        canvas: 'rgb(var(--color-canvas) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--color-surface) / <alpha-value>)',
          secondary: 'rgb(var(--color-surface-secondary) / <alpha-value>)',
          highlight: 'rgb(var(--color-surface-highlight) / <alpha-value>)',
          raised: 'rgb(var(--color-surface-raised) / <alpha-value>)',
          glass: 'rgb(var(--color-surface-glass) / <alpha-value>)',
        },
        element: {
          DEFAULT: 'rgb(var(--color-element) / <alpha-value>)',
          hover: 'rgb(var(--color-element-hover) / <alpha-value>)',
          active: 'rgb(var(--color-element-active) / <alpha-value>)',
        },

        // 2. TEXT COLORS
        main: 'rgb(var(--color-text-main) / <alpha-value>)',
        secondary: 'rgb(var(--color-text-secondary) / <alpha-value>)',
        muted: 'rgb(var(--color-text-muted) / <alpha-value>)',
        themed: {
          icon: 'rgb(var(--color-icon-themed) / <alpha-value>)',
        },

        // 3. BORDERS
        base: 'rgb(var(--color-border-base) / <alpha-value>)',
        focus: 'rgb(var(--color-border-focus) / <alpha-value>)',

        // 4. STATUS COLORS (Auto-generates text-*, bg-*, border-* utilities with opacity support)
        primary: 'rgb(var(--color-primary) / <alpha-value>)',
        info: 'rgb(var(--color-info) / <alpha-value>)',
        success: 'rgb(var(--color-success) / <alpha-value>)',
        warning: 'rgb(var(--color-warning) / <alpha-value>)',
        danger: 'rgb(var(--color-danger) / <alpha-value>)',
      },
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
    require("tailwind-scrollbar"),

    // Composite utility classes for complex styling
    // Note: Basic semantic colors (bg-surface, text-main, border-base, text-success, etc.)
    // are auto-generated from extend.colors above and support opacity modifiers
    // Only define utilities here that combine multiple properties or need special logic
    function ({ addUtilities }) {
      addUtilities({
        // SUBTLE BACKGROUND UTILITIES (kept here due to complex light/dark combinations)
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

        // COMPOSITE INPUT UTILITY (complex styling with focus rings)
        '.input-themed': {
          '@apply bg-white dark:bg-gray-900 border border-slate-300 dark:border-gray-600 text-slate-900 dark:text-gray-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent': {},
        },

        // LEGACY COMPATIBILITY / INTERACTIVE ELEMENT UTILITIES
        '.bg-element-hover': {
          'transition': 'colors 150ms',
          'cursor': 'pointer',
          '&:hover': {
            'background-color': 'rgb(var(--color-element-hover))',
          },
        },



        // ICON COLOR UTILITY (updated to use CSS variable)
        '.icon-themed': {
          'color': 'rgb(var(--color-icon-themed))',
        },
      });
    },
  ],
};