import { inject, injectable } from "tsyringe";
import { Device, Prisma } from "@prisma/client";
import { randomBytes, createHash } from "crypto";
import type { IDeviceService } from "../interfaces/services/IDeviceService.js";
import type { IDeviceRepository } from "../interfaces/repositories/IDeviceRepository.js";

@injectable()
export class DeviceService implements IDeviceService {
    constructor(
        @inject('IDeviceRepository') private deviceRepository: IDeviceRepository
    ) {}

    /**
     * Mendapatkan daftar semua perangkat ESP32 yang terdaftar.
     */
    async getAllDevices(): Promise<Device[]> {
        return this.deviceRepository.findAll();
    }

    /**
     * Mengambil detail perangkat berdasarkan UUID.
     */
    async getDeviceById(id: string): Promise<Device | null> {
        return this.deviceRepository.findById(id);
    }

    private generateApiKey(): { raw: string; hashed: string } {
        const raw = randomBytes(32).toString('hex');
        const hashed = createHash('sha256').update(raw).digest('hex');
        return { raw, hashed };
    }
    
    private generateDeviceCode(): string {
        return `DEV-${randomBytes(4).toString('hex').toUpperCase()}`;
    }

    /**
     * Mendaftarkan perangkat ESP32 baru dan menghasilkan API Key mentah satu kali pakai.
     */
    async registerDevice(name: string, location?: string): Promise<{ device: Device; rawApiKey: string }> {
        const { raw, hashed } = this.generateApiKey();
        const deviceCode = this.generateDeviceCode();
        
        const device = await this.deviceRepository.create({
            name,
            location,
            apiKey: hashed,
            deviceCode: deviceCode,
            status: 'offline'
        });

        return { device, rawApiKey: raw };
    }

    /**
     * Mereset ulang (rotate) API Key dari perangkat yang terkompromi.
     */
    async rotateApiKey(id: string): Promise<{ device: Device; newApiKey: string }> {
        const { raw, hashed } = this.generateApiKey();
        const device = await this.deviceRepository.update(id, { apiKey: hashed });
        return { device, newApiKey: raw };
    }

    /**
     * Memperbarui metadata perangkat (nama, lokasi).
     */
    async updateDevice(id: string, data: Prisma.DeviceUpdateInput): Promise<Device> {
        return this.deviceRepository.update(id, data);
    }

    /**
     * Memperbarui metrik kesehatan perangkat (baterai, sinyal WiFi, versi firmware) dan waktu online terakhir.
     * Jika `firmwareVersion` disertakan dalam payload heartbeat, nilai tersebut akan langsung disimpan
     * ke kolom `firmware_version` pada tabel `devices`, sehingga Settings dashboard dapat menampilkan
     * versi firmware yang sedang berjalan di setiap perangkat ESP32 secara real-time.
     *
     * @param deviceCode      - Kode unik perangkat (misal: "SCALE-ESP32-01")
     * @param batteryLevel    - Level baterai dalam persen (0–100)
     * @param wifiRssi        - Kekuatan sinyal WiFi dalam dBm (-120 s.d. 0)
     * @param firmwareVersion - Versi firmware saat ini (opsional, misal: "1.2.3")
     */
    async processHeartbeat(
        deviceCode: string,
        batteryLevel: number,
        wifiRssi: number,
        firmwareVersion?: string,
    ): Promise<void> {
        const device = await this.deviceRepository.findByDeviceCode(deviceCode);
        if (!device) throw new Error("Perangkat tidak ditemukan");
        
        await this.deviceRepository.updateHeartbeat(device.id, {
            batteryLevel,
            wifiRssi,
            status: 'online',
            firmwareVersion,
        });
    }
}