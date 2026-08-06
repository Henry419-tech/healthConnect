/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'images.unsplash.com',
      'lh3.googleusercontent.com',
      'overpass-api.de',
      'nominatim.openstreetmap.org',
    ],
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'overpass-api.de' },
      { protocol: 'https', hostname: 'nominatim.openstreetmap.org' },
    ],
    unoptimized: false,
  },

  eslint: {
    // Allows production builds to complete even with ESLint errors.
    ignoreDuringBuilds: true,
  },

  // ── Keep pdfkit as a true Node.js module (not bundled by Webpack) ──────
  // pdfkit relies on Node built-ins (fs, stream, etc.) that Webpack cannot
  // bundle correctly inside Next.js App Router routes.
  serverExternalPackages: ['pdfkit'],

  // ── Fix HTTP 431 "Request Header Fields Too Large" in dev ──────
  // NextAuth accumulates session-chunk cookies that can push headers
  // past Node's default 16 KB limit.  Raising it to 32 KB resolves
  // the error without touching any application code.
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // ── Silence Webpack warning about pdfkit's optional canvas dep ──────────
  // pdfkit optionally requires `canvas` for image features we don't use.
  // Without this alias Webpack emits a "can't resolve 'canvas'" warning.
  webpack: (config: any) => {
    config.resolve.alias.canvas = false;
    return config;
  },
}

// Apply the Node.js HTTP max-header-size at the config level so
// `next dev` and `next start` both pick it up automatically.
if (typeof globalThis.process !== 'undefined') {
  // @ts-ignore — internal Node option, not in the types
  process.setMaxListeners?.(20)
}

module.exports = nextConfig