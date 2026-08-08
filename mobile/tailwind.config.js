/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./{app,components,constants,hooks}/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {},
  },
  plugins: [],
}
