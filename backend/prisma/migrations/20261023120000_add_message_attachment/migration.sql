-- CreateEnum
CREATE TYPE "AttachmentType" AS ENUM ('TEXTE', 'IMAGE', 'VIDEO', 'FICHIER');

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "attachmentName" TEXT,
ADD COLUMN     "attachmentType" "AttachmentType" NOT NULL DEFAULT 'TEXTE',
ADD COLUMN     "attachmentUrl" TEXT;
