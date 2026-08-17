import { Router } from "express";
import { iotRouter } from "./iot.routes.js";
import { cattleRouter } from "./cattle.routes.js";
import { weightRouter } from "./weight.routes.js";
import { deviceRouter } from "./device.routes.js";
import { pairingRouter } from "./pairing.routes.js";
import { firmwareRouter } from "./firmware.routes.js";
import { analyticsRouter } from "./analytics.routes.js";
import { reportRouter } from "./reports.routes.js";
import { settingsRouter } from "./settings.routes.js";
import { auditRouter } from "./audit.routes.js";

const mainRouter = Router();

// Endpoint khusus hardware (IoT)
mainRouter.use("/iot", iotRouter);

// Endpoint dashboard (Web)
mainRouter.use("/cattle", cattleRouter);
mainRouter.use("/weights", weightRouter);
mainRouter.use("/devices", deviceRouter);
mainRouter.use("/pairing", pairingRouter);
mainRouter.use("/firmware", firmwareRouter);
mainRouter.use("/analytics", analyticsRouter);
mainRouter.use("/reports", reportRouter);
mainRouter.use("/settings", settingsRouter);
mainRouter.use("/audit-logs", auditRouter);

export default mainRouter;
