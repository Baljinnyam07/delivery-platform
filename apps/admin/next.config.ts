import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Admin is fully per-user and dynamic; plain dynamic rendering keeps it simple.
  transpilePackages: ["@delivery/shared"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
