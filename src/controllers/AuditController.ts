import { Request, Response, NextFunction } from "express";
import { inject, injectable } from "tsyringe";
import { AuditService } from "../services/AuditService.js";

@injectable()
export class AuditController {
    constructor(@inject(AuditService) private auditService: AuditService) {}

    /**
     * Mengambil riwayat audit log aktivitas platform.
     *
     * @route   GET /api/v1/audit-logs
     * @query   entityType, entityId, actorType, limit
     */
    public getAuditLogs = async (
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {
            const { entityType, entityId, actorType, limit } = req.query;

            const logs = await this.auditService.getAuditLogs({
                entityType: entityType ? String(entityType) : undefined,
                entityId: entityId ? String(entityId) : undefined,
                actorType: actorType ? String(actorType) : undefined,
                limit: limit ? Number(limit) : 50,
            });

            res.status(200).json({
                success: true,
                data: logs,
            });
        } catch (error) {
            next(error);
        }
    };
}
