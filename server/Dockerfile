# Use Node.js LTS version
FROM node:18-alpine AS base

# Install system dependencies
RUN apk add --no-cache curl ca-certificates

# Build stage
FROM base AS build

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY tsup.config.ts ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY src/ ./src/
COPY server.ts ./

# Build the TypeScript application
RUN npm run build

# Production stage
FROM base AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from build stage
COPY --from=build /app/dist ./dist

# Create logs directory
RUN mkdir -p logs

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S figma-bridge -u 1001 -G nodejs

# Change ownership of app directory
RUN chown -R figma-bridge:nodejs /app

# Switch to non-root user
USER figma-bridge

# Expose ports
EXPOSE 3001 3002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Start the application
CMD ["npm", "start"]
