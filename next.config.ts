import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* Ottimizzazioni per la stabilità del server di sviluppo */
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
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Disabilitiamo temporaneamente alcune funzioni sperimentali che possono causare hang con Turbopack
  experimental: {
    serverSourceMaps: false,
  },
};

export default nextConfig;
