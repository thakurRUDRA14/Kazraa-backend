/*
  Warnings:

  - A unique constraint covering the columns `[sizeTypeId,name]` on the table `Size` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `sizeTypeId` to the `Size` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Size_name_key";

-- DropIndex
DROP INDEX "Size_shortCode_key";

-- AlterTable
ALTER TABLE "Size" ADD COLUMN     "sizeTypeId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "SizeType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SizeType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SizeType_name_key" ON "SizeType"("name");

-- CreateIndex
CREATE INDEX "Size_sizeTypeId_idx" ON "Size"("sizeTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "Size_sizeTypeId_name_key" ON "Size"("sizeTypeId", "name");

-- AddForeignKey
ALTER TABLE "Size" ADD CONSTRAINT "Size_sizeTypeId_fkey" FOREIGN KEY ("sizeTypeId") REFERENCES "SizeType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
