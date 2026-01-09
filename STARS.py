import streamlit as st
import pandas as pd
import sqlite3
import qrcode
from PIL import Image
import io
import os
from datetime import datetime

# --- KONFIGURASI HALAMAN ---
st.set_page_config(page_title="STARS RSUD CIPAYUNG", page_icon="🏥", layout="wide")

# --- DATABASE CONFIG ---
DB_NAME = 'inventaris.db'

def init_db():
    """Membuat tabel database jika belum ada saat aplikasi pertama kali dijalankan"""
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS alat_kesehatan (
            kode_aset TEXT PRIMARY KEY,
            nama_alat TEXT,
            merk TEXT,
            ruangan TEXT,
            kondisi TEXT,
            tahun_pengadaan TEXT
        )
    ''')
    conn.commit()
    conn.close()

# Inisialisasi Database
init_db()

# --- FUNGSI-FUNGSI LOGIKA (BACKEND) ---

def load_data_from_db():
    """Mengambil data dari database ke dalam format Tabel (DataFrame)"""
    conn = sqlite3.connect(DB_NAME)
    try:
        df = pd.read_sql_query("SELECT * FROM alat_kesehatan", conn)
    except:
        df = pd.DataFrame()
    conn.close()
    return df

def update_status_db(kode_aset, status_baru):
    """Mengubah status alat (misal: Baik -> Rusak) di database"""
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("UPDATE alat_kesehatan SET kondisi = ? WHERE kode_aset = ?", (status_baru, kode_aset))
    conn.commit()
    conn.close()

def format_nomor_wa(nomor):
    """Mengubah format 08xx menjadi 628xx untuk link WhatsApp"""
    nomor = str(nomor).strip().replace('-', '').replace(' ', '')
    if nomor.startswith('0'): return '62' + nomor[1:]
    if nomor.startswith('+62'): return nomor[1:]
    return nomor

def generate_qr(data):
    """Membuat gambar QR Code"""
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    return img

# --- DATA PEGAWAI (USER) ---
# Bisa ditambahkan/diedit sesuai kebutuhan RS
PEGAWAI = {
    "Faisal Aly Marzuki (IGD)": "0812-8822-4386",
    "Sr. Siti Aminah (ICU)": "0813-5555-6666",
    "Dr. Rahmat (Radiologi)": "0811-9999-8888",
    "Bd. Yuli (VK)": "0857-1234-5678"
}

# --- SIDEBAR: AREA ADMIN (UPLOAD DATA) ---
with st.sidebar:
    st.image("https://img.icons8.com/color/96/hospital-2.png", width=80)
    st.title("Admin Area")
    st.info("Gunakan menu ini untuk update data inventaris massal.")
    
    uploaded_file = st.file_uploader("Upload File Excel (.xlsx)", type=['xlsx'])
    
    if uploaded_file is not None:
        if st.button("Proses & Simpan ke Database"):
            try:
                # 1. Baca Excel (dtype=str agar angka 0 di depan tidak hilang)
                df_upload = pd.read_excel(uploaded_file, dtype=str)
                
                # 2. Bersihkan Data (Hapus spasi, Huruf Besar, dll)
                df_upload = df_upload.apply(lambda x: x.str.strip() if x.dtype == "object" else x)
                
                # Pastikan nama kolom sesuai standar
                # Mapping kolom jaga-jaga kalau user salah tulis header di Excel
                df_upload.columns = df_upload.columns.str.lower().str.replace(' ', '_')
                
                if 'nama_alat' in df_upload.columns:
                    df_upload['nama_alat'] = df_upload['nama_alat'].str.title()
                if 'ruangan' in df_upload.columns:
                    df_upload['ruangan'] = df_upload['ruangan'].str.upper()
                
                df_upload.fillna('-', inplace=True)
                
                # 3. Masukkan ke SQLite
                conn = sqlite3.connect(DB_NAME)
                # if_exists='replace' artinya data lama ditimpa data baru
                df_upload.to_sql('alat_kesehatan', conn, if_exists='replace', index=False)
                conn.close()
                
                st.success(f"✅ Sukses! {len(df_upload)} data alat berhasil disimpan.")
                st.rerun() # Refresh halaman otomatis
            except Exception as e:
                st.error(f"Gagal memproses file. Error: {e}")
                st.warning("Pastikan Header Excel Anda: kode_aset, nama_alat, merk, ruangan, kondisi")

# --- HALAMAN UTAMA (DASHBOARD) ---
st.title("🏥 STARS RSUD Cipayung")
st.markdown("**Sistem Terintegrasi Alat Kesehatan Rumah Sakit**")

# Load Data Terbaru dari Database
df_alkes = load_data_from_db()

# Cek apakah database kosong
if df_alkes.empty:
    st.warning("⚠️ Database Kosong. Silakan upload file Excel Inventaris di menu sebelah kiri (Sidebar).")
    # Stop aplikasi di sini jika data kosong, biar tidak error di bawah
    st.stop() 

# Inisialisasi Session State untuk Tiket Laporan (agar realtime di satu sesi)
if 'laporan_masuk' not in st.session_state:
    st.session_state.laporan_masuk = []

# --- MENU TABS ---
tab1, tab2, tab3 = st.tabs(["📝 Form Lapor Kerusakan", "📦 Dashboard Aset & QR", "🔔 Tiket Masuk"])

# === TAB 1: FORM LAPOR ===
with tab1:
    st.header("Formulir Laporan Kerusakan")
    
    col1, col2 = st.columns(2)
    
    with col1:
        # Dropdown list alat (Format: KODE - NAMA - RUANGAN)
        list_alat_display = df_alkes.apply(lambda x: f"{x['kode_aset']} - {x['nama_alat']} ({x['ruangan']})", axis=1).tolist()
        pilihan_alat = st.selectbox("Pilih Alat yang Rusak:", list_alat_display)
        
        # Ambil Kode Aset dari pilihan user (Split string)
        id_terpilih = pilihan_alat.split(" - ")[0]
        
        # Ambil detail lengkap alat tersebut
        detail_alat = df_alkes[df_alkes['kode_aset'] == id_terpilih].iloc[0]

    with col2:
        # Dropdown Pelapor
        pilihan_nama = st.selectbox("Nama Pelapor:", list(PEGAWAI.keys()))
        no_hp_otomatis = PEGAWAI[pilihan_nama]
        st.info(f"📱 No. WhatsApp Terdeteksi: {no_hp_otomatis}")

    keluhan = st.text_area("Deskripsi Keluhan:", placeholder="Contoh: Layar blank, kabel power panas...")

    if st.button("Kirim Laporan", type="primary"):
        # 1. Update status di Database jadi "Rusak"
        update_status_db(id_terpilih, "Rusak / Lapor")
        
        # 2. Buat Link WhatsApp Otomatis
        nama_pelapor_short = pilihan_nama.split(" (")[0]
        wa_target = format_nomor_wa(no_hp_otomatis)
        pesan_wa = (
            f"Halo {nama_pelapor_short}, laporan kerusakan *{detail_alat['nama_alat']}* "
            f"({detail_alat['ruangan']}) dengan keluhan: _{keluhan}_ sudah kami terima. "
            "Teknisi akan segera mengecek."
        )
        # Encode URL agar spasi dan enter terbaca
        import urllib.parse
        pesan_encoded = urllib.parse.quote(pesan_wa)
        link_wa = f"https://wa.me/{wa_target}?text={pesan_encoded}"

        # 3. Masukkan ke List Tiket Dashboard
        tiket_baru = {
            "Waktu": datetime.now().strftime("%Y-%m-%d %H:%M"),
            "Alat": f"{detail_alat['nama_alat']} ({detail_alat['ruangan']})",
            "Pelapor": pilihan_nama,
            "Keluhan": keluhan,
            "Link WA": link_wa
        }
        st.session_state.laporan_masuk.append(tiket_baru)
        
        st.success("✅ Laporan Terkirim! Status alat berubah menjadi 'Rusak'.")
        st.rerun()

# === TAB 2: DATA ASET & QR ===
with tab2:
    st.header("Database Aset & Cetak QR")
    
    # Fitur Cari
    cari = st.text_input("🔍 Cari Alat (Nama / Ruangan / Kode):")
    
    # Filter DataFrame
    if cari:
        df_tampil = df_alkes[
            df_alkes['nama_alat'].str.contains(cari, case=False) | 
            df_alkes['ruangan'].str.contains(cari, case=False) |
            df_alkes['kode_aset'].str.contains(cari, case=False)
        ]
    else:
        df_tampil = df_alkes

    # Tampilkan Tabel dengan Warna (Merah jika Rusak)
    def warna_status(val):
        return 'background-color: #ffcccc' if 'Rusak' in str(val) else ''

    st.dataframe(
        df_tampil.style.map(warna_status, subset=['kondisi']), 
        use_container_width=True,
        hide_index=True
    )

    st.divider()
    
    # Area QR Code Generator
    st.subheader("🖨️ Cetak Label QR Code")
    c_qr1, c_qr2 = st.columns([1, 2])
    
    with c_qr1:
        # Pilihan alat untuk dicetak
        pilihan_qr = st.selectbox("Pilih Alat:", list_alat_display, key="qr_select")
        kode_qr = pilihan_qr.split(" - ")[0]
        
    with c_qr2:
        # Generate QR
        img = generate_qr(f"Lapor Kerusakan ID: {kode_qr}")
        
        # Ubah gambar ke bytes agar bisa tampil di web
        buf = io.BytesIO()
        img.save(buf)
        byte_im = buf.getvalue()
        
        col_sub1, col_sub2 = st.columns(2)
        with col_sub1:
            st.image(byte_im, width=150, caption=f"ID: {kode_qr}")
        with col_sub2:
            st.write("Tempel QR ini pada fisik alat.")
            st.download_button(
                label="⬇️ Download Label (PNG)",
                data=byte_im,
                file_name=f"QR_{kode_qr}.png",
                mime="image/png"
            )

# === TAB 3: TIKET MONITORING ===
with tab3:
    st.header("🔔 Tiket Laporan Masuk (Monitoring)")
    
    if len(st.session_state.laporan_masuk) == 0:
        st.info("Belum ada laporan kerusakan baru. Aman! ☕")
    else:
        # Tampilkan dari yang terbaru (reversed)
        for tiket in reversed(st.session_state.laporan_masuk):
            with st.container(border=True):
                col_t1, col_t2 = st.columns([4, 1])
                with col_t1:
                    st.write(f"🚨 **{tiket['Alat']}**")
                    st.write(f"🗣️ _{tiket['Keluhan']}_")
                    st.caption(f"Pelapor: {tiket['Pelapor']} | 🕒 {tiket['Waktu']}")
                with col_t2:
                    st.link_button("💬 Chat WA", tiket['Link WA'])
