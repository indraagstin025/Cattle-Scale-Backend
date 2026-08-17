import { Router } from "express";
import { container } from "../container/container.js";
import { PairingController } from "../controllers/PairingController.js";
import { validateRequest } from "../middleware/validateRequest.middleware.js";
import { VerifyPairingSchema, RevokeSessionSchema } from "../dto/pairing.dto.js";
import { pairingRateLimiter } from "../middleware/rateLimiter.middleware.js";

const pairingRouter = Router();
const pairingController = container.resolve(PairingController);

/**
 * @route POST /api/v1/pairing/verify
 * @description Admin memverifikasi kode dari layar LCD ESP32 untuk login.
 * @ratelimit 5 percobaan per 10 menit per IP (mencegah brute force kode)
 */
pairingRouter.post(
  "/verify",
  pairingRateLimiter,
  validateRequest({ body: VerifyPairingSchema }),
  pairingController.verifyPairing
);

/**
 * @route DELETE /api/v1/pairing/session
 * @description Admin melakukan logout dan mencabut sesi mereka sendiri.
 */
pairingRouter.delete(
  "/session",
  validateRequest({ body: RevokeSessionSchema }),
  pairingController.revokeSession
);

/**
 * @route GET /api/v1/pairing/sessions
 * @description Mendapatkan daftar seluruh sesi dashboard aktif.
 */
pairingRouter.get("/sessions", pairingController.getActiveSessions);

/**
 * @route DELETE /api/v1/pairing/sessions/:id
 * @description Admin merevoke sesi tertentu berdasarkan UUID (dari halaman Settings).
 * @security authSession (session_token cookie)
 */
pairingRouter.delete("/sessions/:id", pairingController.revokeSessionById);

export { pairingRouter };
