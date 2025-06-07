
import type {NextConfig} from 'next';

const github_pages_url = 'https://michaelhabib.github.io/IdleGame-ChronoClicker/';

const nextConfig: NextConfig = {
  output: 'export', // Add this line to enable static export
  assetPrefix: process.env.npm_lifecycle_event === 'build-github' ? 'https://michaelhabib.github.io/IdleGame-ChronoClicker/' : '',
  distDir: 'docs', // Change the output directory to 'docs'
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  dangerouslyAllowSVG: true, // Allow SVGs
  contentDispositionType: 'attachment',
  contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
};

export default nextConfig;
