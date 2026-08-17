import { PrismaClient } from "@prisma/client";
import { env } from "./env.config.js";

// Inisialisasi singleton instance PrismaClient
export const prisma = new PrismaClient({
  log: env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
});
