FROM node:20-alpine AS builder

WORKDIR /app

# Copy package metadata.
COPY package*.json ./

# Install dependencies.
RUN npm install

# Copy source files.
COPY . .

# Build static assets.
RUN npm run build

# Production runtime.
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

