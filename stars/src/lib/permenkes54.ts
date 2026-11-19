/**
 * Permenkes No. 54 Tahun 2015 tentang Pengujian dan Kalibrasi Alat Kesehatan.
 * - Lampiran I: daftar jenis alat wajib uji/kalibrasi per tingkat risiko (High/Medium/Low Risk).
 * - Pasal 8: uji/kalibrasi berkala ≥ 1×/tahun; wajib lebih cepat bila (5) a–f, mis. setelah perbaikan atau pindah/reinstalasi.
 * - Pasal 9: sertifikat (laik) / surat keterangan (tidak laik) + label hijau/merah (Lampiran II).
 * - Pasal 36: laporan pelaksanaan uji/kalibrasi setiap 3 bulan.
 * Pencocokan nama alat memakai kata kunci Indonesia + Inggris (kata utuh).
 */
export type RisikoP54 = "High Risk" | "Medium Risk" | "Low Risk";
type Entri = { nama: string; kunci: string[] };
const e = (nama: string, ...kunci: string[]): Entri => ({ nama, kunci: kunci.length ? kunci : [nama.toLowerCase()] });

export const LAMPIRAN_I: Record<RisikoP54, Entri[]> = {
  "High Risk": [
    e("Anesthesia Units and Vaporizers", "anestesi", "anesthesia", "vaporizer"), e("Anesthesia Ventilators", "ventilator anestesi"), e("Apnea Monitors", "apnea"),
    e("Argon-Enhanced Coagulation Units", "argon"), e("Aspirators (Emergency and Tracheal)", "aspirator emergency", "suction trakea"), e("Autotransfusion Units", "autotransfusi", "autotransfusion"),
    e("Blood Pressure Units (Invasive)", "ibp", "invasive blood pressure"), e("Capnometers", "kapnometer", "capnometer", "capnograph"), e("Defibrillators (incl. AED)", "defibrilator", "defibrillator", "aed"),
    e("Electrosurgical (Surgical Diathermy) Units", "esu", "electrosurgical", "elektrosurgeri", "cauter", "kauter"), e("Fetal Monitors", "ctg", "fetal monitor", "cardiotocograph"),
    e("Heart-Lung Bypass Units", "heart lung", "bypass"), e("Hemodialysis Units", "hemodialisa", "hemodialisis", "hemodialysis", "dialisis"), e("Humidifiers (Heated)", "humidifier"),
    e("Hypo/Hyperthermia Units", "hipotermia", "hypothermia", "hyperthermia"), e("Incubators (Infant, incl. Transport)", "inkubator", "incubator"), e("Infusion Pumps/Controllers", "infusion pump", "infus pump", "pompa infus"),
    e("Intra-Aortic Balloon Pumps", "iabp"), e("Lasers (Surgical)", "laser"), e("Mobile HEPA Air Cleaners", "hepa"), e("Nuclear Medicine Systems", "nuklir", "gamma camera"),
    e("Oximeters (Pulse)", "oximeter", "oksimeter", "spo2"), e("Oxygen Monitors and Analyzers", "oxygen analyzer", "oksigen analyzer"), e("Pacemakers (external)", "pacemaker", "pacu jantung"),
    e("Peritoneal Dialysis Units", "peritoneal"), e("Phacoemulsification Units", "phaco", "fakoemulsifikasi"), e("Physiologic Monitors", "patient monitor", "bedside monitor", "monitor pasien", "monitor"),
    e("Radiant Warmers (Infant)", "infant warmer", "radiant warmer", "baby warmer"), e("Radiographic Dye Injectors", "injector"), e("Radiologic Imaging Systems", "x ray", "xray", "rontgen", "ct scan", "mri", "c arm", "mammograph", "fluoroscopy"),
    e("Regulators (Tracheal Suction)", "regulator suction"), e("Resuscitators (Cardiac)", "resusitator", "resuscitator"), e("Resuscitators (Pulmonary)", "ambu", "bvm"),
    e("Sterilizers (Steam, EtO)", "sterilisator", "sterilizer", "autoclave", "autoklaf"), e("Tourniquets (Pneumatic)", "tourniquet", "torniket"), e("Transcutaneous O2/CO2 Monitors", "transkutan", "transcutaneous"), e("Ventilators", "ventilator", "respirator"),
  ],
  "Medium Risk": [
    e("Ambulatory ECG Recorders", "holter"), e("Aspirators (Surgical, Thoracic, Uterine)", "suction pump", "aspirator", "suction"), e("Blood Bank Refrigerators", "blood bank", "kulkas darah"), e("Blood Gas/pH Analyzers", "blood gas", "agd", "analisa gas darah"),
    e("Blood Pressure Units (NIBP, critical care)", "nibp"), e("Blood/Solution Warmers", "blood warmer", "penghangat darah"), e("Cardiac Output Units", "cardiac output"), e("Centrifuges & Clinical Lab Equipment", "centrifuge", "sentrifus", "sentrifuge"),
    e("Circumcision Clamps", "sirkumsisi"), e("Cryosurgical Units", "cryo", "krio"), e("Electrocardiographs", "ekg", "ecg", "elektrokardiograf", "electrocardiograph"), e("Electroconvulsive Therapy Units", "ect"),
    e("Electroencephalographs", "eeg"), e("Endoscopes", "endoskop", "endoscope", "laparoskop", "laparoscope"), e("Enteral Pumps", "enteral", "feeding pump"), e("Evoked Potential Units", "evoked"),
    e("Laparoscopic Insufflators", "insufflator", "insuflator"), e("Lithotripters", "litotripsi", "lithotripter", "eswl"), e("Oxygen-Air Proportioners", "blender"), e("Phonocardiograph", "fonokardiograf"),
    e("Phototherapy Units", "fototerapi", "phototherapy", "photo therapy"), e("Pneumatic Antishock Trousers", "antishock"), e("Pressure Transducers", "transducer"), e("Pulmonary Function Analyzers", "spirometer", "spirometri"),
    e("Radiant Warmers (Adult)", "warmer"), e("Regulators (Air, O2, Suction)", "flowmeter", "regulator"), e("Scales for Critical Applications", "timbangan bayi", "baby scale"), e("Special Care Beds", "special care bed"),
    e("Surgical Drills and Saws (Powered)", "bor bedah", "drill", "saw"), e("Traction Units", "traksi", "traction"), e("Treadmills", "treadmill"), e("Ultrasound Scanners", "usg", "ultrasound", "ultrasonografi"),
  ],
  "Low Risk": [
    e("Alternating-Pressure Pads", "kasur dekubitus", "alternating"), e("Aspirators (Low Volume)", "aspirator low"), e("Breast Pumps", "breast pump", "pompa asi"), e("Cast Cutters", "cast cutter", "gergaji gips"),
    e("Circulating-Fluid Pumps", "circulating"), e("Diathermy Units (Physical Therapy)", "diatermi", "diathermy", "swd", "mwd"), e("Electric Beds", "electric bed", "bed elektrik", "tempat tidur elektrik"), e("Electric Wheelchairs", "kursi roda elektrik"),
    e("Electronic Scales (General)", "timbangan"), e("Electronic Thermometers", "termometer", "thermometer"), e("Examination Light", "lampu periksa", "examination lamp"), e("Fiberoptic Light Sources", "light source"),
    e("Oto/Ophthalmoscopes", "otoskop", "oftalmoskop", "otoscope", "ophthalmoscope", "funduskopi"), e("Oxygen Concentrators", "konsentrator oksigen", "oxygen concentrator"), e("Paraffin Baths", "parafin", "paraffin"),
    e("Regulators (Low-Volume Suction)", "low suction"), e("Smoke Evacuators", "smoke evacuator"), e("Sphygmomanometers", "tensimeter", "sfigmomanometer", "sphygmomanometer"), e("Stimulators (Physical Therapy)", "stimulator", "tens"),
    e("Surgical Lights", "lampu operasi", "operating lamp", "surgical light"), e("Surgical Microscopes", "mikroskop operasi", "surgical microscope"), e("Surgical Tables", "meja operasi", "operating table"),
    e("Temperature Monitors", "temperature monitor"), e("Ultrasonic Nebulizers", "nebulizer", "nebuliser"), e("Ultrasound Units (Physical Therapy)", "ultrasound terapi"), e("Whirlpool Baths", "whirlpool"),
  ],
};

/** Lampiran I bagian II: alat yang boleh diuji/dikalibrasi internal oleh instalasi/unit RS (di bawah pengampuan BPFK). */
export const INTERNAL_RS = ["Electro Cardiography", "Baby Incubator", "Infant Warmer", "Timbangan Bayi", "Fetal Doppler", "Photo therapy", "Tensimeter", "Syringe Pump", "Suction Pump", "Centrifuge", "Operating Lamp", "Dental Unit"];

const norm = (s: string) => ` ${s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;

/** Klasifikasi alat menurut Lampiran I (cek High → Medium → Low; kata kunci terpanjang menang dalam tingkat yang sama). */
export function klasifikasiP54(namaAlat: string): { risiko: RisikoP54; jenis: string } | null {
  const n = norm(namaAlat);
  for (const r of ["High Risk", "Medium Risk", "Low Risk"] as RisikoP54[]) {
    let terbaik: { jenis: string; p: number } | null = null;
    for (const x of LAMPIRAN_I[r]) for (const k of x.kunci) if (n.includes(norm(k)) && (!terbaik || k.length > terbaik.p)) terbaik = { jenis: x.nama, p: k.length };
    if (terbaik) return { risiko: r, jenis: terbaik.jenis };
  }
  return null;
}

/** Pasal 8: status kepatuhan satu alat wajib uji. */
export function statusP54(o: { kalibrasiTerakhir: Date | null; berlakuSampai: Date | null; laik: boolean | null; perbaikanTerakhir: Date | null }, kini = new Date()) {
  if (!o.kalibrasiTerakhir) return { kode: "belum", label: "Belum pernah diuji/kalibrasi (Pasal 8 ayat 5f)" };
  if (o.laik === false) return { kode: "tidaklaik", label: "Tidak laik pakai — label merah" };
  if (o.perbaikanTerakhir && o.perbaikanTerakhir > o.kalibrasiTerakhir) return { kode: "pascaperbaikan", label: "Wajib uji ulang setelah perbaikan (Pasal 8 ayat 5c)" };
  const batas = o.berlakuSampai ?? new Date(o.kalibrasiTerakhir.getTime() + 365 * 86_400_000);
  if (batas < kini) return { kode: "kedaluwarsa", label: "Lewat 1 tahun / masa berlaku (Pasal 8 ayat 1)" };
  return { kode: "patuh", label: "Laik pakai & berlaku" };
}
