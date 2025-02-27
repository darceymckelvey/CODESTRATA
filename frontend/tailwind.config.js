/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  important: true,
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Geological Theme Primary Colors
        strata: {
          primary: '#3b5375',     // Deep slate blue (like bedrock)
          'primary-light': '#5c7298',
          'primary-dark': '#29384f',
          secondary: '#5d6b7c',   // Medium slate (like shale)
          accent: '#4b9fe0',      // Bright blue (like aquamarine)
          success: '#38b677',     // Green (like malachite)
          warning: '#eab308',     // Amber (like amber)
          danger: '#e24a59',      // Red (like ruby)
          info: '#3d9cf5',        // Light blue (like turquoise)
          gray: {
            50: '#f8fafc',
            100: '#f1f5f9',
            200: '#e2e8f0',
            300: '#cbd5e1',
            400: '#94a3b8',
            500: '#64748b',
            600: '#475569',
            700: '#334155',
            800: '#1e293b',
            900: '#0f172a',
          }
        },
        // Neutral colors (like sedimentary layers)
        text: {
          primary: '#212b36',     // Almost black (like obsidian)
          secondary: '#4e5d6c',   // Dark gray (like slate)
          tertiary: '#637381',    // Medium gray (like limestone)
        },
        surface: {
          light: '#f8fafc',       // Whitish (like chalk)
          dark: '#1a202c',        // Dark (like coal)
          white: '#ffffff',       // Pure white (like quartz)
          border: '#e2e8f0',      // Light gray (like sandstone)
        },
      },
      fontFamily: {
        mono: ['"Fira Code"', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'strata-sm': '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
        'strata-md': '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
        'strata-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'strata-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
      spacing: {
        xxs: '0.25rem',   // 4px
        xs: '0.5rem',     // 8px
        sm: '0.75rem',    // 12px
        md: '1rem',       // 16px
        lg: '1.5rem',     // 24px
        xl: '2rem',       // 32px
        xxl: '3rem',      // 48px
      }
    },
  },
  plugins: [],
  // Disable preflight to avoid conflicts with Angular Material
  corePlugins: {
    preflight: false,
  },
};

