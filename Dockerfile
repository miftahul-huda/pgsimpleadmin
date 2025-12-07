# Build Stage for Client
FROM node:20-slim AS client-build

WORKDIR /app/client

COPY client/package*.json ./
RUN npm install

COPY client/ ./
RUN npm run build

# Production Stage
FROM node:20-slim

WORKDIR /app

# Copy server dependencies
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm install --production

# Copy server code
COPY server/ ./

# Copy built client assets from build stage
COPY --from=client-build /app/client/dist /app/client/dist

# Expose port
ENV PORT=8080
EXPOSE 8080

# Start server
CMD ["node", "index.js"]
