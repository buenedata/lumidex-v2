/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.pokemontcg.io',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Exclude filesforinspiration directory from compilation
    config.module.rules.push({
      test: /\.tsx?$/,
      exclude: /filesforinspiration/,
    });
    
    return config;
  },
};

export default nextConfig;