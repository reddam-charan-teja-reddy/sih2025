/** @type {import('next').NextConfig} */

// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com', // This is the hostname for GCS
        port: '',
        pathname: '/**', // Allows any path within that hostname
      },
    ],
    // Disable image optimization for external images to prevent 400 errors
    unoptimized: false,
    // Add error handling for failed optimizations
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Add logging for debugging
  experimental: {
    logging: {
      level: 'verbose',
    },
  },
};
export default nextConfig;
