# cvg-admin: Next.js, built as a standalone server. Used by docker compose (Vercel builds on its own).

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Where /api/* is proxied to. It's baked in at build time, so pass it as a build arg.
ARG CVG_API_URL=http://localhost:8080
ENV CVG_API_URL=$CVG_API_URL NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ARG CVG_API_URL=http://localhost:8080
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3001 HOSTNAME=0.0.0.0 CVG_API_URL=$CVG_API_URL
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3001
CMD ["node", "server.js"]
