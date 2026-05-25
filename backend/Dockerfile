FROM node:20-alpine

WORKDIR /app

# Install system dependencies required by Prisma.
RUN apk add --no-cache openssl

# Copy package metadata.
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies.
RUN npm install

# Generate the Prisma client.
RUN npx prisma generate

# Copy source files.
COPY . .

# Build TypeScript output.
RUN npm run build

# Expose the API port.
EXPOSE 3001

# Start the API server.
CMD ["npm", "start"]

