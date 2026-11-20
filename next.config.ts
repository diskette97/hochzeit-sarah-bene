import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Kein serverActions.allowedOrigins nötig: Next vergleicht Origin mit X-Forwarded-Host bzw. Host,
  // und Caddy (reverse_proxy) reicht den öffentlichen Host unverändert durch.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          // Nur Direktiven, die Next-Skripte/Styles nicht berühren. HSTS setzt Caddy (deploy/setup-server.sh).
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
        ],
      },
    ];
  },
};

export default nextConfig;
