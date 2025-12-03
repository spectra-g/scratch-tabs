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
        // SUBTLE BACKGROUND UTILITIES
        '.bg-success-subtle': {
          'background-color': 'rgb(var(--color-success-subtle-bg) / 0.3)',
          'color': 'rgb(var(--color-success-subtle-text))',
          '@media (prefers-color-scheme: light)': {
            'background-color': 'rgb(var(--color-success-subtle-bg))',
          }
        },
        // Note: We need to handle the dark mode class strategy properly
        // The above media query is not enough if we use class strategy
        // Let's use the standard pattern for class-based dark mode

        '.bg-success-subtle': {
          'background-color': 'rgb(var(--color-success-subtle-bg))',
          'color': 'rgb(var(--color-success-subtle-text))',
        },
        '.dark .bg-success-subtle': {
          'background-color': 'rgb(var(--color-success-subtle-bg) / 0.3)',
        },

        '.bg-danger-subtle': {
          'background-color': 'rgb(var(--color-danger-subtle-bg))',
          'color': 'rgb(var(--color-danger-subtle-text))',
        },
        '.dark .bg-danger-subtle': {
          'background-color': 'rgb(var(--color-danger-subtle-bg) / 0.3)',
        },

        '.bg-warning-subtle': {
          'background-color': 'rgb(var(--color-warning-subtle-bg))',
          'color': 'rgb(var(--color-warning-subtle-text))',
        },
        '.dark .bg-warning-subtle': {
          'background-color': 'rgb(var(--color-warning-subtle-bg) / 0.3)',
        },

        '.bg-info-subtle': {
          'background-color': 'rgb(var(--color-info-subtle-bg))',
          'color': 'rgb(var(--color-info-subtle-text))',
        },
        '.dark .bg-info-subtle': {
          'background-color': 'rgb(var(--color-info-subtle-bg) / 0.3)',
        },

        // COMPOSITE INPUT UTILITY (complex styling with focus rings)
        '.input-themed': {
          'background-color': 'rgb(var(--color-input-bg))',
          'border-color': 'rgb(var(--color-input-border))',
          'color': 'rgb(var(--color-input-text))',
          'border-width': '1px',
          '&::placeholder': {
            'color': 'rgb(var(--color-input-placeholder))',
          },
          '&:focus': {
            'outline': 'none',
            '--tw-ring-offset-shadow': 'var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color)',
            '--tw-ring-shadow': 'var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color)',
            'box-shadow': 'var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000)',
            '--tw-ring-color': 'rgb(var(--color-border-focus))',
            'border-color': 'transparent',
          },
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