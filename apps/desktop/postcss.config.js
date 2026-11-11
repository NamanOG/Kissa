module.exports = {
  plugins: [
    require('tailwindcss'),
    // Tailwind's per-element --tw-* defaults become registered properties (see the file).
    require('./scripts/postcss-tw-properties.cjs'),
    require('autoprefixer')
  ]
}
