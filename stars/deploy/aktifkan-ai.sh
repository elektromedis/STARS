#!/usr/bin/env bash
# Mengaktifkan AI gratis di VPS: Hermes 3 (Ollama) + n8n Community. Aman dijalankan berulang kali.
set -euo pipefail
DEPLOY="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DEPLOY"
[ -f .env ] || { echo "[GAGAL] deploy/.env belum ada. Jalankan menu 1 dulu."; exit 1; }
RAM_MB=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)
DISK_GB=$(df -BG --output=avail "$DEPLOY" | tail -1 | tr -dc 0-9)
echo "[INFO] RAM ${RAM_MB} MB, disk kosong ${DISK_GB} GB"
if [ "$RAM_MB" -lt 5500 ] && [ "${PAKSA_AI:-0}" != "1" ]; then
  echo "[BERHENTI] AI lokal butuh RAM VPS minimal 6 GB agar STARS tetap stabil. Tidak ada yang diubah."
  echo "           Pilihan: naikkan paket VPS, atau jalankan AI di komputer lain yang lebih kuat."
  exit 2
fi
[ "$DISK_GB" -ge 8 ] || { echo "[BERHENTI] Disk kosong minimal 8 GB. Tidak ada yang diubah."; exit 2; }
cp .env ".env.sebelum-ai.$(date +%Y%m%d%H%M%S)"
chmod 600 .env .env.sebelum-ai.*
atur() { if grep -q "^$1=" .env; then sed -i "s|^$1=.*|$1=$2|" .env; else printf '%s=%s\n' "$1" "$2" >> .env; fi; }
kosong() { [ -z "$(grep "^$1=" .env | tail -1 | cut -d= -f2-)" ]; }
atur COMPOSE_PROFILES ai
atur ALLIES_LLM_URL http://ollama:11434
atur ALLIES_MODEL "${ALLIES_MODEL:-hermes3:3b}"
if kosong N8N_ENCRYPTION_KEY; then atur N8N_ENCRYPTION_KEY "$(openssl rand -hex 32)"; fi
if kosong INTEGRASI_TOKEN; then atur INTEGRASI_TOKEN "$(openssl rand -hex 24)"; fi
MODEL=$(grep '^ALLIES_MODEL=' .env | tail -1 | cut -d= -f2-)
docker compose --env-file .env --profile ai up -d --build
echo "[INFO] Mengunduh model $MODEL, sekitar 2 GB..."
docker compose --env-file .env --profile ai exec -T ollama ollama pull "$MODEL"
docker compose --env-file .env --profile ai exec -T ollama ollama run "$MODEL" "Jawab satu kata: siap" || true
echo "[OK] AI aktif. Login ke STARS lalu buka ALLIES > Kantor AI."
echo "[OK] n8n hanya terbuka di VPS. Gunakan terowongan SSH lalu buka http://localhost:5678"
echo "     Impor workflow: stars/deploy/n8n/allies-harian.json"
