/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Backoffice Supabase Design System
        primary: '#3ecf8e',
        'primary-deep': '#24b47e',
        'primary-soft': '#4ade80',
        // Verde accesible para TEXTO sobre fondos claros (WCAG AA ≈ 5:1)
        'primary-ink': '#1a7f5a',
        ink: '#171717',
        'ink-secondary': '#212121',
        'ink-mute': '#707070',
        'ink-faint': '#b2b2b2',
        'on-primary': '#171717',
        canvas: '#ffffff',
        'canvas-soft': '#fafafa',
        'canvas-night': '#1c1c1c',
        'canvas-night-soft': '#202020',
        // Supabase Auth — superficie oscura split-screen
        'auth-canvas': '#121212',
        'auth-surface': '#171717',
        'auth-elevated': '#1c1c1c',
        'auth-hairline': '#27272a',
        'auth-text': '#fafafa',
        'auth-muted': '#a1a1aa',
        hairline: '#dfdfdf',
        'hairline-strong': '#c7c7c7',
        'hairline-cool': '#ededed',
        // Storefront & error accent colors (with opacity modifier support)
        'retail-red': 'rgb(229 62 62 / <alpha-value>)',
        'retail-orange': '#dd6b20',
        'retail-gold': '#d69e2e',
      },
      fontFamily: {
        sans: ["'Helvetica Neue'", 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      borderRadius: {
        // Backoffice technical radii (6px default)
        DEFAULT: '6px',
        xs: '4px',
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      spacing: {
        xxs: '2px',
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        xxl: '32px',
        huge: '64px',
      },
      fontSize: {
        'display-xxl': ['64px', { lineHeight: '1.1', letterSpacing: '-1.92px', fontWeight: '500' }],
        'display-xl': ['48px', { lineHeight: '1.1', letterSpacing: '-1.44px', fontWeight: '500' }],
        'display-lg': ['36px', { lineHeight: '1.15', letterSpacing: '-0.72px', fontWeight: '500' }],
        'display-md': ['28px', { lineHeight: '1.2', letterSpacing: '-0.42px', fontWeight: '500' }],
        'heading-lg': ['22px', { lineHeight: '1.2', fontWeight: '500' }],
        'heading-md': ['18px', { lineHeight: '1.4', fontWeight: '500' }],
      },
      keyframes: {
        'modal-in': {
          from: { opacity: '0', transform: 'translateY(4px) scale(0.98)' },
          to: { opacity: '1', transform: 'none' },
        },
      },
      animation: {
        'modal-in': 'modal-in 150ms ease-out',
      },
    },
  },
  plugins: [],
};
