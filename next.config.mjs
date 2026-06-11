/** @type {import('next').NextConfig} */
const nextConfig = {
  generateBuildId: async () => `build-${Date.now()}`,
  transpilePackages: ["framer-motion"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" }
    ]
  },
  async headers() {
    return [
      {
        // HTML pages — always revalidate so browsers never serve stale bundles
        source: "/((?!_next|api|favicon|.*\\..*).+)",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
