FROM node:22-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# Stage 2: Production runner
# FROM node:22-alpine AS runner
# WORKDIR /app

# Set production environment
# ENV NODE_ENV=production

# Copy only what we need from the builder stage
# COPY --from=builder /app/package*.json ./
# COPY --from=builder /app/node_modules ./node_modules
# COPY --from=builder /app/dist ./dist

# Expose the Fastify default port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "dev"]