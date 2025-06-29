-- AlterTable
ALTER TABLE "cloud_connections" ALTER COLUMN "config" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "repositories" ADD COLUMN     "cloudObjects" JSONB NOT NULL DEFAULT '[]';
