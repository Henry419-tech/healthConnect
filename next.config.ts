/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'images.unsplash.com', 
      'lh3.googleusercontent.com', 
      'overpass-api.de', 
      'nominatim.openstreetmap.org'
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'overpass-api.de',
      },
      {
        protocol: 'https',
        hostname: 'nominatim.openstreetmap.org',
      }
    ],
    unoptimized: false,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
}

module.exports = nextConfig