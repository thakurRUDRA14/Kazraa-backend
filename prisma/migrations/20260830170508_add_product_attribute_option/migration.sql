/*
  Warnings:

  - You are about to drop the column `optionId` on the `ProductAttribute` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "ProductAttribute" DROP CONSTRAINT "ProductAttribute_optionId_fkey";

-- DropIndex
DROP INDEX "ProductAttribute_attributeId_idx";

-- DropIndex
DROP INDEX "ProductAttribute_optionId_idx";

-- DropIndex
DROP INDEX "ProductAttribute_productId_idx";

-- AlterTable
ALTER TABLE "ProductAttribute" DROP COLUMN "optionId",
ADD COLUMN     "attributeOptionId" TEXT;

-- CreateTable
CREATE TABLE "ProductAttributeOption" (
    "productAttributeId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,

    CONSTRAINT "ProductAttributeOption_pkey" PRIMARY KEY ("productAttributeId","optionId")
);

-- AddForeignKey
ALTER TABLE "ProductAttribute" ADD CONSTRAINT "ProductAttribute_attributeOptionId_fkey" FOREIGN KEY ("attributeOptionId") REFERENCES "AttributeOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAttributeOption" ADD CONSTRAINT "ProductAttributeOption_productAttributeId_fkey" FOREIGN KEY ("productAttributeId") REFERENCES "ProductAttribute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAttributeOption" ADD CONSTRAINT "ProductAttributeOption_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "AttributeOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
