import type { Metadata } from "next";
import { headers } from "next/headers";
import { Info } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { sesiHalaman } from "@/lib/sesi";
import { unitTerkunci } from "@/lib/akses";
import { cukup } from "@/lib/peran";
import { alamatQr } from "@/lib/alamat";
import { keAlarmDaftar } from "@/lib/monitoring-data";
import { HARI_MS, statusLokasi } from "@/lib/monitoring";
import { MonitoringManager } from "@/components/monitoring/monitoring-manager";

export const metadata: Metadata = { title: "Monitoring" };
export const dynamic = "force-dynamic";

export default async function AdminMonitoringPage({ searchParams }: { searchParams: Promise<{ lokasi?: string; tab?: string }> }) {
  const sp = await searchParams;
  const s = await sesiHalaman("Viewer");
  const kunci = await unitTerkunci();
  const internet = process.env.STARS_MODE === "internet";
  const bolehUbah = cukup(s.user.peran, "Operator") && !internet;
  const bolehAdmin = cukup(s.user.peran, "Admin") && !internet;
  const kini = Date.now();
  const whereUnit = kunci?.id ? { unitKerjaId: kunci.id } : {};
  const [lokasi, sensor, alarm, unit, alat] = await Promise.all([
    prisma.lokasiPantau.findMany({
      where: whereUnit, orderBy: { kode: "asc" },
      include: { unitKerja: { select: { nama: true } }, alat: { select: { kode: true, nama: true } }, sensor: { select: { id: true, serial: true } }, _count: { select: { bacaan: true, alarm: { where: { selesai: null, jenis: { not: "putus" } } } } } },
    }),
    prisma.sensorIot.findMany({ where: kunci?.id ? { lokasi: { unitKerjaId: kunci.id } } : {}, orderBy: { serial: "asc" }, include: { lokasi: { select: { kode: true, nama: true } } } }),
    prisma.alarmPantau.findMany({
      where: { lokasi: whereUnit, OR: [{ selesai: null }, { diakuiPada: null }, { mulai: { gte: new Date(kini - 30 * HARI_MS) } }] },
      orderBy: { mulai: "desc" }, take: 300, include: { lokasi: { select: { kode: true, nama: true } } },
    }),
    prisma.unitKerja.findMany({ orderBy: [{ urut: "asc" }, { nama: "asc" }], select: { id: true, nama: true } }),
    bolehUbah ? prisma.alat.findMany({ where: { aktif: true }, orderBy: [{ nama: "asc" }], select: { id: true, kode: true, nama: true, unitKerja: { select: { nama: true } } } }) : Promise.resolve([]),
  ]);
  const lokasiAwal = Number(sp.lokasi) || null;
  return (
    <div className="grid gap-4">
      {!bolehUbah && (
        <p className="flex items-start gap-2 rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900"><Info className="mt-0.5 size-4 shrink-0" />
          <span>{internet ? "Server ini mode internet (baca saja)." : <>Peran <strong>{s.user.peran}</strong> hanya dapat melihat. Mengatur lokasi, sensor, impor data, dan mengakui alarm memerlukan peran Operator.</>}</span></p>
      )}
      <MonitoringManager
        lokasi={lokasi.map((l) => ({
          id: l.id, kode: l.kode, nama: l.nama, jenis: l.jenis, deskripsi: l.deskripsi, unitKerjaId: l.unitKerjaId, unit: l.unitKerja?.nama ?? null, alatId: l.alatId, alat: l.alat,
          suhuMin: l.suhuMin, suhuMaks: l.suhuMaks, lembapMin: l.lembapMin, lembapMaks: l.lembapMaks, tundaAlarm: l.tundaAlarm, batasPutusMenit: l.batasPutusMenit,
          penanggungJawab: l.penanggungJawab, aktif: l.aktif, terakhirWaktu: l.terakhirWaktu?.toISOString() ?? null, suhu: l.terakhirSuhu, lembap: l.terakhirLembap,
          status: statusLokasi(l, l._count.alarm, kini).kunci, jumlahBacaan: l._count.bacaan, sensor: l.sensor,
        }))}
        sensor={sensor.map((x) => ({ id: x.id, serial: x.serial, nama: x.nama, model: x.model, lokasiId: x.lokasiId, lokasi: x.lokasi, tokenPetunjuk: x.tokenPetunjuk, terakhirTerhubung: x.terakhirTerhubung?.toISOString() ?? null, baterai: x.baterai, sinyal: x.sinyal, aktif: x.aktif }))}
        alarm={alarm.map(keAlarmDaftar)}
        unit={unit}
        alat={alat.map((a) => ({ id: a.id, kode: a.kode, nama: a.nama, unit: a.unitKerja.nama }))}
        bolehUbah={bolehUbah} bolehAdmin={bolehAdmin}
        alamat={alamatQr(await headers())}
        lokasiAwal={lokasiAwal}
        tabAwal={["lokasi", "sensor", "alarm", "impor", "integrasi"].includes(sp.tab ?? "") ? (sp.tab as "lokasi") : null}
      />
    </div>
  );
}
