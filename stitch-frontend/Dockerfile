FROM node:20-slim

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Expose Vite's default port
EXPOSE 5173

# Run the dev server, bound to all interfaces so it's accessible from the host
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
