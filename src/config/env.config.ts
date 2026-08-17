import dotenv from "dotenv";

// Load environment variables dari file .env
dotenv.config();

export const env = {
  PORT: Number(process.env.PORT) || 5000,
  NODE_ENV: process.env.NODE_ENV || "development",
  DATABASE_URL: process.env.DATABASE_URL || "",
  DIRECT_URL: process.env.DIRECT_URL || "",
  FRONTEND_ORIGIN: (process.env.FRONTEND_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim()),
  SESSION_SECRET: process.env.SESSION_SECRET || "default_session_secret",
  SUPABASE_URL: process.env.SUPABASE_URL || "",
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  SUPABASE_TEMPLATE_BUCKET: process.env.SUPABASE_TEMPLATE_BUCKET || "templates",
  SUPABASE_TEMPLATE_PATH: process.env.SUPABASE_TEMPLATE_PATH || "templates-excel/template_pertumbuhan.xlsx",
  SUPABASE_REPORTS_BUCKET: process.env.SUPABASE_REPORTS_BUCKET || "reports",
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
};
