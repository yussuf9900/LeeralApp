# Base stage for sharing files
FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./

# Development stage (keeps all dependencies, runs hot-reloading)
FROM base AS development
RUN npm ci --ignore-scripts
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Builder stage (for compiling production assets)
FROM base AS builder
# Copy package files for both root and frontend
COPY package*.json ./
COPY frontend/package*.json ./frontend/
# Install root dependencies
RUN npm ci --ignore-scripts
# Install frontend dependencies
RUN npm --prefix frontend ci --ignore-scripts

# Copy source code
COPY tsconfig.json ./
COPY src ./src
COPY frontend ./frontend

# Run production build
RUN npm run build

# Production runtime stage (minimal size, runs pre-compiled code)
FROM base AS production
# Install only production dependencies
RUN npm ci --only=production --ignore-scripts
# Copy compiled backend and frontend from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/frontend/dist ./frontend/dist
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
