/**
 * Menyiapkan berkas .env untuk pemula: salin dari .env.example bila belum ada,
 * lalu isi AUTH_SECRET acak bila masih placeholder. Dipanggil oleh jalankan-*.bat.
 */
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const root = path.join(__dirname, "..");
const envPath = path.join(root, ".env");
if (!fs.existsSync(envPath)) {
  fs.copyFileSync(path.join(root, ".env.example"), envPath);
  console.log("[env] .env dibuat dari .env.example");
}
let isi = fs.readFileSync(envPath, "utf8");
if (!/^AUTH_SECRET=.+/m.test(isi) || /AUTH_SECRET="?(ganti|isi)[^"\n]*"?/i.test(isi)) {
  const rahasia = crypto.randomBytes(32).toString("base64");
  isi = /^AUTH_SECRET=.*$/m.test(isi) ? isi.replace(/^AUTH_SECRET=.*$/m, `AUTH_SECRET="${rahasia}"`) : `${isi.trimEnd()}\nAUTH_SECRET="${rahasia}"\n`;
  fs.writeFileSync(envPath, isi);
  console.log("[env] AUTH_SECRET acak dibuat");
}
if (/SUPERADMIN_PASSWORD="?(ganti|isi)/i.test(isi)) {
  console.warn("[env] PERHATIAN: SUPERADMIN_PASSWORD masih placeholder. Ubah di .env sebelum login pertama.");
}
