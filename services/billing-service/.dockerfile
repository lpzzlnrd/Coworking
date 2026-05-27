# ---- Runtime ----
FROM node:22-alpine AS runtime
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Non-root user for security
RUN addgroup -S billing && adduser -S billing -G billing
USER billing

EXPOSE 8002

CMD ["npm", "start"]
