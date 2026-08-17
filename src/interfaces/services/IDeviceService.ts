import { Device, Prisma } from '@prisma/client';

export interface IDeviceService {
  /**
   * Mendapatkan daftar semua perangkat ESP32 yang terdaftar.
   */
  getAllDevices(): Promise<Device[]>;
  
  /**
   * Mengambil detail perangkat berdasarkan UUID.
   */
  getDeviceById(id: string): Promise<Device | null>;
  
  /**
   * Mendaftarkan perangkat ESP32 baru dan menghasilkan API Key mentah satu kali pakai.
   */
  registerDevice(name: string, location?: string): Promise<{ device: Device; rawApiKey: string }>;
  
  /**
   * Mereset ulang (rotate) API Key dari perangkat yang terkompromi.
   */
  rotateApiKey(id: string): Promise<{ device: Device; newApiKey: string }>;
  
  /**
   * Memperbarui metadata perangkat (nama, lokasi).
   */
  updateDevice(id: string, data: Prisma.DeviceUpdateInput): Promise<Device>;
  
  /**
   * Memperbarui metrik kesehatan perangkat (baterai, sinyal WiFi, versi firmware) dan waktu online terakhir.
   */
  processHeartbeat(deviceCode: string, batteryLevel: number, wifiRssi: number, firmwareVersion?: string): Promise<void>;
}
