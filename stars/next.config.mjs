/** @type {import('next').NextConfig} */
const headerKeamanan = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  // HSTS hanya berpengaruh di HTTPS (server internet di balik Caddy); di intranet HTTP diabaikan browser.
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Output standalone untuk Docker (deploy/Dockerfile)
  output: "standalone",
  serverExternalPackages: ["@prisma/client", "prisma", "bcryptjs"],
  async headers() {
    return [{ source: "/:path*", headers: headerKeamanan }];
  },
};
export default nextConfig;
