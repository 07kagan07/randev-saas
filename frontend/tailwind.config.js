/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
        },
      },
      fontSize: {
        // "Stupid user" prensibi — minimum 16px body
        base: ['16px', '1.5'],
      },
      minHeight: {
        touch: '48px', // minimum dokunma hedefi
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
