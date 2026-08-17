import ExcelJS from "exceljs";
import { supabaseAdmin } from "../config/supabase.config.js";
import { env } from "../config/env.config.js";
import { GrowthPrediction } from "./linearRegression.util.js";

/**
 * Informasi identitas sapi yang akan diinjeksi ke laporan Excel.
 */
export interface CattleReportInfo {
    tagId: string;
    name: string | null;
    breed: string | null;
    ageMonths: number | null;
    status: string;
    targetWeightKg: number | null;
}

/**
 * Titik data historis satu timbangan untuk dimasukkan ke tabel Excel.
 */
export interface HistoricalDataPoint {
    dayIndex: number;
    weighedAt: Date;
    weightKg: number;
    note?: string;
}

/**
 * Mengunduh template Excel dari Supabase Storage (Private Bucket),
 * menginjeksi data sapi dan hasil regresi/ekstrapolasi, lalu meng-upload
 * hasilnya ke bucket 'reports' dan mengembalikan Signed URL (berlaku 60 detik).
 *
 * Alur:
 *  1. Download template dari bucket 'templates' menggunakan Service Role Key.
 *  2. Load buffer ke ExcelJS Workbook.
 *  3. Injeksi identitas sapi dan hasil kalkulator regresi (Slope, Intercept, R²).
 *  4. Loop data historis dan data prediksi ekstrapolasi ke baris tabel.
 *  5. Generate buffer Excel yang sudah terisi.
 *  6. Upload ke bucket 'reports' dengan nama file unik.
 *  7. Buat Signed URL (60 detik) dan kembalikan ke controller.
 *
 * @param cattle     - Identitas sapi (tag, nama, ras, umur, dll.)
 * @param historical - Array data historis penimbangan (dari DB)
 * @param prediction - Hasil GrowthPrediction dari linearRegression.util.ts
 * @returns Signed URL (valid 60 detik) untuk mendownload file laporan
 * @throws {Error} Jika template tidak ditemukan atau upload gagal
 */
export async function generateAndUploadGrowthExcel(
    cattle: CattleReportInfo,
    historical: HistoricalDataPoint[],
    prediction: GrowthPrediction,
): Promise<string> {
    // ── Langkah 1: Download template dari Private Bucket ─────────────────────
    const { data: templateBlob, error: downloadError } = await supabaseAdmin.storage
        .from(env.SUPABASE_TEMPLATE_BUCKET)
        .download(env.SUPABASE_TEMPLATE_PATH);

    if (downloadError || !templateBlob) {
        throw new Error(`Gagal mengunduh template Excel dari Supabase: ${downloadError?.message ?? "File tidak ditemukan"}`);
    }

    // ── Langkah 2: Konversi Blob → ArrayBuffer → Load ke ExcelJS ─────────────
    const arrayBuffer = await templateBlob.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    const sheet = workbook.getWorksheet(1);
    if (!sheet) throw new Error("Worksheet tidak ditemukan di dalam template Excel.");

    // ── Langkah 3: Injeksi Kalkulator Regresi (Slope & Intercept) ────────────
    // Sesuai posisi di template: Slope di G5, Intercept di G6
    sheet.getCell("G5").value = parseFloat(prediction.regression.slope.toFixed(4));
    sheet.getCell("G6").value = parseFloat(prediction.regression.intercept.toFixed(4));
    // Tambahan metadata (jika ada sel I5-I8 di template)
    sheet.getCell("G7").value = parseFloat(prediction.regression.r2.toFixed(4));

    // ── Langkah 4: Inject identitas sapi ─────────────────────────────────────
    // Posisi header laporan di baris 1-3 area kosong (kolom F-I)
    sheet.getCell("I1").value = cattle.tagId;
    sheet.getCell("I2").value = cattle.name ?? "-";
    sheet.getCell("I3").value = cattle.breed ?? "-";

    // ── Langkah 5: Loop data ke tabel (mulai baris 5, kolom A-D) ─────────────
    const startRow = 5;

    // 5a. Data historis (Kolom A=No, B=Hari ke-X, C=Berat Aktual, D=kosong)
    historical.forEach((point, index) => {
        const row = sheet.getRow(startRow + index);
        row.getCell(1).value = index + 1;            // A: No
        row.getCell(2).value = point.dayIndex;       // B: Hari ke- (X)
        row.getCell(3).value = point.weightKg;       // C: Berat Aktual (Y - kg)
        row.getCell(4).value = null;                 // D: Berat Prediksi (kosong untuk data aktual)
        row.commit();
    });

    // 5b. Data prediksi/ekstrapolasi (Kolom A=E1/E2/E3, B=Hari ke-X, C=kosong, D=Berat Prediksi)
    const lastHistoricalDayIndex = historical.length > 0
        ? historical[historical.length - 1].dayIndex
        : 0;

    prediction.predictions.forEach((pred, index) => {
        const rowIndex = startRow + historical.length + index;
        const row = sheet.getRow(rowIndex);
        row.getCell(1).value = `E${index + 1}`;                           // A: Label Ekstrapolasi
        row.getCell(2).value = lastHistoricalDayIndex + pred.days;        // B: Hari ke- X (kumulatif)
        row.getCell(3).value = null;                                       // C: Berat Aktual (kosong)
        row.getCell(4).value = parseFloat(pred.estimatedWeightKg.toFixed(1)); // D: Berat Prediksi
        row.commit();
    });

    // ── Langkah 6: Generate buffer Excel yang sudah terisi ───────────────────
    const buffer = await workbook.xlsx.writeBuffer();

    // ── Langkah 7: Upload ke bucket 'reports' dengan nama file unik ──────────
    const timestamp = Date.now();
    const safeTagId = cattle.tagId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const fileName = `Laporan_Pertumbuhan_${safeTagId}_${timestamp}.xlsx`;

    const { error: uploadError } = await supabaseAdmin.storage
        .from(env.SUPABASE_REPORTS_BUCKET)
        .upload(fileName, buffer, {
            contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            upsert: false,
        });

    if (uploadError) {
        throw new Error(`Gagal meng-upload laporan ke Supabase: ${uploadError.message}`);
    }

    // ── Langkah 8: Generate Signed URL (Valid 60 detik) ──────────────────────
    const { data: signedData, error: signError } = await supabaseAdmin.storage
        .from(env.SUPABASE_REPORTS_BUCKET)
        .createSignedUrl(fileName, 60); // 60 detik

    if (signError || !signedData?.signedUrl) {
        throw new Error(`Gagal membuat Signed URL: ${signError?.message}`);
    }

    return signedData.signedUrl;
}
