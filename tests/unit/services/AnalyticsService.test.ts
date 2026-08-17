import 'reflect-metadata';
import { mock, mockClear } from 'jest-mock-extended';
import { AnalyticsService } from '../../../src/services/AnalyticsService.js';
import type { IWeightLogRepository } from '../../../src/interfaces/repositories/IWeightLogRepository.js';
import type { ICattleRepository } from '../../../src/interfaces/repositories/ICattleRepository.js';
import type { IDeviceRepository } from '../../../src/interfaces/repositories/IDeviceRepository.js';

describe('AnalyticsService', () => {
    const weightLogRepoMock = mock<IWeightLogRepository>();
    const cattleRepoMock = mock<ICattleRepository>();
    const deviceRepoMock = mock<IDeviceRepository>();
    let analyticsService: AnalyticsService;

    beforeEach(() => {
        mockClear(weightLogRepoMock);
        mockClear(cattleRepoMock);
        mockClear(deviceRepoMock);
        analyticsService = new AnalyticsService(weightLogRepoMock, cattleRepoMock, deviceRepoMock);
    });

    describe('getDashboardOverview', () => {
        it('harus menghitung KPI peternakan: total sapi, rata-rata ADG, dan perangkat offline', async () => {
            // Setup data sapi
            cattleRepoMock.findAll.mockResolvedValue([
                { id: 'c1', tagId: 'TAG1', breed: 'Brahman' },
                { id: 'c2', tagId: 'TAG2', breed: 'Limousin' },
                { id: 'c3', tagId: 'TAG3', breed: 'Bali' }, // sapi c3 baru ditimbang 1 kali
            ] as any);

            // Mock log timbangan:
            // Sapi 1: timbang tgl 20 (berat 220kg), tgl 10 (berat 210kg) -> 10 hari naik 10kg => ADG = 1.0 kg/hari
            // Sapi 2: timbang tgl 20 (berat 330kg), tgl 10 (berat 315kg) -> 10 hari naik 15kg => ADG = 1.5 kg/hari
            // Sapi 3: timbang hanya 1 kali
            weightLogRepoMock.findHistory
                .mockResolvedValueOnce([
                    { weight: 220 as any, weighedAt: new Date('2026-05-20') } as any,
                    { weight: 210 as any, weighedAt: new Date('2026-05-10') } as any,
                ])
                .mockResolvedValueOnce([
                    { weight: 330 as any, weighedAt: new Date('2026-05-20') } as any,
                    { weight: 315 as any, weighedAt: new Date('2026-05-10') } as any,
                ])
                .mockResolvedValueOnce([
                    { weight: 150 as any, weighedAt: new Date('2026-05-20') } as any,
                ]);

            // Setup data perangkat: 1 online, 2 offline/weighing
            deviceRepoMock.findAll.mockResolvedValue([
                { id: 'd1', status: 'online' },
                { id: 'd2', status: 'offline' },
                { id: 'd3', status: 'weighing' },
            ] as any);

            const overview = await analyticsService.getDashboardOverview();

            expect(overview.totalCattle).toBe(3);
            // avgDailyGain = (1.0 + 1.5) / 2 = 1.25
            expect(overview.avgDailyGain).toBe(1.25);
            expect(overview.offlineDevicesCount).toBe(2);
        });

        it('harus merespons nilai 0 jika peternakan belum memiliki sapi atau data timbangan', async () => {
            cattleRepoMock.findAll.mockResolvedValue([]);
            deviceRepoMock.findAll.mockResolvedValue([]);

            const overview = await analyticsService.getDashboardOverview();

            expect(overview.totalCattle).toBe(0);
            expect(overview.avgDailyGain).toBe(0);
            expect(overview.offlineDevicesCount).toBe(0);
        });
    });

    describe('getCattleGrowthTrend', () => {
        it('harus mengembalikan riwayat urut kronologis dengan ADG dan interval hari', async () => {
            // Mock data dari DB (reverse order, terbaru di index 0)
            weightLogRepoMock.findHistory.mockResolvedValue([
                { id: 'l3', weight: 230 as any, isStable: true, weighedAt: new Date('2026-03-30') } as any,
                { id: 'l2', weight: 215 as any, isStable: true, weighedAt: new Date('2026-03-15') } as any,
                { id: 'l1', weight: 200 as any, isStable: true, weighedAt: new Date('2026-03-01') } as any,
            ]);

            const trend = await analyticsService.getCattleGrowthTrend('cattle-123');

            expect(trend).toHaveLength(3);
            // Index 0: l1 (timbangan awal) -> ADG null
            expect(trend[0].id).toBe('l1');
            expect(trend[0].adg).toBeNull();
            expect(trend[0].daysSincePrev).toBeNull();

            // Index 1: l2 -> 14 hari naik 15kg => ADG = 15/14 = 1.071 kg/hari
            expect(trend[1].id).toBe('l2');
            expect(trend[1].daysSincePrev).toBeCloseTo(14, 0);
            expect(trend[1].adg).toBeCloseTo(1.071, 2);

            // Index 2: l3 -> 15 hari naik 15kg => ADG = 15/15 = 1.0 kg/hari
            expect(trend[2].id).toBe('l3');
            expect(trend[2].daysSincePrev).toBeCloseTo(15, 0);
            expect(trend[2].adg).toBe(1.0);
        });
    });

    describe('predictGrowth', () => {
        it('harus menghasilkan prediksi regresi linear jika data timbangan mencukupi', async () => {
            cattleRepoMock.findById.mockResolvedValue({
                id: 'c-1',
                tagId: 'TAG-1',
                targetWeight: 350 as any,
            } as any);

            weightLogRepoMock.findHistory.mockResolvedValue([
                { weight: 230 as any, weighedAt: new Date('2026-03-30') } as any,
                { weight: 215 as any, weighedAt: new Date('2026-03-15') } as any,
                { weight: 200 as any, weighedAt: new Date('2026-03-01') } as any,
            ]);

            const prediction = await analyticsService.predictGrowth('c-1', 90);

            expect(prediction.regression.slope).toBeGreaterThan(0);
            expect(prediction.predictions).toHaveLength(3); // +30, +60, +90
            expect(prediction.estimatedHarvestDate).toBeInstanceOf(Date);
        });

        it('harus melempar error jika sapi tidak ditemukan di database', async () => {
            cattleRepoMock.findById.mockResolvedValue(null);

            await expect(analyticsService.predictGrowth('unknown-id'))
                .rejects
                .toThrow(/tidak ditemukan/i);
        });
    });

    describe('getBreedPerformance', () => {
        it('harus mengelompokkan sapi per ras dan membandingkan ADG dengan standar baku', async () => {
            cattleRepoMock.findAll.mockResolvedValue([
                { id: 'c1', breed: 'Brahman' },
                { id: 'c2', breed: 'Brahman' },
                { id: 'c3', breed: 'Limousin' },
            ] as any);

            // Sapi Brahman 1: ADG = 1.0
            // Sapi Brahman 2: ADG = 1.2 => Rata-rata Brahman = 1.1
            // Sapi Limousin 1: ADG = 1.5 => Rata-rata Limousin = 1.5
            weightLogRepoMock.findHistory
                .mockResolvedValueOnce([
                    { weight: 210 as any, weighedAt: new Date('2026-05-20') } as any,
                    { weight: 200 as any, weighedAt: new Date('2026-05-10') } as any,
                ])
                .mockResolvedValueOnce([
                    { weight: 212 as any, weighedAt: new Date('2026-05-20') } as any,
                    { weight: 200 as any, weighedAt: new Date('2026-05-10') } as any,
                ])
                .mockResolvedValueOnce([
                    { weight: 315 as any, weighedAt: new Date('2026-05-20') } as any,
                    { weight: 300 as any, weighedAt: new Date('2026-05-10') } as any,
                ]);

            const performance = await analyticsService.getBreedPerformance();

            expect(performance).toHaveLength(2);
            // Diurutkan berdasarkan avgAdg tertinggi (Limousin 1.5 > Brahman 1.1)
            expect(performance[0].breed).toBe('Limousin');
            expect(performance[0].avgAdg).toBe(1.5);
            expect(performance[0].standardAdg).toBeGreaterThan(0);

            expect(performance[1].breed).toBe('Brahman');
            expect(performance[1].avgAdg).toBe(1.1);
            expect(performance[1].cattleCount).toBe(2);
        });
    });
});
