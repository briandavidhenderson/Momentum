/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  // Disable trailing slash for cleaner URLs
  trailingSlash: false,
  // PWA configuration for offline-first
  // Use modern serverExternalPackages instead of webpack config
  serverExternalPackages: ['firebase-admin', 'firebase-functions'],
  // Exclude firebase/functions from transpilation
  transpilePackages: [],
  // Explicitly exclude firebase directory
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
}

// PWA disabled for Next.js 16 / Turbopack compatibility during security update
// const withPWA = require('next-pwa')({
//   dest: 'public',
//   disable: process.env.NODE_ENV === 'development',
//   register: true,
//   skipWaiting: true,
// })

// module.exports = withPWA(nextConfig)
module.exports = nextConfig;
