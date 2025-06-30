import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
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
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      // This is a workaround for a webpack issue with the handlebars library.
      // It forces webpack to use the pre-compiled browser-friendly version.
      'handlebars': 'handlebars/dist/handlebars.js',
    };
    return config;
  },
};

export default nextConfig;
