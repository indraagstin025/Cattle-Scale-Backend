import { Router } from "express";
import { container } from "../container/container.js";
import { AuditController } from "../controllers/AuditController.js";
import { authSession } from "../middleware/authSession.middleware.js";

const auditRouter = Router();
const auditController = container.resolve(AuditController);

// Proteksi seluruh endpoint audit logs dengan session cookie (Web Dashboard)
auditRouter.use(authSession);

/**
 * @route GET /api/v1/audit-logs
 * @description Mengambil riwayat audit log seluruh aktivitas mutasi data (sapi, device, dll.)
 */
auditRouter.get("/", auditController.getAuditLogs);

export { auditRouter };
