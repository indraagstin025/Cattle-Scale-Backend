# 🐄 Cattle-Scale-Backend

Backend RESTful API dan IoT Gateway untuk sistem timbangan sapi cerdas berbasis ESP32, Prisma ORM, PostgreSQL (Supabase), dan Express.js TypeScript dengan arsitektur Dependency Injection (TSyringe).

---

## 🚀 Fitur Utama

- **IoT Data Ingestion**: Endpoint ingest data timbangan (`POST /api/v1/iot/weigh-in`) dengan proteksi idempotensi dan verifikasi API key perangkat (`SHA-256`).
- **Heartbeat & Battery Monitoring**: Pemantauan level baterai, RSSI sinyal WiFi, dan versi firmware perangkat timbangan.
- **Pairing 6-Digit & Session Management**: Autentikasi web dashboard via verifikasi kode 6-digit LCD ESP32 dengan cookie aman (*httpOnly, Secure, SameSite=None*).
- **Pertumbuhan & Prediksi Panen**: Analisis ADG (*Average Daily Gain*) historis dan estimasi tanggal panen menggunakan Regresi Linear OLS.
- **Ekspor Laporan**: Generator laporan PDF & Excel yang di-upload ke private storage dengan *Signed URL* (berlaku 60 detik).
- **Audit Trail & System Settings**: Pencatatan log aktivitas dan konfigurasi ambang batas *spike detection*.
- **Comprehensive Automated Tests**: Dilengkapi 125 test scenarios (Unit Test + Integration Test) dengan tingkat kelulusan 100%.

---

## 🛠️ Tech Stack

- **Runtime**: Node.js (ESM) + TypeScript
- **Framework**: Express.js
- **Database & ORM**: PostgreSQL via Supabase + Prisma ORM
- **IoC / DI**: TSyringe + `reflect-metadata`
- **Testing**: Jest + TS-Jest (ESM VM Modules) + Supertest
- **Logging & Monitoring**: Pino Logger + Sentry
- **CI/CD**: GitHub Actions

---

## 🧪 Menjalankan Pengujian (Testing)

```bash
# Menjalankan seluruh 24 test suites (125 tests)
npm test

# Menjalankan build TypeScript
npm run build
```

---

## 📦 Deployment ke Vercel

1. Hubungkan repository ini ke Vercel dashboard.
2. Masukkan *Environment Variables* sesuai `.env.example`.
3. Deploy!
