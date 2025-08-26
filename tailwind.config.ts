import type { Config } from 'tailwindcss'

export default {
  content: [
    "./src/**/*.{ts,tsx}",
    "./node_modules/@headlessui/react/dist/*.{js,ts,tsx}",
  ],
  darkMode: ["class"],
  theme: {
    container: { 
      center: true, 
      padding: "1rem" 
    },
    extend: {
      colors: {
        bg: "var(--bg)",
        panel: "var(--panel)",
        panel2: "var(--panel-2)",
        text: "var(--text)",
        muted: "var(--muted)",
        border: "var(--border)",
        brand: "var(--brand)",
        brand2: "var(--brand-2)",
        accent: "var(--accent)",
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
      },
      boxShadow: {
        soft: "var(--shadow)",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
      fontSize: {
        '15': ['15px', { lineHeight: '1.5' }],
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-soft': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      transitionProperty: {
        'height': 'height',
        'spacing': 'margin, padding',
      },
      screens: {
        'xs': '475px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
} satisfies Config