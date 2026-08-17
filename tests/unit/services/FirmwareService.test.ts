import 'reflect-metadata';
import { mock, mockClear } from 'jest-mock-extended';
import { FirmwareService } from '../../../src/services/FirmwareService.js';
import type { IFirmwareRepository } from '../../../src/interfaces/repositories/IFirmwareRepository.js';

describe('FirmwareService', () => {
    const firmwareRepoMock = mock<IFirmwareRepository>();
    let firmwareService: FirmwareService;

    beforeEach(() => {
        mockClear(firmwareRepoMock);
        firmwareService = new FirmwareService(firmwareRepoMock);
    });

    describe('getLatestActiveFirmware', () => {
        it('harus mengembalikan firmware aktif terbaru', async () => {
            const mockFirmware = {
                id: 'fw-1',
                version: '2.1.0',
                binaryUrl: 'https://storage/firmware-2.1.0.bin',
                changelog: 'Fix sensor drift',
                isActive: true,
                releasedAt: new Date(),
            };
            firmwareRepoMock.getActiveFirmware.mockResolvedValue(mockFirmware);

            const result = await firmwareService.getLatestActiveFirmware();
            expect(result).toEqual(mockFirmware);
            expect(firmwareRepoMock.getActiveFirmware).toHaveBeenCalledTimes(1);
        });

        it('harus mengembalikan null jika belum ada rilis firmware aktif', async () => {
            firmwareRepoMock.getActiveFirmware.mockResolvedValue(null);

            const result = await firmwareService.getLatestActiveFirmware();
            expect(result).toBeNull();
        });
    });

    describe('publishNewFirmware', () => {
        it('harus menonaktifkan rilis lama lalu mempublikasikan rilis firmware baru yang aktif', async () => {
            const newRelease = {
                id: 'fw-2',
                version: '2.2.0',
                binaryUrl: 'https://storage/firmware-2.2.0.bin',
                changelog: 'Add OTA rollback',
                isActive: true,
                releasedAt: new Date(),
            };

            firmwareRepoMock.deactivateAll.mockResolvedValue(undefined as any);
            firmwareRepoMock.createRelease.mockResolvedValue(newRelease);

            const result = await firmwareService.publishNewFirmware(
                '2.2.0',
                'https://storage/firmware-2.2.0.bin',
                'Add OTA rollback'
            );

            expect(result).toEqual(newRelease);
            expect(firmwareRepoMock.deactivateAll).toHaveBeenCalledTimes(1);
            expect(firmwareRepoMock.createRelease).toHaveBeenCalledWith({
                version: '2.2.0',
                binaryUrl: 'https://storage/firmware-2.2.0.bin',
                changelog: 'Add OTA rollback',
                isActive: true,
            });
        });
    });
});
