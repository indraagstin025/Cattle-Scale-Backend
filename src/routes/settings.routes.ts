import { Router } from "express";
import { container } from "../container/container.js";
import { SettingsController } from "../controllers/SettingsController.js";
import { authSession } from "../middleware/authSession.middleware.js";

const settingsRouter = Router();
const settingsController = container.resolve(SettingsController);

// Semua endpoint Settings hanya bisa diakses oleh Web Dashboard yang sudah login
settingsRouter.use(authSession);

/**
 * @route GET /api/v1/settings
 * @description Mengambil semua pengaturan sistem (farm_name, logo, spike threshold, dll.)
 */
settingsRouter.get("/", settingsController.getAllSettings);

/**
 * @route PUT /api/v1/settings/:key
 * @description Membuat atau memperbarui satu pengaturan sistem berdasarkan key.
 * @body { value: unknown, description?: string }
 */
settingsRouter.put("/:key", settingsController.upsertSetting);

/**
 * @route GET /api/v1/settings/spike-threshold
 * @description Mengambil konfigurasi ambang batas spike detection saat ini.
 */
settingsRouter.get("/spike-threshold", settingsController.getSpikeThreshold);

/**
 * @route GET /api/v1/settings/device-status
 * @description Monitoring status koneksi & buffer semua device ESP32.
 *              Menampilkan berapa menit sejak terakhir kirim heartbeat & flag isLate.
 */
settingsRouter.get("/device-status", settingsController.getDeviceBufferStatus);

export { settingsRouter };
