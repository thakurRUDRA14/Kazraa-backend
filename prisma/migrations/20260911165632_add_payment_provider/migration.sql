/*
  Warnings:

  - You are about to drop the column `gateway` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `gatewayResponse` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `transactionId` on the `Payment` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('CASHFREE', 'RAZORPAY');

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "gateway",
DROP COLUMN "gatewayResponse",
DROP COLUMN "transactionId",
ADD COLUMN     "provider" "PaymentProvider",
ADD COLUMN     "providerOrderId" TEXT,
ADD COLUMN     "providerPaymentId" TEXT,
ADD COLUMN     "providerResponse" JSONB;

-- CreateIndex
CREATE INDEX "Payment_provider_idx" ON "Payment"("provider");

-- CreateIndex
CREATE INDEX "Payment_providerPaymentId_idx" ON "Payment"("providerPaymentId");

-- CreateIndex
CREATE INDEX "Payment_providerOrderId_idx" ON "Payment"("providerOrderId");
