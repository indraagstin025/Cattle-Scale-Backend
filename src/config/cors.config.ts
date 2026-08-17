import cors from "cors";
import { env } from "./env.config.js";

export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // 1. Izinkan request tanpa origin (seperti request langsung dari perangkat ESP32, Postman, atau cURL)
    if (!origin) {
      return callback(null, true);
    }

    // 2. Cek apakah origin ada di daftar FRONTEND_ORIGIN atau jika sedang di mode development
    if (env.FRONTEND_ORIGIN.includes(origin) || env.NODE_ENV === "development") {
      return callback(null, true);
    }

    // 3. Tolak jika origin tidak diizinkan
    return callback(new Error(`CORS Error: Origin '${origin}' tidak diizinkan oleh kebijakan CORS.`));
  },
  credentials: true, // Wajib bernilai true agar session cookie dapat dikirim lintas origin (localhost:5173 -> localhost:5000)
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "x-api-key",        // API Key perangkat ESP32
    "Idempotency-Key",   // Key pencegah duplikasi sinkronisasi offline ESP32
  ],
  exposedHeaders: ["Content-Disposition"], // Agar frontend dapat membaca header nama file saat download CSV/Excel/PDF
};
