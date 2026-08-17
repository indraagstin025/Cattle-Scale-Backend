import 'reflect-metadata';
import { mock, mockClear } from 'jest-mock-extended';
import { AuditService } from '../../../src/services/AuditService.js';
import { AuditRepository } from '../../../src/repositories/AuditRepository.js';

describe('AuditService', () => {
    const auditRepoMock = mock<AuditRepository>();
    let auditService: AuditService;

    beforeEach(() => {
        mockClear(auditRepoMock);
        auditService = new AuditService(auditRepoMock);
    });

    describe('log', () => {
        it('harus mencatat audit log secara sukses', async () => {
            const expectedLog = {
                id: 'audit-001',
                actorType: 'web_session',
                actorId: 'sess-123',
                action: 'create',
                entityType: 'cattle',
                entityId: 'cattle-99',
                changes: { tagId: 'TAG-99' },
                createdAt: new Date(),
            };

            auditRepoMock.create.mockResolvedValue(expectedLog as any);

            const result = await auditService.log(
                'web_session',
                'sess-123',
                'create',
                'cattle',
                'cattle-99',
                { tagId: 'TAG-99' }
            );

            expect(result).toEqual(expectedLog);
            expect(auditRepoMock.create).toHaveBeenCalledWith({
                actorType: 'web_session',
                actorId: 'sess-123',
                action: 'create',
                entityType: 'cattle',
                entityId: 'cattle-99',
                changes: { tagId: 'TAG-99' },
            });
        });

        it('harus mengembalikan null secara non-blocking jika repository melempar error', async () => {
            auditRepoMock.create.mockRejectedValue(new Error('Audit DB write failed'));

            const result = await auditService.log(
                'device',
                'dev-01',
                'update',
                'device',
                'dev-01'
            );

            expect(result).toBeNull();
        });
    });

    describe('getAuditLogs', () => {
        it('harus mengambil daftar audit log dengan filter yang diberikan', async () => {
            const mockLogs = [
                { id: '1', action: 'create', entityType: 'cattle' },
                { id: '2', action: 'update', entityType: 'cattle' },
            ];

            auditRepoMock.findAll.mockResolvedValue(mockLogs as any);

            const filters = { entityType: 'cattle', limit: 10 };
            const results = await auditService.getAuditLogs(filters);

            expect(results).toEqual(mockLogs);
            expect(auditRepoMock.findAll).toHaveBeenCalledWith(filters);
        });
    });
});
