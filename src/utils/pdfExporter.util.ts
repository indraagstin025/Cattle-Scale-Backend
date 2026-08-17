import PDFDocument from "pdfkit";
import { supabaseAdmin } from "../config/supabase.config.js";
import { env } from "../config/env.config.js";
import { GrowthPrediction } from "./linearRegression.util.js";
import { CattleReportInfo, HistoricalDataPoint } from "./excelExporter.util.js";

// ── Konstanta Styling ─────────────────────────────────────────────────────────
const COLOR_PRIMARY   = "#1a5276"; // Biru tua
const COLOR_ACCENT    = "#2980b9"; // Biru medium
const COLOR_SUCCESS   = "#1e8449"; // Hijau
const COLOR_WARNING   = "#ca6f1e"; // Oranye
const COLOR_MUTED     = "#7f8c8d"; // Abu
const COLOR_TEXT      = "#1c2833"; // Hitam teks
const COLOR_ROW_ALT   = "#eaf2ff"; // Biru muda (baris tabel alternating)

/**
 * Membuat laporan PDF pertumbuhan sapi secara lengkap menggunakan PDFKit,
 * meng-upload hasilnya ke Supabase Storage (Private Bucket 'reports'),
 * dan mengembalikan Signed URL yang valid selama 60 detik.
 *
 * Konten laporan:
 *  - Header: Judul laporan & tanggal cetak
 *  - Bagian 1: Profil sapi (Tag ID, Nama, Ras, Umur, Status, Target Panen)
 *  - Bagian 2: Ringkasan Analitik (ADG Regresi, Slope, R², Estimasi Panen)
 *  - Bagian 3: Tabel Riwayat Penimbangan (Tanggal, Berat, Keterangan)
 *  - Footer: Nomor halaman
 *
 * @param cattle     - Identitas sapi
 * @param historical - Data historis timbangan
 * @param prediction - Hasil GrowthPrediction dari regresi linear
 * @returns Signed URL (valid 60 detik) untuk mendownload file PDF
 */
export async function generateAndUploadGrowthPdf(
    cattle: CattleReportInfo,
    historical: HistoricalDataPoint[],
    prediction: GrowthPrediction,
): Promise<string> {
    // ── Buat PDF Buffer menggunakan PDFKit ────────────────────────────────────
    const pdfBuffer = await buildPdfBuffer(cattle, historical, prediction);

    // ── Upload ke Supabase (Private Bucket 'reports') ─────────────────────────
    const timestamp  = Date.now();
    const safeTagId  = cattle.tagId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const fileName   = `Laporan_Pertumbuhan_${safeTagId}_${timestamp}.pdf`;

    const { error: uploadError } = await supabaseAdmin.storage
        .from(env.SUPABASE_REPORTS_BUCKET)
        .upload(fileName, pdfBuffer, {
            contentType: "application/pdf",
            upsert: false,
        });

    if (uploadError) {
        throw new Error(`Gagal meng-upload laporan PDF ke Supabase: ${uploadError.message}`);
    }

    // ── Buat Signed URL (60 detik) ────────────────────────────────────────────
    const { data: signedData, error: signError } = await supabaseAdmin.storage
        .from(env.SUPABASE_REPORTS_BUCKET)
        .createSignedUrl(fileName, 60);

    if (signError || !signedData?.signedUrl) {
        throw new Error(`Gagal membuat Signed URL untuk PDF: ${signError?.message}`);
    }

    return signedData.signedUrl;
}

// ── Helper: Build PDF Buffer ──────────────────────────────────────────────────
function buildPdfBuffer(
    cattle: CattleReportInfo,
    historical: HistoricalDataPoint[],
    prediction: GrowthPrediction,
): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        const doc = new PDFDocument({
            size: "A4",
            margins: { top: 50, bottom: 50, left: 50, right: 50 },
            info: {
                Title: `Laporan Pertumbuhan Sapi - ${cattle.tagId}`,
                Author: "Smart Livestock Management System",
            },
        });

        doc.on("data", (chunk) => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        // ── HALAMAN ──────────────────────────────────────────────────────────
        drawHeader(doc, cattle);
        drawProfileSection(doc, cattle);
        drawAnalyticsSection(doc, prediction);
        drawHistoryTable(doc, historical);
        drawFooter(doc);

        doc.end();
    });
}

// ── Section: Header ───────────────────────────────────────────────────────────
function drawHeader(doc: InstanceType<typeof PDFDocument>, cattle: CattleReportInfo): void {
    // Banner biru di bagian paling atas
    doc.rect(50, 50, 495, 70).fill(COLOR_PRIMARY);

    doc.fillColor("#ffffff")
        .font("Helvetica-Bold")
        .fontSize(18)
        .text("LAPORAN PERTUMBUHAN SAPI", 70, 65, { align: "left" });

    doc.font("Helvetica")
        .fontSize(10)
        .text("Smart Livestock Management System", 70, 90, { align: "left" });

    // Tanggal cetak di pojok kanan banner
    const now = new Date().toLocaleDateString("id-ID", {
        day: "2-digit", month: "long", year: "numeric",
    });
    doc.text(`Dicetak: ${now}`, 70, 90, { align: "right" });

    doc.moveDown(3.5);
}

// ── Section: Profil Sapi ──────────────────────────────────────────────────────
function drawProfileSection(doc: InstanceType<typeof PDFDocument>, cattle: CattleReportInfo): void {
    drawSectionTitle(doc, "1. Profil Sapi");

    const fields: [string, string][] = [
        ["Tag ID",           cattle.tagId],
        ["Nama Sapi",        cattle.name        ?? "-"],
        ["Ras / Breed",      cattle.breed       ?? "-"],
        ["Umur",             cattle.ageMonths ? `${cattle.ageMonths} bulan` : "-"],
        ["Status",           cattle.status],
        ["Target Panen",     cattle.targetWeightKg ? `${cattle.targetWeightKg} Kg` : "Belum ditentukan"],
    ];

    const colLabel = 50;
    const colValue = 220;
    let y = doc.y;

    fields.forEach(([label, value], i) => {
        const bgColor = i % 2 === 0 ? COLOR_ROW_ALT : "#ffffff";
        doc.rect(colLabel, y, 495, 20).fill(bgColor);

        doc.fillColor(COLOR_MUTED).font("Helvetica").fontSize(10)
            .text(label, colLabel + 8, y + 5);
        doc.fillColor(COLOR_TEXT).font("Helvetica-Bold").fontSize(10)
            .text(value, colValue, y + 5);
        y += 20;
    });

    doc.y = y + 12;
}

// ── Section: Ringkasan Analitik ───────────────────────────────────────────────
function drawAnalyticsSection(doc: InstanceType<typeof PDFDocument>, prediction: GrowthPrediction): void {
    drawSectionTitle(doc, "2. Ringkasan Analitik Pertumbuhan");

    const { regression, adgFromRegression, predictions, estimatedHarvestDate, daysUntilHarvest } = prediction;

    // Kartu ringkasan (2 kolom x 3 baris)
    const cards: { label: string; value: string; color: string }[] = [
        { label: "ADG (Regresi)",     value: `${adgFromRegression.toFixed(3)} Kg/hari`,  color: COLOR_SUCCESS },
        { label: "Slope (M)",          value: `${regression.slope.toFixed(4)}`,            color: COLOR_ACCENT  },
        { label: "Intercept (B)",      value: `${regression.intercept.toFixed(2)} Kg`,    color: COLOR_ACCENT  },
        { label: "Akurasi (R²)",       value: `${(regression.r2 * 100).toFixed(1)}%`,     color: regression.r2 >= 0.85 ? COLOR_SUCCESS : COLOR_WARNING },
        { label: "Estimasi Panen",     value: estimatedHarvestDate
            ? estimatedHarvestDate.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })
            : "Tidak tersedia",
          color: COLOR_PRIMARY },
        { label: "Sisa Hari ke Panen", value: daysUntilHarvest ? `${daysUntilHarvest} hari` : "-", color: COLOR_PRIMARY },
    ];

    const cardW = 240;
    const cardH = 45;
    const gapX  = 15;
    let startX  = 50;
    let startY  = doc.y;

    cards.forEach((card, i) => {
        const x = startX + (i % 2) * (cardW + gapX);
        const y = startY + Math.floor(i / 2) * (cardH + 8);

        doc.rect(x, y, cardW, cardH).fill(card.color);
        doc.fillColor("#ffffff").font("Helvetica").fontSize(9)
            .text(card.label, x + 10, y + 8);
        doc.font("Helvetica-Bold").fontSize(14)
            .text(card.value, x + 10, y + 22);
    });

    doc.y = startY + Math.ceil(cards.length / 2) * (cardH + 8) + 12;

    // Sub-tabel prediksi ekstrapolasi
    drawSectionTitle(doc, "   Prediksi Berat (Ekstrapolasi)");
    const headers = ["Horizon", "Estimasi Berat (Kg)"];
    drawTableRow(doc, headers, true);
    predictions.forEach((p) => {
        drawTableRow(doc, [`+${p.days} hari`, `${p.estimatedWeightKg.toFixed(1)} Kg`], false);
    });

    doc.moveDown(1);
}

// ── Section: Tabel Riwayat Timbangan ─────────────────────────────────────────
function drawHistoryTable(doc: InstanceType<typeof PDFDocument>, historical: HistoricalDataPoint[]): void {
    // Pastikan ada space cukup, jika tidak tambah halaman baru
    if (doc.y > 600) doc.addPage();

    drawSectionTitle(doc, "3. Riwayat Penimbangan");

    const headers = ["No.", "Hari ke-", "Tanggal", "Berat (Kg)"];
    drawTableRow(doc, headers, true);

    historical.forEach((point, i) => {
        const tanggal = point.weighedAt.toLocaleDateString("id-ID", {
            day: "2-digit", month: "short", year: "numeric",
        });
        drawTableRow(doc, [
            String(i + 1),
            String(point.dayIndex),
            tanggal,
            point.weightKg.toFixed(1),
        ], false, i);
    });
}

// ── Footer ────────────────────────────────────────────────────────────────────
function drawFooter(doc: InstanceType<typeof PDFDocument>): void {
    const pageHeight = doc.page.height;
    doc.rect(50, pageHeight - 45, 495, 1).fill(COLOR_MUTED);
    doc.fillColor(COLOR_MUTED).font("Helvetica").fontSize(8)
        .text(
            "Dokumen ini dibuat secara otomatis oleh Smart Livestock Management System. Hanya untuk keperluan internal.",
            50, pageHeight - 38,
            { align: "center", width: 495 }
        );
}

// ── Helper: Judul Seksi ───────────────────────────────────────────────────────
function drawSectionTitle(doc: InstanceType<typeof PDFDocument>, title: string): void {
    doc.rect(50, doc.y, 495, 22).fill(COLOR_ACCENT);
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(11)
        .text(title, 58, doc.y - 16);
    doc.moveDown(0.8);
}

// ── Helper: Baris Tabel ───────────────────────────────────────────────────────
function drawTableRow(
    doc: InstanceType<typeof PDFDocument>,
    cells: string[],
    isHeader: boolean,
    rowIndex = 0,
): void {
    const colWidths = [40, 70, 160, 100];
    const rowH = 20;
    const bgColor = isHeader ? COLOR_PRIMARY
        : rowIndex % 2 === 0 ? COLOR_ROW_ALT : "#ffffff";

    let x = 50;
    const y = doc.y;

    colWidths.forEach((w, i) => {
        doc.rect(x, y, w, rowH).fill(bgColor);
        doc.fillColor(isHeader ? "#ffffff" : COLOR_TEXT)
            .font(isHeader ? "Helvetica-Bold" : "Helvetica")
            .fontSize(9)
            .text(cells[i] ?? "", x + 4, y + 6, { width: w - 8, lineBreak: false });
        x += w;
    });

    doc.y = y + rowH;
}
