import { inject, injectable } from "tsyringe";
import { AuditRepository } from "../repositories/AuditRepository.js";
import { AuditLog } from "@prisma/client";

export type AuditActorType = "web_session" | "device" | "system";
export type AuditAction = "create" | "update" | "delete";

@injectable()
export class AuditService {
    constructor(@inject(AuditRepository) private auditRepo: AuditRepository) {}

    /**
     * Mencatat peristiwa perubahan data ke dalam audit log.
     * Operasi ini bersifat non-blocking (jika gagal mencatat log, tidak menggagalkan flow utama).
     *
     * @param actorType  - 'web_session' | 'device' | 'system'
     * @param actorId    - ID sesi web atau ID perangkat ESP32
     * @param action     - 'create' | 'update' | 'delete'
     * @param entityType - 'cattle' | 'device' | 'settings' dll.
     * @param entityId   - ID record yang diubah
     * @param changes    - Snapshot data sebelum/sesudah atau payload perubahan
     */
    async log(
        actorType: AuditActorType,
        actorId: string,
        action: AuditAction,
        entityType: string,
        entityId: string,
        changes?: any
    ): Promise<AuditLog | null> {
        try {
            return await this.auditRepo.create({
                actorType,
                actorId,
                action,
                entityType,
                entityId,
                changes,
            });
        } catch (err) {
            console.error("Gagal mencatat audit log:", err);
            return null;
        }
    }

    /**
     * Mengambil daftar riwayat audit log.
     */
    async getAuditLogs(filters?: {
        entityType?: string;
        entityId?: string;
        actorType?: string;
        limit?: number;
    }): Promise<AuditLog[]> {
        return this.auditRepo.findAll(filters);
    }
}
