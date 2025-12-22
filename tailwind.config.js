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
          'tab-bar': 'rgb(var(--color-surface-tab-bar) / <alpha-value>)',
        },
        element: {
          DEFAULT: 'rgb(var(--color-element) / <alpha-value>)',

          hover: 'rgb(var(--color-element-hover) / <alpha-value>)',
          active: 'rgb(var(--color-element-active) / <alpha-value>)',
          'tab-active': 'rgb(var(--color-element-tab-active) / <alpha-value>)',
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
        // 5. DATA TOKENS (Syntax Highlighting)
        token: {
          string: 'rgb(var(--color-token-string) / <alpha-value>)',
          number: 'rgb(var(--color-token-number) / <alpha-value>)',
          boolean: 'rgb(var(--color-token-boolean) / <alpha-value>)',
          key: 'rgb(var(--color-token-key) / <alpha-value>)',
          keyword: 'rgb(var(--color-token-keyword) / <alpha-value>)',
        },
      },
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            '--tw-prose-body': theme('colors.main'),
            '--tw-prose-headings': theme('colors.main'),
            '--tw-prose-lead': theme('colors.secondary'),
            '--tw-prose-links': theme('colors.primary'),
            '--tw-prose-bold': theme('colors.main'),
            '--tw-prose-counters': theme('colors.secondary'),
            '--tw-prose-bullets': theme('colors.secondary'),
            '--tw-prose-hr': theme('colors.border.base'),
            '--tw-prose-quotes': theme('colors.main'),
            '--tw-prose-quote-borders': theme('colors.border.base'),
            '--tw-prose-captions': theme('colors.secondary'),
            '--tw-prose-code': theme('colors.main'),
            '--tw-prose-pre-code': theme('colors.main'),
            '--tw-prose-pre-bg': theme('colors.surface.secondary'),
            '--tw-prose-th-borders': theme('colors.border.base'),
            '--tw-prose-td-borders': theme('colors.border.base'),
            // Dark mode overrides are handled automatically if we use the same variables, 
            // but prose-invert uses --tw-prose-invert-*.
            // Since we are using CSS variables that switch values, we might not even need prose-invert 
            // if we map --tw-prose-* to OUR variables.
            // However, prose-invert sets --tw-prose-body to --tw-prose-invert-body.
            // So we should map those too or just rely on our variables switching.
            // If we map --tw-prose-body to theme('colors.main'), and colors.main uses var(--color-text-main),
            // and var(--color-text-main) switches in .dark, then we don't need prose-invert class at all!
            // We just need 'prose'.
          },
        },
      }),
    },
  },
  plugins: [
    require("@tailwindcss/typography")({
      className: 'prose',
      target: 'legacy', // or 'modern' - default is 'modern' in v3 but let's stick to default or just configure theme
    }),
    // Actually, the standard way to configure typography colors is via the theme section, not the plugin require.
    // But we can also pass options if needed.
    // The critique said: "Configure the typography plugin in tailwind.config.js to map prose-headings, prose-body, etc., to your CSS variables."
    // This is done in theme.extend.typography.
    require("tailwind-scrollbar"),

    // Composite utility classes for complex styling
    // Note: Basic semantic colors (bg-surface, text-main, border-base, text-success, etc.)
    // are auto-generated from extend.colors above and support opacity modifiers
    // Only define utilities here that combine multiple properties or need special logic
    function ({ addUtilities }) {
      addUtilities({
        // SUBTLE BACKGROUND UTILITIES
        '.bg-success-subtle': {
          'background-color': 'rgb(var(--color-success-subtle-bg) / var(--bg-opacity-subtle))',
          'color': 'rgb(var(--color-success-subtle-text))',
        },
        '.bg-danger-subtle': {
          'background-color': 'rgb(var(--color-danger-subtle-bg) / var(--bg-opacity-subtle))',
          'color': 'rgb(var(--color-danger-subtle-text))',
        },
        '.bg-warning-subtle': {
          'background-color': 'rgb(var(--color-warning-subtle-bg) / var(--bg-opacity-subtle))',
          'color': 'rgb(var(--color-warning-subtle-text))',
        },
        '.bg-info-subtle': {
          'background-color': 'rgb(var(--color-info-subtle-bg) / var(--bg-opacity-subtle))',
          'color': 'rgb(var(--color-info-subtle-text))',
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