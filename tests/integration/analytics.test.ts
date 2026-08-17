import { jest } from '@jest/globals';
import request from 'supertest';

// ── 1. Mock authSession ──────────────────────────────────────────────────────
jest.unstable_mockModule('../../src/middleware/authSession.middleware.js', () => ({
    authSession: (_req: any, _res: any, next: any) => next()
}));

// ── 2. Mock AnalyticsService ─────────────────────────────────────────────────
const mockGetDashboardOverview = jest.fn<any>();
const mockGetBreedPerformance = jest.fn<any>();
const mockGetCattleGrowthTrend = jest.fn<any>();
const mockPredictGrowth = jest.fn<any>();

jest.unstable_mockModule('../../src/services/AnalyticsService.js', () => ({
    AnalyticsService: class {
        getDashboardOverview = mockGetDashboardOverview;
        getBreedPerformance = mockGetBreedPerformance;
        getCattleGrowthTrend = mockGetCattleGrowthTrend;
        predictGrowth = mockPredictGrowth;
    }
}));

// ── 3. Mock Prisma ───────────────────────────────────────────────────────────
jest.unstable_mockModule('../../src/config/prisma.config.js', () => ({
    prisma: { $queryRaw: jest.fn<any>() }
}));

// Dynamic import app
const { default: app } = await import('../../src/app.js');

describe('Integration: Analytics Endpoints (/api/v1/analytics)', () => {

    beforeEach(() => jest.clearAllMocks());

    describe('GET /api/v1/analytics/overview', () => {
        it('harus mengembalikan KPI dashboard utama (totalSapi, avgADG, deviceOffline)', async () => {
            mockGetDashboardOverview.mockResolvedValue({
                totalCattle: 45,
                avgDailyGain: 1.25,
                offlineDevicesCount: 1,
            });

            const res = await request(app).get('/api/v1/analytics/overview');

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.totalCattle).toBe(45);
            expect(res.body.data.avgDailyGain).toBe(1.25);
        });
    });

    describe('GET /api/v1/analytics/breeds/performance', () => {
        it('harus mengembalikan peringkat performa ADG per ras sapi', async () => {
            const mockPerformance = [
                { breed: 'Limousin', cattleCount: 10, avgAdg: 1.6, standardAdg: 1.4 },
                { breed: 'Brahman', cattleCount: 15, avgAdg: 1.2, standardAdg: 1.1 },
            ];
            mockGetBreedPerformance.mockResolvedValue(mockPerformance);

            const res = await request(app).get('/api/v1/analytics/breeds/performance');

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(2);
            expect(res.body.data[0].breed).toBe('Limousin');
        });
    });

    describe('GET /api/v1/analytics/growth/:cattleId', () => {
        it('harus mengembalikan tren riwayat pertumbuhan sapi', async () => {
            const mockTrend = [
                { id: '1', weight: 200, adg: null, daysSincePrev: null },
                { id: '2', weight: 215, adg: 1.0, daysSincePrev: 15 },
            ];
            mockGetCattleGrowthTrend.mockResolvedValue(mockTrend);

            const res = await request(app).get('/api/v1/analytics/growth/cattle-001');

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(2);
            expect(mockGetCattleGrowthTrend).toHaveBeenCalledWith('cattle-001');
        });
    });

    describe('GET /api/v1/analytics/predict/:cattleId', () => {
        it('harus mengembalikan hasil kalkulasi regresi linear dan ekstrapolasi bobot', async () => {
            const mockPrediction = {
                regression: { slope: 1.2, intercept: 200, r2: 0.95 },
                adgFromRegression: 1.2,
                predictions: [{ days: 30, estimatedWeightKg: 236 }],
                estimatedWeightKg: 236,
                estimatedHarvestDate: new Date('2026-10-01'),
                daysUntilHarvest: 90,
            };
            mockPredictGrowth.mockResolvedValue(mockPrediction);

            const res = await request(app).get('/api/v1/analytics/predict/cattle-001?daysAhead=90');

            expect(res.status).toBe(200);
            expect(res.body.data.adgFromRegression).toBe(1.2);
            expect(mockPredictGrowth).toHaveBeenCalledWith('cattle-001', 90);
        });
    });
});
