module.exports = {
  content: [
    './src/**/*.{html,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        text: 'var(--text)',
        secondary: 'var(--secondary)',
        link: 'var(--link)',
        accent: 'var(--accent)',
      },
    },
  },
  plugins: [],
};