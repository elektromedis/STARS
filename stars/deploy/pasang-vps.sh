#!/usr/bin/env bash
# ============================================================
# STARS - pasang & rawat server cloud (VPS Ubuntu/Debian), dijalankan sebagai root.
# Biasanya dipanggil dari laptop lewat deploy\vps.bat. Panduan: docs/PINDAH-KE-CLOUD.md
#
#   bash pasang-vps.sh siapkan [URL]   pasang Docker, Tailscale, firewall, kode, .env baru, lalu nyalakan STARS
#   bash pasang-vps.sh pindah          muat data /root/stars-pindahan.tgz + pindahkan alamat .ts.net ke VPS ini
#   bash pasang-vps.sh alamat          (ulang) pindahkan alamat .ts.net ke VPS ini saja
#   bash pasang-vps.sh perbarui        ambil kode terbaru dari GitHub, cadangkan, bangun ulang
#   bash pasang-vps.sh cadangan        salin basis data + berkas unggahan ke /root/cadangan-stars (14 terakhir)
#   bash pasang-vps.sh pulihkan FILE   kembalikan data dari berkas cadangan/pindahan (.tgz)
#   bash pasang-vps.sh status          ringkasan keadaan server
#
# Aman dijalankan berulang kali. STARS hanya mendengar di 127.0.0.1:3000 dan dibuka
# dari internet lewat Tailscale Funnel (HTTPS) - port 3000 tidak terbuka ke publik.
# ============================================================
set -euo pipefail

REPO="${STARS_REPO:-elektromedis/STARS}"
DIR="${STARS_DIR:-/opt/STARS}"
DEPLOY="$DIR/stars/deploy"
CADANGAN="${STARS_CADANGAN:-/root/cadangan-stars}"
PINDAHAN="${STARS_PINDAHAN:-/root/stars-pindahan.tgz}"
SIMPAN=14
VOL_DATA=stars_stars_data
VOL_UNGGAH=stars_stars_uploads

info()  { printf '\n[STARS] %s\n' "$*"; }
ok()    { printf '[OK] %s\n' "$*"; }
awas()  { printf '[PERHATIAN] %s\n' "$*"; }
gagal() { printf '[GAGAL] %s\n' "$*" >&2; exit 1; }
enter() { read -r -p "$1" _ </dev/tty; }
dc()    { (cd "$DEPLOY" && docker compose --env-file .env "$@"); }

cek_root() { [ "$(id -u)" -eq 0 ] || gagal "Jalankan sebagai root (atau: sudo bash $0 ...)."; }

# Tulis KUNCI=NILAI di deploy/.env (mengganti baris lama, termasuk yang masih dikomentari).
ganti() {
  local f="$DEPLOY/.env" k="$1" v="$2"
  if grep -qE "^#? ?$k=" "$f"; then sed -i -E "s|^#? ?$k=.*|$k=$v|" "$f"; else printf '%s=%s\n' "$k" "$v" >> "$f"; fi
}
nilai_env() { grep -E "^$1=" "$DEPLOY/.env" 2>/dev/null | tail -n 1 | cut -d= -f2- | tr -d '\r" ' || true; }

tunggu_app() {
  local kode
  for _ in $(seq 1 90); do
    kode=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1:3000/ || true)
    case "$kode" in 2??|3??) ok "STARS menjawab di VPS (HTTP $kode)."; return 0 ;; esac
    sleep 2
  done
  awas "STARS belum menjawab setelah 3 menit. Lihat log: cd $DEPLOY && docker compose logs --tail 80 app"
  return 1
}

kunci_github() {
  local k="$HOME/.ssh/stars_github"
  mkdir -p "$HOME/.ssh" && chmod 700 "$HOME/.ssh"
  [ -f "$k" ] || ssh-keygen -q -t ed25519 -N "" -C "stars-vps" -f "$k"
  if ! grep -q 'stars_github' "$HOME/.ssh/config" 2>/dev/null; then
    printf 'Host github.com\n  IdentityFile %s\n  IdentitiesOnly yes\n  StrictHostKeyChecking accept-new\n' "$k" >> "$HOME/.ssh/config"
    chmod 600 "$HOME/.ssh/config"
  fi
  until git ls-remote "git@github.com:$REPO.git" >/dev/null 2>&1; do
    echo
    awas "Repo GitHub $REPO bersifat privat - VPS perlu izin BACA:"
    echo "  1. Buka https://github.com/$REPO/settings/keys/new"
    echo "  2. Title: STARS VPS     Key: salin SATU baris di bawah ini"
    echo "  3. JANGAN centang 'Allow write access', lalu klik Add key"
    echo
    cat "$k.pub"
    echo
    enter "Tekan Enter setelah kunci ditambahkan (Ctrl+C untuk batal)... "
  done
  ok "VPS bisa membaca repo GitHub."
}

siapkan() {
  local url="${1:-}" port p
  command -v apt-get >/dev/null || gagal "Skrip ini untuk Ubuntu/Debian."

  info "1/8 Memperbarui sistem & memasang alat dasar..."
  export DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=a
  apt-get update -q
  apt-get -y -q -o Dpkg::Options::=--force-confold upgrade
  apt-get install -y -q curl git openssl ufw jq ca-certificates cron tzdata
  timedatectl set-timezone Asia/Jakarta 2>/dev/null || true

  info "2/8 Swap (cadangan RAM agar proses build tidak kehabisan memori)..."
  if [ -z "$(swapon --noheadings 2>/dev/null)" ]; then
    fallocate -l 2G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none
    chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
    grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
    ok "Swap 2 GB dibuat."
  else
    ok "Swap sudah ada."
  fi

  info "3/8 Docker..."
  command -v docker >/dev/null || curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker >/dev/null 2>&1 || true
  docker compose version >/dev/null || gagal "docker compose tidak tersedia."
  ok "$(docker --version)"

  info "4/8 Tailscale & firewall..."
  command -v tailscale >/dev/null || curl -fsSL https://tailscale.com/install.sh | sh
  port=$(sshd -T 2>/dev/null | awk '$1=="port"{print $2}' || true)
  [ -n "$port" ] || port=$(echo "${SSH_CONNECTION:-}" | awk '{print $4}')
  [ -n "$port" ] || port=22
  for p in $port; do ufw allow "$p/tcp" >/dev/null; done
  ufw --force enable >/dev/null
  ok "Firewall aktif: hanya SSH (port $(echo "$port" | tr '\n' ' ' | sed 's/ $//')) yang terbuka dari internet."

  info "5/8 Kode STARS dari GitHub ($REPO)..."
  if [ -d "$DIR/.git" ]; then
    ok "Kode sudah ada di $DIR (pakai 'perbarui' untuk versi terbaru)."
  elif GIT_TERMINAL_PROMPT=0 git ls-remote "https://github.com/$REPO.git" >/dev/null 2>&1; then
    git clone "https://github.com/$REPO.git" "$DIR"
  else
    kunci_github
    git clone "git@github.com:$REPO.git" "$DIR"
  fi
  [ -f "$DEPLOY/docker-compose.yml" ] || gagal "$DEPLOY/docker-compose.yml tidak ditemukan - repo tidak sesuai."

  info "6/8 Berkas rahasia deploy/.env..."
  if [ -f "$DEPLOY/.env" ]; then
    ok ".env sudah ada - rahasia tidak diubah."
  else
    cp "$DEPLOY/.env.example" "$DEPLOY/.env"
    ganti AUTH_SECRET "$(openssl rand -hex 32)"
    ganti SYNC_TOKEN "$(openssl rand -hex 24)"
    ganti SUPERADMIN_PASSWORD "$(openssl rand -hex 12)"
    ganti APP_PORT "127.0.0.1:3000"
    ganti STARS_MODE intranet
    ok ".env dibuat dengan rahasia acak BARU (rahasia lama di laptop tidak dipakai)."
  fi
  chmod 600 "$DEPLOY/.env"
  if [ -n "$url" ]; then
    if [[ "$url" =~ ^https://[A-Za-z0-9.-]+(:[0-9]+)?/?$ ]]; then ganti STARS_URL_PUBLIK "${url%/}"; ok "Alamat publik: ${url%/}"
    else awas "Alamat publik '$url' diabaikan (harus https://...)."; fi
  fi
  case "$(nilai_env APP_PORT)" in 127.0.0.1:*) ;; *) awas "APP_PORT di .env bukan 127.0.0.1:... - port STARS terbuka ke internet tanpa HTTPS!" ;; esac
  [ "$(nilai_env STARS_MODE)" = "internet" ] && awas "STARS_MODE=internet membuat server BACA SAJA. Untuk server utama pakai STARS_MODE=intranet."

  info "7/8 Membangun & menyalakan STARS (pertama kali 5-15 menit)..."
  dc up -d --build
  tunggu_app || true

  info "8/8 Jadwal cadangan harian pukul 02:30 WIB..."
  cat > /etc/cron.d/stars-cadangan <<EOF
# STARS: cadangan harian basis data + unggahan (dibuat pasang-vps.sh)
30 2 * * * root bash $DEPLOY/pasang-vps.sh cadangan >> /var/log/stars-cadangan.log 2>&1
EOF
  chmod 644 /etc/cron.d/stars-cadangan
  ok "Cadangan otomatis tersimpan di $CADANGAN ($SIMPAN terakhir)."

  echo
  echo "=========================================================="
  echo " VPS SIAP. STARS sudah hidup di VPS (data masih kosong dan"
  echo " belum bisa dibuka dari luar - itu normal)."
  printf '%s\n' ' Berikutnya, di luar jam kerja: laptop -> deploy\vps.bat -> menu 2.'
  [ -f /var/run/reboot-required ] && echo " Catatan: VPS minta restart (pembaruan kernel) - boleh 'reboot' setelah menu 2 selesai."
  echo "=========================================================="
}

cadangan() {
  local nama jalan=0 rc=0
  docker volume inspect "$VOL_DATA" >/dev/null 2>&1 || gagal "Belum ada data STARS di VPS ini."
  mkdir -p "$CADANGAN" && chmod 700 "$CADANGAN"
  nama="stars-$(date +%Y%m%d-%H%M%S).tgz"
  if dc ps --status running --services 2>/dev/null | grep -x app >/dev/null; then jalan=1; fi
  # Jeda sebentar (beberapa detik) agar basis data tidak berubah selama disalin.
  [ "$jalan" = 1 ] && dc pause app >/dev/null
  docker run --rm -v "$VOL_DATA:/data:ro" -v "$VOL_UNGGAH:/uploads:ro" -v "$CADANGAN:/out" alpine \
    tar czf "/out/$nama" -C / data uploads || rc=$?
  [ "$jalan" = 1 ] && dc unpause app >/dev/null
  if [ "$rc" != 0 ]; then rm -f "${CADANGAN:?}/$nama"; gagal "Cadangan gagal (kode $rc)."; fi
  ln -sfn "$nama" "$CADANGAN/terbaru.tgz"
  # shellcheck disable=SC2012
  ls -1t "$CADANGAN"/stars-*.tgz | tail -n +$((SIMPAN + 1)) | xargs -r rm -f
  ok "Cadangan: $CADANGAN/$nama ($(du -h "$CADANGAN/$nama" | cut -f1))"
}

pulihkan() {
  local berkas="$1"
  [ -f "$berkas" ] || gagal "Berkas $berkas tidak ada."
  berkas=$(readlink -f "$berkas")
  [ -f "$DEPLOY/.env" ] || gagal "VPS belum disiapkan - jalankan 'siapkan' dulu."
  tar tzf "$berkas" 2>/dev/null | grep -x 'data/stars.db' >/dev/null || gagal "$berkas bukan paket data STARS (tidak berisi data/stars.db)."
  if docker volume inspect "$VOL_DATA" >/dev/null 2>&1; then
    info "Mencadangkan data VPS yang sekarang dulu (untuk berjaga-jaga)..."
    cadangan
  fi
  info "Memuat data dari $berkas ..."
  dc stop app
  docker run --rm -v "$VOL_DATA:/data" -v "$VOL_UNGGAH:/uploads" -v "$berkas:/in/paket.tgz:ro" alpine sh -c \
    'rm -rf /data/* /uploads/* && tar xzf /in/paket.tgz -C / && chown -R 1001:1001 /data /uploads && du -sh /data/stars.db && echo "berkas unggahan: $(find /uploads -type f | wc -l)"'
  dc up -d
  tunggu_app
}

pasang_alamat() {
  local url host mesin dns _
  url=$(nilai_env STARS_URL_PUBLIK)
  host=$(echo "$url" | sed -E 's#^https?://##; s#[:/].*$##')
  if [[ "$host" != *.ts.net ]]; then
    awas "STARS_URL_PUBLIK ('$url') bukan alamat Tailscale .ts.net - langkah alamat dilewati."
    echo "  Isi STARS_URL_PUBLIK=https://<nama>.<tailnet>.ts.net di $DEPLOY/.env lalu jalankan: bash $DEPLOY/pasang-vps.sh alamat"
    return 0
  fi
  mesin=${host%%.*}
  baca_dns() { tailscale status --json 2>/dev/null | jq -r '.Self.DNSName // empty' | sed 's/\.$//' || true; }
  info "Memindahkan alamat https://$host ke VPS ini..."
  dns=$(baca_dns)
  if [ "$dns" != "$host" ]; then
    echo "Nama '$mesin' masih dipakai laptop. Lepaskan dulu:"
    echo "  1. Buka https://login.tailscale.com/admin/machines"
    echo "  2. Mesin laptop '$mesin' -> tombol ... -> Edit machine name -> ganti jadi '$mesin-laptop' -> Save"
    enter "Tekan Enter bila sudah... "
    if [ "$(tailscale status --json 2>/dev/null | jq -r '.BackendState // empty' || true)" = "Running" ]; then
      tailscale set --hostname="$mesin"
    else
      echo "Login Tailscale: buka tautan yang muncul di bawah, masuk dengan akun Tailscale YANG SAMA dengan laptop."
      tailscale up --hostname="$mesin"
    fi
    for _ in 1 2 3 4 5; do
      sleep 3
      dns=$(baca_dns)
      [ "$dns" = "$host" ] && break
      awas "Nama VPS di Tailscale sekarang '${dns:-belum ada}', seharusnya '$host'."
      echo "  Di https://login.tailscale.com/admin/machines: mesin VPS ini -> ... -> Edit machine name -> '$mesin' -> Save"
      echo "  (pastikan mesin laptop sudah TIDAK bernama '$mesin')"
      enter "Tekan Enter bila sudah... "
    done
    [ "$dns" = "$host" ] || gagal "Nama Tailscale belum cocok. Setelah diperbaiki jalankan: bash $DEPLOY/pasang-vps.sh alamat"
  fi
  ok "VPS memakai nama $host"
  echo "Menyalakan Funnel (bila muncul tautan persetujuan, buka & setujui seperti dulu di laptop)..."
  tailscale funnel --bg 3000
  tailscale funnel status || true
  echo "Menguji https://$host (sertifikat HTTPS dibuat otomatis, bisa sampai 1 menit)..."
  for _ in 1 2 3 4 5 6; do
    case "$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "https://$host/" || true)" in
      2??|3??) ok "https://$host sudah melayani dari VPS."; return 0 ;;
    esac
    sleep 10
  done
  awas "https://$host belum menjawab dari VPS - coba buka dari HP beberapa menit lagi."
}

pindah() {
  [ -f "$PINDAHAN" ] || gagal "Paket data $PINDAHAN belum ada. Kirim dari laptop lewat deploy\\vps.bat menu 2."
  pulihkan "$PINDAHAN"
  pasang_alamat
  echo
  echo "=========================================================="
  echo " PINDAH SELESAI. Tugas terakhir (wajib):"
  echo "  1. https://login.tailscale.com/admin/machines -> mesin VPS -> ..."
  echo "     -> Disable key expiry   (kalau tidak, VPS putus otomatis +-6 bulan lagi)"
  echo "  2. Buka STARS dari HP (data seluler), scan satu label QR lama."
  echo "  3. Admin -> Pengguna: ganti sandi Super Admin (sandi lama pernah bocor)."
  echo "  Semua pengguna perlu login ulang sekali - itu normal."
  echo "=========================================================="
}

perbarui() {
  local lama baru
  [ -d "$DIR/.git" ] || gagal "Kode belum ada - jalankan 'siapkan' dulu."
  info "Mengambil kode terbaru dari GitHub..."
  lama=$(git -C "$DIR" rev-parse --short HEAD)
  git -C "$DIR" pull --ff-only
  baru=$(git -C "$DIR" rev-parse --short HEAD)
  if [ "$lama" = "$baru" ] && [ "${1:-}" != "paksa" ]; then
    ok "Sudah versi terbaru ($baru: $(git -C "$DIR" log -1 --format=%s)). Sudah klik Sync Changes di laptop?"
    # tetap terapkan perubahan deploy/.env (mis. SMTP_*): compose membuat ulang kontainer hanya bila pengaturannya berubah
    info "Menerapkan pengaturan deploy/.env..."
    dc up -d
    tunggu_app
    return 0
  fi
  info "Mencadangkan data sebelum memperbarui..."
  cadangan
  info "Membangun ulang STARS (beberapa menit; STARS lama tetap melayani sampai selesai)..."
  dc up -d --build
  tunggu_app
  docker image prune -f >/dev/null
  ok "STARS diperbarui: $lama -> $baru ($(git -C "$DIR" log -1 --format=%s))"
}

status() {
  echo "== Kontainer =="; dc ps || true
  echo; echo "== Versi kode =="; git -C "$DIR" log -1 --format='%h %ad %s' --date=short || true
  echo; echo "== Alamat publik =="; tailscale funnel status 2>/dev/null || echo "(Funnel belum aktif)"
  echo; echo "== Disk =="; df -h / | tail -n 1
  echo; echo "== Cadangan terakhir =="
  # shellcheck disable=SC2012
  ls -1t "$CADANGAN"/stars-*.tgz 2>/dev/null | head -n 3 || echo "(belum ada)"
  echo; echo "== Log STARS (20 baris terakhir) =="; dc logs --tail 20 app || true
}

main() {
  cek_root
  case "${1:-}" in
    siapkan)  siapkan "${2:-}" ;;
    pindah)   pindah ;;
    alamat)   pasang_alamat ;;
    perbarui) perbarui "${2:-}" ;;
    cadangan) cadangan ;;
    pulihkan) [ -n "${2:-}" ] || gagal "Pakai: bash $0 pulihkan /root/cadangan-stars/stars-YYYYMMDD-HHMMSS.tgz"; pulihkan "$2" ;;
    status)   status ;;
    *) sed -n '4,12p' "$0"; exit 1 ;;
  esac
}

# Satu baris: bash sudah membaca semuanya sebelum `git pull` (perbarui) menimpa berkas ini.
if [ "${BASH_SOURCE[0]}" = "$0" ]; then main "$@"; exit $?; fi
