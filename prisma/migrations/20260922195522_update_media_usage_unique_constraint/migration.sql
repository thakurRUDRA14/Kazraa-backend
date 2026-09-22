/*
  Warnings:

  - A unique constraint covering the columns `[entityType,entityId,role,sortOrder]` on the table `MediaUsage` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "MediaUsage_entityType_entityId_role_key";

-- CreateIndex
CREATE UNIQUE INDEX "MediaUsage_entityType_entityId_role_sortOrder_key" ON "MediaUsage"("entityType", "entityId", "role", "sortOrder");
