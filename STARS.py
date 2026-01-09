import streamlit as st
import pandas as pd
import sqlite3
import qrcode
from PIL import Image
import io
import os
from datetime import datetime
import time

# --- 1. KONFIGURASI HALAMAN & CSS ENGINE ---
st.set_page_config(page_title="STARS RSUD CIPAYUNG", page_icon="🏥", layout="wide")

# CSS Kustom untuk Tema "Engineering Blue & Gold"
st.markdown("""
<style>
    /* Import Font Keren */
    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;700&family=Montserrat:wght@600;800&display=swap');

    /* Variabel Warna */
    :root {
        --primary-blue: #003366;
        --secondary-blue: #005b96;
        --accent-gold: #D4AF37;
        --light-gold: #F3E5AB;
        --white: #FFFFFF;
        --bg-gray: #F4F6F7;
    }

    /* Reset Streamlit Default */
    .stApp {
        background-color: var(--gray);
        font-family: 'Roboto', sans-serif;
    }
    
    /* Header Styles */
    h1, h2, h3 {
        font-family: 'Montserrat', sans-serif;
        color: var(--primary-blue);
    }
    
    .gold-text {
        color: var(--accent-gold);
    }

    /* --- HERO SECTION --- */
    .hero-container {
        background: linear-gradient(135deg, var(--primary-blue) 0%, var(--secondary-blue) 100%);
        padding: 4rem 2rem;
        border-radius: 0 0 50px 50px;
        color: white;
        text-align: center;
        box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        margin-top: -60px; /* Menarik ke atas menutupi padding default */
    }
    
    .hero-title {
        font-size: 3.5rem;
        font-weight: 800;
        margin-bottom: 1rem;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
    }
    
    .hero-subtitle {
        font-size: 1.2rem;
        font-weight: 300;
        max-width: 800px;
        margin: 0 auto 2rem auto;
        opacity: 0.9;
    }

    /* --- CARDS (Programs & Services) --- */
    .card-container {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 20px;
        padding: 2rem 0;
    }
    
    .feature-card {
        background: gray;
        border: 1px solid #e0e0e0;
        border-radius: 15px;
        padding: 2rem;
        transition: all 0.3s ease;
        border-top: 5px solid var(--accent-gold);
        box-shadow: 0 5px 15px rgba(0,0,0,0.05);
    }
    
    .feature-card:hover {
        transform: translateY(-10px);
        box-shadow: 0 15px 30px rgba(0,0,0,0.1);
    }

    .icon-box {
        font-size: 2.5rem;
        margin-bottom: 1rem;
        color: var(--primary-blue);
    }

    /* --- BUTTONS --- */
    .stButton > button {
        background-color: var(--primary-blue);
        color: var(--accent-gold);
        border: 2px solid var(--accent-gold);
        border-radius: 30px;
        padding: 0.5rem 2rem;
        font-weight: bold;
        transition: 0.3s;
    }
    
    .stButton > button:hover {
        background-color: var(--accent-gold);
        color: var(--primary-blue);
        border-color: var(--primary-blue);
        transform: scale(1.05);
    }

    /* --- TESTIMONIALS --- */
    .testimonial-box {
        background-color: var(--bg-gray);
        border-left: 5px solid var(--primary-blue);
        padding: 1.5rem;
        margin: 1rem 0;
        font-style: italic;
    }

    /* --- FOOTER --- */
    .footer {
        background-color: var(--gray);
        color: white;
        padding: 2rem;
        text-align: center;
        margin-top: 4rem;
        border-radius: 20px 20px 0 0;
    }
</style>
""", unsafe_allow_html=True)

# --- 2. LOGIKA DATABASE (BACKEND LAMA) ---
DB_NAME = 'inventaris.db'

def init_db():
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

init_db()

def load_data_from_db():
    conn = sqlite3.connect(DB_NAME)
    try:
        df = pd.read_sql_query("SELECT * FROM alat_kesehatan", conn)
    except:
        df = pd.DataFrame()
    conn.close()
    return df

def update_status_db(kode_aset, status_baru):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("UPDATE alat_kesehatan SET kondisi = ? WHERE kode_aset = ?", (status_baru, kode_aset))
    conn.commit()
    conn.close()

def format_nomor_wa(nomor):
    nomor = str(nomor).strip().replace('-', '').replace(' ', '')
    if nomor.startswith('0'): return '62' + nomor[1:]
    if nomor.startswith('+62'): return nomor[1:]
    return nomor

def generate_qr(data):
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="gray")
    return img

PEGAWAI = {
    "Faisal Aly Marzuki (IGD)": "0812-8822-4386",
    "Sr. Siti Aminah (ICU)": "0813-5555-6666",
    "Dr. Rahmat (Radiologi)": "0811-9999-8888",
    "Bd. Yuli (VK)": "0857-1234-5678"
}

# --- 3. FUNGSI HALAMAN LANDING PAGE (NEW) ---
def show_landing_page():
    # Hero Section
    st.markdown("""
    <div class="hero-container">
        <h1 class="hero-title">STARS <span class="gold-text">RSUD CIPAYUNG</span></h1>
        <p class="hero-subtitle">Sistem Terpadu Akurasi & Respon Cepat Service Elektromedis. 
        Menjamin keandalan teknologi medis demi keselamatan pasien.</p>
    </div>
    """, unsafe_allow_html=True)

    # CTA Button (Login Hack)
    col_cta1, col_cta2, col_cta3 = st.columns([1, 2, 1])
    with col_cta2:
        st.write("")
        if st.button("🚀 MASUK KE DASHBOARD SISTEM", use_container_width=True):
            st.session_state['page'] = 'dashboard'
            st.rerun()

    # About Section
    st.markdown("---")
    col1, col2 = st.columns(2)
    with col1:
        st.markdown("""
        ### 🏥 Tentang Kami
        Unit Elektromedis RSUD Cipayung berdedikasi untuk menjaga performa alat kesehatan melalui manajemen aset berbasis teknologi. 
        Aplikasi **STARS** hadir sebagai solusi digital untuk:
        * Digitalisasi Inventaris Aset
        * Respon Cepat Perbaikan (Quick Response)
        * Monitoring Kelaikan Alat (Calibration & Safety)
        """)
    with col2:
        # Placeholder Image (Engineering Vibe)
        st.image("https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?auto=format&fit=crop&w=800&q=80", caption="Professional Electromedical Engineering", use_container_width=True)

    # Program Showcase (HTML Card Grid)
    st.markdown("""
    <div style="text-align:center; margin-top:3rem;">
        <h2>Program Unggulan</h2>
        <p>Inovasi layanan kami untuk RSUD Cipayung</p>
    </div>
    <div class="card-container">
        <div class="feature-card">
            <div class="icon-box">📊</div>
            <h3>Asset Management</h3>
            <p>Pemetaan inventaris alat kesehatan yang real-time, akurat, dan terintegrasi dengan database pusat.</p>
        </div>
        <div class="feature-card">
            <div class="icon-box">⚡</div>
            <h3>Quick Response</h3>
            <p>Pelaporan kerusakan berbasis WhatsApp Gateway dengan respon time teknisi kurang dari 15 menit.</p>
        </div>
        <div class="feature-card">
            <div class="icon-box">🛡️</div>
            <h3>Safety & Quality</h3>
            <p>Jadwal kalibrasi otomatis dan pemeliharaan preventif untuk menjamin 100% keamanan pasien.</p>
        </div>
    </div>
    """, unsafe_allow_html=True)

    # Testimonials
    st.markdown("### 💬 Apa Kata Tenaga Medis")
    st.markdown("""
    <div class="testimonial-box">
        "Sejak ada STARS, lapor alat rusak di IGD jadi sangat cepat. Teknisi langsung datang tanpa perlu telpon berkali-kali."
        <br><strong>- Kepala Ruangan IGD</strong>
    </div>
    <div class="testimonial-box">
        "Sangat membantu saat akreditasi. Data kalibrasi alat tersaji lengkap tinggal scan QR Code."
        <br><strong>- Tim Mutu RSUD Cipayung</strong>
    </div>
    """, unsafe_allow_html=True)

    # Footer
    st.markdown("""
    <div class="footer">
        <p>© 2026 IPSRS RSUD Cipayung. All Rights Reserved.</p>
        <p>Jl. Mini I, Bambu Apus, Cipayung, Jakarta Timur</p>
    </div>
    """, unsafe_allow_html=True)

# --- 4. FUNGSI HALAMAN DASHBOARD (SYSTEM LAMA) ---
def show_dashboard():
    # Tombol Logout / Kembali ke Landing Page
    if st.sidebar.button("🏠 Logout / Ke Halaman Utama"):
        st.session_state['page'] = 'landing'
        st.rerun()

    # --- SIDEBAR ADMIN ---
    with st.sidebar:
        st.image("https://img.icons8.com/color/96/hospital-2.png", width=80)
        st.title("Admin Panel")
        st.write("Upload Database Inventaris:")
        uploaded_file = st.file_uploader("File Excel (.xlsx)", type=['xlsx'])
        if uploaded_file is not None:
            if st.button("Update Database"):
                try:
                    df_upload = pd.read_excel(uploaded_file, dtype=str)
                    df_upload = df_upload.apply(lambda x: x.str.strip() if x.dtype == "object" else x)
                    df_upload.columns = df_upload.columns.str.lower().str.replace(' ', '_')
                    if 'nama_alat' in df_upload.columns: df_upload['nama_alat'] = df_upload['nama_alat'].str.title()
                    if 'ruangan' in df_upload.columns: df_upload['ruangan'] = df_upload['ruangan'].str.upper()
                    df_upload.fillna('-', inplace=True)
                    conn = sqlite3.connect(DB_NAME)
                    df_upload.to_sql('alat_kesehatan', conn, if_exists='replace', index=False)
                    conn.close()
                    st.success(f"✅ Database updated: {len(df_upload)} rows.")
                    time.sleep(1)
                    st.rerun()
                except Exception as e:
                    st.error(f"Error: {e}")

    # --- MAIN SYSTEM CONTENT ---
    st.title("⚙️ Dashboard STARS")
    
    df_alkes = load_data_from_db()
    if df_alkes.empty:
        st.warning("Database Kosong. Harap upload data Excel di Sidebar.")
        st.stop()

    if 'laporan_masuk' not in st.session_state:
        st.session_state.laporan_masuk = []

    tab1, tab2, tab3 = st.tabs(["📝 Lapor Kerusakan", "📦 Data Aset & QR", "🔔 Tiket Masuk"])

    # TAB 1: FORM
    with tab1:
        st.subheader("Formulir Lapor Cepat")
        col1, col2 = st.columns(2)
        with col1:
            list_alat_display = df_alkes.apply(lambda x: f"{x['kode_aset']} - {x['nama_alat']} ({x['ruangan']})", axis=1).tolist()
            pilihan_alat = st.selectbox("Pilih Alat:", list_alat_display)
            id_terpilih = pilihan_alat.split(" - ")[0]
            detail_alat = df_alkes[df_alkes['kode_aset'] == id_terpilih].iloc[0]
        with col2:
            pilihan_nama = st.selectbox("Pelapor:", list(PEGAWAI.keys()))
            no_hp_otomatis = PEGAWAI[pilihan_nama]
            st.info(f"WA: {no_hp_otomatis}")
        
        keluhan = st.text_area("Keluhan Kerusakan:")
        if st.button("Kirim Laporan", type="primary"):
            update_status_db(id_terpilih, "Rusak / Lapor")
            # Logic WA
            nama_short = pilihan_nama.split(" (")[0]
            wa_target = format_nomor_wa(no_hp_otomatis)
            pesan_wa = f"Halo {nama_short}, laporan *{detail_alat['nama_alat']}* ({detail_alat['ruangan']}): _{keluhan}_ diterima."
            import urllib.parse
            link_wa = f"https://wa.me/{wa_target}?text={urllib.parse.quote(pesan_wa)}"
            
            # Save Tiket
            tiket = {
                "Waktu": datetime.now().strftime("%Y-%m-%d %H:%M"),
                "Alat": f"{detail_alat['nama_alat']} ({detail_alat['ruangan']})",
                "Pelapor": pilihan_nama,
                "Keluhan": keluhan,
                "Link WA": link_wa
            }
            st.session_state.laporan_masuk.append(tiket)
            st.success("Laporan Terkirim!")
            st.rerun()

    # TAB 2: ASET
    with tab2:
        st.subheader("Database Aset")
        cari = st.text_input("Cari Aset:")
        if cari:
            df_tampil = df_alkes[df_alkes.astype(str).apply(lambda x: x.str.contains(cari, case=False)).any(axis=1)]
        else:
            df_tampil = df_alkes
        
        def highlight_rusak(val):
            return 'background-color: #ffcccc' if 'Rusak' in str(val) else ''
        
        st.dataframe(df_tampil.style.map(highlight_rusak, subset=['kondisi']), use_container_width=True, hide_index=True)
        
        st.divider()
        col_q1, col_q2 = st.columns([1,2])
        with col_q1:
            qr_pilih = st.selectbox("Cetak QR untuk:", list_alat_display, key="qr_key")
            qr_code_str = qr_pilih.split(" - ")[0]
        with col_q2:
            img = generate_qr(f"ID: {qr_code_str}")
            buf = io.BytesIO()
            img.save(buf)
            byte_im = buf.getvalue()
            st.image(byte_im, width=150)
            st.download_button("Download QR", byte_im, f"QR_{qr_code_str}.png", "image/png")

    # TAB 3: TIKET
    with tab3:
        st.subheader("Tiket Masuk")
        if not st.session_state.laporan_masuk:
            st.info("Tidak ada laporan baru.")
        for t in reversed(st.session_state.laporan_masuk):
            with st.container(border=True):
                c1, c2 = st.columns([4,1])
                c1.write(f"**{t['Alat']}** | {t['Keluhan']}")
                c1.caption(f"{t['Pelapor']} @ {t['Waktu']}")
                c2.link_button("Chat WA", t['Link WA'])

# --- 5. NAVIGASI UTAMA (MAIN CONTROLLER) ---
if 'page' not in st.session_state:
    st.session_state['page'] = 'landing'

if st.session_state['page'] == 'landing':
    show_landing_page()
else:
    show_dashboard()



