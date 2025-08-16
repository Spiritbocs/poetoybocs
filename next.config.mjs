/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Support static export for Electron builds
  trailingSlash: true,
  output: process.env.NODE_ENV === 'production' && process.env.BUILD_STATIC ? 'export' : undefined,
  distDir: process.env.BUILD_STATIC ? 'out' : '.next',
}

export default nextConfig
