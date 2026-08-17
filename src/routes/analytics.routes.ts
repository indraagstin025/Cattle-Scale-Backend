import { Router } from "express";
import { container } from "../container/container.js";
import { AnalyticsController } from "../controllers/AnalyticsController.js";
import { authSession } from "../middleware/authSession.middleware.js";

const analyticsRouter = Router();
const analyticsController = container.resolve(AnalyticsController);

// Proteksi seluruh endpoint analytics dengan session cookie (Web Dashboard)
analyticsRouter.use(authSession);

/**
 * @route GET /api/v1/analytics/overview
 * @description KPI ringkasan peternakan: total sapi, ADG rata-rata, device offline.
 */

analyticsRouter.get("/overview", analyticsController.getOverview);

/**
 * @route GET /api/v1/analytics/breeds/performance
 * @description Performa pertumbuhan rata-rata per ras (ADG aktual vs baku).
 */
analyticsRouter.get("/breeds/performance", analyticsController.getBreedPerformance);
/**
 * @route GET /api/v1/analytics/growth/:cattleId
 * @description Tren pertumbuhan historis + ADG per sesi (on-the-fly).
 */
analyticsRouter.get("/growth/:cattleId", analyticsController.getGrowthTrend);

/**
 * @route GET /api/v1/analytics/predict/:cattleId
 * @description Prediksi berat +30/+60/+90 hari + estimasi tanggal panen via regresi linear.
 * @queryparam daysAhead - Opsional, default 90 hari
 */
analyticsRouter.get("/predict/:cattleId", analyticsController.predictGrowth);


export { analyticsRouter };