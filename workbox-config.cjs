module.exports = {
  globDirectory: 'dist',
  globPatterns: [
    '**/*.{js,css,html,ico,png,svg,webp,json}'
  ],
  swDest: 'dist/sw.js',
  navigateFallback: '/index.html',
  ignoreURLParametersMatching: [/^utm_/, /^fbclid$/]
};
