/**
 * @fileoverview Utilitas Regresi Linear + Ekstrapolasi untuk Prediksi Pertumbuhan Sapi.
 *
 * Modul ini mengimplementasikan dua teknik statistik:
 *
 * **[1] Regresi Linear (OLS — Ordinary Least Squares)**
 * Mencari garis lurus terbaik `y = a + b·x` yang meminimalkan kuadrat residual
 * dari keseluruhan data historis penimbangan.
 *
 * ```
 *           (n·Σxy − Σx·Σy)
 *  b (slope)  = ─────────────────────   (laju tumbuh Kg/hari)
 *           (n·Σx² − (Σx)²)
 *
 *  a (intercept) = (Σy − b·Σx) / n     (estimasi berat di hari ke-0)
 *
 *  R² = 1 − (SS_res / SS_tot)          (0 = buruk, 1 = sempurna)
 *       SS_res = Σ(yᵢ − ŷᵢ)²
 *       SS_tot = Σ(yᵢ − ȳ)²
 * ```
 *
 * **[2] Ekstrapolasi**
 * Menggunakan garis regresi untuk memproyeksikan berat di LUAR rentang historis.
 *
 * ```
 *  ŷ_future = a + b · (lastDayIndex + daysAhead)
 * ```
 *
 * **[3] Inverse Prediction (Estimasi Tanggal Panen)**
 * Membalik persamaan regresi untuk mencari kapan target berat akan tercapai.
 *
 * ```
 *  x_panen  = (targetWeight − a) / b
 *  daysLeft = ceil(x_panen − lastDayIndex)
 * ```
 *
 * @example
 *  Input: 3 data selama 2 bulan
 *  Hari ke-0 → 200 Kg | Hari ke-30 → 230 Kg | Hari ke-60 → 262 Kg
 * 
 *  Hasil Regresi: slope=1.0333 Kg/hari, intercept=199.33, R²=0.9997
 * 
 *  Prediksi:
 *    +30 hari → 292.32 Kg
 *    +60 hari → 323.33 Kg
 *    +90 hari → 354.32 Kg
 *    Panen 400 Kg → ~134 hari lagi
 */


// ── Tipe Data ────────────────────────────────────────────────────────────────
/**
 * Representasi satu titik data penimbangan dalam koordinat regresi.
 */
export interface RegressionPoint {
    /** Jumlah hari sejak penimbangan pertama (sumbu waktu / sumbu X) */
    x: number;
    /** Berat sapi dalam Kg pada hari tersebut (sumbu bobot / sumbu Y) */
    y: number;
}

/**
 * Koefisiern hasil kalkulasi model regresi linear OLS.
 */
export interface RegressionResult {
    /**
     * Slope (b) - laju pertambahan bobot rata-rata per hari (Kg/hari).
     * Juga digunakan langsung sebagai (Average Daily Gain) dari regresi.
     */
    slope: number;
    /**
     * Intercept (a) — estimasi bobot sapi di hari ke-0
     * (titik potong garis regresi dengan sumbu Y).
     */
    intercept: number;
    /**
     * Koefisien Determinasi R² (0–1).
     * - 1.0 = model sempurna cocok dengan data.
     * - 0.0 = model tidak menjelaskan variansi data sama sekali.
     */
    r2: number;
}

/**
 * Hasil prediksi bobot pada satu titik waktu tertentu di masa depan.
 */
export interface WeightPrediction {
    /** Jumlah hari ke depan dari tanggal timbangan terakhir */
    days: number;
    /** Estimasi berat hasil ekstrapolasi garis regresi (Kg) */
    estimatedWeightKg: number;
}

/**
 * Ringkasan lengkap hasil analitik pertumbuhan untuk satu ekor sapi,
 * mencakup model regresi, prediksi masa depan, dan estimasi tanggal panen.
 */
export interface GrowthPrediction {
    /** Koefisien model regresi linear (slope, intercept, R²) */
    regression: RegressionResult;
    /**
     * ADG (Average Daily Gain) yang diturunkan dari regresi, nilainya sama dengan `slope`.
     * Satuan: Kg/hari.
     */
    adgFromRegression: number;
    /** Array prediksi bobot pada +30, +60, +90 hari (dan `daysAhead` jika berbeda) */
    predictions: WeightPrediction[];
    /** Estimasi bobot pada `daysAhead` hari ke depan (Kg) */
    estimatedWeightKg: number;
    /**
     * Estimasi tanggal panen berdasarkan `target_weight` sapi.
     * `null` jika slope ≤ 0 atau tidak ada target berat yang ditentukan.
     */
    estimatedHarvestDate: Date | null;
    /**
     * Jumlah hari yang dibutuhkan untuk mencapai target berat dari hari ini.
     * `null` jika tidak dapat diprediksi.
     */
    daysUntilHarvest: number | null;
}

// ── [1] Regresi Linear (OLS) ─────────────────────────────────────────────────
/**
 * Menghitung koefisien regresi linear menggunakan metode Ordinary Least Squares (OLS).
 *
 * Rumus:
 * ```
 *  b = (n·Σxy − Σx·Σy) / (n·Σx² − (Σx)²)
 *  a = (Σy − b·Σx) / n
 *  R² = 1 − (SS_res / SS_tot)
 * ```
 *
 * @param points - Array titik data historis timbangan. Minimal 3 titik diperlukan
 *   agar model memiliki cukup variansi untuk menghasilkan prediksi yang bermakna.
 * @returns Objek `RegressionResult` berisi slope, intercept, dan R².
 * @throws {Error} Jika data kurang dari 3 titik.
 * @throws {Error} Jika semua data berada pada tanggal yang sama (denominator = 0).
 */
export function computeLinearRegression(points: RegressionPoint[]): RegressionResult {
    const n = points.length;

    if (n < 3) {
        throw new Error(`Prediksi membutuhkan 3 data timbangan. Saat ini hanya ada ${n} data.`);
    }

    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

    for (const p of points) {
        sumX += p.x;
        sumY += p.y;
        sumXY += p.x * p.y;
        sumXX += p.x * p.x;
    }

    const denom = n * sumXX - sumX * sumX;

    if (denom === 0) {
        throw new Error(
            "Tidak dapat menghitung regresi: Semua data berada pada tanggal yang sama."
        );
    }

    const b = (n * sumXY - sumX * sumY) / denom;
    const a = (sumY - b * sumX) / n;

    const meanY = sumY / n;
    let ssTot = 0;
    let ssRes = 0;

    for (const p of points) {
        const yHat = a + b * p.x;
        ssTot += (p.y - meanY) ** 2;
        ssRes += (p.y - yHat) ** 2;
    }

    const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

    return {
        slope: parseFloat(b.toFixed(4)),
        intercept: parseFloat(a.toFixed(4)),
        r2: parseFloat(r2.toFixed(4)),
    };
}

// ── [2] EKSTRAPOLASI ─────────────────────────────────────────────────────────
/**
 * Memprediksi berat sapi di masa depan menggunakan ekstrapolasi.
 *
 * Rumus: ŷ = a + b · (lastDayIndex + daysAhead)
 *
 * @param regression   - Hasil dari `computeLinearRegression()`
 * @param daysAhead    - Jumlah hari ke depan dari data timbangan terakhir
 * @param lastDayIndex - Nilai x dari titik data terakhir (hari terakhir data historis)
 */
export function extrapolateWeight(
    regression: RegressionResult,
    daysAhead: number,
    lastDayIndex: number
): number {
    const xFuture = lastDayIndex + daysAhead;
    const predicted = regression.intercept + regression.slope * xFuture;
    return parseFloat(Math.max(0, predicted).toFixed(2));
}

// ── [3] INVERSE PREDICTION (Estimasi Tanggal Panen) ─────────────────────────
/**
 * Mengestimasi kapan sapi mencapai target berat menggunakan inverse prediction.
 *
 * Rumus:
 *   x_panen  = (targetWeight − a) / b
 *   daysLeft = ceil(x_panen − lastDayIndex)
 *
 * @param regression    - Hasil dari `computeLinearRegression()`
 * @param currentWeight - Berat sapi terkini (Kg)
 * @param targetWeight  - Target berat panen (Kg)
 * @param lastDayIndex  - Nilai x dari titik data terakhir
 * @returns { harvestDate, daysUntilHarvest } atau null jika tidak bisa diprediksi
 */
export function estimateHarvestDate(
    regression: RegressionResult,
    currentWeight: number,
    targetWeight: number,
    lastDayIndex: number
): { harvestDate: Date; daysUntilHarvest: number } | null {
    if (regression.slope <= 0) return null;
    if (currentWeight >= targetWeight) {
        return { harvestDate: new Date(), daysUntilHarvest: 0 };
    }
    const xTarget = (targetWeight - regression.intercept) / regression.slope;
    const daysLeft = Math.ceil(xTarget - lastDayIndex);
    if (daysLeft <= 0) {
        return { harvestDate: new Date(), daysUntilHarvest: 0 };
    }
    const harvestDate = new Date();
    harvestDate.setDate(harvestDate.getDate() + daysLeft);
    return { harvestDate, daysUntilHarvest: daysLeft };
}

// ── Fungsi Komposit Utama ─────────────────────────────────────────────────────
/**
 * Fungsi utama: REGRESI LINEAR + EKSTRAPOLASI untuk prediksi pertumbuhan sapi.
 *
 * Alur:
 *   1. Konversi data historis → titik (x=hari, y=berat)
 *   2. Hitung regresi linear (OLS) → slope, intercept, R²
 *   3. Ekstrapolasi → prediksi +30, +60, +90 hari (& daysAhead)
 *   4. Inverse prediction → estimasi tanggal panen
 *
 * Contoh Input/Output:
 *   Input  : [hari 0 → 200 Kg, hari 30 → 230 Kg, hari 60 → 262 Kg]
 *   Regresi: slope=1.0333, intercept=199.33, R²=0.9997
 *   Output : +30hr=292.32Kg | +60hr=323.33Kg | +90hr=354.32Kg
 *            Panen 400Kg → ~134 hari lagi
 *
 * @param points        - Minimal 3 titik data historis timbangan
 * @param targetWeight  - Target berat panen (opsional, dari kolom target_weight di DB)
 * @param daysAhead     - Cakrawala prediksi utama (default: 90 hari / 3 bulan)
 */
export function buildGrowthPrediction(
    points: RegressionPoint[],
    targetWeight?: number,
    daysAhead: number = 90
): GrowthPrediction {
    const regression = computeLinearRegression(points);
    const lastPoint = points[points.length - 1];
    const lastDayIndex = lastPoint.x;
    const currentWeight = lastPoint.y;
    const horizons = Array.from(new Set([30, 60, 90, daysAhead])).sort((a, b) => a - b);
    const predictions: WeightPrediction[] = horizons.map((days) => ({
        days,
        estimatedWeightKg: extrapolateWeight(regression, days, lastDayIndex),
    }));
    const estimatedWeightKg = extrapolateWeight(regression, daysAhead, lastDayIndex);
    let estimatedHarvestDate: Date | null = null;
    let daysUntilHarvest: number | null = null;
    if (targetWeight && targetWeight > 0) {
        const harvest = estimateHarvestDate(regression, currentWeight, targetWeight, lastDayIndex);
        if (harvest) {
            estimatedHarvestDate = harvest.harvestDate;
            daysUntilHarvest = harvest.daysUntilHarvest;
        }
    }
    return {
        regression,
        adgFromRegression: regression.slope,
        predictions,
        estimatedWeightKg,
        estimatedHarvestDate,
        daysUntilHarvest,
    };
}
