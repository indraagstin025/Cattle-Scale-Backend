import { Router } from "express";
import { container } from "../container/container.js";
import { ReportController } from "../controllers/ReportController.js";
import { authSession } from "../middleware/authSession.middleware.js";

const reportRouter = Router();
const reportController = container.resolve(ReportController);

// Proteksi seluruh endpoint reports dengan session cookie (Web Dashboard)
reportRouter.use(authSession);

/**
 * @route GET /api/v1/reports/export-pdf/:cattleId
 * @description Ekspor laporan pertumbuhan sapi ke PDF.
 *              Mengembalikan Signed URL (valid 60 detik) ke file PDF di Supabase.
 */
reportRouter.get("/export-pdf/:cattleId", reportController.exportGrowthToPdf);

export { reportRouter };
