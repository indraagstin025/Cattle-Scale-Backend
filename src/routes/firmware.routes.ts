import { Router } from "express";
import { container } from "../container/container.js";
import { FirmwareController } from "../controllers/FirmwareController.js";
import { validateRequest } from "../middleware/validateRequest.middleware.js";
import { PublishFirmwareSchema } from "../dto/firmware.dto.js";
import { authSession } from "../middleware/authSession.middleware.js";

const firmwareRouter = Router();
const firmwareController = container.resolve(FirmwareController);

// Proteksi seluruh endpoint firmware dengan session cookie (Web Dashboard)
firmwareRouter.use(authSession);

/**
 * @route POST /api/v1/firmware
 * @description Admin mem-publish rilis firmware baru untuk diunduh (OTA).
 */
firmwareRouter.post(
  "/",
  validateRequest({ body: PublishFirmwareSchema }),
  firmwareController.publishNewFirmware
);

export { firmwareRouter };
