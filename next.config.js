/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: false,
        has: [
          {
            type: 'cookie',
            key: 'supabase-auth-token',
          },
        ],
      },
      {
        source: '/',
        destination: '/login',
        permanent: false,
        missing: [
          {
            type: 'cookie',
            key: 'supabase-auth-token',
          },
        ],
      },
       {
        source: '/dashboard',
        destination: '/login',
        permanent: false,
        missing: [
          {
            type: 'cookie',
            key: 'supabase-auth-token',
          },
        ],
      },
    ]
  },
};

export default nextConfig;
