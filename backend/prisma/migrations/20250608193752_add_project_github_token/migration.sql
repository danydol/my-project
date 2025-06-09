-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "githubToken" TEXT,
ADD COLUMN     "githubTokenUpdatedAt" TIMESTAMP(3);
