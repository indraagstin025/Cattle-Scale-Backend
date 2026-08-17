import { Request, Response, NextFunction } from "express";
import { inject, injectable } from "tsyringe";
import type { IDeviceService } from "../interfaces/services/IDeviceService.js";

@injectable()
export class DeviceController {
    constructor(
        @inject("IDeviceService") private deviceService: IDeviceService
    ) {}

    /**
     * Mengambil daftar semua perangkat ESP32 yang terdaftar di sistem.
     * @route GET /api/v1/devices
     * @param {Request} req - Express Request object.
     * @param {Response} res - Express Response object untuk mengembalikan array perangkat.
     * @param {NextFunction} next - Express NextFunction untuk error handling global.
     */
    public getAllDevices = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const devices = await this.deviceService.getAllDevices();
            res.status(200).json({ success: true, data: devices });
        } catch (error) { next(error); }
    };

    /**
     * Mengambil profil dan metrik kesehatan perangkat ESP32 berdasarkan UUID.
     * @route GET /api/v1/devices/:id
     * @param {Request} req - Express Request object berisi path param `id`.
     * @param {Response} res - Express Response object mengembalikan detail perangkat.
     * @param {NextFunction} next - Express NextFunction untuk error handling.
     */
    public getDeviceById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const device = await this.deviceService.getDeviceById(req.params.id);
            if (!device) {
                res.status(404).json({ success: false, message: "Device not found" });
                return;
            }
            res.status(200).json({ success: true, data: device });
        } catch (error) { next(error); }
    };

    /**
     * Mendaftarkan perangkat ESP32 baru dan mengembalikan raw API Key satu kali tampil.
     * @route POST /api/v1/devices
     * @param {Request} req - Express Request object berisi `name` dan `location`.
     * @param {Response} res - Express Response object mengembalikan data device dan `rawApiKey`.
     * @param {NextFunction} next - Express NextFunction untuk error handling.
     */
    public registerDevice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { name, location } = req.body;
            const result = await this.deviceService.registerDevice(name, location);
            res.status(201).json({ success: true, message: "Device registered", data: result });
        } catch (error) { next(error); }
    };

    /**
     * Merotasi (reset) API Key perangkat ESP32 demi keamanan dan mengembalikan API Key baru.
     * @route POST /api/v1/devices/:id/rotate-key
     * @param {Request} req - Express Request object berisi path param `id`.
     * @param {Response} res - Express Response object mengembalikan `rawApiKey` yang baru.
     * @param {NextFunction} next - Express NextFunction untuk error handling.
     */
    public rotateApiKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const result = await this.deviceService.rotateApiKey(req.params.id);
            res.status(200).json({ success: true, message: "API Key rotated", data: result });
        } catch (error) { next(error); }
    };

    /**
     * Memperbarui metadata informasi perangkat (seperti nama, lokasi).
     * @route PUT /api/v1/devices/:id
     * @param {Request} req - Express Request object berisi payload data perangkat.
     * @param {Response} res - Express Response object mengembalikan hasil update.
     * @param {NextFunction} next - Express NextFunction untuk error handling.
     */
    public updateDevice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const device = await this.deviceService.updateDevice(req.params.id, req.body);
            res.status(200).json({ success: true, message: "Device updated", data: device });
        } catch (error) { next(error); }
    };

    /**
     * Menerima detak jantung (heartbeat) dari ESP32 untuk update metrik baterai, sinyal WiFi,
     * dan versi firmware yang sedang berjalan.
     *
     * @route POST /api/v1/iot/heartbeat
     * @param {string}  req.body.deviceCode       - Kode unik perangkat
     * @param {number}  req.body.batteryLevel      - Level baterai (0-100%)
     * @param {number}  req.body.wifiRssi          - Kekuatan sinyal WiFi (dBm)
     * @param {string}  [req.body.firmwareVersion] - Versi firmware aktif (opsional, misal: "1.2.3")
     */
    public processHeartbeat = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { deviceCode, batteryLevel, wifiRssi, firmwareVersion } = req.body;
            await this.deviceService.processHeartbeat(deviceCode, batteryLevel, wifiRssi, firmwareVersion);
            res.status(200).json({ success: true, message: "Heartbeat processed" });
        } catch (error) { next(error); }
    };
}
