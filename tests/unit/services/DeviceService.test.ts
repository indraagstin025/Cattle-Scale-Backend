import 'reflect-metadata';
import { mock, mockClear } from 'jest-mock-extended';
import { DeviceService } from '../../../src/services/DeviceService.js';
import type { IDeviceRepository } from '../../../src/interfaces/repositories/IDeviceRepository.js';

describe('DeviceService', () => {
    const deviceRepoMock = mock<IDeviceRepository>();
    let deviceService: DeviceService;

    beforeEach(() => {
        mockClear(deviceRepoMock);
        deviceService = new DeviceService(deviceRepoMock);
    });

    describe('getAllDevices & getDeviceById', () => {
        it('harus mengembalikan daftar seluruh perangkat', async () => {
            const mockDevices = [
                { id: '1', name: 'Timbangan A', status: 'online' },
                { id: '2', name: 'Timbangan B', status: 'offline' },
            ];
            deviceRepoMock.findAll.mockResolvedValue(mockDevices as any);

            const result = await deviceService.getAllDevices();
            expect(result).toEqual(mockDevices);
            expect(deviceRepoMock.findAll).toHaveBeenCalledTimes(1);
        });

        it('harus mengembalikan detail satu perangkat berdasarkan ID', async () => {
            const mockDevice = { id: 'dev-1', name: 'Timbangan Utama' };
            deviceRepoMock.findById.mockResolvedValue(mockDevice as any);

            const result = await deviceService.getDeviceById('dev-1');
            expect(result).toEqual(mockDevice);
            expect(deviceRepoMock.findById).toHaveBeenCalledWith('dev-1');
        });
    });

    describe('registerDevice', () => {
        it('harus membuat perangkat baru, men-generate rawApiKey dan deviceCode (DEV-XXXX)', async () => {
            deviceRepoMock.create.mockImplementation(async (data) => ({
                id: 'new-dev-uuid',
                name: data.name,
                location: data.location ?? null,
                apiKey: data.apiKey,
                deviceCode: data.deviceCode,
                status: 'offline',
                batteryLevel: 100,
                wifiRssi: null,
                firmwareVersion: null,
                lastSeenAt: new Date(),
                deletedAt: null,
                createdAt: new Date(),
            }));

            const result = await deviceService.registerDevice('Timbangan Kandang 1', 'Blok A');

            expect(result.device.id).toBe('new-dev-uuid');
            expect(result.device.name).toBe('Timbangan Kandang 1');
            expect(result.device.status).toBe('offline');
            expect(result.device.deviceCode).toMatch(/^DEV-[A-F0-9]{8}$/);
            expect(typeof result.rawApiKey).toBe('string');
            expect(result.rawApiKey.length).toBe(64); // 32 bytes hex
            expect(result.device.apiKey).not.toBe(result.rawApiKey); // tersimpan sebagai hash
            expect(deviceRepoMock.create).toHaveBeenCalledTimes(1);
        });
    });

    describe('rotateApiKey', () => {
        it('harus me-reset API Key dan mengembalikan rawApiKey baru', async () => {
            deviceRepoMock.update.mockImplementation(async (id, data) => ({
                id,
                apiKey: data.apiKey as string,
            } as any));

            const result = await deviceService.rotateApiKey('dev-123');

            expect(result.device.id).toBe('dev-123');
            expect(typeof result.newApiKey).toBe('string');
            expect(result.newApiKey.length).toBe(64);
            expect(deviceRepoMock.update).toHaveBeenCalledWith('dev-123', {
                apiKey: expect.any(String),
            });
        });
    });

    describe('updateDevice', () => {
        it('harus meneruskan pembaruan metadata perangkat ke repository', async () => {
            const updated = { id: 'dev-1', name: 'Nama Baru', location: 'Blok B' };
            deviceRepoMock.update.mockResolvedValue(updated as any);

            const result = await deviceService.updateDevice('dev-1', { name: 'Nama Baru', location: 'Blok B' });

            expect(result).toEqual(updated);
            expect(deviceRepoMock.update).toHaveBeenCalledWith('dev-1', { name: 'Nama Baru', location: 'Blok B' });
        });
    });

    describe('processHeartbeat', () => {
        it('harus memperbarui metrik kesehatan perangkat jika deviceCode ditemukan', async () => {
            deviceRepoMock.findByDeviceCode.mockResolvedValue({
                id: 'dev-uuid-88',
                deviceCode: 'DEV-SCALE-01',
            } as any);

            await deviceService.processHeartbeat('DEV-SCALE-01', 85, -65, '1.2.0');

            expect(deviceRepoMock.findByDeviceCode).toHaveBeenCalledWith('DEV-SCALE-01');
            expect(deviceRepoMock.updateHeartbeat).toHaveBeenCalledWith('dev-uuid-88', {
                batteryLevel: 85,
                wifiRssi: -65,
                status: 'online',
                firmwareVersion: '1.2.0',
            });
        });

        it('harus melempar error jika deviceCode tidak terdaftar', async () => {
            deviceRepoMock.findByDeviceCode.mockResolvedValue(null);

            await expect(deviceService.processHeartbeat('UNKNOWN-CODE', 90, -70))
                .rejects
                .toThrow(/Perangkat tidak ditemukan/i);

            expect(deviceRepoMock.updateHeartbeat).not.toHaveBeenCalled();
        });
    });
});
