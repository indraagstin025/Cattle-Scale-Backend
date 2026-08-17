import { jest } from '@jest/globals';
import ExcelJS from 'exceljs';
import type { CattleReportInfo, HistoricalDataPoint } from '../../../src/utils/excelExporter.util.js';
import type { GrowthPrediction } from '../../../src/utils/linearRegression.util.js';

// Setup Mock ESM
const mockUpload = jest.fn<any>();
const mockDownload = jest.fn<any>();
const mockCreateSignedUrl = jest.fn<any>();
const mockFrom = jest.fn<any>().mockReturnValue({
    upload: mockUpload,
    download: mockDownload,
    createSignedUrl: mockCreateSignedUrl,
});

jest.unstable_mockModule('../../../src/config/supabase.config.js', () => ({
    supabaseAdmin: {
        storage: {
            from: mockFrom
        }
    }
}));

// Dynamic import HARUS setelah unstable_mockModule
const { generateAndUploadGrowthPdf } = await import('../../../src/utils/pdfExporter.util.js');
const { generateAndUploadGrowthExcel } = await import('../../../src/utils/excelExporter.util.js');

describe('exportGenerator.util', () => {
    
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('PDF Export (generateAndUploadGrowthPdf)', () => {
        it('harus menghasilkan buffer PDF, menguploadnya, dan mengembalikan signedUrl', async () => {
            mockUpload.mockResolvedValue({ data: { path: 'dummy.pdf' }, error: null });
            mockCreateSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://example.com/signed.pdf' }, error: null });

            const cattle: CattleReportInfo = {
                tagId: 'CATTLE-001',
                name: 'Si Belang',
                breed: 'Brahman',
                ageMonths: 12,
                status: 'ACTIVE',
                targetWeightKg: 500
            };

            const historical: HistoricalDataPoint[] = [
                { dayIndex: 0, weighedAt: new Date(), weightKg: 200 },
                { dayIndex: 30, weighedAt: new Date(), weightKg: 230 },
                { dayIndex: 60, weighedAt: new Date(), weightKg: 260 },
            ];

            const prediction: GrowthPrediction = {
                regression: { slope: 1, intercept: 200, r2: 1 },
                adgFromRegression: 1.0,
                predictions: [
                    { days: 30, estimatedWeightKg: 290 },
                ],
                estimatedWeightKg: 290,
                estimatedHarvestDate: new Date(),
                daysUntilHarvest: 240
            };

            const url = await generateAndUploadGrowthPdf(cattle, historical, prediction);

            expect(url).toBe('https://example.com/signed.pdf');
            expect(mockUpload).toHaveBeenCalledTimes(1);
            expect((mockUpload.mock.calls[0] as any[])[0]).toMatch(/Laporan_Pertumbuhan_CATTLE-001/);
            expect(Buffer.isBuffer((mockUpload.mock.calls[0] as any[])[1])).toBe(true);
            expect(mockCreateSignedUrl).toHaveBeenCalledWith(expect.stringContaining('.pdf'), 60);
        });

        it('harus melempar error jika upload PDF ke Supabase gagal', async () => {
            mockUpload.mockResolvedValue({ data: null, error: { message: 'Upload Failed' } });

            const cattle: CattleReportInfo = { tagId: 'CATTLE-002', status: 'ACTIVE', ageMonths: null, breed: null, name: null, targetWeightKg: null };
            const historical: HistoricalDataPoint[] = [];
            const prediction: GrowthPrediction = {
                regression: { slope: 1, intercept: 200, r2: 1 },
                adgFromRegression: 1.0,
                predictions: [],
                estimatedWeightKg: 200,
                estimatedHarvestDate: null,
                daysUntilHarvest: null
            };

            await expect(generateAndUploadGrowthPdf(cattle, historical, prediction))
                .rejects
                .toThrow(/Gagal meng-upload laporan PDF/i);
        });
    });

    describe('Excel Export (generateAndUploadGrowthExcel)', () => {
        it('harus mengunduh template, mengisi data sel, mengupload workbook, dan mengembalikan signedUrl', async () => {
            // Buat template dummy valid
            const templateWb = new ExcelJS.Workbook();
            templateWb.addWorksheet('Sheet1');
            const templateBuffer = await templateWb.xlsx.writeBuffer();

            mockDownload.mockResolvedValue({
                data: {
                    arrayBuffer: async () => templateBuffer
                },
                error: null
            });
            mockUpload.mockResolvedValue({ data: { path: 'dummy.xlsx' }, error: null });
            mockCreateSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://example.com/signed.xlsx' }, error: null });

            const cattle: CattleReportInfo = {
                tagId: 'TAG-EXCEL-01',
                name: 'Sapi Juara',
                breed: 'Limousin',
                ageMonths: 18,
                status: 'ACTIVE',
                targetWeightKg: 650
            };

            const historical: HistoricalDataPoint[] = [
                { dayIndex: 0, weighedAt: new Date('2026-01-01'), weightKg: 300 },
                { dayIndex: 30, weighedAt: new Date('2026-01-31'), weightKg: 345 },
            ];

            const prediction: GrowthPrediction = {
                regression: { slope: 1.5, intercept: 300, r2: 0.98 },
                adgFromRegression: 1.5,
                predictions: [
                    { days: 30, estimatedWeightKg: 390 },
                    { days: 60, estimatedWeightKg: 435 },
                ],
                estimatedWeightKg: 435,
                estimatedHarvestDate: new Date('2026-08-01'),
                daysUntilHarvest: 210
            };

            const url = await generateAndUploadGrowthExcel(cattle, historical, prediction);

            expect(url).toBe('https://example.com/signed.xlsx');
            expect(mockDownload).toHaveBeenCalledTimes(1);
            expect(mockUpload).toHaveBeenCalledTimes(1);
            expect((mockUpload.mock.calls[0] as any[])[0]).toMatch(/Laporan_Pertumbuhan_TAG-EXCEL-01.*\.xlsx/);
            expect(mockCreateSignedUrl).toHaveBeenCalledWith(expect.stringContaining('.xlsx'), 60);
        });

        it('harus melempar error jika unduh template dari Supabase Storage gagal', async () => {
            mockDownload.mockResolvedValue({ data: null, error: { message: 'Bucket not found' } });

            const cattle: CattleReportInfo = { tagId: 'TAG-ERR', status: 'ACTIVE', ageMonths: null, breed: null, name: null, targetWeightKg: null };
            const prediction = { regression: { slope: 1, intercept: 100, r2: 1 }, predictions: [] } as any;

            await expect(generateAndUploadGrowthExcel(cattle, [], prediction))
                .rejects
                .toThrow(/Gagal mengunduh template Excel/i);
        });

        it('harus melempar error jika upload Excel ke Supabase Storage gagal', async () => {
            const templateWb = new ExcelJS.Workbook();
            templateWb.addWorksheet('Sheet1');
            const templateBuffer = await templateWb.xlsx.writeBuffer();

            mockDownload.mockResolvedValue({
                data: { arrayBuffer: async () => templateBuffer },
                error: null
            });
            mockUpload.mockResolvedValue({ data: null, error: { message: 'Storage Quota Exceeded' } });

            const cattle: CattleReportInfo = { tagId: 'TAG-ERR-UPLOAD', status: 'ACTIVE', ageMonths: null, breed: null, name: null, targetWeightKg: null };
            const prediction = { regression: { slope: 1, intercept: 100, r2: 1 }, predictions: [] } as any;

            await expect(generateAndUploadGrowthExcel(cattle, [], prediction))
                .rejects
                .toThrow(/Gagal meng-upload laporan ke Supabase/i);
        });
    });
});
