/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ivory: '#F7F1E6',
        linen: '#FCF9F3',
        wax: '#EADFCB',
        hairline: '#D9CBB3',
        caramel: '#A9692F',
        toffee: '#8A5222',
        espresso: '#2E1F17',
        soot: '#1E1410',
        umber: '#6F5546',
        ember: '#E8A93C',
        sage: '#5F6B4E',
        wine: '#8C3B32',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Didot', 'Georgia', 'serif'],
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        page: '78rem',
      },
    },
  },
  plugins: [],
}
