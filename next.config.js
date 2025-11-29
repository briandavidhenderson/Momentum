/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  // Disable trailing slash for cleaner URLs
  trailingSlash: false,
  // PWA configuration for offline-first
  webpack: (config, { isServer }) => {
    // Exclude firebase/functions directory from Next.js compilation
    config.externals = config.externals || [];
    if (isServer) {
      config.externals.push('firebase-functions', 'firebase-admin');
    }
    return config;
  },
  // Exclude firebase/functions from transpilation
  transpilePackages: [],
  // Explicitly exclude firebase directory
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
}

const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
})

module.exports = withPWA(nextConfig)
