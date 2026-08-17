import { Router } from "express";
import { container } from "../container/container.js";
import { WeightLogController } from "../controllers/WeightLogController.js";
import { authSession } from "../middleware/authSession.middleware.js";

const weightRouter = Router();
const weightLogController = container.resolve(WeightLogController);

// Proteksi seluruh endpoint weights dengan session cookie (Web Dashboard)
weightRouter.use(authSession);

/**
 * @route GET /api/v1/weights/history
 * @description Mengambil Riwayat log penimbangan ternak.
 */
weightRouter.get("/history", weightLogController.getHistory);

/**
 * @route GET /api/v1/weights/export-excel/:cattleId
 * @description Ekspor data penimbangan + prediksi regresi ke Excel.
 *              Mengembalikan Signed URL (valid 60 detik) ke file Excel di Supabase.
 */
weightRouter.get("/export-excel/:cattleId", weightLogController.exportGrowthToExcel);

export { weightRouter };