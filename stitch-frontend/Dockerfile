# Build stage
FROM node:20-slim AS build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Environment variable for WebSocket URL (baked into the build)
ARG VITE_WS_URL=wss://spies.atyourservice-ai.com/ws
ARG VITE_DROP_CONSOLE=false
ENV VITE_WS_URL=$VITE_WS_URL
ENV VITE_DROP_CONSOLE=$VITE_DROP_CONSOLE

# Build the production application
RUN npm run build

# Serve stage
FROM node:20-slim

WORKDIR /app

# Only copy what's needed to serve
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/vite.config.ts ./vite.config.ts

EXPOSE 4173

CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "4173"]
