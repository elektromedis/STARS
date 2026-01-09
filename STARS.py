from flask import Flask, render_template_string, request, redirect, url_for
from datetime import datetime

app = Flask(__name__)

# --- 1. DATABASE PEGAWAI (USER) ---
# Data ini yang akan mengisi otomatis nomor HP
data_pegawai = [
    {"nama": "Br. Budi Santoso", "ruangan": "IGD", "hp": "0812-3333-4444"},
    {"nama": "Sr. Siti Aminah", "ruangan": "ICU", "hp": "0813-5555-6666"},
    {"nama": "Dr. Rahmat", "ruangan": "Radiologi", "hp": "0811-9999-8888"},
    {"nama": "Bd. Yuli", "ruangan": "VK (Bersalin)", "hp": "0857-1234-5678"}
]

# --- 2. DATABASE ALKES ---
data_alkes = [
    {"id": "ELECT-001", "nama": "Patient Monitor", "ruangan": "IGD", "status": "Baik"},
    {"id": "ELECT-002", "nama": "Syringe Pump", "ruangan": "ICU", "status": "Baik"},
    {"id": "ELECT-003", "nama": "X-Ray Mobile", "ruangan": "Radiologi", "status": "Perlu Kalibrasi"}
]

laporan_masuk = []

# --- HELPER: FORMAT WA ---
def format_nomor_wa(nomor):
    nomor = nomor.strip().replace('-', '').replace(' ', '')
    if nomor.startswith('0'): return '62' + nomor[1:]
    if nomor.startswith('+62'): return nomor[1:]
    return nomor

# --- TAMPILAN WEB (HTML + JAVASCRIPT) ---
html_base = """
<!DOCTYPE html>
<html>
<head>
    <title>SIM-E RSUD Cipayung</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: 'Segoe UI', sans-serif; margin: 0; background-color: #f4f6f9; }
        .nav { background: #004085; padding: 15px; color: white; display: flex; justify-content: space-between; align-items: center;}
        .nav a { color: white; text-decoration: none; margin-left: 20px; font-weight: bold; }
        .container { padding: 20px; max-width: 800px; margin: auto; }
        .card { background: white; padding: 20px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px;}
        th, td { border-bottom: 1px solid #ddd; padding: 10px; text-align: left; }
        th { background-color: #f8f9fa; }
        input, select, textarea { width: 100%; padding: 10px; margin: 5px 0 15px 0; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
        .btn-lapor { background: #dc3545; color: white; border: none; padding: 12px; cursor: pointer; border-radius: 5px; width: 100%; font-size: 16px; font-weight: bold;}
        .btn-wa { background: #25D366; color: white; padding: 5px 10px; text-decoration: none; border-radius: 4px; font-size: 12px; display: inline-block;}
    </style>
</head>
<body>
    <div class="nav">
        <span>🏥 SIM-E RSUD Cipayung</span>
        <div><a href="/">Dashboard</a><a href="/lapor-kerusakan">Form Laporan</a></div>
    </div>
    <div class="container">
        {% block content %}{% endblock %}
    </div>
</body>
</html>
"""

@app.route('/')
def dashboard():
    content = """
    {% extends "base" %}
    {% block content %}
    
    <div class="card">
        <h3>🔔 Tiket Laporan Masuk</h3>
        {% if tiket %}
            <table>
            <tr><th>Waktu</th><th>Pelapor</th><th>Alat & Keluhan</th><th>Aksi</th></tr>
            {% for lapor in tiket %}
            <tr>
                <td>{{ lapor.waktu }}</td>
                <td>{{ lapor.pelapor }}</td>
                <td><b>{{ lapor.nama_alat }}</b><br><span style="color:red">{{ lapor.keluhan }}</span></td>
                <td><a href="{{ lapor.link_wa }}" target="_blank" class="btn-wa">💬 Chat WA</a></td>
            </tr>
            {% endfor %}
            </table>
        {% else %}
            <p>Tidak ada laporan kerusakan.</p>
        {% endif %}
    </div>

    <div class="card">
        <h3>📦 Daftar Aset</h3>
        <table>
            <tr><th>Nama Alat</th><th>Ruangan</th><th>Status</th><th>QR</th></tr>
            {% for item in data %}
            <tr>
                <td>{{ item.nama }}</td>
                <td>{{ item.ruangan }}</td>
                <td>{{ item.status }}</td>
                <td><a href="/cetak-label/{{ item.id }}" target="_blank">🖨️</a></td>
            </tr>
            {% endfor %}
        </table>
    </div>
    {% endblock %}
    """
    full_html = html_base.replace('{% block content %}{% endblock %}', content).replace('{% extends "base" %}', '')
    return render_template_string(full_html, data=data_alkes, tiket=laporan_masuk)

@app.route('/cetak-label/<id_alat>')
def cetak_label(id_alat):
    alat = next((item for item in data_alkes if item['id'] == id_alat), None)
    url_lapor = f"{request.host_url}lapor-kerusakan?id={id_alat}"
    qr_api_url = f"https://api.qrserver.com/v1/create-qr-code/?size=150x150&data={url_lapor}"
    return render_template_string("""
        <div style="text-align:center; font-family:Arial; padding:20px; border:2px solid black; display:inline-block;">
            <h2>{{ alat.nama }}</h2><img src="{{ qr_url }}"><br>Scan untuk Lapor<br><br>
            <button onclick="window.print()">Print</button>
        </div>
    """, alat=alat, qr_url=qr_api_url)

@app.route('/lapor-kerusakan', methods=['GET', 'POST'])
def lapor():
    id_otomatis = request.args.get('id') # Tangkap ID dari QR Code
    
    if request.method == 'POST':
        id_alat = request.form['id_alat']
        pelapor_info = request.form['pelapor'] # Format: "Nama|NoHP"
        keluhan = request.form['keluhan']
        
        # Pisahkan Nama dan HP dari value dropdown
        nama_pelapor, no_hp = pelapor_info.split('|')

        # Update status alat
        nama_alat_lapor = ""
        ruangan_alat = ""
        for alat in data_alkes:
            if alat['id'] == id_alat:
                alat['status'] = "Rusak / Lapor"
                nama_alat_lapor = alat['nama']
                ruangan_alat = alat['ruangan']
                break
        
        # Generate Link WA
        link_wa = f"https://wa.me/{format_nomor_wa(no_hp)}?text=Halo%20{nama_pelapor},%20terkait%20laporan%20{nama_alat_lapor}..."

        laporan_masuk.append({
            "waktu": datetime.now().strftime("%H:%M"),
            "nama_alat": nama_alat_lapor,
            "ruangan": ruangan_alat,
            "pelapor": nama_pelapor,
            "link_wa": link_wa,
            "keluhan": keluhan
        })
        return redirect(url_for('sukses_lapor'))

    content = """
    {% extends "base" %}
    {% block content %}
    <div class="card" style="max-width: 600px; margin: auto;">
        <h2 style="color: #d9534f;">Formulir Laporan Kerusakan</h2>
        
        <form method="post">
            <label><b>Pilih Alat:</b></label>
            <select name="id_alat" required>
                <option value="" disabled selected>-- Pilih Alat --</option>
                {% for item in data_alkes %}
                <option value="{{ item.id }}" {% if item.id == id_selected %}selected{% endif %}>
                    {{ item.nama }} - {{ item.ruangan }}
                </option>
                {% endfor %}
            </select>
            
            <label><b>Nama Pelapor:</b></label>
            <select name="pelapor" id="select_pelapor" onchange="isiOtomatis()" required>
                <option value="" disabled selected>-- Siapa Anda? --</option>
                {% for orang in pegawai %}
                <option value="{{ orang.nama }}|{{ orang.hp }}" data-hp="{{ orang.hp }}">
                    {{ orang.nama }} ({{ orang.ruangan }})
                </option>
                {% endfor %}
            </select>

            <label><b>Nomor WhatsApp (Terisi Otomatis):</b></label>
            <input type="text" id="input_hp" placeholder="Nomor akan muncul otomatis..." readonly style="background-color: #e9ecef;">
            
            <label><b>Keluhan:</b></label>
            <textarea name="keluhan" rows="4" placeholder="Jelaskan kerusakan..." required></textarea>
            
            <button type="submit" class="btn-lapor">Kirim Laporan</button>
        </form>

        <script>
            function isiOtomatis() {
                // Ambil elemen dropdown dan input
                var dropdown = document.getElementById("select_pelapor");
                var inputHP = document.getElementById("input_hp");
                
                // Ambil data-hp dari opsi yang dipilih
                var selectedOption = dropdown.options[dropdown.selectedIndex];
                var nomor = selectedOption.getAttribute("data-hp");
                
                // Isi ke kolom input
                inputHP.value = nomor;
            }
        </script>
    </div>
    {% endblock %}
    """
    full_html = html_base.replace('{% block content %}{% endblock %}', content).replace('{% extends "base" %}', '')
    return render_template_string(full_html, data_alkes=data_alkes, pegawai=data_pegawai, id_selected=id_otomatis)

@app.route('/sukses')
def sukses_lapor():
    return render_template_string("""
    <div style="text-align:center; padding:50px; font-family:sans-serif;">
        <h1 style="color:green;">Laporan Terkirim! ✅</h1>
        <a href="/">Kembali</a>
    </div>
    """)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
