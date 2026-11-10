# Owed: Next.js standalone build, served by node on port 3000.
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Playwright is a dev dependency for the video pipeline; the image never needs its browsers.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN npm ci --no-audit --no-fund

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S owed && adduser -S owed -G owed && mkdir -p .data && chown owed:owed .data
COPY --from=build --chown=owed:owed /app/.next/standalone ./
COPY --from=build --chown=owed:owed /app/.next/static ./.next/static
COPY --from=build --chown=owed:owed /app/public ./public
USER owed
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1
CMD ["node", "server.js"]
