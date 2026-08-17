import { Request, Response, NextFunction } from "express";
import { inject, injectable } from "tsyringe";
import type { IPairingService } from "../interfaces/services/IPairingService.js";

/**
 * Konfigurasi cookie session_token sesuai Section 12.4 URD.
 * - `httpOnly`: mencegah akses dari JavaScript (anti-XSS)
 * - `secure`: hanya dikirim via HTTPS
 * - `sameSite: 'none'`: wajib untuk cross-domain (frontend Vercel ↔ backend Vercel)
 * - `path: '/'`: berlaku untuk semua endpoint
 */
const SESSION_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "none" as const,
    path: "/",
} as const;

@injectable()
export class PairingController {
    constructor(
        @inject("IPairingService") private pairingService: IPairingService
    ) { }

    /**
     * Perangkat ESP32 meminta kode pairing 6 digit sementara (berlaku 5 menit).
     * @route POST /api/v1/iot/pairing/generate
     * @param {Request}      req  - Express Request berisi payload `deviceId`
     * @param {Response}     res  - Express Response mengembalikan kode pairing
     * @param {NextFunction} next - NextFunction untuk error handling
     */
    public generatePairingCode = async (
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {
            const { deviceId } = req.body;
            const pairing = await this.pairingService.generatePairingCode(deviceId);
            res.status(201).json({
                success: true,
                message: "Pairing code generated",
                data: pairing,
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Perangkat ESP32 melakukan polling untuk mengecek apakah kode telah diverifikasi oleh web.
     * @route GET /api/v1/iot/pairing/status
     * @param {Request}      req  - Express Request berisi query parameter `code`
     * @param {Response}     res  - Express Response mengembalikan status kode
     * @param {NextFunction} next - NextFunction untuk error handling
     */
    public checkPairingStatus = async (
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {
            const code = req.query.code as string;
            const isValidAndUnused = await this.pairingService.checkPairingStatus(code);
            res.status(200).json({ success: true, data: { isValidAndUnused } });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Pengguna web memverifikasi kode 6 digit dari perangkat ESP32 dan memulai sesi permanen.
     * Cookie `session_token` di-set secara otomatis dengan config httpOnly + Secure + SameSite=None
     * sesuai Section 12.4 URD (cross-domain antara frontend dan backend).
     *
     * @route POST /api/v1/pairing/verify
     * @param {Request}      req  - Express Request berisi payload `code` dan `userAgentLabel`
     * @param {Response}     res  - Express Response menyertakan cookie session_token
     * @param {NextFunction} next - NextFunction untuk error handling
     */
    public verifyPairing = async (
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {
            const { code, userAgentLabel } = req.body;
            const result = await this.pairingService.verifyPairing(code, userAgentLabel);

            // Set cookie session_token: httpOnly + Secure + SameSite=None (cross-domain)
            res.cookie("session_token", result.sessionToken, SESSION_COOKIE_OPTIONS);

            res.status(200).json({
                success: true,
                message: "Pairing berhasil. Session aktif.",
                data: { deviceId: result.deviceId },
                // sessionToken TIDAK disertakan di body — hanya via httpOnly cookie
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Mencabut token sesi milik pengguna sendiri (logout).
     * Cookie `session_token` juga dihapus dari browser.
     *
     * @route DELETE /api/v1/pairing/session
     * @param {Request}      req  - Express Request (session dibaca dari cookie httpOnly)
     * @param {Response}     res  - Express Response mengembalikan status pencabutan
     * @param {NextFunction} next - NextFunction untuk error handling
     */
    public revokeSession = async (
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {
            // Ambil token dari cookie (bukan body — karena httpOnly)
            const sessionToken = req.cookies?.session_token;

            if (sessionToken) {
                await this.pairingService.revokeSession(sessionToken);
            }

            // Hapus cookie dari browser
            res.clearCookie("session_token", SESSION_COOKIE_OPTIONS);

            res.status(200).json({
                success: true,
                message: "Sesi berhasil dicabut.",
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Mendapatkan daftar semua sesi web (dashboard login) yang aktif saat ini.
     * @route GET /api/v1/sessions
     * @param {Request}      req  - Express Request
     * @param {Response}     res  - Express Response mengembalikan daftar sesi aktif
     * @param {NextFunction} next - NextFunction untuk error handling
     */
    public getActiveSessions = async (
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {
            const sessions = await this.pairingService.getActiveSessions();
            res.status(200).json({ success: true, data: sessions });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Admin merevoke sesi tertentu berdasarkan UUID (dari halaman Settings).
     * Berbeda dengan `revokeSession` yang hanya merevoke milik sendiri,
     * method ini bisa merevoke sesi mana pun berdasarkan ID-nya.
     *
     * @route DELETE /api/v1/pairing/sessions/:id
     * @param {Request}      req            - Express Request
     * @param {string}       req.params.id  - UUID WebSession yang ingin di-revoke
     * @param {Response}     res            - Express Response
     * @param {NextFunction} next           - NextFunction untuk error handling
     */
    public revokeSessionById = async (
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {
            const { id } = req.params;
            await this.pairingService.revokeSessionById(id);
            res.status(200).json({
                success: true,
                message: `Sesi berhasil di-revoke.`,
            });
        } catch (error) {
            next(error);
        }
    };
}
