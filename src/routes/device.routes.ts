import { Router } from "express";
import { container } from "../container/container.js";
import { DeviceController } from "../controllers/DeviceController.js";
import { validateRequest } from "../middleware/validateRequest.middleware.js";
import { RegisterDeviceSchema, UpdateDeviceSchema } from "../dto/device.dto.js";
import { authSession } from "../middleware/authSession.middleware.js";

const deviceRouter = Router();
const deviceController = container.resolve(DeviceController);

// Proteksi seluruh endpoint devices dengan session cookie (Web Dashboard)
deviceRouter.use(authSession);

/**
 * @route GET /api/v1/devices
 * @description Mengambil semua daftar perangkat yang terdaftar.
 */
deviceRouter.get("/", deviceController.getAllDevices);

/**
 * @route GET /api/v1/devices/:id
 * @description Mendapatkan detail profil dari sebuah perangkat ESP32.
 */
deviceRouter.get("/:id", deviceController.getDeviceById);

/**
 * @route POST /api/v1/devices
 * @description Mendaftarkan perangkat baru dari Web Dashboard.
 */
deviceRouter.post(
  "/",
  validateRequest({ body: RegisterDeviceSchema }),
  deviceController.registerDevice
);

/**
 * @route POST /api/v1/devices/:id/rotate-key
 * @description Merotasi API Key perangkat demi keamanan.
 */
deviceRouter.post("/:id/rotate-key", deviceController.rotateApiKey);

/**
 * @route PUT /api/v1/devices/:id
 * @description Memperbarui lokasi/nama perangkat ESP32.
 */
deviceRouter.put(
  "/:id",
  validateRequest({ body: UpdateDeviceSchema }),
  deviceController.updateDevice
);

export { deviceRouter };
