import { Router } from "express";
import { container } from "../container/container.js";
import { CattleController } from "../controllers/CattleController.js";
import { validateRequest } from "../middleware/validateRequest.middleware.js";
import { CreateCattleSchema, UpdateCattleSchema, CattleQuerySchema } from "../dto/cattle.dto.js";
import { authSession } from "../middleware/authSession.middleware.js";

const cattleRouter = Router();
const cattleController = container.resolve(CattleController);

// Proteksi seluruh endpoint cattle dengan session cookie (Web Dashboard)
cattleRouter.use(authSession);

/**
 * @route GET /api/v1/cattle
 * @description Mengambil daftar semua sapi dengan filter.
 */
cattleRouter.get(
  "/",
  validateRequest({ query: CattleQuerySchema }),
  cattleController.getAllCattle
);

/**
 * @route GET /api/v1/cattle/:id
 * @description Mengambil profil detail sapi berdasarkan ID.
 */
cattleRouter.get("/:id", cattleController.getCattleById);

/**
 * @route POST /api/v1/cattle
 * @description Mendaftarkan data sapi baru.
 */
cattleRouter.post(
  "/",
  validateRequest({ body: CreateCattleSchema }),
  cattleController.registerCattle
);

/**
 * @route PUT /api/v1/cattle/:id
 * @description Mengupdate profil sapi.
 */
cattleRouter.put(
  "/:id",
  validateRequest({ body: UpdateCattleSchema }),
  cattleController.updateCattle
);

/**
 * @route DELETE /api/v1/cattle/:id
 * @description Menghapus profil sapi (soft delete).
 */
cattleRouter.delete("/:id", cattleController.removeCattle);

export { cattleRouter };