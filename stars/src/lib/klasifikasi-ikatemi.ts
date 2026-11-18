/**
 * Klasifikasi Alat Kesehatan Elektromedik berdasarkan Tingkat Teknologi dan Risiko —
 * Keputusan Ketua Umum Ikatan Elektromedis Indonesia (IKATEMI) Nomor 1 Tahun 2023 (Lampiran), ditetapkan 2 September 2023.
 * Fungsi: Bedah & Anestesi, Diagnostik, Laboratorium, Life Support, Radiologi, Terapi.
 * Teknologi: Sederhana, Menengah, Tinggi. Risiko: Rendah, Menengah, Tinggi.
 */
export const FUNGSI_IKATEMI = ["Bedah dan Anestesi", "Diagnostik", "Laboratorium", "Life Support", "Radiologi", "Terapi"] as const;
export const TEKNOLOGI_IKATEMI = ["Sederhana", "Menengah", "Tinggi"] as const;
export const RISIKO_IKATEMI = ["Rendah", "Menengah", "Tinggi"] as const;
export type FungsiIkatemi = (typeof FUNGSI_IKATEMI)[number];
export type TeknologiIkatemi = (typeof TEKNOLOGI_IKATEMI)[number];
export type RisikoIkatemi = (typeof RISIKO_IKATEMI)[number];
export type AlatIkatemi = { no: number; fungsi: FungsiIkatemi; teknologi: TeknologiIkatemi; nama: string; risiko: RisikoIkatemi };

type Grup = [no: number, fungsi: FungsiIkatemi, teknologi: TeknologiIkatemi, alat: string];
const R = "Rendah", M = "Menengah", T = "Tinggi";
// Format baris alat: "Nama|R" — R/M/T = Rendah/Menengah/Tinggi
const GRUP: Grup[] = [
  [1, "Bedah dan Anestesi", "Sederhana", `Aspirators (Suction Low Volume)|R;Cast Cutters|R;Circumcision Clamps|M;Cold Light Source|M;Fiberoptic Light Sources|R;Gynecological Table Electric|R;Intermittent/Compression Units|R;Operating Lamp Mobile|R;Operating Table Electric|R;Patient Warming System|M;Smoke Evacuators|R;Sternum Saw|R;Suction Pump|R;Surgical Drill|R;Vaccuum Extractor|R;Warming Cabinet|R`],
  [2, "Bedah dan Anestesi", "Menengah", `Cryosurgical Unit|M;Gynecological Table Electric (Remote Controlled)|M;Hypo/Hyphertermial Unit|T;IABP (Intra Aortic Balloon Pump)|T;Operating Lamp Ceiling|R;Operating Table Electric (Remote Controlled)|M;Tourniquet System|M`],
  [3, "Bedah dan Anestesi", "Tinggi", `Anestesia Unit|T;Anestesia Unit dengan Ventilator|T;Argon-Enhanced Coagulation Units|T;Arthroscopy Surgery|T;Autotransfusion Units|T;Electrosurgery Unit|T;Endoscopy Unit|T;Harmonic Scalpel|T;Heart Lung Machine|T;Laparoscopy Unit/ Laparoscopic Insufflator|T;Laser Surgery|T;Operating Microscope/ Surgical Microscope|R;Phaco Emulsifikasi/Vitrectomy|T;Ultrasound Surgery|T`],
  [4, "Diagnostik", "Sederhana", `Amnioscope|R;Bed Pasien Elektrik|R;Chamber Accoustic Test|R;Echotonometer|R;Examination Lamp/Lampu Tindakan/Lampu Periksa|R;Head Lamp|R;In-Bed Weighting Scale|R;Keratometer|R;Laringoscope|R;Lens Meter|R;OAE (Oto Acoustic Emission)|R;Opthalmoscope|R;Otoscope|R;Snellen/Chart Projector|R;Sphygmomanometer|M;Synoptophore|R;Tempat Tidur Pasien Elektrik|R;Tempat Tidur Pasien Elektrik dengan Timbangan Badan|R;Termometer Klinis Kontak|R;Termometer Klinis Non Kontak|R;Timbangan Badan Digital|R;Timbangan Bayi Digital|M;Tonometer|R;Uroflowmeter|R;Vein Viewer|R`],
  [5, "Diagnostik", "Menengah", `Arrythmia Monitor|M;Audiometer|M;BERA (Brainstem Evoked Response Audiometri)|M;Bilirubin Meter Non Invasive|M;Blood Pressure Monitor / NIBP|M;Blood Pressure Monitor Invasive|M;Cardiac Output Units|M;CTG (Cardiotocography)|M;Dental Unit|M;ECG (Electro Cardiograph)|M;Electrical Cardiometry|M;Fetal Detector|M;Heart Rate Monitor|M;Holter Monitor/ Ambulatory ECG|M;Kolposkopi|R;NIBP Monitor/ NIBP Unit|M;Photo Fundus|M;PO2 Trancutaneus Monitor|M;Projection Perimeter|M;Pulmonary Function Analyzers|M;Pulse Oxymeter|M;Pulse Oxymeter Invasive|M;Refractometer|R;Respiration Monitor|M;Spirometer|M;Urodinamik|M`],
  [6, "Diagnostik", "Tinggi", `Angiojet|T;Autoref Keratometer|M;Bedside Monitor/Patient Monitor|M;Bone Densitometer|M;Brain Mapping|M;Computerize Opthalmoscope|M;Computerize Tonometry|M;Echo Cardiograph|M;EEG (Electroencephalograph)|M;Electro Nystagmograph|M;EMG (Electro Myography)|M;Exercise Stress Test / Treadmill|M;Fibroscan|T;Hemodinamik Monitor Cath Lab|M;Phono Cardiograph|M;Test Stress Cardiopulmonary/CPET|T;Ultrasonic Cardiac Output Monitor (USCOM)|M;USG (Ultrasonography)|M;USG Mata/Biometri/AB Scan|M;Vector Cardiograph|M`],
  [7, "Laboratorium", "Sederhana", `Analytical Balance|R;Automatic Coagulation Timer|R;Bilirubin Meter|R;Carbon Dioxide Monitor|R;Centrifuge|R;Cold Plate|R;Diluters|R;Dissector|R;Dryer|R;Evaporators|R;Fluorometer|R;Glucometer|R;Hot Plate|R;Hot Plate Stirrer|R;Incinerator|R;Insufflator|R;Iontophoresis Sweat Test|R;Laboratory Balance|R;Laboratory Densitometer|R;Laboratory Mixer|R;Laminary Air Flow|M;Loupes|R;Magnetic Stirer|R;Microscope Binocular|R;Microscope Monocular|R;Mikropipet|R;Pengasah Pisau Microtome|R;pH Meter|R;Plasma Extractor|R;Protombin Meter|R;Rotator|R;Sedimentation Rate Unit|R;Shaker Laboratory|R;Slide Stainer|R;Specimen Cutter|R;Ultrasonic Cleaner|R;Ureterotome|R;Water Destillator|R;Water Purification System|R`],
  [8, "Laboratorium", "Menengah", `Analyzer Laboratory|M;Analyzer Whole Blood|M;Analyzers Body Fluids|M;Analyzers Urea Nitrogen|M;Biosafety Cabinet|M;Blood Bank Refrigerator|M;Clinical Chemistry Analyzer|M;Fluroscent Mikroskop|M;Hematology Analyzer|M;Homogenizer Tissue|M;Immunoassay Analyzer|M;Laboratory Deep Freezer|M;Laboratory Freezer|M;Laboratory Incubator|M;Laboratory Refrigerator|M;Microscope Photograph|R;Microscopes Light Laboratory|M;Microtitration|M;Microtome|M;Platelet Agregator|M;Precison Balance|M;Refractometer (Laboratorium)|M;Refrigerated Centrifuge|M;Spectrophotometer|M;Steam Sterilizer|M;Tissue Embedding|M;Titrator|M;Ultrasonic Cleaner (Menengah)|M;Water Bath Laboratory|M`],
  [9, "Laboratorium", "Tinggi", `Blood Cell Processor|M;Blood Gas Analyzer|M;Colony Counter|M;Cytometer|M;DNA Sequencing System/PCR|M;Electrophoresis System|M;Freezing Microtome|M;Gamma Counter|M;Gas/Liquid Chromatograph|M;Laboratory Auto Analyzer|M;Nephelometres|M;Plasma Separator|M;Radioimmunoassay Analyzer|M;Tissue Processor|M;Urine Analyzer|M;Viscosimetres Plasma|M`],
  [10, "Life Support", "Sederhana", `AED (Automatic External Defibrillator)|T;Anti Decubitus Matras|R;Aspirators (Emergency and Tracheal)|M;Blood Warmer|M;Bubble CPAP|R;Cardiac Resusitator|R;CPAP (Continous Positive Airway Pressure)|T;Feeding Pump|R;HFNC (High Flow Nasal Canula)|R;Oxygen Blenders|R;Oxygen Concentrator|M;Oxygen Monitor|R;Pneumatic Pulmonary Resuscitators|T`],
  [11, "Life Support", "Menengah", `Baby Incubator/Infant Incubator/ Transport Incubator|T;Defibrillator|M;Infant Warmer/ Radiant Warmer|T;Infusion Pump|M;NIRS (Near-infrared Spectroscopy)|R;Pacemaker External/Non Invasive Pacemaker|M;Syringe Pump|M`],
  [12, "Life Support", "Tinggi", `CAPD (Continuous Ambulatory Peritoneal Dialysis)|T;CRRT (Continuous Renal Replacement Therapy)|M;ECMO (Extracorporeal Membrane Oxygenation)|T;Heated Humidifier|M;Hemodialysis Unit|T;High Frequency Oscilation Ventilator|T;Infant Ventilator|T;Transport Ventilator|T;Transvenous Pacemakers|T;Ventilator|T`],
  [13, "Radiologi", "Sederhana", `Contrast Injector|R;Dental X-Ray|R;Laser Imagers|R;Panoramic Dental X-Ray|R;Radiation Survey Meter, Ionization Chambers|R;Radiation Survey Meter, Geiger-Muller|R;X-Ray Mobile Unit|R`],
  [14, "Radiologi", "Menengah", `C-Arm X-Ray Mobile|R;DR (Digital Radiography)|R;General Diagnostic X-Ray/X-Ray Stationary|R;Mammography X-Ray Unit|M;Radiographic/Fluoroscopic System|R;Radioisotop Dose Calibrator|R;Thyroid Up Take|R;Tomography Unit|R;Treatment Planning System|R;Urology X-Ray Unit|R;X-Ray Intervensional|R;X-Ray Simulator|M`],
  [15, "Radiologi", "Tinggi", `After Loading/ Brachy Therapy|T;Cathlab/Angiography|T;CT Scanner|M;CT Simulator|R;Gamma Camera/SPECT/SPECT CT/NMCT|R;LINAC (Linear Accelerator)|T;MRI (Magnetic Resonance Imaging)|R;PET-CT (Positron Emission Computer Tomography)|R;Telegamma Therapy Cobalt-60|T`],
  [16, "Terapi", "Sederhana", `Alternating-Pressure Pad|R;Blue Light/ Phototherapy Unit /Bilirubin Light|R;Breast Pumps|R;Electric Wheelchair|R;ENT Treatment|R;Exercise Bicycle Electric|R;Hydro Therapy|R;Infra Red Lamp|R;Kompressor Nebulizer|M;Parafin Bath|R;Patient Lifts|R;Traction Unit|R;Treadmill|R;Ultra Violet Lamp|R;Ultrasonic Nebulizer|R;Whirl Pool Bath|R`],
  [17, "Terapi", "Menengah", `Compression Therapy|R;Cryo Therapy|R;Electro Stimulator|R;Electroconvulsive Therapy Units|M;Hydro Therapy (Menengah)|R;Microwaves Diathermy|R;Radio Frequency Pain|R;Shortwaves Diathermy|R;Ultrasound Therapy|R`],
  [18, "Terapi", "Tinggi", `ECT (Electroconvulsive Therapy Unit)|M;ESWL (Extracorporeal Shock Wave Lithotripsy)|M;Hyperbaric Chamber|M;Prostratron|M;Trancranial Magnetic Stimulator|M`],
];
const KODE: Record<string, RisikoIkatemi> = { R, M, T };

export const KLASIFIKASI_IKATEMI: AlatIkatemi[] = GRUP.flatMap(([no, fungsi, teknologi, daftar]) =>
  daftar.split(";").map((x) => { const [nama, r] = x.split("|"); return { no, fungsi, teknologi, nama: nama.trim(), risiko: KODE[r.trim()] }; }));

export const labelKelompok = (a: Pick<AlatIkatemi, "fungsi" | "teknologi">) => `Alat Elektromedik ${a.fungsi} Teknologi ${a.teknologi}`;
export const cariIkatemi = (nama: string | null | undefined) => (nama ? KLASIFIKASI_IKATEMI.find((a) => a.nama === nama) ?? null : null);

const normal = (s: string) => s.toLowerCase().replace(/\([^)]*\)/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
/** Sinonim nama lokal / Trilux → nama baku IKATEMI. */
const SINONIM: [RegExp, string][] = [
  [/bedside|patient monitor|monitor pasien/i, "Bedside Monitor/Patient Monitor"],
  [/\baed\b|automated external/i, "AED (Automatic External Defibrillator)"],
  [/defibril/i, "Defibrillator"],
  [/ventilator.*(transport|portab)|transport.*ventilator/i, "Transport Ventilator"],
  [/ventilator.*(bayi|infant|neonat)|infant ventilator/i, "Infant Ventilator"],
  [/hfov|high frequency/i, "High Frequency Oscilation Ventilator"],
  [/ventilator/i, "Ventilator"],
  [/syringe|spuit pump/i, "Syringe Pump"],
  [/infus/i, "Infusion Pump"],
  [/incubator|inkubator/i, "Baby Incubator/Infant Incubator/ Transport Incubator"],
  [/infant warmer|radiant|baby warmer/i, "Infant Warmer/ Radiant Warmer"],
  [/suction|aspirator|penghisap/i, "Suction Pump"],
  [/ecg|ekg|electrocardio/i, "ECG (Electro Cardiograph)"],
  [/usg|ultrasonogra/i, "USG (Ultrasonography)"],
  [/ctg|cardiotoco/i, "CTG (Cardiotocography)"],
  [/doppler|fetal/i, "Fetal Detector"],
  [/oksimeter|oxymeter|oximeter|spo2/i, "Pulse Oxymeter"],
  [/tensimeter|sphygmo/i, "Sphygmomanometer"],
  [/nebuli/i, "Kompressor Nebulizer"],
  [/esu|electrosurg|elektrokauter|cauter/i, "Electrosurgery Unit"],
  [/anest/i, "Anestesia Unit"],
  [/lampu operasi|operating lamp/i, "Operating Lamp Ceiling"],
  [/meja operasi|operating table/i, "Operating Table Electric"],
  [/lampu (periksa|tindakan)|examination (light|lamp)/i, "Examination Lamp/Lampu Tindakan/Lampu Periksa"],
  [/phototherap|fototerapi|blue light/i, "Blue Light/ Phototherapy Unit /Bilirubin Light"],
  [/hemodialis|dialysis machine/i, "Hemodialysis Unit"],
  [/autoclave|sterilisator|sterilizer/i, "Steam Sterilizer"],
  [/hematolog/i, "Hematology Analyzer"],
  [/kimia klinik|chemistry analy/i, "Clinical Chemistry Analyzer"],
  [/centrifu|sentrifu/i, "Centrifuge"],
  [/mikroskop|microscope/i, "Microscope Binocular"],
  [/x.?ray mobile|rontgen mobile/i, "X-Ray Mobile Unit"],
  [/c.?arm/i, "C-Arm X-Ray Mobile"],
  [/ct.?scan/i, "CT Scanner"],
  [/flowmeter|regulator oksigen/i, ""],
  [/oxygen concentrat|konsentrator oksigen/i, "Oxygen Concentrator"],
  [/cpap/i, "CPAP (Continous Positive Airway Pressure)"],
  [/hfnc|high flow nasal/i, "HFNC (High Flow Nasal Canula)"],
  [/timbangan bayi|baby scale/i, "Timbangan Bayi Digital"],
  [/timbangan/i, "Timbangan Badan Digital"],
  [/termometer|thermometer/i, "Termometer Klinis Non Kontak"],
  [/laringoskop|laryngoscope/i, "Laringoscope"],
  [/otoskop|otoscope/i, "Otoscope"],
  [/oftalmoskop|ophthalmoscope|opthalmoscope/i, "Opthalmoscope"],
  [/blood warmer|penghangat darah/i, "Blood Warmer"],
  [/refrigerator.*(darah|blood)|kulkas darah|blood bank/i, "Blood Bank Refrigerator"],
  [/bed pasien|tempat tidur.*elektri|hospital bed.*electric|bed.*(patient|pasien).*electr|electr\w*.*bed/i, "Tempat Tidur Pasien Elektrik"],
  [/endoskop|endoscop/i, "Endoscopy Unit"],
  [/laparoskop|laparoscop/i, "Laparoscopy Unit/ Laparoscopic Insufflator"],
  [/dental unit|dental chair/i, "Dental Unit"],
  [/spirometer/i, "Spirometer"],
  [/audiometer/i, "Audiometer"],
  [/eeg/i, "EEG (Electroencephalograph)"],
  [/emg/i, "EMG (Electro Myography)"],
  [/treadmill/i, "Exercise Stress Test / Treadmill"],
  [/short ?wave|swd/i, "Shortwaves Diathermy"],
  [/ultrasound therap|terapi ultrasound/i, "Ultrasound Therapy"],
  [/tens\b|stimulator/i, "Electro Stimulator"],
  [/traksi|traction/i, "Traction Unit"],
  [/infra ?red/i, "Infra Red Lamp"],
];

/** Tebak klasifikasi IKATEMI dari nama alat (sinonim dulu, lalu kecocokan nama baku). Null bila tidak yakin. */
export function tebakIkatemi(namaAlat: string): AlatIkatemi | null {
  for (const [pola, baku] of SINONIM) if (pola.test(namaAlat)) return baku ? cariIkatemi(baku) : null;
  const n = normal(namaAlat);
  if (!n) return null;
  const token = new Set(n.split(" "));
  let terbaik: AlatIkatemi | null = null, skor = 0;
  for (const a of KLASIFIKASI_IKATEMI) {
    const k = normal(a.nama);
    if (!k) continue;
    if (n === k) return a;
    const kata = k.split(" ").filter((w) => w.length > 2);
    const cocok = kata.filter((w) => token.has(w)).length; // kata utuh, bukan potongan (cegah "ect" ⊂ "electric")
    const s = kata.length ? cocok / kata.length : 0;
    if (s > skor && cocok >= Math.min(2, kata.length)) { skor = s; terbaik = a; }
  }
  return skor >= 0.99 ? terbaik : null;
}
