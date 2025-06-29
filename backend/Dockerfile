# Multi-stage build for Node.js backend
# Stage 1: Dependencies stage
FROM node:18-alpine AS dependencies

# Install build dependencies
RUN apk add --no-cache openssl python3 make g++

# Set working directory
WORKDIR /app

# Copy package files first (for better caching)
COPY backend/package*.json ./
COPY backend/prisma ./prisma/

# Install dependencies
RUN npm ci --include=dev

# Generate Prisma client
RUN npm run prisma:generate

# Stage 2: Build stage
FROM dependencies AS builder

# Copy source code
COPY backend/ .

# Build the application
RUN npm run build

# Remove dev dependencies
RUN npm ci --only=production && npm cache clean --force

# Stage 3: Frontend build stage
FROM node:18-alpine AS frontend-builder

WORKDIR /frontend

# Copy frontend files
COPY frontend/package*.json ./
RUN npm ci

# Copy frontend source and build
COPY frontend/ ./
RUN npm run build

# Stage 4: Production stage
FROM node:18-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache openssl curl

# Set working directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S deployai -u 1001 -G nodejs

# Copy built application from builder stage
COPY --from=builder --chown=deployai:nodejs /app/dist ./dist
COPY --from=builder --chown=deployai:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=deployai:nodejs /app/package*.json ./
COPY --from=builder --chown=deployai:nodejs /app/prisma ./prisma

# Copy frontend build files
COPY --from=frontend-builder --chown=deployai:nodejs /frontend/build ./frontend/build

# Copy health check script
COPY --chown=deployai:nodejs backend/healthcheck.js ./

# Create logs directory with proper permissions
RUN mkdir -p logs && chown deployai:nodejs logs

# Create terraform-workspaces directory with write permissions
RUN mkdir -p /app/terraform-workspaces && chmod 777 /app/terraform-workspaces

# Switch to non-root user
USER deployai

# Expose port
EXPOSE 3005

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start the application
CMD ["npm", "start"] 