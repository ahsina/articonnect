/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

// Check if we're building for Capacitor (mobile apps)
const isMobileBuild = process.env.MOBILE_BUILD === 'true';

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // Enable static export for Capacitor builds
  ...(isMobileBuild && {
    output: 'export',
    trailingSlash: true, // Required for Capacitor routing
  }),

  images: {
    domains: ['localhost', 'articonnect-uploads.s3.eu-west-1.amazonaws.com'],
    // Disable image optimization for static export
    ...(isMobileBuild && {
      unoptimized: true,
    }),
  },

  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
    NEXT_PUBLIC_GOOGLE_MAPS_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY,
    NEXT_PUBLIC_STRIPE_PUBLIC_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY,
  },

  // Exclude e2e tests from build
  typescript: {
    ignoreBuildErrors: false,
  },

  // Webpack configuration for optional dependencies
  webpack: (config, { isServer }) => {
    // Make @sentry/nextjs optional - don't fail if not installed
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@sentry/nextjs': false,
    };

    // Exclude e2e folder from compilation
    config.module.rules.push({
      test: /\.tsx?$/,
      exclude: /e2e/,
    });

    return config;
  },
};

module.exports = withPWA(nextConfig);
