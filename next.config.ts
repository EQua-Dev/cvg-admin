import type { NextConfig } from "next";

// The browser only ever talks to this app. /api/* is proxied to cvg-backend,
// so the session cookie is first-party and no CORS is needed.
const API_URL = process.env.CVG_API_URL ?? "http://localhost:8080";

const config: NextConfig = {
  poweredByHeader: false,
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/api/:path*` }];
  },
};

export default config;
