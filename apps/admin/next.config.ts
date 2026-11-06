import type { NextConfig } from "next";

// Baseline security headers for an internal admin tool.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" }, // never embeddable (clickjacking)
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" }, // admin must not be indexed
];

const nextConfig: NextConfig = {
  // Admin is fully per-user and dynamic; plain dynamic rendering keeps it simple.
  transpilePackages: ["@delivery/shared"],
  poweredByHeader: false,
  headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
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
