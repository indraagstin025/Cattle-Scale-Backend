import app from "./app.js";
import { env } from "./config/env.config.js";
import { logger } from "./utils/logger.util.js";

// TODO: In the future we might want to ensure Prisma / DB connection is established
const PORT = env.PORT;

const server = app.listen(PORT, () => {
  logger.info(`Server is running in ${env.NODE_ENV} mode`);
  logger.info(`🚀 API is available at: http://localhost:${PORT}/health`);
});

process.on("SIGTERM", () => {
  logger.info("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  logger.info("SIGINT signal received: closing HTTP server");
  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });
});
