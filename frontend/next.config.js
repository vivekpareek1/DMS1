/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // Server-side only proxy target - not exposed to the browser bundle.
    // In docker-compose this is the backend service name; for plain
    // `next dev` it falls back to localhost.
    const backend = process.env.INTERNAL_API_URL || 'http://localhost:3001';
    return [
      {
        source: '/api/:path*',
        destination: `${backend}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
