-- AlterTable
ALTER TABLE "Message" ADD COLUMN "deliveredAt" TIMESTAMP(3),
ADD COLUMN "readAt" TIMESTAMP(3);

-- Messages déjà lus avant cette migration : on les marque livrés + lus (sinon ils resteraient à une seule coche)
UPDATE "Message"
SET "deliveredAt" = "createdAt", "readAt" = "updatedAt"
WHERE "isRead" = true AND "destinataireId" IS NOT NULL;
