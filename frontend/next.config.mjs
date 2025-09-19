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
  },
};
export default nextConfig;
