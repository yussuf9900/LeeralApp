# Base stage for sharing files
FROM node:18-alpine AS base
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
RUN npm ci --ignore-scripts
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Production runtime stage (minimal size, runs pre-compiled code)
FROM base AS production
RUN npm ci --only=production --ignore-scripts
COPY --from=builder /app/dist ./dist
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
