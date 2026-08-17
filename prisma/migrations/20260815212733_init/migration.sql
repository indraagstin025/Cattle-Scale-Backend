-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "device_code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "api_key" VARCHAR(100) NOT NULL,
    "location" VARCHAR(100),
    "battery_level" INTEGER NOT NULL DEFAULT 100,
    "wifi_rssi" INTEGER,
    "status" VARCHAR(20) NOT NULL DEFAULT 'offline',
    "firmware_version" VARCHAR(20),
    "last_seen_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cattle" (
    "id" TEXT NOT NULL,
    "tag_id" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100),
    "breed" VARCHAR(50) NOT NULL,
    "gender" VARCHAR(10) NOT NULL,
    "birth_date" DATE,
    "initial_weight" DECIMAL(6,2) NOT NULL,
    "target_weight" DECIMAL(6,2),
    "current_weight" DECIMAL(6,2),
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "cattle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weight_logs" (
    "id" TEXT NOT NULL,
    "cattle_id" TEXT,
    "device_id" TEXT,
    "weight" DECIMAL(6,2) NOT NULL,
    "is_stable" BOOLEAN NOT NULL DEFAULT true,
    "idempotency_key" VARCHAR(100),
    "weighed_at" TIMESTAMPTZ NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weight_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "key" VARCHAR(50) NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "pairing_codes" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pairing_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "web_sessions" (
    "id" TEXT NOT NULL,
    "session_token" VARCHAR(255) NOT NULL,
    "label" VARCHAR(100),
    "paired_device_id" TEXT,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "last_active_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "web_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "firmware_releases" (
    "id" TEXT NOT NULL,
    "version" VARCHAR(20) NOT NULL,
    "binary_url" TEXT NOT NULL,
    "changelog" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "released_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "firmware_releases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "devices_device_code_key" ON "devices"("device_code");

-- CreateIndex
CREATE UNIQUE INDEX "devices_api_key_key" ON "devices"("api_key");

-- CreateIndex
CREATE INDEX "idx_devices_api_key" ON "devices"("api_key");

-- CreateIndex
CREATE UNIQUE INDEX "cattle_tag_id_key" ON "cattle"("tag_id");

-- CreateIndex
CREATE INDEX "idx_cattle_tag_id" ON "cattle"("tag_id");

-- CreateIndex
CREATE INDEX "idx_cattle_breed" ON "cattle"("breed");

-- CreateIndex
CREATE INDEX "idx_cattle_status" ON "cattle"("status");

-- CreateIndex
CREATE UNIQUE INDEX "weight_logs_idempotency_key_key" ON "weight_logs"("idempotency_key");

-- CreateIndex
CREATE INDEX "idx_weight_logs_cattle_date" ON "weight_logs"("cattle_id", "weighed_at" DESC);

-- CreateIndex
CREATE INDEX "idx_pairing_codes_code" ON "pairing_codes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "web_sessions_session_token_key" ON "web_sessions"("session_token");

-- CreateIndex
CREATE INDEX "idx_web_sessions_token" ON "web_sessions"("session_token");

-- CreateIndex
CREATE UNIQUE INDEX "firmware_releases_version_key" ON "firmware_releases"("version");

-- AddForeignKey
ALTER TABLE "weight_logs" ADD CONSTRAINT "weight_logs_cattle_id_fkey" FOREIGN KEY ("cattle_id") REFERENCES "cattle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weight_logs" ADD CONSTRAINT "weight_logs_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pairing_codes" ADD CONSTRAINT "pairing_codes_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "web_sessions" ADD CONSTRAINT "web_sessions_paired_device_id_fkey" FOREIGN KEY ("paired_device_id") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
