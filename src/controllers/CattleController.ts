import { Request, Response, NextFunction } from "express";
import { inject, injectable } from 'tsyringe';
import type { ICattleService } from "../interfaces/services/ICattleService.js";
import { AuditService } from "../services/AuditService.js";

@injectable()
export class CattleController {
    constructor(
        @inject("ICattleService") private cattleService: ICattleService,
        @inject(AuditService) private auditService: AuditService,
    ) { }

    /**
     * Mengambil daftar semua sapi dengan filter pencarian.
     * @route GET /api/v1/cattle
     * @param {Request} req - Express Request object berisi query string (misal: ?status=active&breed=limousin).
     * @param {Response} res - Express Response object untuk mengembalikan array profil sapi.
     * @param {NextFunction} next - Express NextFunction untuk meneruskan error ke handler global.
     */
    public getAllCattle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const filters = req.query;
            const cattleList = await this.cattleService.getAllCattle(filters);

            res.status(200).json({
                success: true,
                data: cattleList
            });
        } catch (error) {
            next(error);
        }
    };


    /**
     * Mengambil detail profil sapi beserta riwayatnya berdasarkan UUID.
     * @route GET /api/v1/cattle/:id
     * @param {Request} req - Express Request object berisi path param `id`.
     * @param {Response} res - Express Response object berisi data sapi secara detail.
     * @param {NextFunction} next - Express NextFunction untuk meneruskan error ke handler global.
     * @returns {Promise<void>}
     */
    public getCattleById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const cattle = await this.cattleService.getCattleById(id);

            if (!cattle) {
                res.status(404).json({ success: false, message: "Data sapi tidak ditemukan" });
                return;
            }

            res.status(200).json({
                success: true,
                data: cattle
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Mendaftarkan profil sapi baru ke dalam sistem.
     * @route POST /api/v1/cattle
     * @param {Request} req - Express Request object berisi payload JSON sapi baru.
     * @param {Response} res - Express Response object mengembalikan record sapi yang baru tersimpan.
     * @param {NextFunction} next - Express NextFunction untuk meneruskan error ke handler global.
     */
    public registerCattle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const payload = req.body;
            const newCattle = await this.cattleService.registerCattle(payload);

            // Audit Trail: Catat aksi penambahan sapi oleh web session
            const webSession = (req as any).webSession;
            if (webSession) {
                await this.auditService.log(
                    "web_session",
                    webSession.id,
                    "create",
                    "cattle",
                    newCattle.id,
                    payload
                );
            }

            res.status(201).json({
                success: true,
                message: "Sapi baru berhasil didaftarkan",
                data: newCattle
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Memperbarui detail informasi sapi yang sudah ada.
     * @route PUT /api/v1/cattle/:id
     * @param {Request} req - Express Request object berisi path param `id` dan JSON payload update.
     * @param {Response} res - Express Response object mengembalikan record sapi hasil pembaruan.
     * @param {NextFunction} next - Express NextFunction untuk meneruskan error ke handler global.
     */
    public updateCattle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const payload = req.body;

            const updatedCattle = await this.cattleService.updateCattle(id, payload);

            // Audit Trail: Catat aksi pembaruan sapi oleh web session
            const webSession = (req as any).webSession;
            if (webSession) {
                await this.auditService.log(
                    "web_session",
                    webSession.id,
                    "update",
                    "cattle",
                    id,
                    payload
                );
            }

            res.status(200).json({
                success: true,
                message: "Data sapi berhasil diperbaharui",
                data: updatedCattle
            });
        } catch (error) {
            next (error);
        }
    };

    /**
     * Menghapus profil sapi secara logikal (soft delete) berdasarkan UUID.
     * @route DELETE /api/v1/cattle/:id
     * @param {Request} req - Express Request object berisi path param `id`.
     * @param {Response} res - Express Response object berisi pesan status keberhasilan penghapusan.
     * @param {NextFunction} next - Express NextFunction untuk meneruskan error ke handler global.
     */
    public removeCattle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            await this.cattleService.removeCattle(id);

            // Audit Trail: Catat aksi penghapusan sapi oleh web session
            const webSession = (req as any).webSession;
            if (webSession) {
                await this.auditService.log(
                    "web_session",
                    webSession.id,
                    "delete",
                    "cattle",
                    id
                );
            }

            res.status(200).json({
                success: true,
                message: "Data sapi berhasil dihapus (Soft Delete)"
            });
        } catch (error) {
            next(error);
        }

    }; 
}