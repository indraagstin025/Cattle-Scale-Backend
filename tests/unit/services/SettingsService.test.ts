import 'reflect-metadata';
import { jest } from '@jest/globals';
import { mock, mockClear } from 'jest-mock-extended';
import { SettingsService, SETTING_KEYS } from '../../../src/services/SettingsService.js';
import { SettingsRepository } from '../../../src/repositories/SettingsRepository.js';
import type { PrismaClient } from '@prisma/client';

describe('SettingsService', () => {
    const settingsRepoMock = mock<SettingsRepository>();
    const prismaMock = mock<PrismaClient>();
    let settingsService: SettingsService;

    beforeEach(() => {
        mockClear(settingsRepoMock);
        mockClear(prismaMock);
        settingsService = new SettingsService(settingsRepoMock, prismaMock);
    });

    describe('getAllSettings & getSetting', () => {
        it('harus menggabungkan data DB dengan nilai default untuk key yang belum di-set', async () => {
            // Mock hanya ada 1 setting di DB (farm_name)
            settingsRepoMock.findAll.mockResolvedValue([
                {
                    key: SETTING_KEYS.FARM_NAME,
                    value: 'Peternakan Berkah Sejahtera',
                    description: 'Nama peternakan utama',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ]);

            const allSettings = await settingsService.getAllSettings();

            expect(allSettings).toHaveLength(Object.keys(SETTING_KEYS).length);

            const farmName = allSettings.find((s) => s.key === SETTING_KEYS.FARM_NAME);
            expect(farmName?.value).toBe('Peternakan Berkah Sejahtera');

            // Key lain harus menggunakan nilai default fallback
            const timezone = allSettings.find((s) => s.key === SETTING_KEYS.FARM_TIMEZONE);
            expect(timezone?.value).toBe('Asia/Jakarta');

            const spikeKg = allSettings.find((s) => s.key === SETTING_KEYS.SPIKE_THRESHOLD_KG);
            expect(spikeKg?.value).toBe(50);
        });

        it('harus mengembalikan nilai dari DB atau fallback ke default pada getSetting', async () => {
            settingsRepoMock.findByKey
                .mockResolvedValueOnce({
                    key: SETTING_KEYS.SPIKE_THRESHOLD_KG,
                    value: 75,
                    description: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                })
                .mockResolvedValueOnce(null); // FARM_TIMEZONE belum ada di DB

            const customSpike = await settingsService.getSetting(SETTING_KEYS.SPIKE_THRESHOLD_KG);
            expect(customSpike).toBe(75);

            const defaultTimezone = await settingsService.getSetting(SETTING_KEYS.FARM_TIMEZONE);
            expect(defaultTimezone).toBe('Asia/Jakarta');
        });
    });

    describe('upsertSetting', () => {
        it('harus menyimpan setting jika key valid', async () => {
            const mockSaved = {
                key: SETTING_KEYS.SPIKE_THRESHOLD_KG,
                value: 60,
                description: 'Ambang batas baru',
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            settingsRepoMock.upsert.mockResolvedValue(mockSaved);

            const result = await settingsService.upsertSetting(
                SETTING_KEYS.SPIKE_THRESHOLD_KG,
                60,
                'Ambang batas baru'
            );

            expect(result).toEqual(mockSaved);
            expect(settingsRepoMock.upsert).toHaveBeenCalledWith(
                SETTING_KEYS.SPIKE_THRESHOLD_KG,
                60,
                'Ambang batas baru'
            );
        });

        it('harus melempar error jika key tidak terdaftar di SETTING_KEYS', async () => {
            await expect(settingsService.upsertSetting('invalid_setting_key', 'some-value'))
                .rejects
                .toThrow(/tidak dikenal/i);

            expect(settingsRepoMock.upsert).not.toHaveBeenCalled();
        });
    });

    describe('getSpikeThreshold', () => {
        it('harus mengembalikan thresholdKg dan windowSeconds', async () => {
            settingsRepoMock.findByKey
                .mockResolvedValueOnce({ key: SETTING_KEYS.SPIKE_THRESHOLD_KG, value: 40 } as any)
                .mockResolvedValueOnce({ key: SETTING_KEYS.SPIKE_WINDOW_SECONDS, value: 15 } as any);

            const spike = await settingsService.getSpikeThreshold();

            expect(spike.thresholdKg).toBe(40);
            expect(spike.windowSeconds).toBe(15);
        });
    });

    describe('getDeviceBufferStatus', () => {
        it('harus mendeteksi perangkat yang terlambat mengirim heartbeat (isLate = true)', async () => {
            // Setup batas terlambat = 15 menit
            settingsRepoMock.findByKey.mockResolvedValue({
                key: SETTING_KEYS.DEVICE_OFFLINE_WARN_MINUTES,
                value: 15,
            } as any);

            const now = Date.now();
            const lastSeen5MinAgo = new Date(now - 5 * 60 * 1000);   // online 5 menit lalu
            const lastSeen30MinAgo = new Date(now - 30 * 60 * 1000); // offline 30 menit lalu (> 15 min)

            (prismaMock as any).device = {
                findMany: jest.fn<any>().mockResolvedValue([
                    {
                        id: 'd1',
                        deviceCode: 'DEV-01',
                        name: 'Scale 1',
                        status: 'online',
                        firmwareVersion: '1.0.0',
                        lastSeenAt: lastSeen5MinAgo,
                    },
                    {
                        id: 'd2',
                        deviceCode: 'DEV-02',
                        name: 'Scale 2',
                        status: 'offline',
                        firmwareVersion: '1.0.0',
                        lastSeenAt: lastSeen30MinAgo,
                    },
                ]),
            };

            const statusList = await settingsService.getDeviceBufferStatus();

            expect(statusList).toHaveLength(2);

            // Device 1: baru 5 menit -> tidak late
            expect(statusList[0].isLate).toBe(false);
            expect(statusList[0].minutesSinceLastSeen).toBe(5);

            // Device 2: 30 menit -> isLate = true
            expect(statusList[1].isLate).toBe(true);
            expect(statusList[1].minutesSinceLastSeen).toBe(30);
        });
    });
});
