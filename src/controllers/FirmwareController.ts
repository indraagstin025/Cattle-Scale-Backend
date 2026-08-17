import { Request, Response, NextFunction } from "express";
import { inject, injectable } from "tsyringe";
import type { IFirmwareService } from "../interfaces/services/IFirmwareService.js";

@injectable()
export class FirmwareController {
    constructor(
        @inject("IFirmwareService") private firmwareService: IFirmwareService
    ) { }

    /**
     * Mengecek dan mendapatkan informasi rilis firmware OTA terbaru yang aktif.
     * @route GET /api/v1/iot/firmware/latest
     * @param {Request} req - Express Request object.
     * @param {Response} res - Express Response object berisi versi dan URL unduhan firmware.
     * @param {NextFunction} next - Express NextFunction untuk error handling global.
     */
    public getLatestActiveFirmware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const firmware = await this.firmwareService.getLatestActiveFirmware();
            if (!firmware) {
                res.status(404).json({ success: false, message: "No active firmware found" });
                return;
            }
            res.status(200).json({ success: true, data: firmware });
        } catch (error) { next(error); }
    };

    /**
     * Mempublikasikan rilis firmware baru dan menonaktifkan rilis sebelumnya secara otomatis.
     * @route POST /api/v1/firmware
     * @param {Request} req - Express Request object berisi `version`, `binaryUrl`, dan `changelog`.
     * @param {Response} res - Express Response object berisi data firmware baru.
     * @param {NextFunction} next - Express NextFunction untuk error handling global.
     */
    public publishNewFirmware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { version, binaryUrl, changelog } = req.body;
            const firmware = await this.firmwareService.publishNewFirmware(version, binaryUrl, changelog);
            res.status(201).json({ success: true, message: "Firmware published", data: firmware });
        } catch (error) { next(error); }
    };
}
