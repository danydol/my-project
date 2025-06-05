-- AlterTable
ALTER TABLE "analytics" ADD COLUMN     "projectId" TEXT;

-- AlterTable
ALTER TABLE "deployments" ADD COLUMN     "cloudConnectionId" TEXT,
ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "provider" TEXT;

-- AlterTable
ALTER TABLE "infrastructures" ADD COLUMN     "projectId" TEXT;

-- AlterTable
ALTER TABLE "repositories" ADD COLUMN     "projectId" TEXT;

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "slug" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "defaultEnvironments" TEXT[] DEFAULT ARRAY['dev', 'staging', 'prod']::TEXT[],
    "multiCloud" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "icon" TEXT,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cloud_connections" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "lastValidated" TIMESTAMP(3),
    "errorMessage" TEXT,
    "config" JSONB NOT NULL,
    "region" TEXT,
    "description" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cloud_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "projects_slug_key" ON "projects"("slug");

-- CreateIndex
CREATE INDEX "projects_userId_idx" ON "projects"("userId");

-- CreateIndex
CREATE INDEX "projects_slug_idx" ON "projects"("slug");

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- CreateIndex
CREATE INDEX "cloud_connections_projectId_idx" ON "cloud_connections"("projectId");

-- CreateIndex
CREATE INDEX "cloud_connections_provider_idx" ON "cloud_connections"("provider");

-- CreateIndex
CREATE INDEX "cloud_connections_status_idx" ON "cloud_connections"("status");

-- CreateIndex
CREATE UNIQUE INDEX "cloud_connections_projectId_name_key" ON "cloud_connections"("projectId", "name");

-- CreateIndex
CREATE INDEX "analytics_projectId_idx" ON "analytics"("projectId");

-- CreateIndex
CREATE INDEX "deployments_projectId_idx" ON "deployments"("projectId");

-- CreateIndex
CREATE INDEX "deployments_cloudConnectionId_idx" ON "deployments"("cloudConnectionId");

-- CreateIndex
CREATE INDEX "deployments_provider_idx" ON "deployments"("provider");

-- CreateIndex
CREATE INDEX "infrastructures_projectId_idx" ON "infrastructures"("projectId");

-- CreateIndex
CREATE INDEX "repositories_projectId_idx" ON "repositories"("projectId");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cloud_connections" ADD CONSTRAINT "cloud_connections_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "infrastructures" ADD CONSTRAINT "infrastructures_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_cloudConnectionId_fkey" FOREIGN KEY ("cloudConnectionId") REFERENCES "cloud_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics" ADD CONSTRAINT "analytics_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
