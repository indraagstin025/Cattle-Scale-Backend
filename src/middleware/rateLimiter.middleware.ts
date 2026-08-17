import rateLimit from "express-rate-limit";

/**
 * Rate Limiter khusus untuk endpoint `POST /api/v1/pairing/verify`.
 *
 * Spesifikasi (sesuai URD Section 9, NFR-02):
 * - Maksimal **5 percobaan** dalam **10 menit** per IP address.
 * - Setelah melebihi batas, semua request berikutnya diblokir hingga jendela waktu reset.
 * - Mencegah serangan brute force terhadap kode pairing 6 digit.
 *
 * @example
 * 
 * pairingRouter.post("/verify", pairingRateLimiter, validateRequest(...), controller.verifyPairing);
 */
export const pairingRateLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message:
            "Terlalu banyak percobaan verifikasi kode pairing." +
            "Coba lagi dalam 10 menit.",
    },

    /**
     * Key generator: default menggunakan IP address.
     * Bisa diganti ke per-device atau per-session jika dibutuhkan.
     */
    keyGenerator: (req) => {
        return (
            (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
            req.ip ??
            "unknown"
        );
    },

    /**
     * Handler saat limit terlampaui — override default untuk format JSON konsisten.
     */
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message:
                "Terlalu banyak percobaan verifikasi kode pairing." +
                "coba lagi dalam 10 menit.",
            retryAfter: Math.ceil(10 * 60),
        });
    },
});

/**
 * Rate Limiter umum untuk endpoint publik lainnya (proteksi dasar).
 * Maksimal 100 request per menit per IP.
 */
export const generalRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Terlalu banyak request. Coba lagi sebentar lagi.",
    },
});