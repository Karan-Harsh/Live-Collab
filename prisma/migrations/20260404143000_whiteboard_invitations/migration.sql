-- CreateEnum
CREATE TYPE "WhiteboardCollaboratorRole" AS ENUM ('EDITOR');

-- CreateEnum
CREATE TYPE "WhiteboardInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELED');

-- DropIndex
DROP INDEX "Document_isShared_createdAt_idx";

-- AlterTable
ALTER TABLE "Document" DROP COLUMN "isShared";

-- CreateTable
CREATE TABLE "WhiteboardCollaborator" (
    "id" UUID NOT NULL,
    "whiteboardId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "WhiteboardCollaboratorRole" NOT NULL DEFAULT 'EDITOR',
    "invitedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhiteboardCollaborator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhiteboardInvite" (
    "id" UUID NOT NULL,
    "whiteboardId" UUID NOT NULL,
    "inviterId" UUID NOT NULL,
    "recipientId" UUID NOT NULL,
    "status" "WhiteboardInviteStatus" NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhiteboardInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhiteboardCollaborator_whiteboardId_userId_key" ON "WhiteboardCollaborator"("whiteboardId", "userId");

-- CreateIndex
CREATE INDEX "WhiteboardCollaborator_userId_createdAt_idx" ON "WhiteboardCollaborator"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "WhiteboardCollaborator_whiteboardId_createdAt_idx" ON "WhiteboardCollaborator"("whiteboardId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WhiteboardInvite_whiteboardId_recipientId_key" ON "WhiteboardInvite"("whiteboardId", "recipientId");

-- CreateIndex
CREATE INDEX "WhiteboardInvite_recipientId_status_createdAt_idx" ON "WhiteboardInvite"("recipientId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "WhiteboardInvite_whiteboardId_status_createdAt_idx" ON "WhiteboardInvite"("whiteboardId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "WhiteboardCollaborator" ADD CONSTRAINT "WhiteboardCollaborator_whiteboardId_fkey" FOREIGN KEY ("whiteboardId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhiteboardCollaborator" ADD CONSTRAINT "WhiteboardCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhiteboardCollaborator" ADD CONSTRAINT "WhiteboardCollaborator_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhiteboardInvite" ADD CONSTRAINT "WhiteboardInvite_whiteboardId_fkey" FOREIGN KEY ("whiteboardId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhiteboardInvite" ADD CONSTRAINT "WhiteboardInvite_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhiteboardInvite" ADD CONSTRAINT "WhiteboardInvite_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
