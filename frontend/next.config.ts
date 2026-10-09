import type { NextConfig } from "next";

const api = process.env.BACKEND_URL ?? "http://localhost:8000";

const config: NextConfig = {
  turbopack: {
    rules: {
      "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" },
    },
  },
  // /api va al backend en el mismo dominio: cookie de sesión first-party
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${api}/api/:path*` }];
  },
};

export default config;
