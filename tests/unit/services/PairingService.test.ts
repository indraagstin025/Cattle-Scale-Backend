import 'reflect-metadata';
import { mock, mockClear } from 'jest-mock-extended';
import { PairingService } from '../../../src/services/PairingService.js';
import type { IPairingRepository } from '../../../src/interfaces/repositories/IPairingRepository.js';

describe('PairingService', () => {
    const pairingRepoMock = mock<IPairingRepository>();
    let pairingService: PairingService;

    beforeEach(() => {
        mockClear(pairingRepoMock);
        pairingService = new PairingService(pairingRepoMock);
    });

    describe('generatePairingCode', () => {
        it('harus menghasilkan kode 6 digit dan menyimpannya di repository', async () => {
            const deviceId = 'dev-123';
            
            pairingRepoMock.createPairingCode.mockResolvedValue({
                id: '1',
                code: '123456',
                deviceId,
                expiresAt: new Date(),
                used: false,
                createdAt: new Date(),
            });

            const result = await pairingService.generatePairingCode(deviceId);
            
            expect(result.deviceId).toBe(deviceId);
            expect(pairingRepoMock.createPairingCode).toHaveBeenCalledTimes(1);
            
            const callArg = pairingRepoMock.createPairingCode.mock.calls[0][0];
            expect(callArg.deviceId).toBe(deviceId);
            expect(callArg.code).toMatch(/^\d{6}$/); // Pastikan 6 digit
        });
    });

    describe('checkPairingStatus', () => {
        it('harus mereturn true jika kode valid dan belum terpakai', async () => {
            pairingRepoMock.findValidPairingCode.mockResolvedValue({
                id: '1',
                code: '123456',
                deviceId: 'dev-123',
                expiresAt: new Date(),
                used: false,
                createdAt: new Date(),
            });

            const isValid = await pairingService.checkPairingStatus('123456');
            expect(isValid).toBe(true);
            expect(pairingRepoMock.findValidPairingCode).toHaveBeenCalledWith('123456');
        });

        it('harus mereturn false jika kode valid tapi sudah terpakai (meskipun normalnya query findValidPairingCode tidak mengambil yg used)', async () => {
            pairingRepoMock.findValidPairingCode.mockResolvedValue({
                id: '1',
                code: '123456',
                deviceId: 'dev-123',
                expiresAt: new Date(),
                used: true,
                createdAt: new Date(),
            });

            const isValid = await pairingService.checkPairingStatus('123456');
            expect(isValid).toBe(false);
        });

        it('harus mereturn false jika kode tidak ditemukan / expired', async () => {
            pairingRepoMock.findValidPairingCode.mockResolvedValue(null);

            const isValid = await pairingService.checkPairingStatus('123456');
            expect(isValid).toBe(false);
        });
    });

    describe('verifyPairing', () => {
        it('harus menghasilkan sessionToken dan menandai code used jika valid', async () => {
            const code = '654321';
            const mockCode = {
                id: 'code-1',
                code,
                deviceId: 'dev-777',
                expiresAt: new Date(),
                used: false,
                createdAt: new Date(),
            };

            pairingRepoMock.findValidPairingCode.mockResolvedValue(mockCode);
            pairingRepoMock.markCodeAsUsed.mockResolvedValue({ ...mockCode, used: true });
            pairingRepoMock.createSession.mockResolvedValue({
                id: 'sess-1',
                sessionToken: 'sess_dev-777_123',
                label: 'Test Dashboard',
                pairedDeviceId: 'dev-777',
                revoked: false,
                createdAt: new Date(),
                lastActiveAt: new Date(),
            });

            const result = await pairingService.verifyPairing(code, 'Test Dashboard');

            expect(result.deviceId).toBe('dev-777');
            expect(result.sessionToken).toMatch(/^sess_dev-777_/);
            
            expect(pairingRepoMock.markCodeAsUsed).toHaveBeenCalledWith('code-1');
            expect(pairingRepoMock.createSession).toHaveBeenCalledWith(
                expect.objectContaining({
                    label: 'Test Dashboard',
                    pairedDeviceId: 'dev-777',
                })
            );
        });

        it('harus melempar error jika kode pairing tidak valid', async () => {
            pairingRepoMock.findValidPairingCode.mockResolvedValue(null);
            
            await expect(pairingService.verifyPairing('000000'))
                .rejects
                .toThrow(/tidak valid atau sudah kedaluwarsa/i);
                
            expect(pairingRepoMock.markCodeAsUsed).not.toHaveBeenCalled();
            expect(pairingRepoMock.createSession).not.toHaveBeenCalled();
        });
    });

    describe('revokeSessionById', () => {
        it('harus mencabut sesi jika UUID ditemukan', async () => {
            pairingRepoMock.findSessionById.mockResolvedValue({
                id: 'sess-uuid-1',
                sessionToken: 'xyz',
                label: 'Web',
                pairedDeviceId: 'dev',
                revoked: false,
                createdAt: new Date(),
                lastActiveAt: new Date(),
            });

            await pairingService.revokeSessionById('sess-uuid-1');
            
            expect(pairingRepoMock.revokeSession).toHaveBeenCalledWith('sess-uuid-1');
        });

        it('harus melempar error jika UUID tidak ditemukan', async () => {
            pairingRepoMock.findSessionById.mockResolvedValue(null);

            await expect(pairingService.revokeSessionById('sess-uuid-2'))
                .rejects
                .toThrow(/tidak ditemukan/i);
                
            expect(pairingRepoMock.revokeSession).not.toHaveBeenCalled();
        });
    });
});
