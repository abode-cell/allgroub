/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: false,
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

module.exports = nextConfig;
