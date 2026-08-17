import { Router } from "express";
import { container } from "../container/container.js";
import { DeviceController } from "../controllers/DeviceController.js";
import { WeightLogController } from "../controllers/WeightLogController.js";
import { PairingController } from "../controllers/PairingController.js";
import { FirmwareController } from "../controllers/FirmwareController.js";
import { validateRequest } from "../middleware/validateRequest.middleware.js";
import { WeighInSchema, HeartbeatSchema } from "../dto/iot.dto.js";
import { GeneratePairingCodeSchema, CheckPairingStatusQuerySchema } from "../dto/pairing.dto.js";
import { authApiKey } from "../middleware/authApiKey.middleware.js";

const iotRouter = Router();

const deviceController = container.resolve(DeviceController);
const weightLogController = container.resolve(WeightLogController);
const pairingController = container.resolve(PairingController);
const firmwareController = container.resolve(FirmwareController);

iotRouter.use(authApiKey);

/**
 * @route POST /api/v1/iot/weigh-in
 * @description Menerima log timbangan dari ESP32.
 * @security x-api-key (device)
 */
iotRouter.post(
  "/weigh-in",
  validateRequest({ body: WeighInSchema }),
  weightLogController.processWeighIn
);

/**
 * @route POST /api/v1/iot/heartbeat
 * @description Menerima sinyal kehidupan (baterai & WiFi) dari ESP32.
 */
iotRouter.post(
  "/heartbeat",
  validateRequest({ body: HeartbeatSchema }),
  deviceController.processHeartbeat
);

/**
 * @route POST /api/v1/iot/pairing/generate
 * @description ESP32 meminta kode pairing 6 digit yang baru.
 */
iotRouter.post(
  "/pairing/generate",
  validateRequest({ body: GeneratePairingCodeSchema }),
  pairingController.generatePairingCode
);

/**
 * @route GET /api/v1/iot/pairing/status
 * @description ESP32 mengecek apakah kode 6 digit sudah diverifikasi di web.
 */
iotRouter.get(
  "/pairing/status",
  validateRequest({ query: CheckPairingStatusQuerySchema }),
  pairingController.checkPairingStatus
);

/**
 * @route GET /api/v1/iot/firmware/latest
 * @description ESP32 mengecek versi firmware terbaru untuk keperluan OTA.
 */
iotRouter.get("/firmware/latest", firmwareController.getLatestActiveFirmware);

export { iotRouter };