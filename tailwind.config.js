/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enable dark mode based on 'dark' class
  theme: {
    extend: {
      colors: {
        primary: '#4F46E5', // Indigo 600
        secondary: '#6B7280', // Gray 500
        accent: '#EC4899', // Pink 500
        background: {
          light: '#F9FAFB', // Gray 50
          dark: '#111827', // Gray 900
        },
        card: {
          light: '#FFFFFF',
          dark: '#1F2937', // Gray 800
        },
        text: {
          light: '#1F2937', // Gray 800
          dark: '#F9FAFB', // Gray 50
        },
      },
      boxShadow: {
        'subtle': '0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.02)',
        'md-dark': '0 4px 6px rgba(255, 255, 255, 0.05), 0 1px 3px rgba(255, 255, 255, 0.02)',
      },
    },
  },
  plugins: [],
}
