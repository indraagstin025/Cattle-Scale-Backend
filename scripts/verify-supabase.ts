import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Muat variabel environment dari .env
dotenv.config();

async function verifySupabaseConfig() {
    console.log("==========================================");
    console.log("🔍 Verifikasi Konfigurasi Supabase Storage");
    console.log("==========================================\n");

    // ── Cek 1: Variabel environment wajib ────────────────────────────────────
    const supabaseUrl        = process.env.SUPABASE_URL;
    const serviceRoleKey     = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const templateBucket     = process.env.SUPABASE_TEMPLATE_BUCKET || "templates";
    const templatePath       = process.env.SUPABASE_TEMPLATE_PATH   || "templates-excel/template_pertumbuhan.xlsx";
    const reportsBucket      = process.env.SUPABASE_REPORTS_BUCKET  || "reports";

    let hasError = false;

    if (!supabaseUrl || supabaseUrl.includes("YOUR-PROJECT-REF")) {
        console.error("❌ SUPABASE_URL    : Belum diatur atau masih placeholder.");
        hasError = true;
    } else {
        console.log(`✅ SUPABASE_URL    : ${supabaseUrl}`);
    }

    if (!serviceRoleKey || serviceRoleKey.length < 20) {
        console.error("❌ SERVICE_ROLE_KEY: Belum diatur atau terlalu pendek.");
        hasError = true;
    } else {
        console.log(`✅ SERVICE_ROLE_KEY : ...${serviceRoleKey.slice(-12)} (tersembunyi)`);
    }

    console.log(`ℹ️  TEMPLATE_BUCKET : ${templateBucket}`);
    console.log(`ℹ️  TEMPLATE_PATH   : ${templatePath}`);
    console.log(`ℹ️  REPORTS_BUCKET  : ${reportsBucket}\n`);

    if (hasError) {
        console.error("\n❌ Periksa kembali file .env Anda sebelum menjalankan server.");
        process.exit(1);
    }

    // ── Cek 2: Koneksi ke Supabase & file template ────────────────────────────
    console.log("⏳ Menghubungi Supabase dan mencari file template...\n");

    try {
        const supabase = createClient(supabaseUrl!, serviceRoleKey!);

        // Download 1 byte saja untuk verifikasi keberadaan file
        const { data, error } = await supabase.storage
            .from(templateBucket)
            .download(templatePath);

        if (error) {
            console.error(`❌ GAGAL mengakses template: ${error.message}`);
            if (error.message.includes("Object not found")) {
                console.log(`💡 File tidak ditemukan di path: ${templateBucket}/${templatePath}`);
                console.log("   Pastikan Anda sudah meng-upload file template ke Supabase Storage.");
            } else if (error.message.includes("Invalid API key") || error.message.includes("JWT")) {
                console.log("   SUPABASE_SERVICE_ROLE_KEY sepertinya tidak valid. Gunakan Service Role Key (bukan Anon Key).");
            }
            process.exit(1);
        }

        const sizeKb = (data.size / 1024).toFixed(1);
        console.log(`✅ Template ditemukan! Ukuran: ${sizeKb} KB`);

        // ── Cek 3: Bucket 'reports' bisa diakses ────────────────────────────
        const testFileName = `__verify_test_${Date.now()}.xlsx`;
        const testBuffer = Buffer.from("ok");
        const { error: uploadError } = await supabase.storage
            .from(reportsBucket)
            .upload(testFileName, testBuffer, {
                contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });

        if (uploadError) {
            console.error(`❌ GAGAL upload ke bucket '${reportsBucket}': ${uploadError.message}`);
            console.log(`💡 Pastikan bucket '${reportsBucket}' sudah dibuat di Supabase Storage.`);
            process.exit(1);
        }

        // Hapus file test
        await supabase.storage.from(reportsBucket).remove([testFileName]);

        console.log(`✅ Bucket '${reportsBucket}' siap menerima file laporan.`);
        console.log("\n🎉 Semua konfigurasi Supabase VALID. Sistem siap untuk ekspor Excel!\n");

    } catch (err: any) {
        console.error("❌ ERROR KONEKSI: Tidak dapat terhubung ke Supabase.");
        console.error(err.message);
        process.exit(1);
    }
}

verifySupabaseConfig();
