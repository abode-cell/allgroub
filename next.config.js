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
  webpack: (config, { isServer }) => {
    // This is to prevent a webpack error from a Genkit dependency.
    // See: https://github.com/firebase/genkit/issues/495
    if (isServer) {
      config.externals.push('require-in-the-middle');
    }
    return config;
  },
};

module.exports = nextConfig;
