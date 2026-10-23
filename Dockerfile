# ==========================
# Stage 1: Build
# ==========================
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --frozen-lockfile
COPY . .
# Run production build
RUN npm run build

# ==========================
# Stage 2: Production (The Slick Part)
# ==========================
# ... (Builder stage stays the same) ...

FROM nginx:stable-alpine
# Copy your custom config
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Copy build assets
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]