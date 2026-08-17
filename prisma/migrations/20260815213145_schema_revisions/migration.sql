/*
  Warnings:

  - The `status` column on the `cattle` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `devices` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `gender` on the `cattle` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('online', 'offline', 'weighing');

-- CreateEnum
CREATE TYPE "CattleGender" AS ENUM ('male', 'female');

-- CreateEnum
CREATE TYPE "CattleStatus" AS ENUM ('active', 'sold', 'quarantine', 'deceased');

-- DropForeignKey
ALTER TABLE "weight_logs" DROP CONSTRAINT "weight_logs_cattle_id_fkey";

-- AlterTable
ALTER TABLE "cattle" DROP COLUMN "gender",
ADD COLUMN     "gender" "CattleGender" NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "CattleStatus" NOT NULL DEFAULT 'active';

-- AlterTable
ALTER TABLE "devices" DROP COLUMN "status",
ADD COLUMN     "status" "DeviceStatus" NOT NULL DEFAULT 'offline',
ALTER COLUMN "last_seen_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "system_settings" ADD COLUMN     "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "web_sessions" ALTER COLUMN "session_token" SET DATA TYPE TEXT;

-- CreateIndex
CREATE INDEX "idx_cattle_status" ON "cattle"("status");

-- CreateIndex
CREATE INDEX "idx_weight_logs_device_id" ON "weight_logs"("device_id");

-- AddForeignKey
ALTER TABLE "weight_logs" ADD CONSTRAINT "weight_logs_cattle_id_fkey" FOREIGN KEY ("cattle_id") REFERENCES "cattle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
