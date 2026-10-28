/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // small Docker image (see Dockerfile)
  poweredByHeader: false,
  experimental: {
    serverComponentsExternalPackages: ['pg'], // keep node-postgres as a normal module (also used by scripts/migrate.mjs)
  },
};
export default nextConfig;
