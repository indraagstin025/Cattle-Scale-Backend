import { Device, Prisma } from '@prisma/client';

export interface IDeviceRepository {
    /**
     * Mengambil semua perangkat.
     */
    findAll(): Promise<Device[]>;
    
    /**
     * Mencari perangkat berdasarkan UUID.
     */
    findById(id: string): Promise<Device | null>;
    
    /**
     * Mencari perangkat berdasarkan API Key (hashed).
     */
    findByApiKey(apiKey: string): Promise<Device | null>;
    
    /**
     * Mencari perangkat berdasarkan kode unik (misal: DEV-A1B2C3).
     */
    findByDeviceCode(deviceCode: string): Promise<Device | null>;
    
    /**
     * Mendaftarkan perangkat baru.
     */
    create(data: Prisma.DeviceCreateInput): Promise<Device>;
    
    /**
     * Memperbarui data perangkat.
     */
    update(id: string, data: Prisma.DeviceUpdateInput): Promise<Device>;
    
    /**
     * Memperbarui status online/offline, statistik baterai, dan versi firmware dari perangkat.
     */
    updateHeartbeat(id: string, data: { batteryLevel: number; wifiRssi: number; status: string; firmwareVersion?: string }): Promise<Device>;
}