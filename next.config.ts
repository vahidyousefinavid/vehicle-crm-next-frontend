import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    const apiBase = process.env.DOMAIN_API || 'http://localhost:3011';
    return [
      { source: '/api/:path*', destination: `${apiBase}/:path*` },
    ];
  },
};

export default nextConfig;
