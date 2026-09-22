/*
  Warnings:

  - You are about to drop the column `imageId` on the `Banner` table. All the data in the column will be lost.
  - You are about to drop the column `mobileImageId` on the `Banner` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrl` on the `Category` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrl` on the `Collection` table. All the data in the column will be lost.
  - You are about to drop the column `logoId` on the `Marketplace` table. All the data in the column will be lost.
  - You are about to drop the column `faviconId` on the `StoreSetting` table. All the data in the column will be lost.
  - You are about to drop the column `logoId` on the `StoreSetting` table. All the data in the column will be lost.
  - You are about to drop the column `avatar` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `ProductImage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ReviewImage` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `purpose` to the `Media` table without a default value. This is not possible if the table is not empty.
  - Added the required column `storageProvider` to the `Media` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Media` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('TEMPORARY', 'ACTIVE', 'FAILED', 'DELETED');

-- CreateEnum
CREATE TYPE "MediaPurpose" AS ENUM ('PRODUCT', 'CATEGORY', 'BANNER', 'CATALOGUE', 'COLLECTION', 'HOMEPAGE', 'CAMPAIGN', 'SOCIAL_POST', 'PROFILE', 'REVIEW', 'STORE', 'MARKETPLACE');

-- CreateEnum
CREATE TYPE "MediaEntityType" AS ENUM ('PRODUCT', 'CATEGORY', 'BANNER', 'CATALOGUE', 'COLLECTION', 'HOMEPAGE', 'CAMPAIGN', 'SOCIAL_POST', 'USER', 'REVIEW', 'STORE', 'MARKETPLACE');

-- CreateEnum
CREATE TYPE "MediaRole" AS ENUM ('PRIMARY', 'GALLERY', 'THUMBNAIL', 'COVER', 'DESKTOP_IMAGE', 'MOBILE_IMAGE', 'VIDEO', 'AVATAR', 'LOGO', 'FAVICON', 'PAGE', 'HERO', 'MOBILE_HERO', 'CARD', 'CONTENT');

-- CreateEnum
CREATE TYPE "StorageProvider" AS ENUM ('CLOUDINARY', 'S3', 'R2');

-- DropForeignKey
ALTER TABLE "Banner" DROP CONSTRAINT "Banner_imageId_fkey";

-- DropForeignKey
ALTER TABLE "Banner" DROP CONSTRAINT "Banner_mobileImageId_fkey";

-- DropForeignKey
ALTER TABLE "Marketplace" DROP CONSTRAINT "Marketplace_logoId_fkey";

-- DropForeignKey
ALTER TABLE "ProductImage" DROP CONSTRAINT "ProductImage_mediaId_fkey";

-- DropForeignKey
ALTER TABLE "ProductImage" DROP CONSTRAINT "ProductImage_productId_fkey";

-- DropForeignKey
ALTER TABLE "ReviewImage" DROP CONSTRAINT "ReviewImage_mediaId_fkey";

-- DropForeignKey
ALTER TABLE "ReviewImage" DROP CONSTRAINT "ReviewImage_reviewId_fkey";

-- DropForeignKey
ALTER TABLE "StoreSetting" DROP CONSTRAINT "StoreSetting_faviconId_fkey";

-- DropForeignKey
ALTER TABLE "StoreSetting" DROP CONSTRAINT "StoreSetting_logoId_fkey";

-- AlterTable
ALTER TABLE "Banner" DROP COLUMN "imageId",
DROP COLUMN "mobileImageId";

-- AlterTable
ALTER TABLE "Category" DROP COLUMN "imageUrl";

-- AlterTable
ALTER TABLE "Collection" DROP COLUMN "imageUrl";

-- AlterTable
ALTER TABLE "Marketplace" DROP COLUMN "logoId";

-- AlterTable
ALTER TABLE "Media" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "duration" DOUBLE PRECISION,
ADD COLUMN     "originalName" TEXT,
ADD COLUMN     "publicId" TEXT,
ADD COLUMN     "purpose" "MediaPurpose" NOT NULL,
ADD COLUMN     "status" "MediaStatus" NOT NULL DEFAULT 'TEMPORARY',
ADD COLUMN     "storageProvider" "StorageProvider" NOT NULL,
ADD COLUMN     "type" "MediaType" NOT NULL,
ADD COLUMN     "uploadedById" TEXT,
ALTER COLUMN "size" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "StoreSetting" DROP COLUMN "faviconId",
DROP COLUMN "logoId";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "avatar";

-- DropTable
DROP TABLE "ProductImage";

-- DropTable
DROP TABLE "ReviewImage";

-- DropEnum
DROP TYPE "ImageType";

-- CreateTable
CREATE TABLE "MediaUsage" (
    "id" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "entityType" "MediaEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "role" "MediaRole" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MediaUsage_mediaId_idx" ON "MediaUsage"("mediaId");

-- CreateIndex
CREATE INDEX "MediaUsage_entityType_entityId_idx" ON "MediaUsage"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "MediaUsage_entityType_entityId_role_idx" ON "MediaUsage"("entityType", "entityId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "MediaUsage_entityType_entityId_role_key" ON "MediaUsage"("entityType", "entityId", "role");

-- CreateIndex
CREATE INDEX "Media_status_idx" ON "Media"("status");

-- CreateIndex
CREATE INDEX "Media_type_idx" ON "Media"("type");

-- CreateIndex
CREATE INDEX "Media_purpose_idx" ON "Media"("purpose");

-- CreateIndex
CREATE INDEX "Media_storageProvider_idx" ON "Media"("storageProvider");

-- CreateIndex
CREATE INDEX "Media_uploadedById_idx" ON "Media"("uploadedById");

-- CreateIndex
CREATE INDEX "Media_createdAt_idx" ON "Media"("createdAt");

-- CreateIndex
CREATE INDEX "Media_deletedAt_idx" ON "Media"("deletedAt");

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaUsage" ADD CONSTRAINT "MediaUsage_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
