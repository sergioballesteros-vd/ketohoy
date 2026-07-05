import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'prod-mercadona.imgix.net' },
    ],
  },
};

export default nextConfig;
