/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        mist: '#EFF7F7',
        mistDeep: '#E1F0EF',
        ink: '#223238',
        inkSoft: '#5A6B70',
        aqua: {
          light: '#8FE3EE',
          DEFAULT: '#4FBFD6',
          deep: '#1C7293',
        },
        coral: {
          light: '#FFA98F',
          DEFAULT: '#FF7A5C',
          deep: '#E85F42',
        },
        sunshine: '#FFC857',
        card: '#FFFFFF',
      },
      fontFamily: {
        hand: ['"Kalam"', 'cursive'],
        body: ['"Nunito"', 'sans-serif'],
      },
      borderRadius: {
        blob: '255px 15px 225px 15px / 15px 225px 15px 255px',
      },
      boxShadow: {
        soft: '0 8px 24px -8px rgba(28, 114, 147, 0.25)',
        card: '0 10px 30px -12px rgba(34, 50, 56, 0.18)',
      },
    },
  },
  plugins: [],
}
