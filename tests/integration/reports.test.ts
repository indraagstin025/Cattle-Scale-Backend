import { jest } from '@jest/globals';
import request from 'supertest';

// ── 1. Mock authSession ──────────────────────────────────────────────────────
jest.unstable_mockModule('../../src/middleware/authSession.middleware.js', () => ({
    authSession: (_req: any, _res: any, next: any) => next()
}));

// ── 2. Mock AnalyticsService ─────────────────────────────────────────────────
const mockPredictGrowth = jest.fn<any>();
const mockGetCattleGrowthTrend = jest.fn<any>();

jest.unstable_mockModule('../../src/services/AnalyticsService.js', () => ({
    AnalyticsService: class {
        predictGrowth = mockPredictGrowth;
        getCattleGrowthTrend = mockGetCattleGrowthTrend;
    }
}));

// ── 3. Mock pdfExporter ──────────────────────────────────────────────────────
const mockGenerateAndUploadGrowthPdf = jest.fn<any>();
jest.unstable_mockModule('../../src/utils/pdfExporter.util.js', () => ({
    generateAndUploadGrowthPdf: mockGenerateAndUploadGrowthPdf
}));

// ── 4. Mock Prisma ───────────────────────────────────────────────────────────
jest.unstable_mockModule('../../src/config/prisma.config.js', () => ({
    prisma: { $queryRaw: jest.fn<any>() }
}));

// Dynamic import app
const { default: app } = await import('../../src/app.js');

describe('Integration: Reports Endpoints (/api/v1/reports)', () => {

    beforeEach(() => jest.clearAllMocks());

    describe('GET /api/v1/reports/export-pdf/:cattleId', () => {
        it('harus membuat laporan PDF dan mengembalikan signedUrl (200)', async () => {
            mockPredictGrowth.mockResolvedValue({
                regression: { slope: 1.0, intercept: 200, r2: 1.0 },
                adgFromRegression: 1.0,
                predictions: [],
                estimatedWeightKg: 300,
                estimatedHarvestDate: new Date(),
                daysUntilHarvest: 100,
            });

            mockGetCattleGrowthTrend.mockResolvedValue([
                { weighedAt: new Date('2026-01-01'), weight: 200 },
                { weighedAt: new Date('2026-01-15'), weight: 215 },
            ]);

            mockGenerateAndUploadGrowthPdf.mockResolvedValue('https://supabase/signed-pdf-url.pdf');

            const res = await request(app).get('/api/v1/reports/export-pdf/c-123');

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.downloadUrl).toBe('https://supabase/signed-pdf-url.pdf');
            expect(res.body.data.expiresInSeconds).toBe(60);
        });

        it('harus mengembalikan status 500 jika proses export gagal', async () => {
            mockPredictGrowth.mockRejectedValue(new Error('Sapi membutuhkan minimal 3 riwayat timbang'));

            const res = await request(app).get('/api/v1/reports/export-pdf/c-invalid');

            expect(res.status).toBe(500);
            expect(res.body.success).toBe(false);
        });
    });
});
