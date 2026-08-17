import { inject, injectable } from "tsyringe";
import { PrismaClient, AuditLog, Prisma } from "@prisma/client";

@injectable()
export class AuditRepository {
    constructor(@inject("PrismaClient") private prisma: PrismaClient) {}

    /**
     * Mencatat satu kejadian audit baru ke tabel audit_logs.
     */
    async create(data: {
        actorType: string;
        actorId: string;
        action: string;
        entityType: string;
        entityId: string;
        changes?: any;
    }): Promise<AuditLog> {
        return this.prisma.auditLog.create({
            data: {
                actorType: data.actorType,
                actorId: data.actorId,
                action: data.action,
                entityType: data.entityType,
                entityId: data.entityId,
                changes: data.changes ?? Prisma.JsonNull,
            },
        });
    }

    /**
     * Mengambil daftar riwayat audit dengan filter dan pagination.
     */
    async findAll(filters?: {
        entityType?: string;
        entityId?: string;
        actorType?: string;
        limit?: number;
    }): Promise<AuditLog[]> {
        const where: Prisma.AuditLogWhereInput = {};

        if (filters?.entityType) where.entityType = filters.entityType;
        if (filters?.entityId) where.entityId = filters.entityId;
        if (filters?.actorType) where.actorType = filters.actorType;

        return this.prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: filters?.limit || 50,
        });
    }
}
