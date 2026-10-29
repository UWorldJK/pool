import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      "/app/:path*",
      "/sign-in",
      "/sign-up",
      "/forgot-password",
      "/reset-password",
      "/auth/:path*",
    ].map((source) => ({
      source,
      headers: Object.entries({
        "Cache-Control":
          "private, no-cache, no-store, must-revalidate, max-age=0",
        "CDN-Cache-Control": "no-store",
        "Vercel-CDN-Cache-Control": "no-store",
        Pragma: "no-cache",
        Expires: "0",
        "Referrer-Policy": "strict-origin",
      }).map(([key, value]) => ({ key, value })),
    }));
  },
};

export default nextConfig;
