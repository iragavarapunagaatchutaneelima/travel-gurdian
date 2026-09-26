# Use Node image. Next.js 16 requires a modern Node runtime; this matches
# the version used in local development (Node 22).
FROM node:22-alpine

# Set work directory
WORKDIR /workspace

# Copy dependencies definitions
COPY package*.json ./

# Install dependencies
RUN npm install --no-audit --no-fund --legacy-peer-deps

# Copy project files
COPY . .

# Disable telemetry and build the production bundle
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Expose port
EXPOSE 3000

# Start Next.js server
CMD ["npm", "run", "start"]
