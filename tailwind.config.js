/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Aesthetic from prototype mockups: Clean, modern, medical-spa/wellness
        app: {
          bg: '#f8f9fa',
          sidebar: '#ffffff',
          text: {
            primary: '#1d2125',
            secondary: '#5e6c7c',
            muted: '#7a828a'
          },
          mint: {
            50: '#fdf2f8',
            100: '#fce7f3', // Light pink fill
            200: '#fbcfe8', // Vibrant pink accent
            250: '#f9a8d4', // Brighter pink accent
            DEFAULT: '#db2777', // Vibrant pink primary
            600: '#be185d',
            700: '#9d174d'
          },
          pink: {
            50: '#fef2f2',
            100: '#fee2e2', // Light red fill
            250: '#fca5a5', // Medium red accent
            DEFAULT: '#dc2626', // Clear danger red
            600: '#b91c1c'
          },
          peach: {
            50: '#fdf6ee',
            100: '#fde8d8', // Soft warning fill
            DEFAULT: '#9a5b1e', // Warm brown text
            600: '#7d4816'
          },
          sky: {
            50: '#f0f7fd',
            100: '#dceefb', // Soft info fill
            DEFAULT: '#1e5a8a', // Deep info blue text
            600: '#174870'
          },
          lavender: {
            50: '#f6f2fc',
            100: '#e8def8', // Soft admin fill
            DEFAULT: '#5b3a8a', // Deep purple text
            600: '#4a2e70'
          },
          gray: {
            50: '#f8f9fa',
            100: '#f0f2f4', // Table headers, inactive button fill
            200: '#e1e4e6',
            300: '#d0d5d9',
            500: '#7a828a', // Inactive text/icons
            700: '#4d5358'
          }
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      fontSize: {
        // Escala tipográfica mínima legible (nada por debajo de 11px)
        '2xs': ['11px', { lineHeight: '14px' }],
        xs: ['12px', { lineHeight: '16px' }],
        sm: ['13px', { lineHeight: '18px' }],
        base: ['14px', { lineHeight: '20px' }],
        lg: ['16px', { lineHeight: '24px' }],
        xl: ['18px', { lineHeight: '26px' }],
        '2xl': ['22px', { lineHeight: '28px' }],
      }
    },
  },
  plugins: [],
}
