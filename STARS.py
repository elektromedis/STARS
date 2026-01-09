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
    """Membuat tabel database jika belum ada"""
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    # Kita sesuaikan nama kolom dengan standar Excel yang kita bahas sebelumnya
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

# Panggil fungsi inisialisasi saat aplikasi mulai
init_db()

# --- FUNGSI HELPER DATABASE ---
def load_data_from_db():
    """Mengambil semua data aset dari database"""
    conn = sqlite3.connect(DB_NAME)
    try:
        df = pd.read_sql_query("SELECT * FROM alat_kesehatan", conn)
    except:
        df = pd.DataFrame() # Return kosong jika error
    conn.close()
    return df

def update_status_db(kode_aset, status_baru):
    """Update status alat saat ada laporan"""
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("UPDATE alat_kesehatan SET kondisi = ? WHERE kode_aset = ?", (status_baru, kode_aset))
    conn.commit()
    conn.close()

# --- FUNGSI HELPER LAINNYA ---
def format_nomor_wa(nomor):
    nomor = str(nomor).strip().replace('-', '').replace(' ', '')
    if nomor.startswith('0'): return '62' + nomor[1:]
    if nomor.startswith('+62'): return nomor[1:]
    return nomor

def generate_qr(data):
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    return img

# --- DATA PEGAWAI (Tetap Hardcoded atau bisa dipindah ke DB nanti) ---
PEGAWAI = {
    "Faisal Aly Marzuki (IGD)": "0812-8822-4386",
    "Sr. Siti Aminah (ICU)": "0813-5555-6666",
    "Dr. Rahmat (Radiologi)": "0811-9999-8888",
    "Bd. Yuli (VK)": "0857-1234-5678"
}

# --- SIDEBAR: AREA ADMIN UPLOAD ---
with st.sidebar:
    st.image("https://img.icons8.com/color/96/hospital-2.png", width=80)
    st.title("Admin Area")
    st.write("Upload Database Inventaris Terbaru di sini.")
    
    uploaded_file = st.file_uploader("Pilih File Excel (.xlsx)", type=['xlsx'])
    
    if uploaded_file is not None:
        if st.button("Proses & Simpan ke Database"):
            try:
                # 1. Baca Excel
                df_upload = pd.read_excel(uploaded_file, dtype=str)
                
                # 2. Cleaning / Standarisasi (Sama seperti logika Flask)
                df_upload = df_upload.apply(lambda x: x.str.strip() if x.dtype == "object" else x)
                if 'nama_alat' in df_upload.columns:
                    df_upload['nama_alat'] = df_upload['nama_alat'].str.title()
                if 'ruangan' in df_upload.columns:
                    df_upload['ruangan'] = df_upload['ruangan'].str.upper()
                
                df_upload.fillna('-', inplace=True)
                
                # 3. Masukkan ke SQLite (Replace = Mengganti data lama dengan yang baru)
                conn = sqlite3.connect(DB_NAME)
                df_upload.to_sql('alat_kesehatan', conn, if_exists='replace', index=False)
                conn.close()
                
                st.success(f"✅ Sukses! {len(df_upload)} data alat berhasil diupdate.")
                st.rerun() # Refresh halaman agar data tampil
            except Exception as e:
                st.error(f"Gagal memproses file: {e}")
                st.info("Pastikan kolom Excel: kode_aset, nama_alat, merk, ruangan, kondisi")

# --- APLIKASI UTAMA ---
st.title("🏥 SIM-E RSUD Cipayung")
st.markdown("**Sistem Informasi Manajemen Elektromedis & Post Market Surveillance**")

# Load Data dari Database
df_alkes = load_data_from_db()

# Cek apakah database kosong
if df_alkes.empty:
    st.warning("⚠️ Database Kosong. Silakan upload file Excel Inventaris di menu sebelah kiri (Sidebar).")
    st.stop() # Hentikan aplikasi jika data kosong

# Inisialisasi Tiket Session State
if 'laporan_masuk' not in st.session_state:
    st.session_state.laporan_masuk = []

# Tab Menu
tab1, tab2, tab3 = st.tabs(["📝 Form Lapor Kerusakan", "📦 Dashboard Aset & QR", "🔔 Tiket Masuk"])

# --- TAB 1: FORM LAPOR ---
with tab1:
    st.header("Formulir Laporan Kerusakan")
    
    col1, col2 = st.columns(2)
    
    with col1:
        # Pilih Alat (Data diambil dari Database)
        # Format list: "KODE - Nama Alat (Ruangan)"
        list_alat = df_alkes.apply(lambda x: f"{x['kode_aset']} - {x['nama_alat']} ({x['ruangan']})", axis=1).tolist()
        pilihan_alat = st.selectbox("Pilih Alat yang Rusak:", list_alat)
        
        # Ambil ID alat yang dipilih untuk pemrosesan
        id_terpilih = pilihan_alat.split(" - ")[0]
        
        # Cari detail alat terpilih dari dataframe
        detail_alat_terpilih = df_alkes[df_alkes['kode_aset'] == id_terpilih].iloc[0]

    with col2:
        # Pilih Pelapor
        pilihan_nama = st.selectbox("Nama Pelapor:", list(PEGAWAI.keys()))
        no_hp_otomatis = PEGAWAI[pilihan_nama]
        st.info(f"📱 No. WhatsApp Terdeteksi: {no_hp_otomatis}")

    keluhan = st.text_area("Deskripsi Keluhan / Kerusakan:", placeholder="Contoh: Layar mati, kabel terkelupas...")

    if st.button("Kirim Laporan", type="primary"):
        # 1. Update Status Alat di Database
        update_status_db(id_terpilih, "Rusak / Lapor")
        
        # 2. Buat Link WA
        pelapor_clean = pilihan_nama.split(" (")[0]
        wa_target = format_nomor_wa(no_hp_otomatis)
        pesan = f"Halo {pelapor_clean}, laporan kerusakan *{detail_alat_terpilih['nama_alat']}* ({detail_alat_terpilih['ruangan']}) dengan keluhan: _{keluhan}_ sudah kami terima. Teknisi akan segera meluncur."
        link_wa = f"https://wa.me/{wa_target}?text={pesan.replace(' ', '%20')}"

        # 3. Simpan ke Database Tiket (Session State)
        tiket_baru = {
            "Waktu": datetime.now().strftime("%Y-%m-%d %H:%M"),
            "Alat": f"{detail_alat_terpilih['nama_alat']} ({detail_alat_terpilih['ruangan']})",
            "Pelapor": pilihan_nama,
            "Keluhan": keluhan,
            "Link WA": link_wa
        }
        st.session_state.laporan_masuk.append(tiket_baru)
        
        st.success("✅ Laporan Berhasil Dikirim! Status alat di database telah diubah menjadi 'Rusak'.")
        st.rerun() # Refresh agar status di dashboard terupdate

# --- TAB 2: DASHBOARD ASET ---
with tab2:
    st.header("Database Aset & Cetak QR")
    
    # Filter Pencarian
    cari = st.text_input("🔍 Cari Alat (Ketik Nama / Ruangan / Kode):")
    
    # Logic Filter
    if cari:
        df_tampil = df_alkes[
            df_alkes['nama_alat'].str.contains(cari, case=False) | 
            df_alkes['ruangan'].str.contains(cari, case=False) |
            df_alkes['kode_aset'].str.contains(cari, case=False)
        ]
    else:
        df_tampil = df_alkes

    # Tampilkan Dataframe dengan styling kondisi
    def highlight_rusak(val):
        color = '#ffcccb' if val == 'Rusak / Lapor' else ''
        return f'background-color: {color}'

    st.dataframe(df_tampil.style.map(highlight_rusak, subset=['kondisi']), use_container_width=True)

    st.divider()
    
    # Fitur Cetak QR
    st.subheader("🖨️ Generator Label QR Code")
    col_qr1, col_qr2 = st.columns([1, 2])
    
    with col_qr1:
        # Selectbox khusus QR
        list_alat_qr = df_alkes.apply(lambda x: f"{x['kode_aset']} - {x['nama_alat']}", axis=1).tolist()
        qr_pilih = st.selectbox("Pilih Alat untuk Cetak Label:", list_alat_qr, key="qr_select")
        qr_id = qr_pilih.split(" - ")[0]
        
        detail_alat_qr = df_alkes[df_alkes['kode_aset'] == qr_id].iloc[0]
    
    with col_qr2:
        if not df_alkes.empty:
            # Generate QR Image
            img = generate_qr(f"Lapor Kerusakan ID: {qr_id}")
            
            buf = io.BytesIO()
            img.save(buf)
            byte_im = buf.getvalue()
            
            st.image(byte_im, caption=f"QR Code: {qr_id}", width=200)
            
            st.download_button(
                label="⬇️ Download Label Gambar",
                data=byte_im,
                file_name=f"Label_{qr_id}.png",
                mime="image/png"
            )
            st.caption(f"Tempel di unit: {detail_alat_qr['nama_alat']} - {detail_alat_qr['ruangan']}")

# --- TAB 3: TIKET MASUK ---
with tab3:
    st.header("🔔 Tiket Laporan Masuk (Dashboard Teknisi)")
    
    if len(st.session_state.laporan_masuk) > 0:
        for idx, tiket in enumerate(reversed(st.session_state.laporan_masuk)):
            with st.container():
                st.warning(f"🚨 **{tiket['Alat']}** - {tiket['Keluhan']}")
                col_tik1, col_tik2 = st.columns([3, 1])
                with col_tik1:
                    st.caption(f"Pelapor: {tiket['Pelapor']} | Waktu: {tiket['Waktu']}")
                with col_tik2:
                    st.link_button("💬 Chat WA Pelapor", tiket['Link WA'])
                st.divider()
    else:
        st.info("Belum ada laporan kerusakan masuk. Semua aman! ☕")
