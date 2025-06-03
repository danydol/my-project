# Multi-stage build for Node.js backend
# Stage 1: Dependencies stage
FROM node:18-alpine AS dependencies

# Install build dependencies
RUN apk add --no-cache openssl python3 make g++

# Set working directory
WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --include=dev

# Generate Prisma client
RUN npm run prisma:generate

# Stage 2: Build stage
FROM dependencies AS builder

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Remove dev dependencies
RUN npm ci --only=production && npm cache clean --force

# Stage 3: Production stage
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

# Copy health check script
COPY --chown=deployai:nodejs healthcheck.js ./

# Switch to non-root user
USER deployai

# Expose port
EXPOSE 3005

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start the application
CMD ["npm", "start"] 