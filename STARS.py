import streamlit as st
import pandas as pd
from datetime import datetime
import qrcode
from PIL import Image
import io

# --- KONFIGURASI HALAMAN ---
st.set_page_config(page_title="SIM-E RSUD Cipayung", page_icon="🏥", layout="wide")

# --- 1. DATABASE PEGAWAI (USER) ---
PEGAWAI = {
    "Br. Budi Santoso (IGD)": "0812-3333-4444",
    "Sr. Siti Aminah (ICU)": "0813-5555-6666",
    "Dr. Rahmat (Radiologi)": "0811-9999-8888",
    "Bd. Yuli (VK)": "0857-1234-5678"
}

# --- 2. DATABASE ALKES (Simulasi) ---
if 'data_alkes' not in st.session_state:
    st.session_state.data_alkes = [
        {"ID": "ELECT-001", "Nama": "Patient Monitor", "Ruangan": "IGD", "Status": "Baik", "Install": "2020-01-10", "Harga": 35000000},
        {"ID": "ELECT-002", "Nama": "Syringe Pump", "Ruangan": "ICU", "Status": "Baik", "Install": "2022-05-20", "Harga": 18000000},
        {"ID": "ELECT-003", "Nama": "X-Ray Mobile", "Ruangan": "Radiologi", "Status": "Perlu Kalibrasi", "Install": "2019-11-05", "Harga": 150000000}
    ]

# --- 3. DATABASE TIKET ---
if 'laporan_masuk' not in st.session_state:
    st.session_state.laporan_masuk = []

# --- FUNGSI HELPER ---
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

# --- APLIKASI UTAMA ---
st.title("🏥 SIM-E RSUD Cipayung")
st.markdown("**Sistem Informasi Manajemen Elektromedis & Post Market Surveillance**")

# Tab Menu
tab1, tab2, tab3 = st.tabs(["📝 Form Lapor Kerusakan", "📦 Dashboard Aset & QR", "🔔 Tiket Masuk"])

# --- TAB 1: FORM LAPOR ---
with tab1:
    st.header("Formulir Laporan Kerusakan")
    
    col1, col2 = st.columns(2)
    
    with col1:
        # Pilih Alat
        list_alat = [f"{item['ID']} - {item['Nama']} ({item['Ruangan']})" for item in st.session_state.data_alkes]
        pilihan_alat = st.selectbox("Pilih Alat yang Rusak:", list_alat)
        
        # Ambil ID alat yang dipilih
        id_terpilih = pilihan_alat.split(" - ")[0]

    with col2:
        # Pilih Pelapor (Otomatis HP)
        pilihan_nama = st.selectbox("Nama Pelapor:", list(PEGAWAI.keys()))
        no_hp_otomatis = PEGAWAI[pilihan_nama]
        st.info(f"📱 No. WhatsApp Terdeteksi: {no_hp_otomatis}")

    keluhan = st.text_area("Deskripsi Keluhan / Kerusakan:", placeholder="Contoh: Layar mati, kabel terkelupas, error code 404...")

    if st.button("Kirim Laporan", type="primary"):
        # Logika Simpan
        # 1. Update Status Alat
        nama_alat_simple = ""
        ruangan_simple = ""
        for alat in st.session_state.data_alkes:
            if alat['ID'] == id_terpilih:
                alat['Status'] = "Rusak / Lapor"
                nama_alat_simple = alat['Nama']
                ruangan_simple = alat['Ruangan']
                break
        
        # 2. Buat Link WA
        pelapor_clean = pilihan_nama.split(" (")[0]
        wa_target = format_nomor_wa(no_hp_otomatis)
        pesan = f"Halo {pelapor_clean}, laporan kerusakan *{nama_alat_simple}* ({ruangan_simple}) dengan keluhan: _{keluhan}_ sudah kami terima. Teknisi akan segera meluncur."
        link_wa = f"https://wa.me/{wa_target}?text={pesan.replace(' ', '%20')}"

        # 3. Simpan ke Database Tiket
        tiket_baru = {
            "Waktu": datetime.now().strftime("%Y-%m-%d %H:%M"),
            "Alat": f"{nama_alat_simple} ({ruangan_simple})",
            "Pelapor": pilihan_nama,
            "Keluhan": keluhan,
            "Link WA": link_wa
        }
        st.session_state.laporan_masuk.append(tiket_baru)
        
        st.success("✅ Laporan Berhasil Dikirim! Status alat berubah menjadi 'Rusak'.")

# --- TAB 2: DASHBOARD ASET ---
with tab2:
    st.header("Database Aset & Cetak QR")
    
    # Tampilkan Dataframe
    df_alkes = pd.DataFrame(st.session_state.data_alkes)
    st.dataframe(df_alkes, use_container_width=True)

    st.divider()
    
    # Fitur Cetak QR
    st.subheader("🖨️ Generator Label QR Code")
    col_qr1, col_qr2 = st.columns([1, 2])
    
    with col_qr1:
        qr_pilih = st.selectbox("Pilih Alat untuk Cetak Label:", list_alat, key="qr_select")
        qr_id = qr_pilih.split(" - ")[0]
        # Cari detail alat
        detail_alat = next((item for item in st.session_state.data_alkes if item['ID'] == qr_id), None)
    
    with col_qr2:
        if detail_alat:
            # Generate QR Image
            # Di aplikasi real, ini bisa link ke web app. Di sini kita isi ID Alat.
            img = generate_qr(f"Lapor Kerusakan ID: {qr_id}")
            
            # Konversi ke bytes untuk ditampilkan
            buf = io.BytesIO()
            img.save(buf)
            byte_im = buf.getvalue()
            
            st.image(byte_im, caption=f"QR Code: {qr_id}", width=200)
            
            # Tombol Download
            st.download_button(
                label="⬇️ Download Label Gambar",
                data=byte_im,
                file_name=f"Label_{qr_id}.png",
                mime="image/png"
            )
            st.caption(f"Tempel di unit: {detail_alat['Nama']} ({detail_alat['Ruangan']})")

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
