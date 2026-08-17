/*
  Warnings:

  - The `status` column on the `cattle` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `devices` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `session_token` on the `web_sessions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - Changed the type of `gender` on the `cattle` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Made the column `cattle_id` on table `weight_logs` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "weight_logs" DROP CONSTRAINT "weight_logs_cattle_id_fkey";

-- DropIndex
DROP INDEX "idx_cattle_tag_id";

-- DropIndex
DROP INDEX "idx_devices_api_key";

-- DropIndex
DROP INDEX "idx_web_sessions_token";

-- AlterTable
ALTER TABLE "cattle" DROP COLUMN "gender",
ADD COLUMN     "gender" VARCHAR(10) NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" VARCHAR(20) NOT NULL DEFAULT 'active';

-- AlterTable
ALTER TABLE "devices" ALTER COLUMN "last_seen_at" SET DEFAULT CURRENT_TIMESTAMP,
DROP COLUMN "status",
ADD COLUMN     "status" VARCHAR(20) NOT NULL DEFAULT 'offline';

-- AlterTable
ALTER TABLE "web_sessions" ALTER COLUMN "session_token" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "weight_logs" ALTER COLUMN "cattle_id" SET NOT NULL;

-- DropEnum
DROP TYPE "CattleGender";

-- DropEnum
DROP TYPE "CattleStatus";

-- DropEnum
DROP TYPE "DeviceStatus";

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_type" VARCHAR(20) NOT NULL,
    "actor_id" TEXT NOT NULL,
    "action" VARCHAR(20) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" TEXT NOT NULL,
    "changes" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "breed_growth_standards" (
    "breed" VARCHAR(50) NOT NULL,
    "expected_adg" DECIMAL(4,2) NOT NULL,
    "source" TEXT,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "breed_growth_standards_pkey" PRIMARY KEY ("breed")
);

-- CreateIndex
CREATE INDEX "idx_audit_logs_entity" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "idx_cattle_status" ON "cattle"("status");

-- AddForeignKey
ALTER TABLE "weight_logs" ADD CONSTRAINT "weight_logs_cattle_id_fkey" FOREIGN KEY ("cattle_id") REFERENCES "cattle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
