import 'reflect-metadata';
import { mock, mockClear } from 'jest-mock-extended';
import { CattleService } from '../../../src/services/CattleService.js';
import type { ICattleRepository } from '../../../src/interfaces/repositories/ICattleRepository.js';

describe('CattleService', () => {
    const cattleRepoMock = mock<ICattleRepository>();
    let cattleService: CattleService;

    beforeEach(() => {
        mockClear(cattleRepoMock);
        cattleService = new CattleService(cattleRepoMock);
    });

    describe('Age Calculation (enrichWithAge)', () => {
        it('harus menghitung ageMonths dengan benar berdasarkan birthDate', async () => {
            const now = new Date();
            const birthDate = new Date();
            birthDate.setMonth(now.getMonth() - 5); // Umur 5 bulan

            cattleRepoMock.findById.mockResolvedValue({
                id: '1',
                tagId: 'TAG1',
                name: 'Sapi 1',
                breed: 'Brahman',
                birthDate: birthDate,
                gender: 'male',
                initialWeight: 200 as any,
                targetWeight: 400 as any,
                currentWeight: 250 as any,
                notes: null,
                status: 'active',
                createdAt: new Date(),
                updatedAt: new Date(),
                deletedAt: null,
            });

            const result = await cattleService.getCattleById('1');
            expect(result?.ageMonths).toBe(5);
        });

        it('harus mereturn ageMonths = null jika birthDate null', async () => {
            cattleRepoMock.findById.mockResolvedValue({
                id: '2',
                tagId: 'TAG2',
                name: 'Sapi 2',
                breed: 'Angus',
                birthDate: null,
                gender: 'male',
                initialWeight: 180 as any,
                targetWeight: null,
                currentWeight: null,
                notes: null,
                status: 'active',
                createdAt: new Date(),
                updatedAt: new Date(),
                deletedAt: null,
            });

            const result = await cattleService.getCattleById('2');
            expect(result?.ageMonths).toBeNull();
        });

        it('harus memperkaya semua data sapi pada getAllCattle', async () => {
            const now = new Date();
            const birthDate1 = new Date();
            birthDate1.setFullYear(now.getFullYear() - 1); // Umur 12 bulan

            cattleRepoMock.findAll.mockResolvedValue([
                {
                    id: '1',
                    tagId: 'TAG1',
                    name: 'Sapi 1',
                    breed: 'Brahman',
                    birthDate: birthDate1,
                    gender: 'male',
                    initialWeight: 200 as any,
                    targetWeight: 400 as any,
                    currentWeight: null,
                    notes: null,
                    status: 'active',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    deletedAt: null,
                },
                {
                    id: '2',
                    tagId: 'TAG2',
                    name: 'Sapi 2',
                    breed: 'Brahman',
                    birthDate: null,
                    gender: 'female',
                    initialWeight: 190 as any,
                    targetWeight: null,
                    currentWeight: null,
                    notes: null,
                    status: 'active',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    deletedAt: null,
                }
            ]);

            const results = await cattleService.getAllCattle();
            expect(results).toHaveLength(2);
            expect(results[0].ageMonths).toBe(12);
            expect(results[1].ageMonths).toBeNull();
        });
    });

    describe('registerCattle', () => {
        it('harus meneruskan panggilan ke repository create', async () => {
            const createData = { tagId: 'TAG-123', name: 'Baru' };
            cattleRepoMock.create.mockResolvedValue({ id: '99', ...createData } as any);

            const result = await cattleService.registerCattle(createData as any);
            expect(cattleRepoMock.create).toHaveBeenCalledWith(createData);
            expect(result.id).toBe('99');
        });
    });

    describe('updateCattle', () => {
        it('harus meneruskan panggilan ke repository update', async () => {
            cattleRepoMock.update.mockResolvedValue({ id: '1', name: 'Updated' } as any);

            const result = await cattleService.updateCattle('1', { name: 'Updated' });
            expect(cattleRepoMock.update).toHaveBeenCalledWith('1', { name: 'Updated' });
            expect(result.name).toBe('Updated');
        });
    });

    describe('removeCattle', () => {
        it('harus meneruskan panggilan ke repository softDelete', async () => {
            cattleRepoMock.softDelete.mockResolvedValue({ id: '1', deletedAt: new Date() } as any);

            const result = await cattleService.removeCattle('1');
            expect(cattleRepoMock.softDelete).toHaveBeenCalledWith('1');
            expect(result.deletedAt).not.toBeNull();
        });
    });
});
