import 'reflect-metadata';
import { mock, mockClear } from 'jest-mock-extended';
import { WeightLogService } from '../../../src/services/WeightLogService.js';
import type { IWeightLogRepository } from '../../../src/interfaces/repositories/IWeightLogRepository.js';
import type { ICattleRepository } from '../../../src/interfaces/repositories/ICattleRepository.js';
import type { IDeviceRepository } from '../../../src/interfaces/repositories/IDeviceRepository.js';

describe('WeightLogService', () => {
    const weightLogRepoMock = mock<IWeightLogRepository>();
    const cattleRepoMock = mock<ICattleRepository>();
    const deviceRepoMock = mock<IDeviceRepository>();
    let weightLogService: WeightLogService;

    beforeEach(() => {
        mockClear(weightLogRepoMock);
        mockClear(cattleRepoMock);
        mockClear(deviceRepoMock);
        weightLogService = new WeightLogService(weightLogRepoMock, cattleRepoMock, deviceRepoMock);
    });

    describe('processWeighIn', () => {
        const samplePayload = {
            deviceCode: 'DEV-SCALE-01',
            tagId: 'TAG-123',
            weight: 350.5,
            isStable: true,
            weighedAt: new Date('2026-06-01T10:00:00Z'),
            idempotencyKey: 'idemp-unique-abc-123',
        };

        it('harus menjamin idempotensi: mengembalikan record yang sudah ada jika idempotencyKey cocok', async () => {
            const existingLog = {
                id: 'existing-log-id',
                weight: 350.5 as any,
                idempotencyKey: 'idemp-unique-abc-123',
                cattleId: 'c-1',
                deviceId: 'd-1',
                isStable: true,
                weighedAt: new Date(),
                notes: null,
                createdAt: new Date(),
            };

            weightLogRepoMock.findByIdempotencyKey.mockResolvedValue(existingLog);

            const result = await weightLogService.processWeighIn(samplePayload);

            expect(result).toEqual(existingLog);
            expect(weightLogRepoMock.findByIdempotencyKey).toHaveBeenCalledWith('idemp-unique-abc-123');
            // Pastikan tidak melakukan query sapi / create baru
            expect(cattleRepoMock.findByTagId).not.toHaveBeenCalled();
            expect(weightLogRepoMock.create).not.toHaveBeenCalled();
        });

        it('harus melempar error jika tagId sapi tidak ditemukan di database', async () => {
            weightLogRepoMock.findByIdempotencyKey.mockResolvedValue(null);
            cattleRepoMock.findByTagId.mockResolvedValue(null); // Sapi tidak ada

            await expect(weightLogService.processWeighIn(samplePayload))
                .rejects
                .toThrow(/Sapi dengan tag TAG-123 tidak ditemukan/i);

            expect(weightLogRepoMock.create).not.toHaveBeenCalled();
        });

        it('harus melempar error jika deviceCode perangkat tidak terdaftar', async () => {
            weightLogRepoMock.findByIdempotencyKey.mockResolvedValue(null);
            cattleRepoMock.findByTagId.mockResolvedValue({ id: 'c-1', tagId: 'TAG-123' } as any);
            deviceRepoMock.findByDeviceCode.mockResolvedValue(null); // Device tidak ada

            await expect(weightLogService.processWeighIn(samplePayload))
                .rejects
                .toThrow(/Device DEV-SCALE-01 tidak valid/i);

            expect(weightLogRepoMock.create).not.toHaveBeenCalled();
        });

        it('harus membuat log timbangan baru dan mengupdate currentWeight pada sapi', async () => {
            weightLogRepoMock.findByIdempotencyKey.mockResolvedValue(null);
            cattleRepoMock.findByTagId.mockResolvedValue({ id: 'c-1', tagId: 'TAG-123' } as any);
            deviceRepoMock.findByDeviceCode.mockResolvedValue({ id: 'd-1', deviceCode: 'DEV-SCALE-01' } as any);

            const createdLog = {
                id: 'new-log-uuid',
                cattleId: 'c-1',
                deviceId: 'd-1',
                weight: 350.5 as any,
                isStable: true,
                weighedAt: samplePayload.weighedAt,
                idempotencyKey: samplePayload.idempotencyKey,
                notes: null,
                createdAt: new Date(),
            };

            weightLogRepoMock.create.mockResolvedValue(createdLog);

            const result = await weightLogService.processWeighIn(samplePayload);

            expect(result).toEqual(createdLog);
            expect(weightLogRepoMock.create).toHaveBeenCalledWith({
                cattleId: 'c-1',
                deviceId: 'd-1',
                weight: 350.5,
                isStable: true,
                weighedAt: samplePayload.weighedAt,
                idempotencyKey: samplePayload.idempotencyKey,
            });
            // Memastikan currentWeight pada sapi ikut terupdate
            expect(cattleRepoMock.update).toHaveBeenCalledWith('c-1', {
                currentWeight: 350.5,
            });
        });
    });

    describe('getHistory', () => {
        it('harus meneruskan filter pencarian log timbangan ke repository', async () => {
            const mockLogs = [
                { id: '1', weight: 200 as any },
                { id: '2', weight: 210 as any },
            ];
            weightLogRepoMock.findHistory.mockResolvedValue(mockLogs as any);

            const filters = {
                cattleId: 'c-1',
                startDate: new Date('2026-01-01'),
                endDate: new Date('2026-06-01'),
                take: 50,
            };

            const result = await weightLogService.getHistory(filters);

            expect(result).toEqual(mockLogs);
            expect(weightLogRepoMock.findHistory).toHaveBeenCalledWith(filters);
        });
    });
});
