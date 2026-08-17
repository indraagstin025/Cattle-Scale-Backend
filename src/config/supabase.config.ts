import { createClient } from "@supabase/supabase-js";
import { env } from "./env.config.js";

/**
 * Instance Supabase Client yang menggunakan Service Role Key.
 * 
 * Service Role Key memiliki hak akses penuh (admin/bypass RLS),
 * sehingga backend dapat:
 *  - Mengunduh file dari bucket PRIVATE tanpa mengandalkan URL publik.
 *  - Meng-upload file ke bucket PRIVATE.
 * 
 * PERINGATAN: Key ini JANGAN pernah diekspos ke Frontend/Client.
 */
export const supabaseAdmin = createClient(
    env.SUPABASE_URL || "https://placeholder.supabase.co",
    env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-role-key",
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);
