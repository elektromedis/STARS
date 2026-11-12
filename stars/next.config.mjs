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
  serverExternalPackages: ["@prisma/client", "prisma", "bcryptjs"],
  experimental: {
    // Foto lapor kerusakan maks 5 MB lewat server action (bawaan Next hanya 1 MB).
    serverActions: { bodySizeLimit: "6mb" },
    // Unggahan ke /api/admin melewati middleware; bawaannya memotong badan permintaan di 10 MB.
    middlewareClientMaxBodySize: "20mb",
  },
  async headers() {
    return [{ source: "/:path*", headers: headerKeamanan }];
  },
};
export default nextConfig;
