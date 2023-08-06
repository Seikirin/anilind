/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}', // Note the addition of the `app` directory.
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
 
    // Or if using `src` directory:
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      screens: {
        'xs': '570px',
      },
      colors: {
        anilist: {
          50: '#0B1622',
          100: '#151F2E',
          200: '#3DB4F2',
          300: '#11161D',
          400: 'rgb(61,180,242)',
        }
      },
      keyframes: {
        slide: {
          '0%': { transform: 'translateX(-200%)' },
          '100%': { transform: 'translateX(200%)' },
        }
      },
      animation: {
        'slide': 'slide 0.75s linear infinite',
      },
      boxShadow: {
        'xs': '0 0 2px 0.125px',
      }
    },
  },
  plugins: [],
}

