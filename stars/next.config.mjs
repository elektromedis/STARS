/** @type {import('next').NextConfig} */
const headerKeamanan = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" }, // kamera untuk tombol Scan QR
  { key: "X-DNS-Prefetch-Control", value: "off" },
  // HSTS hanya berpengaruh di HTTPS (server internet di balik Caddy); di intranet HTTP diabaikan browser.
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Output standalone untuk Docker (deploy/Dockerfile)
  output: "standalone",
  serverExternalPackages: ["@prisma/client", "prisma", "bcryptjs", "qrcode"],
  experimental: {
    // Server action (formulir admin) — bawaan Next hanya 1 MB. Lapor Kerusakan (foto 5 MB + video 20 MB) memakai /api/lapor.
    serverActions: { bodySizeLimit: "6mb" },
    // Unggahan ke /api/admin melewati middleware; bawaannya memotong badan permintaan di 10 MB (dokumen alat maks 30 MB).
    middlewareClientMaxBodySize: "32mb",
  },
  async headers() {
    return [{ source: "/:path*", headers: headerKeamanan }];
  },
};
export default nextConfig;
