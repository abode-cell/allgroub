
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
        source: '/login',
        destination: '/',
        has: [
          {
            type: 'cookie',
            key: 'sb-access-token',
          },
        ],
        permanent: false,
      },
       {
        source: '/signup',
        destination: '/',
        has: [
          {
            type: 'cookie',
            key: 'sb-access-token',
          },
        ],
        permanent: false,
      },
    ]
  },
};

export default nextConfig;
