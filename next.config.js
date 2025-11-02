/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Static export for Firebase Hosting deployment
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Disable trailing slash for cleaner URLs
  trailingSlash: false,
  // PWA configuration for offline-first
  webpack: (config) => {
    return config
  },
}

module.exports = nextConfig
