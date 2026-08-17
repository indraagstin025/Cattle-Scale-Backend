import "reflect-metadata";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import mainRouter from "./routes/index.js";
import { pinoHttp } from "pino-http";
import { corsOptions } from "./config/cors.config.js";
import { logger } from "./utils/logger.util.js";
import { prisma } from "./config/prisma.config.js";
import { errorHandler } from "./middleware/errorHandler.middleware.js";
import { httpsRedirect } from "./middleware/httpsRedirect.middleware.js";

const app = express();

app.use(httpsRedirect);
app.set("trust proxy", 1);
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => req.url === "/api/v1/iot/heartbeat" || req.url === "/health", // Optional: hide spammy logs
    },
  })
);

// Health Check & Uptime Monitoring Endpoint (Section 11.9 & Task 64)
app.get("/health", async (req, res) => {
  try {
    // Ping database untuk memastikan koneksi aktif
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: "healthy",
      database: "connected",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(503).json({
      status: "unhealthy",
      database: "disconnected",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Register API Routes
app.use("/api/v1", mainRouter);

// Global Error Handler
app.use(errorHandler);

export default app;
