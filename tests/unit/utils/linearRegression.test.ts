import {
    computeLinearRegression,
    extrapolateWeight,
    estimateHarvestDate,
    buildGrowthPrediction,
    type RegressionPoint
} from '../../../src/utils/linearRegression.util.js';

describe('linearRegression.util', () => {

    describe('computeLinearRegression', () => {
        it('harus menghitung slope dan intercept yang tepat untuk pertumbuhan konstan', () => {
            const points: RegressionPoint[] = [
                { x: 0, y: 200 },
                { x: 10, y: 210 },
                { x: 20, y: 220 },
                { x: 30, y: 230 }
            ];
            
            const result = computeLinearRegression(points);
            
            // slope (ADG) = 1.0 (naik 10kg setiap 10 hari)
            expect(result.slope).toBeCloseTo(1.0, 2);
            // intercept = 200 di hari ke-0
            expect(result.intercept).toBeCloseTo(200.0, 2);
            // R2 = 1.0 karena linearnya sempurna
            expect(result.r2).toBe(1.0);
        });

        it('harus menghitung R2 dengan benar pada data pertumbuhan yang memiliki fluktuasi (real world)', () => {
            const points: RegressionPoint[] = [
                { x: 0, y: 200 },
                { x: 15, y: 218 },
                { x: 30, y: 228 },
                { x: 45, y: 247 },
                { x: 60, y: 258 }
            ];

            const result = computeLinearRegression(points);

            expect(result.slope).toBeGreaterThan(0.9);
            expect(result.slope).toBeLessThan(1.1);
            expect(result.r2).toBeGreaterThan(0.98);
            expect(result.r2).toBeLessThanOrEqual(1.0);
        });

        it('harus melempar error jika data kurang dari 3 titik', () => {
            const points: RegressionPoint[] = [
                { x: 0, y: 200 },
                { x: 10, y: 210 }
            ];
            
            expect(() => computeLinearRegression(points)).toThrow(/membutuhkan 3 data/i);
        });

        it('harus melempar error jika semua data ada pada waktu yang sama', () => {
            const points: RegressionPoint[] = [
                { x: 10, y: 200 },
                { x: 10, y: 210 },
                { x: 10, y: 220 }
            ];
            
            expect(() => computeLinearRegression(points)).toThrow(/tanggal yang sama/i);
        });
    });

    describe('extrapolateWeight', () => {
        it('harus memprediksi berat secara akurat dengan menggunakan garis regresi', () => {
            const regression = { slope: 1, intercept: 200, r2: 1 };
            
            // Hari terakhir (x) = 30
            // Kita ingin memprediksi berat pada hari ke 30 + 15 hari = 45 hari
            // y = 200 + 1 * 45 = 245
            const prediction = extrapolateWeight(regression, 15, 30);
            
            expect(prediction).toBeCloseTo(245.0, 2);
        });

        it('harus menghasilkan berat hari ini jika daysAhead = 0', () => {
            const regression = { slope: 1.2, intercept: 200, r2: 0.99 };
            const prediction = extrapolateWeight(regression, 0, 30);
            expect(prediction).toBeCloseTo(200 + 1.2 * 30, 2);
        });

        it('harus memastikan berat tidak bisa negatif (return 0)', () => {
            const regression = { slope: -5, intercept: 100, r2: 1 };
            
            // y = 100 + (-5) * 30 = -50 => dipaksa jadi 0
            const prediction = extrapolateWeight(regression, 10, 20);
            expect(prediction).toBe(0);
        });
    });

    describe('estimateHarvestDate', () => {
        it('harus mengembalikan null jika laju pertumbuhan (slope) <= 0', () => {
            const regression = { slope: 0, intercept: 200, r2: 0 };
            const result = estimateHarvestDate(regression, 200, 300, 10);
            expect(result).toBeNull();
        });

        it('harus mengembalikan null jika slope negatif (bobot sapi terus turun)', () => {
            const regression = { slope: -0.5, intercept: 300, r2: 0.9 };
            const result = estimateHarvestDate(regression, 250, 400, 100);
            expect(result).toBeNull();
        });

        it('harus mengembalikan 0 hari jika berat sapi sudah melewati target', () => {
            const regression = { slope: 1, intercept: 200, r2: 1 };
            const result = estimateHarvestDate(regression, 310, 300, 110);
            expect(result?.daysUntilHarvest).toBe(0);
        });

        it('harus menghitung estimasi jumlah hari dengan akurat (dibulatkan ke atas)', () => {
            const regression = { slope: 1.5, intercept: 200, r2: 1 };
            // Target 250 kg. Saat ini x = 10 (berat diprediksi = 215kg)
            // x_panen = (250 - 200) / 1.5 = 33.33
            // daysLeft = ceil(33.33 - 10) = 24
            
            const result = estimateHarvestDate(regression, 215, 250, 10);
            expect(result?.daysUntilHarvest).toBe(24);
        });
    });

    describe('buildGrowthPrediction', () => {
        it('harus menyusun seluruh data prediksi menjadi kesatuan objek yang rapi', () => {
            const points: RegressionPoint[] = [
                { x: 0, y: 200 },
                { x: 30, y: 230 },
                { x: 60, y: 262 } // slope approx 1.0333, intercept 199.33
            ];
            
            const result = buildGrowthPrediction(points, 400, 90);
            
            expect(result.regression.slope).toBeGreaterThan(0);
            expect(result.adgFromRegression).toBe(result.regression.slope);
            
            // Harus mencakup horizon default (30, 60, 90)
            const days = result.predictions.map(p => p.days);
            expect(days).toEqual([30, 60, 90]);
            
            // Karena target 400kg cukup besar, harus ada estimasi panen
            expect(result.estimatedHarvestDate).toBeInstanceOf(Date);
            expect(result.daysUntilHarvest).toBeGreaterThan(0);
        });

        it('harus menyertakan custom daysAhead yang tidak ada di [30, 60, 90]', () => {
            const points: RegressionPoint[] = [
                { x: 0, y: 200 },
                { x: 30, y: 230 },
                { x: 60, y: 260 }
            ];

            const result = buildGrowthPrediction(points, 500, 45);

            // Horizon harus berisi [30, 45, 60, 90] terurut
            const days = result.predictions.map(p => p.days);
            expect(days).toEqual([30, 45, 60, 90]);
            expect(result.estimatedWeightKg).toBeCloseTo(305, 1);
        });

        it('harus mengembalikan null untuk panen jika targetWeight tidak diberikan atau 0', () => {
            const points: RegressionPoint[] = [
                { x: 0, y: 200 },
                { x: 30, y: 230 },
                { x: 60, y: 260 }
            ];

            const resultNoTarget = buildGrowthPrediction(points, undefined, 90);
            expect(resultNoTarget.estimatedHarvestDate).toBeNull();
            expect(resultNoTarget.daysUntilHarvest).toBeNull();

            const resultZeroTarget = buildGrowthPrediction(points, 0, 90);
            expect(resultZeroTarget.estimatedHarvestDate).toBeNull();
            expect(resultZeroTarget.daysUntilHarvest).toBeNull();
        });
    });
});
