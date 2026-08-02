FROM node:24-alpine

# Install pnpm globally
RUN npm install -g pnpm

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json pnpm-*.yaml ./
RUN pnpm install --frozen-lockfile

# Copy TypeScript source code and certificates
COPY tsconfig.json ./
COPY src/ ./src/
COPY cert/ ./cert/

# Build TypeScript to JavaScript
RUN pnpm run build

# Clean up dev dependencies after build to keep image smaller
RUN pnpm install --frozen-lockfile --prod

# Create directories for data persistence
RUN mkdir /data

# Environment variables documentation and defaults
ENV NODE_ENV=production
# See environment variables in the README.md

# Expose both Prometheus metrics port and OIDC callback port
EXPOSE 3001 53443

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Start the application
CMD ["node", "dist/index.js"]
